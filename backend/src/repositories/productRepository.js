'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');
const { generateEmbedding } = require('../services/embeddingService');

const TABLE = 'products';

// ─── Platform ID cache ──────────────────────────────────────────────────────
// Maps lowercase store key → UUID from the platforms table.
// Populated lazily on first call per key; persists for the process lifetime.
const _platformIdCache = new Map();

// ─── Error formatter ────────────────────────────────────────────────────────
// Handles Supabase error objects, standard Error objects, strings, and null.
function formatError(err) {
  if (!err) return 'unknown error (null/undefined)';
  if (typeof err === 'string') return err;
  if (err.message) {
    const extra = [err.code, err.details, err.hint].filter(Boolean).join(' | ');
    return extra ? `${err.message} [${extra}]` : err.message;
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

/**
 * Resolve the UUID of a platform by its store key.
 * Checks an in-memory cache first; queries Supabase on cache miss.
 *
 * Store key mapping:
 *   'pcexpress' → platforms row where name = 'PCExpress'
 *   'villman'   → platforms row where name = 'VillMan'
 *   'pcworx'    → platforms row where name = 'PCWorx'
 *
 * @param {string} storeKey  Lowercase store identifier from _source field
 * @returns {Promise<string|null>} UUID or null if store not found
 */
async function getPlatformId(storeKey) {
  if (!storeKey) return null;

  const key = storeKey.toLowerCase().trim();

  // Return from cache if already resolved
  if (_platformIdCache.has(key)) {
    return _platformIdCache.get(key);
  }

  // Map store keys to the exact name values stored in the platforms table
  // These must match the `name` column values exactly (case-sensitive)
  const STORE_KEY_TO_PLATFORM_NAME = {
    pcexpress:  'PCExpress',
    villman:    'VillMan',
    pcworx:     'PCWorx',
    'pc express': 'PCExpress',
    'pc worx':    'PCWorx',
  };

  const platformName = STORE_KEY_TO_PLATFORM_NAME[key];
  if (!platformName) {
    logger.warn(`[ProductRepository] getPlatformId: unknown store key "${key}"`);
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('platforms')
      .select('id')
      .eq('name', platformName)
      .single();

    if (error || !data) {
      logger.error(
        `[ProductRepository] getPlatformId: could not find platform "${platformName}": ` +
        (error?.message || 'no row returned')
      );
      return null;
    }

    // Cache the result
    _platformIdCache.set(key, data.id);
    logger.debug(`[ProductRepository] getPlatformId: "${key}" → ${data.id}`);
    return data.id;

  } catch (err) {
    logger.error(`[ProductRepository] getPlatformId threw: ${err?.message || String(err)}`);
    return null;
  }
}

/**
 * Clean product data before saving to database.
 * Removes all internal runtime fields that should NOT be persisted.
 * These fields are used for ranking/display logic but have no DB columns.
 */
function cleanProductForDatabase(product) {
  if (!product) return null;
  
  // All fields that should NOT be saved to the database
  const INTERNAL_FIELDS = [
    // Ranking/display fields
    '_source', '_score', '_rankingScore', '_rankingBreakdown',
    '_reasons', '_rankingMeta', '_rankingExplanation', '_similarity',
    '_index', '_store',
    // camelCase versions (normalized to snake_case by DB)
    'originalPrice', 'discountPercent', 'isOnSale', 'promoLabel',
    'isAvailable', 'sellerName', 'imageUrl', 'productUrl',
    'storeId', 'storeName', 'storeColor',
    // Fields that don't exist in schema yet
    'price_updated_at', 'stock_updated_at', 'rating_updated_at', 'specs_updated_at',
    // Derived field (not a DB column)
    'platform',
  ];
  
  const clean = {};
  for (const [key, value] of Object.entries(product)) {
    if (!INTERNAL_FIELDS.includes(key)) {
      clean[key] = value;
    }
  }
  
  // Ensure required DB columns have defaults
  if (!clean.created_at) {
    clean.created_at = new Date().toISOString();
  }
  if (!clean.updated_at) {
    clean.updated_at = new Date().toISOString();
  }
  if (!clean.last_scraped) {
    clean.last_scraped = new Date().toISOString();
  }
  
  return clean;
}

/**
 * Pre-load all platform IDs into the cache.
 * Call once at startup (in server.js or searchService) to avoid
 * per-product DB round-trips on first scrape.
 */
async function loadAllPlatformIds() {
  try {
    const { data, error } = await supabase
      .from('platforms')
      .select('id, name');

    if (error) throw error;

    const NAME_TO_KEY = {
      'PCExpress': 'pcexpress',
      'VillMan':   'villman',
      'PCWorx':    'pcworx',
    };

    for (const row of (data || [])) {
      const key = NAME_TO_KEY[row.name] || row.name.toLowerCase();
      _platformIdCache.set(key, row.id);
    }

    logger.info(`[ProductRepository] Platform IDs loaded: ${_platformIdCache.size} platforms cached`);
  } catch (err) {
    logger.error('[ProductRepository] loadAllPlatformIds failed: ' + (err?.message || String(err)));
  }
}

async function upsertProduct(productData) {
  // Strip internal runtime fields — never written to DB
  const RUNTIME_FIELDS = [
    '_source', '_score', '_rankingScore', '_rankingBreakdown',
    '_reasons', '_rankingMeta', '_rankingExplanation', '_similarity',
    '_index', '_store',
    // Strip columns that don't exist yet — add back after running their migration
    'price_updated_at', 'stock_updated_at', 'rating_updated_at', 'specs_updated_at',
    // `platform` is derived in searchService and not a DB column
    'platform',
    // Legacy camelCase duplicates
    'originalPrice', 'discountPercent', 'isOnSale', 'promoLabel',
    'isAvailable', 'sellerName', 'imageUrl', 'productUrl',
    'storeId', 'storeName', 'storeColor',
  ];

  // Extract deal-related fields from productData BEFORE cleaning (before they get deleted)
  const originalPriceFromInput = productData.originalPrice;
  const promoLabelFromInput = productData.promoLabel;

  const cleanData = { ...productData };
  for (const field of RUNTIME_FIELDS) {
    delete cleanData[field];
  }

  // Validate and normalize discount fields
  const price = parseFloat(cleanData.price) || 0;
  const originalPrice = (originalPriceFromInput !== null && originalPriceFromInput !== undefined)
    ? (isNaN(parseFloat(originalPriceFromInput)) ? null : parseFloat(originalPriceFromInput))
    : null;
  
  let discountPercent = null;
  let isOnSale = false;
  
  // Compute discount — only if original price is valid and higher than current price
  if (originalPrice && originalPrice > price) {
    discountPercent = ((originalPrice - price) / originalPrice) * 100;
    isOnSale = true;
  } else if (promoLabelFromInput && promoLabelFromInput.trim()) {
    // Fallback: if no computed discount but promo label exists, mark as on-sale
    isOnSale = true;
  }
  
  // Ensure discountPercent is a number or null, never NaN
  if (discountPercent !== null && isNaN(discountPercent)) {
    discountPercent = null;
  }

  // Generate embedding from product title
  // Do this BEFORE the upsert so it's included in the same DB write
  let embedding = null;
  if (cleanData.title) {
    // Combine title with any available description for richer embedding
    const textToEmbed = cleanData.title.trim();
    embedding = await generateEmbedding(textToEmbed);
    // generateEmbedding returns null on failure — that's OK
    // The product saves without embedding, can be backfilled later
  }

  // Prepare final data with validated discount fields
  // Convert camelCase to snake_case for Supabase
  const finalData = {
    ...cleanData,
    price: price,
    original_price: originalPrice,
    discount_percent: discountPercent,
    is_on_sale: isOnSale,
    promo_label: (promoLabelFromInput && promoLabelFromInput.trim()) ? promoLabelFromInput.trim() : null,
    embedding,
  };
  
  // Remove camelCase versions to avoid conflicts
  delete finalData.originalPrice;
  delete finalData.discountPercent;
  delete finalData.isOnSale;
  delete finalData.promoLabel;

  // DEBUG: Log before save
  if (isOnSale || discountPercent) {
    const supabase = require('../config/db').supabase;
    const logger = require('../config/logger');
    logger.info(`[productRepository.upsertProduct] SAVING DEAL: title="${finalData.title?.substring(0, 50)}" | price=${price} | original_price=${originalPrice} | discount_percent=${discountPercent?.toFixed(1)}% | is_on_sale=${isOnSale} | promo_label="${finalData.promo_label || 'none'}"`);
  }

  // Upsert by product_url (unique)
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(finalData, { onConflict: 'product_url', ignoreDuplicates: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function findByUrl(productUrl) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('product_url', productUrl)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  // 🆕 FIX: Flatten nested platforms data
  return data ? { ...data, platform: data.platforms?.name || 'Unknown', platforms: undefined } : data;
}

async function findByIds(ids) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .in('id', ids);
  if (error) throw error;
  // 🆕 FIX: Flatten nested platforms data for all rows
  return (data || []).map(p => ({ ...p, platform: p.platforms?.name || 'Unknown', platforms: undefined }));
}

async function updateEmbedding(id, embedding) {
  const { error } = await supabase
    .from(TABLE)
    .update({ embedding })
    .eq('id', id);
  if (error) throw error;
}

// New methods for product endpoints
async function findAll(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // 🆕 FIX: Flatten nested platforms data
  return (data || []).map(p => ({ ...p, platform: p.platforms?.name || 'Unknown', platforms: undefined }));
}

async function findRecent(limit = 10) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // 🆕 FIX: Flatten nested platforms data
  return (data || []).map(p => ({ ...p, platform: p.platforms?.name || 'Unknown', platforms: undefined }));
}

async function findTopRated(limit = 10) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .gt('rating', 0)
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // 🆕 FIX: Flatten nested platforms data
  return (data || []).map(p => ({ ...p, platform: p.platforms?.name || 'Unknown', platforms: undefined }));
}

/**
 * Find products whose title contains the keyword (case-insensitive).
/**
 * @param {string} keyword - e.g. 'laptop', 'smartphone', 'desktop'
 * @param {number} limit   - max results to return (default 10)
 * @param {string} platformId - optional: filter by platform UUID
 */
async function findByKeyword(keyword, limit = 10, platformId = null) {
  let query = supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .ilike('title', `%${keyword}%`)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (platformId) {
    query = query.eq('platform_id', platformId);
  }

  const { data, error } = await query;
  if (error) throw error;
  // 🆕 FIX: Flatten nested platforms data
  return (data || []).map(p => ({ ...p, platform: p.platforms?.name || 'Unknown', platforms: undefined }));
}

// ─── 🆕 FRESHNESS-AWARE QUERY METHODS ─────────────────────────────────────────

/**
 * 🆕 Search with automatic freshness filtering
 * Returns products sorted by freshness (most recent first)
 * Only returns products scraped within the last N hours
 * 🆕 FIX: Now includes platform info so SearchService can group by store
 */
async function searchByQueryFresh(query, hoursThreshold = 6) {
  try {
    const thresholdDate = new Date(
      Date.now() - hoursThreshold * 60 * 60 * 1000
    ).toISOString();
    
    // 🆕 FIX: Join with platforms table to include platform_id in results
    // This is critical so SearchService can properly group products by store
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, platforms(id, name)')
      .ilike('title', `%${query}%`)
      .gte('last_scraped', thresholdDate)
      .eq('is_available', true)
      .order('last_scraped', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    // 🆕 FIX: Flatten nested platforms data to top-level platform field
    // Supabase returns: { ...product, platforms: { id, name } }
    // We need: { ...product, platform: "PCExpress", platform_id: "..." }
    return (data || []).map(p => ({
      ...p,
      platform: p.platforms?.name || 'Unknown',  // 🆕 CRITICAL: Extract platform name
      platforms: undefined,  // Remove nested object to avoid confusion
    }));
  } catch (error) {
    logger.error('[ProductRepository] searchByQueryFresh error: ' + formatError(error));
    return [];
  }
}

/**
 * 🆕 Search products by keyword — returns ALL matching products regardless of age.
 * Used as last-resort fallback in searchWithFallback() when fresh DB has no results.
 * Ordered by last_scraped DESC so newest data surfaces first.
 * 🆕 FIX: Now includes platform info for proper store grouping
 *
 * @param {string} query   - Search keyword (matched against title)
 * @param {number} limit   - Max results to return (default 100)
 * @returns {Promise<Array>} Array of product rows, or [] on error
 */
async function searchByQuery(query, limit = 100) {
  try {
    const normalizedQuery = (query || '').trim().toLowerCase();
    if (!normalizedQuery) return [];

    // 🆕 FIX: Join with platforms table to include platform info
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, platforms(id, name)')
      .ilike('title', `%${normalizedQuery}%`)
      .eq('is_available', true)
      .order('last_scraped', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[ProductRepository] searchByQuery error: ' + formatError(error));
      return [];
    }

    logger.debug(`[ProductRepository] searchByQuery "${normalizedQuery}" → ${(data || []).length} results`);
    
    // 🆕 FIX: Flatten nested platforms data to top-level platform field
    // Same as searchByQueryFresh — extract platform name from nested platforms object
    return (data || []).map(p => ({
      ...p,
      platform: p.platforms?.name || 'Unknown',  // 🆕 CRITICAL: Extract platform name
      platforms: undefined,  // Remove nested object
    }));
  } catch (err) {
    logger.error('[ProductRepository] searchByQuery threw: ' + formatError(err));
    return [];
  }
}

/**
 * 🆕 Get stale products for background re-scraping
 * Used by scheduled jobs to refresh old data
 */
async function getStaleProducts(hoursOld = 6, limit = 100) {
  try {
    const thresholdDate = new Date(
      Date.now() - hoursOld * 60 * 60 * 1000
    ).toISOString();
    
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, title, product_url, last_scraped, platform_id')
      .lt('last_scraped', thresholdDate)
      .eq('is_available', true)
      .order('last_scraped', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    logger.info(`[ProductRepository] Found ${data?.length || 0} stale products`);
    return data || [];
  } catch (error) {
    logger.error('[ProductRepository] getStaleProducts error: ' + formatError(error));
    return [];
  }
}

/**
 * 🆕 Mark product unavailable (removed from platform)
 */
async function markUnavailable(productUrl) {
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ is_available: false })
      .eq('product_url', productUrl);
    
    if (error) throw error;
    logger.info(`[ProductRepository] Marked unavailable: ${productUrl}`);
  } catch (error) {
    logger.error('[ProductRepository] markUnavailable error: ' + formatError(error));
    throw error;
  }
}

