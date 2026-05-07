'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[CONFIG] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },

  scraping: {
    delayMin: parseInt(process.env.SCRAPE_DELAY_MIN_MS, 10) || 1500,
    delayMax: parseInt(process.env.SCRAPE_DELAY_MAX_MS, 10) || 4000,
    maxRetries: parseInt(process.env.SCRAPE_MAX_RETRIES, 10) || 3,
    timeout: parseInt(process.env.SCRAPE_TIMEOUT_MS, 10) || 45000,
    headless: process.env.SCRAPE_HEADLESS !== 'false',
    proxyList: process.env.PROXY_LIST
      ? process.env.PROXY_LIST.split(',').map((p) => p.trim()).filter(Boolean)
      : [],
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 500,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
};