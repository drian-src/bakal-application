'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { exportJson, exportCsv, deleteAccount } = require('../controllers/exportController');

// Rate limit export endpoints (prevent abuse)
let exportLimiter;
try {
  const rateLimit = require('express-rate-limit');
  exportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                    // max 5 exports per 15 min
    message: { success: false, message: 'Too many export requests. Please wait.' },
  });
} catch (err) {
  // Fallback if express-rate-limit not installed
  exportLimiter = (req, res, next) => next();
}

/**
 * GET /api/user/export/json — Export user data as JSON
 * GET /api/user/export/csv  — Export user data as CSV
 * DELETE /api/user/export/account  — Delete user account permanently
 */
router.get('/export/json',      requireAuth, exportLimiter, exportJson);
router.get('/export/csv',       requireAuth, exportLimiter, exportCsv);
router.delete('/export/account', requireAuth, deleteAccount);

module.exports = router;
