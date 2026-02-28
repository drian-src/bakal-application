'use strict';

const { supabase } = require('../config/db');

const CART_TABLE = 'cart';
const CART_ITEMS_TABLE = 'cart_items';

/**
 * Get cart for a user, including populated product details
 */
async function getCartByUserId(userId) {
  const { data, error } = await supabase
    .from(CART_TABLE)
    .select(
      `
      id,
      user_id,
      updated_at,
      ${CART_ITEMS_TABLE}(
        id,
        product_id,
        quantity,
        added_at,
        products(
          id,
          title,
          price,
          image_url,
          platform_id,
          platforms(name)
        )
      )
      `
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create a new cart for a user
 */
async function createCart(userId) {
  const { data, error } = await supabase
    .from(CART_TABLE)
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add or update an item in the cart
 * If product already in cart, increment quantity; otherwise, create new item
 */
async function addOrUpdateCartItem(userId, productId, quantity = 1) {
  // First, ensure cart exists
  let cart = await getCartByUserId(userId);
  if (!cart) {
    cart = await createCart(userId);
  }

  // Check if item already exists in cart
  const { data: existingItem, error: checkError } = await supabase
    .from(CART_ITEMS_TABLE)
    .select('id, quantity')
    .eq('cart_id', cart.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') throw checkError;

  if (existingItem) {
    // Update quantity
    const newQuantity = existingItem.quantity + quantity;
    const { data, error } = await supabase
      .from(CART_ITEMS_TABLE)
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq('id', existingItem.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new item
    const { data, error } = await supabase
      .from(CART_ITEMS_TABLE)
      .insert({
        cart_id: cart.id,
        product_id: productId,
        quantity,
        added_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Update quantity of a cart item
 */
async function updateCartItemQuantity(cartItemId, quantity) {
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  const { data, error } = await supabase
    .from(CART_ITEMS_TABLE)
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('id', cartItemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a single cart item by ID
 */
async function removeCartItem(cartItemId) {
  const { error } = await supabase
    .from(CART_ITEMS_TABLE)
    .delete()
    .eq('id', cartItemId);

  if (error) throw error;
}

/**
 * Clear all items from a user's cart
 */
async function clearCart(userId) {
  // Get cart first
  const cart = await getCartByUserId(userId);
  if (!cart) return;

  // Delete all cart items
  const { error } = await supabase
    .from(CART_ITEMS_TABLE)
    .delete()
    .eq('cart_id', cart.id);

  if (error) throw error;
}

/**
 * Delete entire cart and its items
 */
async function deleteCart(cartId) {
  // First delete all items
  const { error: itemsError } = await supabase
    .from(CART_ITEMS_TABLE)
    .delete()
    .eq('cart_id', cartId);

  if (itemsError) throw itemsError;

  // Then delete cart
  const { error } = await supabase
    .from(CART_TABLE)
    .delete()
    .eq('id', cartId);

  if (error) throw error;
}

/**
 * Get single cart item by ID
 */
async function getCartItem(cartItemId) {
  const { data, error } = await supabase
    .from(CART_ITEMS_TABLE)
    .select(
      `
      id,
      cart_id,
      product_id,
      quantity,
      added_at,
      products(
        id,
        title,
        price,
        image_url,
        platform_id,
        platforms(name)
      )
      `
    )
    .eq('id', cartItemId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

module.exports = {
  getCartByUserId,
  createCart,
  addOrUpdateCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  deleteCart,
  getCartItem,
};
