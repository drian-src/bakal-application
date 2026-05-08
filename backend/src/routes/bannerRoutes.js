const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { optionalAuth } = require('../middleware/authMiddleware');

/**
 * GET /api/banners/featured-deals
 * Returns 1 top deal per platform (PCExpress, VillMan, PCWorx) for homepage carousel
 * Cache: 1 hour
 */
router.get(
  '/featured-deals',
  optionalAuth,
  bannerController.getFeaturedDeals
);

module.exports = router;
