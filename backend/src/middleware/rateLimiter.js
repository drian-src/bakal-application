'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/dotenv');
const logger = require('../config/logger');

// ─────────────────────────────────────────────────────────────────────────────
// SKIP FUNCTION — bypasses all rate limits in development / for localhost
//
// In development (NODE_ENV !== 'production'), ALL rate limits are skipped.
// This prevents false "Too many requests" errors during local development,
// testing, and debugging. Rate limits only enforce in production.
//
// Additionally, requests from localhost IP addresses are always skipped
// even in production, allowing server-side health checks and admin tools.
// ─────────────────────────────────────────────────────────────────────────────
const skipInDevelopment = (req) => {
  // Skip entirely in development mode
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  // Skip for localhost IPs even in production (health checks, internal tools)
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL LIMITER — applied to ALL routes via app.use(globalLimiter) in app.js
//
// Purpose: Broad protection against bots and DDoS.
// Window:  15 minutes
// Max:     500 requests per IP per window
//
// Why 500?
//   A normal user session on Bakàl involves:
//     ~10 page loads × 3 API calls each = 30 calls for navigation
//     ~5 searches × 1 call each = 5 search calls
//     ~10 tracking calls (fire-and-forget) = 10 tracking calls
//     ~5 recommendation fetches = 5 calls
//     Total reasonable session: ~50–80 calls in 15 minutes
//   500 allows ~6 normal user sessions before triggering, while still
//   blocking bots that fire hundreds of requests per second.
//
// Note: config.rateLimit.max is used as a fallback if config exists,
//       but overridden to 500 minimum to prevent the current bug.
// ─────────────────────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.max(config.rateLimit?.max || 500, 500), // min 500
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  handler: (req, res, next, options) => {
    logger.warn(`[RateLimit] Global limit hit: ${req.ip} → ${req.method} ${req.path}`);
    res.status(429).json(options.message);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH LIMITER — applied to GET /api/search in searchRoutes.js
//
// Purpose: Protect against scraping abuse (each search triggers 3 Playwright
//          browser instances scraping PCExpress, VillMan, and PCWorx).
//          Scraping is CPU/memory intensive — too many concurrent searches
//          would crash the server.
//
// Window:  1 minute
// Max:     20 requests per IP per window (was 5 — too strict)
//
// Why 20?
//   A power user browsing multiple categories:
//     Search "laptop" → view results → search "gaming laptop" → filter by store
//     = 2–4 searches in quick succession. 20 allows normal browsing behavior
//     while still blocking bots that fire 100+ searches per minute.
//   Note: The backend also has a 15-minute scrape cache, so repeat searches
//         for the same query don't trigger new scrapes — they're free.
//
// keyGenerator: use userId if authenticated, fall back to IP address.
//   This prevents shared IPs (offices, universities, mobile carriers using
//   NAT) from one user's searches affecting another user's limit.
// ─────────────────────────────────────────────────────────────────────────────
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // was 5 — increased to fix the bug
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  keyGenerator: (req) => {
    // Use authenticated user ID if available, otherwise use IP
    // Prevents shared-IP false positives
    return req.user?.id || req.ip;
  },
  message: {
    success: false,
    message: 'Search rate limit exceeded. Please wait a moment before searching again.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`[RateLimit] Search limit hit: ${req.user?.id || req.ip}`);
    res.status(429).json(options.message);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH LIMITER — applied to POST /api/auth/register and /api/auth/login
//
// Purpose: Prevent brute-force password attacks and account enumeration.
//
// Window:  15 minutes
// Max:     20 attempts per IP per window (unchanged — this was correct)
//
// Why keep 20?
//   Google OAuth doesn't count here (it redirects to Google, not this endpoint).
//   The only remaining auth endpoints are /register and /login for legacy
//   email/password users. 20 attempts in 15 minutes is generous for a human,
//   tight for a brute-force bot.
// ─────────────────────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // unchanged — correct for auth
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  message: {
    success: false,
    message: 'Too many auth attempts. Please try again in 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`[RateLimit] Auth limit hit: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// TRACKING LIMITER — NEW: applied to POST /api/recommendations/track
//
// Purpose: The tracking endpoint is called fire-and-forget on every search
//          and every cart checkout click. It was previously only covered by
//          globalLimiter, which means rapid testing was burning through the
//          global budget. A dedicated lenient limiter prevents abuse while
//          not interfering with normal usage.
//
// Window:  1 minute
// Max:     60 per IP per window (1 per second average — very lenient)
//
// Why 60?
//   A user who searches 20 times in a minute generates 20 tracking calls.
//   60 allows 3× headroom above the searchLimiter max (20) to account for
//   both search tracking AND cart click tracking in the same minute.
// ─────────────────────────────────────────────────────────────────────────────
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // very lenient — fire-and-forget calls
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDevelopment,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'Too many tracking requests.',
  },
  // No handler logger — tracking failures are non-critical and too noisy
});

module.exports = { globalLimiter, searchLimiter, authLimiter, trackingLimiter };