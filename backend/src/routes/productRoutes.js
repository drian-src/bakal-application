'use strict';

const express = require('express');
const productController = require('../controllers/productController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all products with pagination
router.get('/', optionalAuth, productController.getAllProducts);

// GET recent products
router.get('/recent', optionalAuth, productController.getRecentProducts);

// GET top-rated products
router.get('/top-rated', optionalAuth, productController.getTopRatedProducts);

// GET product detail by platform and product ID (must come last to avoid conflicts with above routes)
router.get('/:platform/:productId', optionalAuth, productController.getProductDetail);

module.exports = router;
