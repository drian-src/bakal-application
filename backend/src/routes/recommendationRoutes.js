'use strict';

const express = require('express');
const recommendationController = require('../controllers/recommendationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Track user interaction (search, click, view, cart_add)
router.post('/track', requireAuth, recommendationController.track);

// Get personalized recommendations for logged-in user
router.get('/', requireAuth, recommendationController.recommendations);

module.exports = router;