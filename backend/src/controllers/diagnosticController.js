'use strict';

const productRepo = require('../repositories/productRepository');
const logger = require('../config/logger');

/**
 * Diagnostic endpoint to verify data availability
 * GET /api/diagnostic/banner-data
 */
async function getBannerDiagnostics(req, res, next) {
  try {
    console.log('[diagnostic] Checking banner data availability...');

    // Get data using product repository which has proper supabase client
    const products = await productRepo.findFeaturedOnSale();

    console.log('[diagnostic] Featured products:', {
      count: products?.length || 0,
      samples: products?.slice(0, 2),
    });

    // Return comprehensive diagnostic report
    res.json({
      success: true,
      diagnostic: {
        bannerData: {
          count: products?.length || 0,
          products: products?.map(p => ({
            id: p.id,
            title: p.title,
            is_on_sale: p.is_on_sale,
            is_available: p.is_available,
            discount_percent: p.discount_percent,
            price: p.price,
            original_price: p.original_price,
            image_url: p.image_url,
            platform: p.platform || p.platforms?.name,
            rating: p.rating,
            reviews_count: p.reviews_count,
          })) || [],
          hasIds: products?.every(p => !!p.id) || false,
          sample: products?.[0] ? {
            hasId: !!products[0].id,
            id: products[0].id,
            title: products[0].title,
          } : null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[diagnostic] Error:', error);
    logger.error('[diagnostic] getBannerDiagnostics error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

module.exports = {
  getBannerDiagnostics,
};
