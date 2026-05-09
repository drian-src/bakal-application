'use strict';

const productRepo = require('../repositories/productRepository');
const logger = require('../config/logger');

/**
 * GET /api/banners/featured-deals
 * Returns 1 top deal per platform for homepage banner carousel
 * DEBUG VERSION: Logs full response for troubleshooting
 */
async function getFeaturedDeals(req, res, next) {
  try {
    console.log('[bannerController] getFeaturedDeals() called');
    
    // Fetch best deals (already filters to 1 per platform)
    const deals = await productRepo.findFeaturedOnSale();
    
    console.log('[bannerController] Raw deals from repo:', JSON.stringify(deals, null, 2));

    if (!deals || deals.length === 0) {
      console.warn('[bannerController] No deals found, returning empty array');
      return res.json({
        success: true,
        data: [],
        message: 'No featured deals available',
      });
    }

    // Transform for banner display
    const banners = deals.map((deal, idx) => {
      console.log(`[bannerController] Transforming deal ${idx}:`, {
        hasId: !!deal.id,
        id: deal.id,
        title: deal.title,
        platform: deal.platform || deal.platforms?.name,
      });

      const banner = {
        id: deal.id,
        productTitle: deal.title,
        productImage: deal.image_url,
        // Only include originalPrice if it's valid (greater than current price)
        originalPrice: (deal.original_price && deal.original_price > deal.price) ? deal.original_price : null,
        currentPrice: deal.price,
        // Only include discount if original_price is valid
        discountPercent: (deal.original_price && deal.original_price > deal.price && deal.discount_percent > 0) ? Math.round(deal.discount_percent) : 0,
        promoLabel: deal.promo_label || null,
        platformId: deal.platform_id,
        platformName: deal.platform || deal.platforms?.name || 'Unknown',
        productUrl: deal.product_url,
        productDetailUrl: deal.id 
          ? `/product/${(deal.platform || deal.platforms?.name || 'unknown').toLowerCase().replace(/\s+/g, '-')}/${deal.id}`
          : null,
        rating: deal.rating || 0,
        reviewsCount: deal.reviews_count || 0,
        isOnSale: deal.is_on_sale,
      };
      
      console.log(`[bannerController] Transformed banner ${idx}:`, banner);
      return banner;
    });

    console.log('[bannerController] Final banners array:', JSON.stringify(banners, null, 2));

    // Add Cache-Control header (1 hour)
    res.set('Cache-Control', 'public, max-age=3600');

    logger.debug(`[bannerController] getFeaturedDeals returning ${banners.length} banners`);

    const response = {
      success: true,
      data: banners,
      count: banners.length,
      debug: {
        timestamp: new Date().toISOString(),
        endpoint: '/api/banners/featured-deals',
        hasIds: banners.every(b => b.id),
      }
    };
    
    console.log('[bannerController] Final response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('[bannerController] getFeaturedDeals error:', error);
    logger.error('[bannerController] getFeaturedDeals error:', error);
    next(error);
  }
}

module.exports = {
  getFeaturedDeals,
};
