const express = require('express');
const retailerSessionController = require('../controllers/retailerSessionController');

const router = express.Router();

/**
 * Retailer Session Routes
 * All routes require JWT authentication (enforced at app.js level)
 */

/**
 * POST /api/retailer-sessions
 * Create a new retailer session
 */
router.post('/', retailerSessionController.createSession);

/**
 * GET /api/retailer-sessions
 * Get all sessions for current user
 */
router.get('/', retailerSessionController.getUserSessions);

/**
 * GET /api/retailer-sessions/:platformId
 * Get session for specific platform
 */
router.get('/:platformId', retailerSessionController.getSessionByPlatform);

/**
 * GET /api/retailer-sessions/:platformId/status
 * Check if session is active
 */
router.get('/:platformId/status', retailerSessionController.checkSessionStatus);

/**
 * PATCH /api/retailer-sessions/:sessionId
 * Update session (mark as accessed)
 */
router.patch('/:sessionId', retailerSessionController.updateSession);

/**
 * DELETE /api/retailer-sessions/:sessionId
 * Delete a specific session (logout from one retailer)
 */
router.delete('/:sessionId', retailerSessionController.deleteSession);

/**
 * DELETE /api/retailer-sessions
 * Delete all sessions for user (logout from all retailers)
 */
router.delete('/', retailerSessionController.deleteAllUserSessions);

module.exports = router;
