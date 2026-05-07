'use strict';

const express = require('express');
const searchController = require('../controllers/searchController');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');
const { searchLimiter } = require('../middleware/rateLimiter');
const { supabase } = require('../config/db');
const productRepo = require('../repositories/productRepository');
const logger = require('../config/logger');

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

// 🆕 GET /api/search/monitoring/health — Database health and cache stats
router.get('/monitoring/health', async (req, res, next) => {
  try {
    // Check DB connectivity
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Check for stale products (>6 hours old)
    const staleProducts = await productRepo.getStaleProducts(6, 1);
    const dataFreshness = staleProducts.length > 0 ? 'has_stale_data' : 'fresh';
    
    return res.json({
      status: 'ok',
      database: {
        connected: true,
        totalProducts: count,
        dataFreshness: dataFreshness,
        staleProductsFound: staleProducts.length > 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[SearchRoutes] Monitoring health check failed:', error.message);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;