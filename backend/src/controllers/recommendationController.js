'use strict';

const { trackInteraction, getRecommendations } = require('../services/recommendationService');
const logger = require('../config/logger');

/**
 * Valid event types for user interactions
 */
const VALID_EVENT_TYPES = ['search', 'click', 'view', 'cart_add'];

/**
 * ============================================================
 * FUNCTION 1: track()
 * ============================================================
 *
 * POST /api/recommendations/track
 *
 * Validate the interaction event and record it in the database.
 * Never throws — delegates error handling to global error handler.
 *
 * @param {Object} req - Express request with user from requireAuth middleware
 * @param {Object} res - Express response
 * @param {Function} next - Express next error handler
 */
async function track(req, res, next) {
  try {
    // ── Check 1: userId must exist ────────────────────────────────────────────
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // ── Check 2: eventType must be present and valid ──────────────────────────
    const { eventType, productId, query, metadata } = req.body;

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: `eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      });
    }

    // ── Check 3: search events require query ───────────────────────────────────
    if (eventType === 'search' && !query) {
      return res.status(400).json({
        success: false,
        message: 'query is required for search events.',
      });
    }

    // ── Check 4: click and view events require productId ──────────────────────
    if (['click', 'view'].includes(eventType) && !productId) {
      return res.status(400).json({
        success: false,
        message: 'productId is required for click/view events.',
      });
    }

    // ── Call service to track interaction ──────────────────────────────────────
    // trackInteraction() never throws — it swallows errors internally
    await trackInteraction(userId, eventType, { productId, query, metadata });

    // ── Return success ────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: 'Interaction tracked.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ============================================================
 * FUNCTION 2: recommendations()
 * ============================================================
 *
 * GET /api/recommendations
 *
 * Return personalized product recommendations for the logged-in user.
 * Determines which recommendation strategy was used (trending, hybrid, etc).
 *
 * @param {Object} req - Express request with user from requireAuth middleware
 * @param {Object} res - Express response
 * @param {Function} next - Express next error handler
 */
async function recommendations(req, res, next) {
  try {
    // ── Step 1: Get userId ────────────────────────────────────────────────────
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // ── Step 2: Parse limit ───────────────────────────────────────────────────
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);

    // ── Step 3: Get recommendations ───────────────────────────────────────────
    // getRecommendations() never throws — it returns [] on error
    const results = await getRecommendations(userId, limit);

    // ── Step 4: Determine which strategy was used ─────────────────────────────
    const strategy =
      results.length === 0
        ? 'none'
        : results[0].reasonType === 'trending'
          ? 'trending'
          : results.some(r => r.reasonType === 'users_also_viewed')
            ? 'hybrid'
            : 'content_only';

    logger.info(`[RecController] Returning ${results.length} recommendations for user ${userId} (strategy: ${strategy})`);

    // ── Step 5: Return response ───────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        recommendations: results,
        count: results.length,
        strategy,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ============================================================
 * MODULE EXPORTS
 * ============================================================
 */

module.exports = { track, recommendations };