/**
 * 🆕 Increment view count (for popularity tracking)
 * Prefers RPC for atomic increment, falls back to UPDATE
 */
async function incrementViewCount(id) {
  try {
    // Try RPC first for atomic increment
    const { error: rpcError } = await supabase.rpc('increment_view_count', {
      product_id: id
    });
    
    if (!rpcError) return;
    
    // Fallback: use regular update
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({ view_count: supabase.raw('view_count + 1') })
      .eq('id', id);
    
    if (updateError) throw updateError;
  } catch (error) {
    logger.warn('[ProductRepository] incrementViewCount failed: ' + formatError(error));
    // Don't throw — view tracking should never break search
  }
}

/**
 * ⚠️  CRITICAL: All tables with FK → products(id):
 * 
 * These tables have foreign key constraints on products.id:
 *   - product_sources (product_sources_product_id_fkey)
 *   - cart_items (cart_items_product_id_fkey)
 *   - recommendations (recommendations_product_id_fkey)
 *   - user_recommendations (user_recommendations_product_id_fkey)
 *   - user_product_interactions (user_product_interactions_product_id_fkey)
 *   - user_interactions (user_interactions_product_id_fkey)
 *   - background_jobs (background_jobs_product_id_fkey)
 * 
 * NEVER:
 *   1. DELETE a product row if child rows exist
 *   2. Change a product.id (primary key) while child rows reference it
 *   3. Generate a new UUID for an existing product's id field
 * 
 * ALWAYS:
 *   1. Use onConflict: 'product_url' to UPDATE in-place
 *   2. Omit the id field from upsert payloads (let DB handle it)
 *   3. Delete from child tables BEFORE deleting from products
 * 
 * @param {Array<object>} products - Array of product objects (no id field required)
 * @returns {Promise<Array>} Array of upserted product rows with real DB-assigned IDs
 */
