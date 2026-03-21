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
    const { platform, productId } = req.params;
    
    if (!platform || !productId) {
      return res.status(400).json({ success: false, message: 'Platform and product ID are required' });
    }

    const product = await productRepo.findById(productId);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Verify product belongs to requested platform
    if (product.platforms?.name?.toLowerCase() !== platform.toLowerCase()) {
      return res.status(404).json({ success: false, message: 'Product not found on this platform' });
    }

    return res.status(200).json({ success: true, data: product });
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
