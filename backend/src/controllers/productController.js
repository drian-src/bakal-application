'use strict';

const productRepo = require('../repositories/productRepository');
const logger = require('../config/logger');

async function getAllProducts(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    
    if (page < 1) {
      return res.status(400).json({ success: false, message: 'Page must be >= 1' });
    }

    const products = await productRepo.findAll(page, limit);
    return res.status(200).json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

async function getProductDetail(req, res, next) {
  try {
    const { platform: platformId, productId } = req.params;
    
    if (!platformId || !productId) {
      return res.status(400).json({ success: false, message: 'Platform ID and product ID are required' });
    }

    const product = await productRepo.findById(productId);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Verify product belongs to requested platform (compare UUIDs)
    if (product.platform_id !== platformId) {
      logger.warn(`[ProductController] Platform mismatch: product.platform_id=${product.platform_id} vs requested=${platformId}`);
      return res.status(404).json({ success: false, message: 'Product not found on this platform' });
    }

    // Shape product with camelCase aliases and ensure all fields are present (same as searchService)
    const shapedProduct = {
      ...product,
      
      // Core identification
      platform: product.platforms?.name || product.platform || 'unknown',
      
      // Expose camelCase aliases for backward compatibility
      originalPrice: product.original_price,
      discountPercent: product.discount_percent,
      isOnSale: product.is_on_sale,
      promoLabel: product.promo_label,
      freeItems: product.free_items,
      storeName: product.seller_name,
      imageUrl: product.image_url,
      productUrl: product.product_url,
      platformId: product.platform_id,
      reviewsCount: product.reviews_count,
      lastScraped: product.last_scraped,
      
      // Ensure specs, brand, sku, variation are always present (never undefined)
      specs: product.specs || {},
      brand: product.brand || null,
      sku: product.sku || null,
      variation: product.variation || null,
      free_items: product.free_items || null,
      is_available: product.is_available !== false,
      stock: product.stock || null,
      last_scraped: product.last_scraped || null,
      view_count: product.view_count || 0,
    };

    logger.debug(`[ProductController] Returning shaped product detail for ${shapedProduct.title}`);
    return res.status(200).json({ success: true, data: shapedProduct });
  } catch (err) {
    next(err);
  }
}

async function getRecentProducts(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    
    const products = await productRepo.findRecent(limit);
    return res.status(200).json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

async function getTopRatedProducts(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    
    const products = await productRepo.findTopRated(limit);
    return res.status(200).json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllProducts,
  getProductDetail,
  getRecentProducts,
  getTopRatedProducts,
};
