'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');

/**
 * Freshness Engine — Determines if products are stale and need refresh
 * Uses TTL settings from database, supports per-platform configuration
 */

const DEFAULT_TTLS = {
  price: 30,           // 30 minutes
  stock: 10,           // 10 minutes
  rating: 60,          // 1 hour
  specs: 10080,        // 7 days
  availability: 15,    // 15 minutes
};

let ttlCache = null;
let ttlCacheTime = 0;
const TTL_CACHE_DURATION = 10 * 60 * 1000; // Refresh TTL config every 10 min

/**
 * Load TTL settings from database (or use defaults)
 */
async function loadTTLSettings(force = false) {
  const now = Date.now();
  
  if (ttlCache && now - ttlCacheTime < TTL_CACHE_DURATION && !force) {
    return ttlCache;
  }

  try {
    const { data, error } = await supabase
      .from('ttl_settings')
      .select('*')
      .eq('is_enabled', true);

    if (error) throw error;

    ttlCache = {};
    for (const setting of data || []) {
      const key = `${setting.platform_name}:${setting.field_type}`;
      ttlCache[key] = setting.ttl_minutes * 60 * 1000; // Convert to ms
    }

    ttlCacheTime = now;
    logger.info(`[FreshnessEngine] Loaded ${Object.keys(ttlCache).length} TTL settings`);
    return ttlCache;
  } catch (err) {
    logger.error('[FreshnessEngine] Failed to load TTL settings, using defaults:', err);
    ttlCache = null;
    return null;
  }
}

/**
 * Get TTL for a specific field + platform combination
 */
function getTTL(fieldType, platform) {
  const ttls = ttlCache || {};
  
  // Try platform-specific TTL first, then fallback to default
  const platformKey = `${platform}:${fieldType}`;
  const defaultKey = `*:${fieldType}`;
  
  const ttlMs = ttls[platformKey] || ttls[defaultKey] || (DEFAULT_TTLS[fieldType] * 60 * 1000);
  return ttlMs;
}

/**
 * Check if a product field is fresh
 * 
 * @param {Object} product - Product object with updated_at timestamps
 * @param {String} fieldType - 'price', 'stock', 'rating', 'specs', 'availability'
 * @param {String} platform - 'PCExpress', 'Villman', 'PCWorx'
 * @returns {Boolean} true if fresh, false if stale
 */
function isFieldFresh(product, fieldType, platform) {
  if (!product) return false;

  const updateColumn = `${fieldType}_updated_at`;
  const lastUpdated = product[updateColumn];

  if (!lastUpdated) {
    // If no timestamp, consider it stale
    return false;
  }

  const ttl = getTTL(fieldType, platform);
  const age = Date.now() - new Date(lastUpdated).getTime();

  return age < ttl;
}

/**
 * Check if a product needs critical updates (price or stock)
 */
function needsCriticalRefresh(product, platform) {
  const priceFresh = isFieldFresh(product, 'price', platform);
  const stockFresh = isFieldFresh(product, 'stock', platform);
  
  // Return true if EITHER price OR stock is stale
  return !priceFresh || !stockFresh;
}

/**
 * Check if product needs full refresh (any field stale)
 */
function needsFullRefresh(product, platform) {
  const fields = ['price', 'stock', 'rating', 'specs'];
  
  for (const field of fields) {
    if (!isFieldFresh(product, field, platform)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate stale fields for a product
 * @returns {Array} List of stale field names: ['price', 'stock'] etc
 */
function getStaleFields(product, platform) {
  const fields = ['price', 'stock', 'rating', 'specs', 'availability'];
  const stale = [];

  for (const field of fields) {
    if (!isFieldFresh(product, field, platform)) {
      stale.push(field);
    }
  }

  return stale;
}

/**
 * Calculate freshness percentage for UI display
 * 0% = all stale, 100% = all fresh
 */
function calculateFreshness(product, platform) {
  const fields = ['price', 'stock', 'rating', 'specs'];
  let freshCount = 0;

  for (const field of fields) {
    if (isFieldFresh(product, field, platform)) {
      freshCount++;
    }
  }

  return Math.round((freshCount / fields.length) * 100);
}

/**
 * Get human-readable freshness message
 */
function getFreshnessMessage(product, platform) {
  if (!product) return 'Unknown';

  const freshness = calculateFreshness(product, platform);
  const staleFields = getStaleFields(product, platform);

  if (freshness === 100) {
    return '✅ All data fresh';
  } else if (freshness === 0) {
    return '⚠️ All data stale';
  } else {
    return `⏳ ${freshness}% fresh (${staleFields.join(', ')} stale)`;
  }
}

module.exports = {
  loadTTLSettings,
  getTTL,
  isFieldFresh,
  needsCriticalRefresh,
  needsFullRefresh,
  getStaleFields,
  calculateFreshness,
  getFreshnessMessage,
};
