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

/**
 * Fetch with automatic timeout, retry, and error handling.
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} maxRetries - Max number of retry attempts
 * @param {string} label - Label for logging
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, timeoutMs = 8000, maxRetries = 2, label = 'fetch') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      lastError = err;
      const errorType = err.name === 'AbortError' ? 'timeout' : err.code || 'network error';
      
      if (attempt === maxRetries) {
        logger.error(`[${label}] Failed after ${maxRetries} attempts (${errorType}): ${err.message}`);
        break;
      }
      
      const delay = 1000 * attempt;
      logger.warn(`[${label}] ${errorType} (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

module.exports = { withRetry, sleep, randomDelay, fetchWithRetry };