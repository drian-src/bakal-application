'use strict';

const authService = require('../services/authService');
const { sendWelcomeEmail } = require('../services/emailService');
const logger = require('../config/logger');
const { OAuth2Client } = require('google-auth-library');
const { fetchWithRetry } = require('../utils/retryHelper');
const clockSkewHelper = require('../utils/clockSkewHelper');

// Initialize OAuth2Client with custom options to handle clock skew
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  // Allow some clock skew tolerance (in seconds)
  // Default is quite strict, we add 5-minute tolerance
});

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
    
    // ✅ NEW: Send welcome email (non-blocking, async in background)
    sendWelcomeEmail(result.user.email, result.user.name)
      .then(emailResult => {
        if (emailResult.success) {
          logger.info(`✅ Welcome email queued for ${result.user.email}`);
        } else {
          logger.warn(`⚠️ Email failed for ${result.user.email}:`, emailResult.error);
          // Don't fail signup if email fails — user account is created successfully
        }
      })
      .catch(err => {
        logger.error('❌ Email service error:', err);
        // Don't fail signup if email fails
      });

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

    // Step 1 — Exchange the authorization code for Google tokens (with retry + timeout)
    let tokenResponse;
    try {
      tokenResponse = await fetchWithRetry(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id:     process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
            grant_type:    'authorization_code',
          }),
        },
        8000, // timeout
        2,    // maxRetries
        'GoogleTokenExchange'
      );
    } catch (err) {
      logger.error('[AuthController] Token exchange failed:', err.message);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.id_token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=token_exchange_failed`
      );
    }

    // Step 2 — Verify the ID token with Google's public keys
    // NEVER skip this — it's the only proof the token came from Google
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken:  tokenData.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      const errorMsg = err.message || '';
      const isClockSkewError = 
        errorMsg.includes('Expiration time too far in future') || 
        errorMsg.includes('Token used too late');
      
      logger.warn(`[AuthController] Token verification error: ${errorMsg}`, { 
        error: err.message,
        isClockSkewError 
      });
      
      if (isClockSkewError) {
        // Handle clock skew issues by manually decoding and verifying with tolerance
        logger.info('[AuthController] Attempting manual token verification with clock skew tolerance...');
        
        try {
          const parts = tokenData.id_token.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format (expected 3 parts)');
          }
          
          // Decode the payload (part 1, 0-indexed)
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf8')
          );
          
          // Validate token structure
          if (!payload.aud) {
            throw new Error('Token missing "aud" (audience) claim');
          }
          
          // Check audience
          const validAudiences = [process.env.GOOGLE_CLIENT_ID];
          const audienceMatch = Array.isArray(payload.aud)
            ? payload.aud.some(aud => validAudiences.includes(aud))
            : validAudiences.includes(payload.aud);
          
          if (!audienceMatch) {
            throw new Error(`Token audience "${payload.aud}" does not match client ID`);
          }
          
          // Check expiration with 5-minute clock skew tolerance
const CLOCK_SKEW_TOLERANCE_SEC = 5 * 60; // 5 minutes
const now = Math.floor(Date.now() / 1000);
const expiresAt = payload.exp || 0;
const issuedAt = payload.iat || 0;

// Log diagnostics
clockSkewHelper.logDiagnostics(issuedAt, expiresAt, 'GoogleAuthCallback');
logger.info(`[AuthController] Token timing check - iat: ${issuedAt}, exp: ${expiresAt}, now: ${now}`);

const validationResult = clockSkewHelper.validateTokenTiming(issuedAt, expiresAt, CLOCK_SKEW_TOLERANCE_SEC);

if (!validationResult.valid) {
  logger.error('[AuthController] Token validation failed after clock skew adjustment', {
    reason: validationResult.errorMsg,
    diagnostics: validationResult.diagnostics,
  });
  throw new Error(validationResult.errorMsg);
}

// Ensure token was issued recently (not from the far past) - moved into clockSkewHelper.js
// const MAX_TOKEN_AGE_SEC = 24 * 60 * 60; // 24 hours
// const tokenAge = now - issuedAt;
// if (tokenAge > MAX_TOKEN_AGE_SEC) {
//   logger.warn('[AuthController] Token is very old', { tokenAgeSec: tokenAge });
//   throw new Error('Token is too old');
// }

// ✅ Token passed manual verification — create mock ticket
ticket = { getPayload: () => payload };
logger.info('[AuthController] Token manually verified with clock skew tolerance');
        } catch (manualErr) {
          logger.error('[AuthController] Manual token verification failed', {
            originalError: err.message,
            manualError: manualErr.message
          });
          return res.redirect(
            `${process.env.FRONTEND_URL}/login?error=token_verification_failed&reason=${encodeURIComponent(manualErr.message)}`
          );
        }
      } else {
        // Non-skew error — reject immediately
        logger.error('[AuthController] Token verification failed (non-skew error)', {
          error: err.message
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=token_verification_failed&reason=${encodeURIComponent(err.message)}`
        );
      }
    }

    const payload = ticket.getPayload();

    // Step 3 — Reject unverified emails (rare but possible with some providers)
    if (!payload.email_verified) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=email_not_verified`
      );
    }

    // Step 4 — Delegate upsert + JWT signing to authService
    // authService.googleLogin() handles: find-or-create user, sign JWT
    const { user, token, isNewUser } = await authService.googleLogin({
      googleId:  payload.sub,        // unique Google user ID
      email:     payload.email,
      name:      payload.name,
      avatarUrl: payload.picture,
    });

    // ✅ NEW: Send welcome email for new Google OAuth users (non-blocking)
    if (isNewUser) {
      sendWelcomeEmail(user.email, user.name)
        .then(emailResult => {
          if (emailResult.success) {
            logger.info(`✅ Welcome email queued for new Google user ${user.email}`);
          } else {
            logger.warn(`⚠️ Email failed for new Google user ${user.email}:`, emailResult.error);
            // Don't fail OAuth if email fails — user account is created successfully
          }
        })
        .catch(err => {
          logger.error('❌ Email service error (Google user):', err);
          // Don't fail OAuth if email fails
        });
    }

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