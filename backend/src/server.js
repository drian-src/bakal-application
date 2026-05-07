'use strict';

const app = require('./app');
const config = require('./config/dotenv');
const logger = require('./config/logger');
const { testConnection } = require('./config/db');
const { loadPlatformIds } = require('./services/searchService');
const { warmupModel } = require('./services/embeddingService');
const { closeSharedBrowser } = require('./scrapers/baseScraper');
const BackgroundWorker = require('./jobs/backgroundWorker');
const freshnessEngine = require('./services/freshnessEngine');

async function bootstrap() {
  await testConnection();
  
  // Load platform IDs with graceful failure — app can work without them
  try {
    await loadPlatformIds();
  } catch (err) {
    logger.error('[Bootstrap] Failed to load platform IDs:', err.message);
    logger.warn('[Bootstrap] Continuing startup without platform IDs — search will degrade gracefully');
  }

  // Pre-load the embedding model so first search isn't slow
  // This runs in background — server starts immediately without waiting
  warmupModel().catch(err =>
    logger.warn('[Bootstrap] Embedding model pre-warm failed (non-critical): ' + err.message)
  );

  // Pre-load TTL settings for freshness engine
  freshnessEngine.loadTTLSettings().catch(err =>
    logger.warn('[Bootstrap] TTL settings pre-load failed (non-critical): ' + err.message)
  );

  const server = app.listen(config.port, async () => {
    logger.info(`🚀 Bakàl backend running on port ${config.port} [${config.nodeEnv}]`);

    // Start the background worker (after server is listening)
    try {
      const worker = new BackgroundWorker({
        pollInterval: 5000,     // Check for jobs every 5 seconds
        batchSize: 10,          // Process up to 10 jobs per poll
        maxRetries: 3,
      });

      // Start worker in background (don't await — let it run continuously)
      worker.start().catch(err => {
        logger.error('[BackgroundWorker] Critical startup error: ' + (err?.message || String(err)));
        logger.error('[BackgroundWorker] Stack: ' + (err?.stack || 'no stack'));
      });

      // Store worker reference for graceful shutdown
      server.backgroundWorker = worker;
    } catch (err) {
      logger.error('[Bootstrap] Failed to start BackgroundWorker:', err.message);
    }
  });

  const shutdown = async (signal) => {
    logger.info(`[Server] ${signal} received. Shutting down gracefully...`);
    
    // Stop background worker
    if (server.backgroundWorker) {
      server.backgroundWorker.stop();
      logger.info('[Server] Background worker stopped.');
    }
    
    // OPT 6: Close browser pool before exiting (prevents orphaned Chrome processes)
    await closeSharedBrowser();
    
    server.close(() => {
      logger.info('[Server] HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    const msg = reason instanceof Error
      ? reason.message + '\n' + reason.stack
      : JSON.stringify(reason);
    logger.error('[Server] Unhandled rejection: ' + msg);
  });

  process.on('uncaughtException', (err) => {
    logger.error('[Server] Uncaught exception:', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});