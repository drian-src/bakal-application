'use strict';

const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ success: false, message: 'email, name, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    const result = await authService.register({ email, name, password });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required.' });
    }
    const result = await authService.login({ email, password });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function googleCallback(req, res, next) {
  try {
    // passport attaches profile to req.user via strategy
    const { user, token } = await authService.googleCallback(req.user);
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, googleCallback, getProfile };