async function upsertProductsBatch(products) {
  if (!products || products.length === 0) {
    logger.warn('[ProductRepository] No products to upsert');
    return [];
  }
  
  try {
    // CRITICAL: Clean all products before upsert
    // Remove internal fields (_source, _index, _similarity, etc)
    // that don't have corresponding DB columns
    const cleanedProducts = products.map((p, idx) => {
      const cleaned = cleanProductForDatabase(p);
      
      // ✅ FIX: Remove the id field entirely
      // Do NOT pass id to Supabase — let the database assign/maintain it
      // This ensures Supabase performs an UPDATE in-place (matching on product_url)
      // rather than trying to change the primary key
      delete cleaned.id;
      
      return cleaned;
    });
    
    logger.debug(`[ProductRepository] Cleaned ${cleanedProducts.length} products (removed internal fields, omitted id for safe upsert)`);
    
    // ✅ SAFE: onConflict: 'product_url' will find existing rows by URL
    // Without id in the payload, Supabase performs an in-place UPDATE
    // The product.id stays stable, child FK rows remain valid
    const { error, data } = await supabase
      .from(TABLE)
      .upsert(cleanedProducts, {
        onConflict: 'product_url',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    
    logger.info(`[ProductRepository] Successfully upserted ${data?.length || 0} products to database`);
    return data || [];
  } catch (error) {
    logger.error('[ProductRepository] upsertProductsBatch error: ' + formatError(error));
    throw error;
  }
}

module.exports = { 
  upsertProduct, 
  findByUrl, 
  findById, 
  findByIds, 
  updateEmbedding,
  findAll,
  findRecent,
  findTopRated,
  findByKeyword,
  // 🆕 NEW EXPORTS
  searchByQueryFresh,
  searchByQuery,
  getStaleProducts,
  markUnavailable,
  incrementViewCount,
  upsertProductsBatch,
  getPlatformId,
  loadAllPlatformIds,
  cleanProductForDatabase
};