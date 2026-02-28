'use strict';

const express = require('express');
const cartController = require('../controllers/cartController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// All cart routes require authentication
// Note: requireAuth will be applied at the app.js level, but we can also apply it here for clarity

/**
 * GET /api/cart
 * Get the authenticated user's cart
 */
router.get('/', cartController.getCart);

/**
 * POST /api/cart
 * Add an item to cart
 * Body: { productId, quantity }
 */
router.post('/', cartController.addToCart);

/**
 * PUT /api/cart/:itemId
 * Update a cart item's quantity
 * Body: { quantity }
 */
router.put('/:itemId', cartController.updateCartItem);

/**
 * DELETE /api/cart/:itemId
 * Remove a specific item from cart
 */
router.delete('/:itemId', cartController.removeFromCart);

/**
 * DELETE /api/cart
 * Clear the entire cart
 */
router.delete('/', cartController.clearCart);

module.exports = router;
