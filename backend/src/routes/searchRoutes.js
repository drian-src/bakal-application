'use strict';

const express = require('express');
const searchController = require('../controllers/searchController');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');
const { searchLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// GET available stores (no auth required)
router.get('/stores', searchController.getStores);

// GET search history (requires auth)
router.get('/history', requireAuth, searchController.getSearchHistory);

// DELETE search history (requires auth)
router.delete('/history', requireAuth, searchController.deleteSearchHistory);

// POST /api/search?q=...  — search is expensive so use POST-style with query param
router.get('/', searchLimiter, optionalAuth, searchController.search);
router.get('/:searchId/results', optionalAuth, searchController.getSearchResults);

module.exports = router;