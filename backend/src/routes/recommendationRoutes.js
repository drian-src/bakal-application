'use strict';

const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Generate recommendations for a search
router.post('/:searchId', optionalAuth, recommendationController.recommend);
// Retrieve existing recommendations
router.get('/:searchId', optionalAuth, recommendationController.getRecommendations);

module.exports = router;