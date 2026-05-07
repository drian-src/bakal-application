'use strict';

const cartRepo = require('../repositories/cartRepository');
const logger = require('../config/logger');

/**
 * GET /api/cart
 * Retrieve the authenticated user's cart with populated product details
 */
async function getCart(req, res, next) {
  try {
    const userId = req.user.id;
    logger.info(`[CartController] Getting cart for user: ${userId}`);
    
    const cart = await cartRepo.getCartByUserId(userId);
    logger.info(`[CartController] Cart retrieved: ${cart ? cart.id : 'null'}`);
    
    // If no cart exists, return empty cart response
    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          id: null,
          items: [],
          count: 0,
          totalPrice: 0,
        },
      });
    }

    // Calculate total price and map items
    const items = cart.cart_items || [];
    logger.info(`[CartController] Processing ${items.length} cart items`);
    
    const mappedItems = items.map(item => {
      logger.debug(`[CartController] Processing item ${item.id}, products array length: ${item.products ? item.products.length : 0}`);
      
      const product = item.products && item.products[0] ? item.products[0] : null;
      const platformData = product && product.platforms && product.platforms[0] 
        ? product.platforms[0] 
        : null;
      
      if (product) {
        logger.debug(`[CartController] Item ${item.id} has product: ${product.title}`);
      } else {
        logger.warn(`[CartController] Item ${item.id} has NO product data`);
      }
      
      return {
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        addedAt: item.added_at,
        product: product ? {
          id: product.id,
          title: product.title,
          price: product.price,
          imageUrl: product.image_url,
          productUrl: product.product_url,
          platformId: product.platform_id,
          platform: platformData ? platformData.name : null,
        } : null,
      };
    });

    const totalPrice = mappedItems.reduce((sum, item) => {
      const itemPrice = item.product && item.product.price 
        ? item.product.price * item.quantity 
        : 0;
      return sum + itemPrice;
    }, 0);

    logger.info(`[CartController] Returning ${mappedItems.length} items with total price: ${totalPrice}`);

    return res.status(200).json({
      success: true,
      data: {
        id: cart.id,
        items: mappedItems,
        count: mappedItems.length,
        totalPrice,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cart
 * Add an item to cart (or increment quantity if already exists)
 * Body: { productId, quantity }
 */
async function addToCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number',
      });
    }

    const cartItem = await cartRepo.addOrUpdateCartItem(userId, productId, quantity);
    const fullCart = await cartRepo.getCartByUserId(userId);

    return res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        item: cartItem,
        cart: fullCart,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/cart/:itemId
 * Update the quantity of a cart item
 * Body: { quantity }
 */
async function updateCartItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    // Validation
    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and quantity are required',
      });
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number',
      });
    }

    // Verify item belongs to user (by checking if it's in their cart)
    const item = await cartRepo.getCartItem(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    const updatedItem = await cartRepo.updateCartItemQuantity(itemId, quantity);
    const cart = await cartRepo.getCartByUserId(userId);

    return res.status(200).json({
      success: true,
      message: 'Cart item quantity updated',
      data: {
        item: updatedItem,
        cart,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cart/:itemId
 * Remove a single item from the cart
 */
async function removeFromCart(req, res, next) {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required',
      });
    }

    // Verify item exists
    const item = await cartRepo.getCartItem(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    await cartRepo.removeCartItem(itemId);
    const cart = await cartRepo.getCartByUserId(userId);

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: { cart },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cart
 * Clear the entire cart for the authenticated user
 */
async function clearCart(req, res, next) {
  try {
    const userId = req.user.id;

    await cartRepo.clearCart(userId);

    return res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: {
        id: null,
        items: [],
        count: 0,
        totalPrice: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
