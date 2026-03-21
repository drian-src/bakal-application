'use strict';

const express = require('express');
const categoryController = require('../controllers/categoryController');
const productRepo = require('../repositories/productRepository');
const logger = require('../config/logger');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all categories
router.get('/', optionalAuth, categoryController.getCategories);

/**
 * GET /api/categories/products?keyword=laptop&limit=8
 *
 * Returns products from the database matching a keyword.
 * No scraping — reads from the existing products table only.
 * Used by CategoriesGrid to show pre-loaded products instantly.
 *
 * No auth required — category browsing is public.
 */
router.get('/products', async (req, res, next) => {
  try {
    const keyword = req.query.keyword?.trim();
    const limit   = Math.min(parseInt(req.query.limit, 10) || 8, 20);

    if (!keyword || keyword.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'keyword query param is required (min 2 characters)',
      });
    }

    logger.debug(`[CategoryRoute] Fetching products for keyword: "${keyword}" (limit: ${limit})`);

    const products = await productRepo.findByKeyword(keyword, limit);

    logger.info(`[CategoryRoute] Found ${products.length} products for "${keyword}"`);

    return res.status(200).json({
      success:  true,
      data: {
        keyword,
        count:    products.length,
        products: products.map(p => ({
          id:          p.id,
          title:       p.title,
          price:       p.price,
          imageUrl:    p.image_url,
          productUrl:  p.product_url,
          platform:    p.platforms?.name || null,
          platformId:  p.platform_id,
          rating:      p.rating,
          updatedAt:   p.updated_at,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET products in a category with pagination
router.get('/:categoryId/products', optionalAuth, categoryController.getProductsByCategory);

module.exports = router;
