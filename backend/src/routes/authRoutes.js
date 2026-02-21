'use strict';

const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Email/password auth
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  authController.googleCallback
);
router.get('/google/failure', (req, res) => {
  res.status(401).json({ success: false, message: 'Google authentication failed.' });
});

// Protected
router.get('/me', requireAuth, authController.getProfile);

module.exports = router;