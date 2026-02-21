'use strict';

const logger = require('../config/logger');

/**
 * Retry an async function with exponential backoff.
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Max number of attempts
 * @param {number} baseDelay - Base delay in ms (doubles each attempt)
 * @param {string} label - Label for logging
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000, label = 'operation') {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      logger.warn(`[Retry] ${label} failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms. Error: ${err.message}`);
      await sleep(delay);
    }
  }
  logger.error(`[Retry] ${label} failed after ${maxRetries} attempts.`);
  throw lastError;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max ms.
 */
async function randomDelay(min, max) {
  const delay = min + Math.random() * (max - min);
  await sleep(delay);
}

module.exports = { withRetry, sleep, randomDelay };