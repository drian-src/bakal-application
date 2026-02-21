'use strict';

const app = require('./app');
const config = require('./config/dotenv');
const logger = require('./config/logger');
const { testConnection } = require('./config/db');
const { loadPlatformIds } = require('./services/searchService');

async function bootstrap() {
  await testConnection();
  await loadPlatformIds();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 Bakàl backend running on port ${config.port} [${config.nodeEnv}]`);
  });

  const shutdown = async (signal) => {
    logger.info(`[Server] ${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('[Server] HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('[Server] Unhandled rejection:', reason);
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