'use strict';

const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    logger.error(`[ErrorHandler] ${statusCode} ${req.method} ${req.path} - ${message}`, err.stack);
  } else {
    logger.warn(`[ErrorHandler] ${statusCode} ${req.method} ${req.path} - ${message}`);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;