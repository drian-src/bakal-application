'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');

const CART_TABLE = 'cart';
const CART_ITEMS_TABLE = 'cart_items';

/**
 * Get cart for a user, including populated product details
 */
async function getCartByUserId(userId) {
  try {
    logger.info(`[Cart] Fetching cart for user: ${userId}`);
    
    // First, get the cart
    const { data: cart, error: cartError } = await supabase
      .from(CART_TABLE)
      .select('id, user_id, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartError && cartError.code !== 'PGRST116') throw cartError;
    
    if (!cart) {
      logger.info(`[Cart] No cart found for user: ${userId}`);
      return null;
    }
    
    logger.info(`[Cart] Found cart: ${cart.id}`);

    // Then, get cart items with product IDs
    const { data: items, error: itemsError } = await supabase
      .from(CART_ITEMS_TABLE)
      .select('id, product_id, quantity, added_at')
      .eq('cart_id', cart.id);

    if (itemsError) throw itemsError;

    logger.info(`[Cart] Found ${items ? items.length : 0} items in cart`);

    // For each product ID, fetch the product with platform info
    if (!items || items.length === 0) {
      logger.info(`[Cart] Cart is empty, returning empty items array`);
      return { ...cart, cart_items: [] };
    }

    const productIds = items.map(i => i.product_id);
    logger.info(`[Cart] Fetching products: ${productIds.join(',')}`);
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, price, image_url, product_url, platform_id, platforms(id, name)')
      .in('id', productIds);

    if (productsError) throw productsError;

    logger.info(`[Cart] Found ${products ? products.length : 0} products`);

    // Create a product map for quick lookup
    const productMap = {};
    (products || []).forEach(p => {
      // Supabase returns to-one FK joins as a plain object, not an array.
      // Wrap platforms in an array so cartController.js can read platforms[0] safely.
      productMap[p.id] = {
        ...p,
        platforms: p.platforms ? [p.platforms] : [],
      };
      logger.debug(`[Cart] Mapped product ${p.id}: ${p.title}, platform: ${p.platforms?.name}`);
    });

    // Merge cart items with product data
    const cartItemsWithProducts = items.map(item => {
      const product = productMap[item.product_id];
      if (!product) {
        logger.warn(`[Cart] Product ${item.product_id} not found for cart item ${item.id}`);
      }
      return {
        ...item,
        products: product ? [product] : []
      };
    });

    logger.info(`[Cart] Returning cart with ${cartItemsWithProducts.length} items`);
    return { ...cart, cart_items: cartItemsWithProducts };
  } catch (err) {
    logger.error('[getCartByUserId] Error:', err);
    throw err;
  }
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
        product_url,
        platform_id,
        platforms(id, name)
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
