'use strict';

const express = require('express');
const { supabase } = require('../config/db');
const logger = require('../config/logger');

const router = express.Router();

/**
 * GET /api/user/preferences
 * Load user's theme preference and other settings
 */
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('users')
      .select('id, email, theme_preference, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      preferences: {
        theme_preference: data.theme_preference || 'system',
        created_at: data.created_at,
      },
    });
  } catch (error) {
    logger.error('[UserRoutes] GET /preferences error:', error.message);
    return res.status(500).json({ error: 'Failed to load preferences' });
  }
});

/**
 * PATCH /api/user/preferences
 * Update user's theme preference and other settings
 */
router.patch('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const { theme_preference } = req.body;

    // Validate theme value
    if (theme_preference && !['light', 'dark', 'system'].includes(theme_preference)) {
      return res.status(400).json({ error: 'Invalid theme value. Must be: light, dark, or system' });
    }

    // Update user's theme preference
    const { data, error } = await supabase
      .from('users')
      .update({
        theme_preference: theme_preference || 'system',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, email, theme_preference')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    logger.info(`[UserRoutes] Theme updated for user ${userId}: ${theme_preference}`);

    return res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: {
        theme_preference: data.theme_preference,
      },
    });
  } catch (error) {
    logger.error('[UserRoutes] PATCH /preferences error:', error.message);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * DELETE /api/user/account
 * Permanently delete user account and all associated data (GDPR-compliant)
 * Cascading delete via database foreign keys
 */
router.delete('/account', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      logger.error('[UserRoutes] DELETE /account: req.user not authenticated', {
        hasUser: !!req.user,
        userId: req.user?.id
      });
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    logger.warn(`[UserRoutes] Account deletion initiated for user: ${userId}`);

    // Delete from all related tables (order matters due to FKs)
    
    // 1. Delete search history
    const { error: searchError } = await supabase
      .from('searches')
      .delete()
      .eq('user_id', userId);
    if (searchError) logger.warn(`[Delete searches]: ${searchError.message}`);

    // 2. Delete user interactions
    const { error: interactError } = await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', userId);
    if (interactError) logger.warn(`[Delete interactions]: ${interactError.message}`);

    // 3. Delete user recommendations
    const { error: recError } = await supabase
      .from('user_recommendations')
      .delete()
      .eq('user_id', userId);
    if (recError) logger.warn(`[Delete recommendations]: ${recError.message}`);

    // 4. Delete cart items and carts
    const { data: carts, error: cartsError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId);

    if (cartsError) logger.warn(`[Get carts]: ${cartsError.message}`);

    if (carts && carts.length > 0) {
      const cartIds = carts.map(c => c.id);
      
      const { error: cartItemsError } = await supabase
        .from('cart_items')
        .delete()
        .in('cart_id', cartIds);
      if (cartItemsError) logger.warn(`[Delete cart items]: ${cartItemsError.message}`);

      const { error: cartsDeleteError } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', userId);
      if (cartsDeleteError) logger.warn(`[Delete carts]: ${cartsDeleteError.message}`);
    }

    // 5. Delete the user account
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      logger.error(`[UserRoutes] Failed to delete user account: ${deleteError.message}`);
      return res.status(500).json({ error: deleteError.message });
    }

    logger.info(`[GDPR] User account permanently deleted: ${userId} at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    });
  } catch (error) {
    logger.error('[UserRoutes] Account deletion failed:', error.message);
    return res.status(500).json({
      error: 'Failed to delete account. Please try again or contact support.',
    });
  }
});

module.exports = router;
