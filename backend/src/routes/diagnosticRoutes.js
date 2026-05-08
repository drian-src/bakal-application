const express = require('express');
const router = express.Router();
const diagnosticController = require('../controllers/diagnosticController');

/**
 * GET /api/diagnostic/banner-data
 * Returns diagnostic information about banner data availability
 * No authentication required
 */
router.get('/banner-data', diagnosticController.getBannerDiagnostics);

module.exports = router;
