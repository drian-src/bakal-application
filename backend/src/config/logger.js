'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, printf, errors, json } = format;

// Custom JSON formatter for structured logging
const structuredFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  // If message is an object, use it as is and merge with meta
  if (typeof message === 'object') {
    return JSON.stringify({ level, timestamp: ts, ...message, ...meta });
  }
  // Otherwise, include message in the output
  return JSON.stringify({ level, timestamp: ts, message, ...meta });
});

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: combine(timestamp(), structuredFormat)
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      format: combine(timestamp(), structuredFormat)
    }),
  ],
});

module.exports = logger;