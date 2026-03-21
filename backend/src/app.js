'use strict';

require('./config/dotenv'); // Boot validation

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const config = require('./config/dotenv');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/authMiddleware');
const { globalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const searchRoutes = require('./routes/searchRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

// Support multiple allowed origins (dev + prod)
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',  // Vite default — always allow in dev
  'http://localhost:5174',  // Vite alternative port (when 5173 is in use)
  'http://localhost:4173',  // Vite preview
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow any localhost in development
    if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
      logger.debug(`[CORS] Allowing development localhost origin: ${origin}`);
      return callback(null, true);
    }
    logger.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.set('trust proxy', 1);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Passport (Google OAuth — stateless) ───────────────────────────────────────
if (config.google.clientId) {
  passport.use(new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  ));
}
app.use(passport.initialize());

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`→ ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', requireAuth, cartRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;