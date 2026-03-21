'use strict';

const express = require('express');
const categoryController = require('../controllers/categoryController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all categories
router.get('/', optionalAuth, categoryController.getCategories);

// GET products in a category with pagination
router.get('/:categoryId/products', optionalAuth, categoryController.getProductsByCategory);

module.exports = router;
