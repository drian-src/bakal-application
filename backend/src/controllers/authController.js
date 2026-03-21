'use strict';

const authService = require('../services/authService');
const logger = require('../config/logger');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    // Database already excludes password_hash via select(), so result.user is safe to send
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

/**
 * GET /api/auth/google
 * Step 1 of OAuth flow — build the Google consent URL and redirect the user.
 * No auth middleware on this route — user is not logged in.
 */
async function googleAuthRedirect(req, res) {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',  // always show the account picker
  });

  return res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}

/**
 * GET /api/auth/google/callback
 * Step 2 of OAuth flow — Google redirects here with an authorization code.
 * Exchange code → verify ID token → upsert user → sign JWT → redirect to frontend.
 * No auth middleware on this route — user is not logged in yet.
 */
async function googleAuthCallback(req, res, next) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=missing_code`
      );
    }

    // Step 1 — Exchange the authorization code for Google tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.id_token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=token_exchange_failed`
      );
    }

    // Step 2 — Verify the ID token with Google's public keys
    // NEVER skip this — it's the only proof the token came from Google
    const ticket = await googleClient.verifyIdToken({
      idToken:  tokenData.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Step 3 — Reject unverified emails (rare but possible with some providers)
    if (!payload.email_verified) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=email_not_verified`
      );
    }

    // Step 4 — Delegate upsert + JWT signing to authService
    // authService.googleLogin() handles: find-or-create user, sign JWT
    const { user, token } = await authService.googleLogin({
      googleId:  payload.sub,        // unique Google user ID
      email:     payload.email,
      name:      payload.name,
      avatarUrl: payload.picture,
    });

    // Step 5 — Redirect to frontend callback page with token + user data
    // Frontend /auth/callback reads these params and stores them in localStorage
    const userParam = encodeURIComponent(JSON.stringify({
      id:           user.id,
      email:        user.email,
      name:         user.name,
      avatarUrl:    user.avatar_url,
      authProvider: user.auth_provider,
    }));

    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userParam}`
    );

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

// googleCallback removed — replaced by googleAuthRedirect + googleAuthCallback
module.exports = { register, login, googleAuthRedirect, googleAuthCallback, getProfile };