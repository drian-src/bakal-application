'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Email/password auth
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Google OAuth
// GET /api/auth/google — initiates Google OAuth flow
// No auth middleware — user is not logged in
router.get('/google', authController.googleAuthRedirect);

// GET /api/auth/google/callback — Google redirects here after consent
// No auth middleware — user is not logged in yet
router.get('/google/callback', authController.googleAuthCallback);

// Protected
router.get('/me', requireAuth, authController.getProfile);

module.exports = router;