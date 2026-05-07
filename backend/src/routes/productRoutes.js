'use strict';

const express = require('express');
const { supabase } = require('../config/db');
const logger = require('../config/logger');
const productController = require('../controllers/productController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all products with pagination
router.get('/', optionalAuth, productController.getAllProducts);

// GET recent products
router.get('/recent', optionalAuth, productController.getRecentProducts);

// GET top-rated products
router.get('/top-rated', optionalAuth, productController.getTopRatedProducts);

// GET featured on-sale products for carousel (cached 24h)
router.get('/featured', optionalAuth, productController.getFeaturedProducts);

/**
 * GET /api/products/:id
 *
 * Fetch a single product from Bakàl's DB by its UUID.
 * This is NOT a scrape — it reads from the products table directly.
 *
 * The product's `product_url` field contains the external store link.
 * The frontend "View on Store" button opens product_url in a new tab.
 *
 * Note: The old route was /api/products/:platform/:id which was wrong —
 * platform filtering is not needed because product UUIDs are globally unique.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Basic UUID format validation — prevents malformed queries hitting DB
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.',
      });
    }

    // Join with platforms to get the platform name (e.g. "PCExpress")
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        price,
        original_price,
        discount_percent,
        is_on_sale,
        promo_label,
        rating,
        reviews_count,
        seller_name,
        product_url,
        image_url,
        specs,
        is_available,
        stock,
        brand,
        sku,
        variation,
        free_items,
        last_scraped,
        view_count,
        platforms ( id, name )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      logger.warn(`[ProductRoutes] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Derive the lowercase platform key from the joined platform name
    const platformName = data.platforms?.name || '';
    const PLATFORM_NAME_TO_KEY = {
      'PCExpress': 'pcexpress',
      'VillMan':   'villman',
      'PCWorx':    'pcworx',
    };
    const platformKey = PLATFORM_NAME_TO_KEY[platformName] || platformName.toLowerCase();

    // Shape the response to match what ProductDetailPage.jsx expects
    // ✅ CRITICAL: Always include brand, sku, variation even if null
    // Frontend rendering depends on these fields being present (not undefined)
    const product = {
      ...data,
      platform:    platformKey,          // lowercase key for storeConfig lookup
      seller_name: data.seller_name || platformName,
      platforms:   undefined,            // strip the join object from response
      // ✅ Ensure all detail fields are present (never undefined for frontend)
      brand:       data.brand || null,
      sku:         data.sku || null,
      variation:   data.variation || null,
    };

    return res.status(200).json({
      success: true,
      data: product,
    });

  } catch (err) {
    logger.error('[ProductRoutes] getProductById error: ' + (err?.message || String(err)));
    next(err);
  }
});

/**
 * Legacy route: GET /api/products/:platform/:id
 * Redirects to the new /api/products/:id route.
 * Keeps backward compatibility without returning 404.
 */
router.get('/:platform/:productId', async (req, res) => {
  const { productId } = req.params;
  // Redirect to the platform-agnostic route
  return res.redirect(301, `/api/products/${productId}`);
});

module.exports = router;
