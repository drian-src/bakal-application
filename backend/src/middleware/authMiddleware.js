'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/dotenv');
const userRepo = require('../repositories/userRepository');

/**
 * Strict JWT auth — rejects if no/invalid token.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await userRepo.findById(decoded.sub);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

/**
 * Optional auth — attaches user if token present, continues without.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await userRepo.findById(decoded.sub);
      if (user) req.user = user;
    }
  } catch {
    // Silently ignore invalid tokens for optional routes
  }
  next();
}

module.exports = { requireAuth, optionalAuth };