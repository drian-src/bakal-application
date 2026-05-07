'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');
const pcexpressScraper = require('../scrapers/pcexpressScraper');
const villmanScraper = require('../scrapers/villmanScraper');
const pcworxScraper = require('../scrapers/pcworxScraper');
const searchRepo = require('../repositories/searchRepository');
const productRepo = require('../repositories/productRepository');
const productSourceRepo = require('../repositories/productSourceRepository');
const { getEnabledStores, getStoreByName } = require('../config/stores');
const { rankProducts } = require('./rankingEngine');
const { generateEmbedding } = require('./embeddingService');
const freshnessEngine = require('./freshnessEngine');
const jobQueue = require('../repositories/jobQueue');

// ============================================================
// BACKEND SEARCH CACHE — Prevent re-scraping same query
// ============================================================
const scrapeCache = new Map();
const BACKEND_CACHE_MS = 15 * 60 * 1000; // 15 minutes

// Tracks scrapes currently in progress — key = normalized query
// Value = the Promise of the scrape in progress
// Any second request for the same query awaits this Promise
// instead of starting a new scrape
const inFlightScrapes = new Map();

// Auto-purge stale cache entries every 5 minutes to prevent memory buildup
// and to ensure partial results don't linger past TTL
setInterval(() => {
  const now = Date.now();
  let purged = 0;
  for (const [key, val] of scrapeCache.entries()) {
    if (now - val.timestamp > BACKEND_CACHE_MS) {
      scrapeCache.delete(key);
      purged++;
    }
  }
  if (purged > 0) {
    logger.debug(`[Backend Cache] Purged ${purged} stale entries`);
  }
}, 5 * 60 * 1000);
const SCRAPER_TIMEOUT_MS = 90000; // FIX: Increased from 45s to 90s.
// PcExpressScraper.search() flow: API call (~5s) → fallback page load (~35s) →
// scrapeMany 5 products at concurrency 2 (~45s) = ~85s total.
// 45s was cutting off scrapeMany before it could return any products.

// Map store IDs to their scrapers
const scraperMap = {
  pcexpress: pcexpressScraper,
  villman: villmanScraper,
  pcworx: pcworxScraper,
};

/** Wrap a promise with timeout — returns either result or { error: "timed out" } */
const withTimeout = (promise, ms = SCRAPER_TIMEOUT_MS, storeName = 'Store') =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${storeName} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);

const getCachedOrScrape = async (query, scrapeFn) => {
  const key = query.toLowerCase().trim();

  // 1. Check cache first (instant return)
  const cached = scrapeCache.get(key);
  if (cached && Date.now() - cached.timestamp < BACKEND_CACHE_MS) {
    // FIX: Only serve cache if it actually has products.
    // A previous search where all stores timed out would have cached 0 products —
    // serving that forever defeats the purpose of caching.
    const cachedProductCount = (cached.data || []).reduce(
      (sum, store) => sum + (store.items?.length || 0), 0
    );
    if (cachedProductCount > 0) {
      logger.info(`[Backend Cache HIT] Query: "${key}" (${cachedProductCount} cached products)`);
      return cached.data;
    }
    logger.info(`[Backend Cache STALE] Query: "${key}" had 0 products — re-scraping`);
  }

  // 2. Check if a scrape for this query is already in progress
  if (inFlightScrapes.has(key)) {
    logger.info(`[Backend Cache WAIT] Query: "${key}" — awaiting in-flight scrape`);
    // Wait for the existing scrape to finish and return its result
    return await inFlightScrapes.get(key);
  }

  // 3. No cache, no in-flight scrape — start a new scrape
  //    Wrap the scrape in a Promise and register it in inFlightScrapes
  //    so any concurrent request for the same query will await it
  const scrapePromise = (async () => {
    try {
      logger.info(`[Backend Cache MISS] Scraping: "${key}"...`);

      // Run the scrape function
      const result = await scrapeFn();

      // FIX: Only cache if at least one store returned at least one product.
      // Do not cache empty results — they may be caused by timeouts, not a real "no results".
      const totalProducts = (result || []).reduce(
        (sum, store) => sum + (store.items?.length || 0), 0
      );
      if (totalProducts > 0) {
        scrapeCache.set(key, { data: result, timestamp: Date.now() });
        logger.info(`[Backend Cache SET] "${key}" — ${totalProducts} products cached`);
      } else {
        logger.warn(`[Backend Cache SKIP] "${key}" — 0 products returned, not caching`);
      }

      return result;
    } finally {
      // Always remove from in-flight map when done (success OR error)
      // so future requests after this one completes will use the cache
      inFlightScrapes.delete(key);
    }
  })();

  // Register the in-flight promise BEFORE awaiting it
  // so concurrent requests can find and await it immediately
  inFlightScrapes.set(key, scrapePromise);

  return await scrapePromise;
};

let PLATFORM_IDS = {};

async function loadPlatformIds() {
  if (!supabase) {
    PLATFORM_IDS = {};
    logger.warn('[SearchService] Supabase not configured; skipping platform ID load.');
    return;
  }

  // Retry with timeout to handle network issues during bootstrap
  const maxRetries = 3;
  const baseDelay = 500;
  const timeoutMs = 10000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout wrapper around Supabase query
      const platformPromise = supabase.from('platforms').select('id, name');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Platform IDs query timed out')), timeoutMs)
      );
      
      const { data, error } = await Promise.race([platformPromise, timeoutPromise]);
      if (error) throw error;
      
      for (const p of data) PLATFORM_IDS[p.name.toLowerCase().trim()] = p.id;
      logger.info(`[SearchService] Platform IDs loaded: ${JSON.stringify(PLATFORM_IDS)}`);
      return; // Success
    } catch (err) {
      if (attempt === maxRetries) {
        throw err; // Give up after max retries
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`[SearchService] Failed to load platform IDs (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ─── SEMANTIC SEARCH USING PGVECTOR ──────────────────────────────────────────
// Finds products by MEANING not keywords — calls SQL function to search embeddings
// Called in parallel with live scraping so results supplement each other

async function semanticSearch(query, limit = 20, threshold = 0.3) {
  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      logger.warn('[SearchService] semanticSearch: embedding generation failed, skipping');
      return [];
    }

    // Call the SQL function we created in Step 1
    // rpc() is required because supabase-js doesn't support <=> directly
    const { data, error } = await supabase.rpc('match_products_by_embedding', {
      query_embedding:     queryEmbedding,
      match_count:         limit,
      similarity_threshold: threshold,
    });

    if (error) {
      logger.warn('[SearchService] semanticSearch DB error: ' + error.message);
      return [];
    }

    logger.info(`[SearchService] Semantic search found ${data?.length ?? 0} results for "${query}"`);

    // Map DB rows to the same shape as scraper results
    // so downstream code (dedup, ranking) handles them identically
    return (data || []).map(row => ({
      id:          row.id,
      title:           row.title,
      price:           row.price,
      originalPrice:   row.original_price,
      promoLabel:      row.promo_label,
      image_url:       row.image_url,
      product_url:     row.product_url,
      platform_id:     row.platform_id,
      rating:          row.rating,
      reviews_count:   row.reviews_count,
      seller_name:     row.seller_name,
      is_on_sale:      row.is_on_sale,
      discount_percent: row.discount_percent,
      
      // EXTENDED FIELDS — all product details
      brand:           row.brand || null,
      sku:             row.sku || null,
      variation:       row.variation || null,
      specs:           row.specs || {},
      free_items:      row.free_items || null,
      is_available:    row.is_available !== false,
      stock:           row.stock || null,
      last_scraped:    row.last_scraped,
      view_count:      row.view_count || 0,
      
      _similarity:     row.similarity,    // semantic score (0–1), used by ranking
      _source:         'semantic',        // marks this as a DB result, not live scrape
    }));

  } catch (err) {
    logger.error('[SearchService] semanticSearch error: ' + err.message);
    return []; // non-critical — fall back to scraper results only
  }
}

/**
 * Check if a scraped product is relevant to the search query.
 * At least ONE query word (or its aliases) must appear in the product title or URL.
 * 
 * Aliases expand search terms to include related keywords:
 * - "television" also matches "tv", "monitor", "display"
 * - "monitor" also matches "tv", "television", "display"
 * - etc.
 */
const SEARCH_ALIASES = {
  television: ['tv', 'monitor', 'display', 'screen'],
  tv: ['television', 'monitor', 'display', 'screen'],
  monitor: ['tv', 'television', 'display', 'screen'],
  display: ['tv', 'television', 'monitor', 'screen'],
  screen: ['tv', 'television', 'monitor', 'display'],
  keyboard: ['kbd'],
  mouse: ['wireless', 'cordless'],
  headset: ['headphone', 'earphone', 'audio'],
  headphone: ['headset', 'earphone', 'audio'],
};

function isRelevantProduct(product, query) {
  // Split query into words, trim, and remove empty strings
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  // If no query words, accept all products (shouldn't happen)
  if (queryWords.length === 0) return true;
  
  const titleLower = (product.title || '').toLowerCase();
  const urlLower = (product.product_url || '').toLowerCase();
  const combinedSearchText = `${titleLower} ${urlLower}`;
  
  // Build expanded word list with aliases
  const expandedWords = new Set();
  for (const word of queryWords) {
    expandedWords.add(word);
    if (SEARCH_ALIASES[word]) {
      SEARCH_ALIASES[word].forEach(alias => expandedWords.add(alias));
    }
  }
  
  // At least ONE query word (or its aliases) must appear in title or URL
  return Array.from(expandedWords).some(word => combinedSearchText.includes(word));
}

/**
 * Apply fallback filtering to ensure results are returned whenever possible.
 * Strategy: Exact match → Token match → Return all (unfiltered)
 * @param {array} products - All unique, deduplicated products
 * @param {string} query - Normalized search query (lowercase)
 * @returns {object} { results: filtered products, fallbackLevel: null|'token'|'unfiltered' }
 */
function applyFallbackFilter(products, query) {
  const normalizedQuery = query.trim().toLowerCase();

  // PRIMARY MATCH: Exact phrase match in title
  let filtered = products.filter(p =>
    (p.title || '').toLowerCase().includes(normalizedQuery)
  );

  if (filtered.length > 0) {
    logger.info(
      `[SearchService] Fallback EXACT: ${filtered.length} products matched full query "${normalizedQuery}"`
    );
    return { results: filtered, fallbackLevel: null };
  }

  // FALLBACK 1: Token match (any query token appears in title)
  const tokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

  if (tokens.length > 1) {
    // Multi-token query: require at least one token match
    filtered = products.filter(p => {
      const titleLower = (p.title || '').toLowerCase();
      return tokens.some(token => titleLower.includes(token));
    });

    if (filtered.length > 0) {
      logger.warn(
        `[SearchService] Fallback TOKEN: No exact match found. Using ${filtered.length} products matching individual tokens`
      );
      return { results: filtered, fallbackLevel: 'token' };
    }
  }

  // FALLBACK 2: Return all products (unfiltered, but normalized)
  logger.warn(
    `[SearchService] Fallback UNFILTERED: No token matches. Returning all ${products.length} products without filtering`
  );
  return { results: products, fallbackLevel: 'unfiltered' };
}

/**
 * Scrape all enabled stores in parallel with abort signal handling.
 * Each store has its own AbortController so individual timeouts don't affect others.
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of {store, items, error} objects
 */
async function scrapeAllStores(query) {
  const enabledStores = getEnabledStores();
  
  logger.info(
    `[SearchService] Scraper called: stores=${enabledStores.map(s => s.name).join(', ')} ` +
    `query="${query}" count=${enabledStores.length}`
  );
  
  const PER_STORE_TIMEOUT_MS = 90000; // 90s per store
  
  // Each store gets its own AbortController so we can cancel it individually on timeout
  const abortControllers = {};
  const scrapers = {};
  
  for (const store of enabledStores) {
    abortControllers[store.id] = new AbortController();
    scrapers[store.id] = scraperMap[store.id];
  }
  
  // Helper: races the scraper against a timeout, then signals abort on timeout
  const withCancellableTimeout = (promise, label, abortController) => {
    const timeoutId = setTimeout(() => {
      abortController.abort(); // signals the scraper to stop
    }, PER_STORE_TIMEOUT_MS);
    
    return promise.finally(() => clearTimeout(timeoutId));
  };
  
  // Fire all scrapers simultaneously with individual abort signals
  const scrapePromises = enabledStores.map((store) => {
    const scraper = scraperMap[store.id];
    if (!scraper) {
      return Promise.resolve({
        store,
        items: [],
        error: `No scraper found for ${store.name}`,
      });
    }

    const startTime = Date.now();
    return withCancellableTimeout(
      scraper.search(query, null, abortControllers[store.id].signal),
      store.name,
      abortControllers[store.id]
    )
      .then((items) => {
        const durationMs = Date.now() - startTime;
        logger.info(
          `[SearchService] Scraper result: store="${store.name}" ` +
          `count=${(items || []).length} durationMs=${durationMs}`
        );
        return {
          store,
          items: items || [],
          error: null,
        };
      })
      .catch((err) => {
        const durationMs = Date.now() - startTime;
        logger.error(
          `[SearchService] Scraper failed: store="${store.name}" ` +
          `error="${err.message || 'Scrape failed'}" durationMs=${durationMs}`
        );
        return {
          store,
          items: [],
          error: err.message || 'Scrape failed',
        };
      });
  });

  // Wait for all scrapers to finish — allSettled ensures partial failures don't break everything
  const results = await Promise.allSettled(scrapePromises);

  return results.map((result) => {
    if (result.status === 'fulfilled') return result.value;
    
    // Log rejection with full context
    logger.error(
      `[SearchService] Scraper rejection: error="${result.reason?.message || 'Unknown error'}" ` +
      `query="${query}"`
    );
    
    return { store: null, items: [], error: result.reason?.message || 'Unexpected failure' };
  });
}

/**
 * Scrape a single store by store ID.
 * @param {string} storeId - Store identifier ('pcexpress'|'pcworx'|'villman')
 * @param {string} query - Search query
 * @returns {Promise<{store, items, error}>} Store scraping result
 */
async function scrapeByStore(storeId, query) {
  const store = getStoreByName(storeId);
  if (!store) {
    return {
      store: null,
      items: [],
      error: `Invalid store ID: ${storeId}`,
    };
  }

  const scraper = scraperMap[store.id];
  if (!scraper) {
    return {
      store,
      items: [],
      error: `No scraper found for ${store.name}`,
    };
  }

  const abortController = new AbortController();
  try {
    const items = await withTimeout(
      scraper.search(query, null, abortController.signal),
      SCRAPER_TIMEOUT_MS,
      store.name
    );
    return {
      store,
      items: items || [],
      error: null,
    };
  } catch (err) {
    // Clean up on timeout
    abortController.abort();
    return {
      store,
      items: [],
      error: err.message || 'Scrape failed',
    };
  }
}

async function search(query, userId = null, resultLimit = null, dealsOnly = false, minDiscount = 0) {
  const searchStartTime = Date.now();
  
  if (!Object.keys(PLATFORM_IDS).length) await loadPlatformIds();

  // FIX: Strip trailing punctuation added by voice recognition (e.g. "CPU." → "CPU")
  // Chrome's Web Speech API appends periods, commas, and question marks automatically.
  // These break the relevance filter's includes() check and store search APIs.
  const normalizedQuery = query.trim().replace(/[.,!?;:]+$/, '');

  // Log search started
  logger.info(
    `[SearchService] Search started: query="${normalizedQuery}" userId=${userId || null} ` +
    `resultLimit=${resultLimit || null} dealsOnly=${dealsOnly || false} minDiscount=${minDiscount || 0}`
  );

  if (normalizedQuery !== query) {
    logger.info(`[SearchService] Query normalized: "${query}" → "${normalizedQuery}"`);
  }

  const dbEnabled = !!supabase;

  let searchRecord = { id: null };
  if (dbEnabled) {
    try {
      searchRecord = await searchRepo.create(userId, normalizedQuery);
      logger.info(`[SearchService] Search #${searchRecord.id} - "${normalizedQuery}"`);
    } catch (err) {
      logger.warn('[SearchService] Failed to create search record; continuing without persistence', err.message);
    }
  } else {
    logger.info(`[SearchService] DB disabled — running search in memory for: "${normalizedQuery}"`);
  }

  // ─── LEVEL 1: Check fresh DB (< 6 hours) ─────────────────────────────
  // This avoids hitting live scrapers when we already have fresh enough data.
  // "Fresh" = scraped within the last 6 hours (controlled by searchByQueryFresh TTL).
  // 🆕 FIX: Changed threshold logic to require fresh results from ALL 3 stores
  // Previously: if (DB results >= 3) skip scraping — could return incomplete results
  // Now: Always scrape if ANY store is missing recent results
  const DB_FIRST_THRESHOLD_PER_STORE = 1; // Min results threshold PER STORE before considering scraping
  let freshDbResults = [];
  let freshByStore = { pcexpress: 0, villman: 0, pcworx: 0 };
  
  try {
    freshDbResults = await productRepo.searchByQueryFresh(normalizedQuery);
    
    // 🆕 FIX: Count fresh results by store to verify ALL stores have recent data
    if (freshDbResults.length > 0) {
      for (const product of freshDbResults) {
        // Resolve platform name from platform_id using PLATFORM_IDS map
        for (const [storeKey, platformId] of Object.entries(PLATFORM_IDS)) {
          if (platformId === product.platform_id) {
            freshByStore[storeKey] = (freshByStore[storeKey] || 0) + 1;
            break;
          }
        }
      }
      logger.info(
        `[SearchService] DB-first HIT: "${normalizedQuery}" → ` +
        `${freshDbResults.length} fresh products | PCExpress: ${freshByStore.pcexpress}, VillMan: ${freshByStore.villman}, PCWorx: ${freshByStore.pcworx}`
      );
    }
  } catch (dbErr) {
    // Non-fatal — fall through to scraping
    logger.warn('[SearchService] DB-first check failed (will scrape): ' + dbErr?.message);
  }

  // ─── LEVEL 2: Only skip scraping if ALL stores have recent results ──────
  // 🆕 FIX: ALWAYS scrape if ANY store has <1 recent products
  // This ensures we don't serve incomplete results from cache
  let storeResults = [];
  const hasAllStores = freshByStore.pcexpress >= DB_FIRST_THRESHOLD_PER_STORE && 
                       freshByStore.villman >= DB_FIRST_THRESHOLD_PER_STORE && 
                       freshByStore.pcworx >= DB_FIRST_THRESHOLD_PER_STORE;

  if (hasAllStores && freshDbResults.length >= 3) {
    // DB has recent results from ALL 3 stores — skip scraping
    storeResults = [{ store: { name: 'database', id: 'db' }, items: freshDbResults, error: null }];
    logger.info(
      `[SearchService] DB-first THRESHOLD MET: all 3 stores have ${DB_FIRST_THRESHOLD_PER_STORE}+ fresh results ` +
      `— using fresh DB results, skipping scrape`
    );
  } else {
    // DB missing data from at least one store OR has <3 total — hit the live scrapers
    const missingStores = [];
    if (freshByStore.pcexpress < DB_FIRST_THRESHOLD_PER_STORE) missingStores.push('PCExpress');
    if (freshByStore.villman < DB_FIRST_THRESHOLD_PER_STORE) missingStores.push('VillMan');
    if (freshByStore.pcworx < DB_FIRST_THRESHOLD_PER_STORE) missingStores.push('PCWorx');
    
    logger.info(
      `[SearchService] DB-first MISS: stores missing recent results: ${missingStores.join(', ')} ` +
      `— scraping live for: "${normalizedQuery}"`
    );
    storeResults = await getCachedOrScrape(normalizedQuery, () => scrapeAllStores(normalizedQuery));
  }

  // Flatten products and add store tracking
  let allProducts = [];
  const productCountByStore = { pcexpress: 0, villman: 0, pcworx: 0, database: 0, other: 0 };
  
  for (const storeResult of storeResults) {
    if (storeResult.error) {
      logger.warn(`[SearchService] ${storeResult.store?.name}: ${storeResult.error}`);
    }
    
    // 🆕 FIX: Resolve platform_id to platform name if missing
    const storeName = storeResult.store?.name?.toLowerCase() || 'unknown';
    
    for (const product of storeResult.items) {
      // If product doesn't have platform name (came from DB), resolve it from platform_id
      let platformName = storeResult.store?.name || 'Unknown';
      let storeId = storeResult.store?.id;
      
      if (!platformName && product.platform_id) {
        // Resolve platform_id to name using PLATFORM_IDS map
        for (const [key, pid] of Object.entries(PLATFORM_IDS)) {
          if (pid === product.platform_id) {
            const store = getStoreByName(key);
            if (store) {
              platformName = store.name;
              storeId = store.id;
            }
            break;
          }
        }
      }
      
      allProducts.push({
        ...product,
        platform: platformName,
        storeId: storeId,
      });
      
      // Track by store for logging
      const storeKey = (storeResult.store?.id || platformName.toLowerCase() || 'other').toLowerCase();
      if (productCountByStore.hasOwnProperty(storeKey)) {
        productCountByStore[storeKey]++;
      } else {
        productCountByStore['other']++;
      }
    }
  }
  
  // 🆕 FIX: Log product counts by store to detect if PCExpress is missing
  logger.info(
    `[SearchService] After store collection: PCExpress=${productCountByStore.pcexpress} ` +
    `VillMan=${productCountByStore.villman} PCWorx=${productCountByStore.pcworx} ` +
    `Database=${productCountByStore.database} Total=${allProducts.length}`
  );

  // ─── Run semantic search in parallel ────────────────────────────────────
  // semanticSearch uses pgvector embeddings for meaning-based matching.
  // It runs against already-stored products — fast (~200ms).
  let semanticResults = [];
  try {
    semanticResults = await semanticSearch(normalizedQuery).catch(err => {
      logger.warn('[SearchService] semanticSearch failed (non-fatal): ' + err?.message);
      return [];
    });
  } catch (err) {
    logger.warn('[SearchService] semanticSearch error (non-fatal): ' + err?.message);
    semanticResults = [];
  }

  // ─── Merge semantic results into allProducts ────────────────────────────
  // Semantic search returns already-shaped product objects, but they need platform name
  if (semanticResults && semanticResults.length > 0) {
    logger.info(`[SearchService] Merging ${semanticResults.length} semantic results`);
    const semanticWithPlatform = semanticResults.map(p => {
      // Look up platform name from platform_id using store config
      let platformName = 'Unknown';
      let storeId = null;
      
      if (p.platform_id) {
        // Find matching store by platform_id in the database platforms table
        for (const [platformKey, platformId] of Object.entries(PLATFORM_IDS)) {
          if (platformId === p.platform_id) {
            const store = getStoreByName(platformKey);
            if (store) {
              platformName = store.name; // Use correct casing: PCExpress, VillMan, PCWorx
              storeId = store.id;
            }
            break;
          }
        }
      }
      
      logger.debug(`[SearchService] Semantic product platform resolution: ${p.platform_id} → ${platformName}`);
      
      return {
        ...p,
        platform: platformName,
        storeId: storeId || p.platform_id,
      };
    });
    allProducts.push(...semanticWithPlatform);
  }

  logger.info(`[SearchService] Raw products (scraped + semantic): ${allProducts.length}`);
  
  // DEBUG: Log sample of first product to verify field extraction
  if (allProducts.length > 0) {
    const sample = allProducts[0];
    logger.debug(`[SearchService] Sample product structure:`, {
      title: sample.title?.substring(0, 50),
      price: sample.price,
      originalPrice: sample.originalPrice,
      brand: sample.brand,
      sku: sample.sku,
      variation: sample.variation,
      specs: sample.specs ? Object.keys(sample.specs).length + ' keys' : 'none',
      promo: sample.promo_label || sample.promoLabel,
      freeItems: sample.free_items || sample.freeItems,
      store: sample.platform,
    });
  }

  // Step 1 — Apply deal filters (dealsOnly, minDiscount) BEFORE other filtering
  if (dealsOnly || minDiscount > 0) {
    const beforeFilter = allProducts.length;
    
    // BUG FIX 1: Check if ANY products have discount data before filtering
    // Scrapers may not extract discount fields yet — avoid silently returning 0 results
    const productsWithDiscountData = allProducts.filter(
      p => p.is_on_sale != null || p.discount_percent != null
    );
    
    if (productsWithDiscountData.length === 0) {
      // No discount data available — skip filter entirely
      logger.warn(
        `[SearchService] Deal filter skipped — 0 of ${beforeFilter} products have discount data. ` +
        `Scrapers do not currently extract discount fields.`
      );
      // Do NOT filter — keep all products so user sees results
    } else {
      // Some products have discount data — apply filter
      const dealSamples = [];
      allProducts = allProducts.filter(p => {
        const matchesDeals = !dealsOnly || p.is_on_sale;
        const matchesDiscount = !minDiscount || (p.discount_percent || 0) >= minDiscount;
        const passes = matchesDeals && matchesDiscount;
        
        // DEBUG: Collect sample of products for logging
        if (passes && dealSamples.length < 5) {
          dealSamples.push({
            title: p.title?.substring(0, 40),
            is_on_sale: p.is_on_sale,
            discount_percent: p.discount_percent,
          });
        }
        
        return passes;
      });
      logger.info(
        `[SearchService] Deal filter: ${beforeFilter} → ${allProducts.length} products ` +
        `(dealsOnly=${dealsOnly}, minDiscount=${minDiscount}) | Sample deals: ${JSON.stringify(dealSamples)}`
      );
    }
  }

  // Step 2 — Deduplicate by product_url
  const seen = new Set();
  const uniqueProducts = allProducts.filter((p) => {
    if (!p || !p.product_url || seen.has(p.product_url)) return false;
    seen.add(p.product_url);
    return true;
  });

  logger.info(`[SearchService] Unique products after dedup: ${uniqueProducts.length}`);

  // Step 3 — Relevance filter: remove products unrelated to the query
  const relevantProducts = [];
  const rejectedProducts = [];
  
  for (const product of uniqueProducts) {
    if (isRelevantProduct(product, normalizedQuery)) {
      relevantProducts.push(product);
      logger.debug(`[SearchService] ✓ ACCEPTED: "${product.title}" (${product.platform})`);
    } else {
      rejectedProducts.push(product);
      logger.debug(`[SearchService] ✗ REJECTED: "${product.title}" (${product.platform})`);
    }
  }

  logger.info(
    `[SearchService] Relevance filter: ${relevantProducts.length}/${uniqueProducts.length} products kept`
  );

  // Step 3.5 — Apply fallback filter to ensure we always return results when possible
  const { results: fallbackFiltered, fallbackLevel } = applyFallbackFilter(
    relevantProducts.length > 0 ? relevantProducts : uniqueProducts,
    normalizedQuery
  );
  if (fallbackLevel !== null && fallbackLevel > 0) {
    logger.info(
      `[SearchService] Fallback triggered: level="${fallbackLevel}" ` +
      `resultCount=${fallbackFiltered.length} query="${normalizedQuery}"`
    );
  }

  // ── Multi-factor ranking ─────────────────────────────────────────────────
  // Annotates each product with _score, _reasons, _rankingMeta.
  // Sorts by _score DESC. Falls back to original order on any error.
  // NOTE: Ranking is performed AFTER database save (Step 3b) to ensure products have real UUIDs
  // for ranking engine queries

  if (rejectedProducts.length > 0) {
    const sample = rejectedProducts.slice(0, 3);
    logger.info(`[SearchService] Sample rejected products (${rejectedProducts.length} total):`);
    sample.forEach(p => {
      logger.info(`  - ${p.title}`);
    });
  }

  // STEP 3a — Save products to DB FIRST (before ranking!)
  // This assigns real UUIDs to each product so ranking can query user_interactions
  const savedProducts = [];
  const sources = [];
  const groupedByStore = {};

  if (dbEnabled) {
    for (let i = 0; i < fallbackFiltered.length; i++) {
      const p = fallbackFiltered[i];
      try {
        // Normalize platform name to lowercase for lookup (e.g., "PCExpress" → "pcexpress")
        const platformKey = p.platform?.toLowerCase().trim();
        const platformId = PLATFORM_IDS[platformKey];
        if (!platformId) {
          logger.warn(`[SearchService] Unknown platform key: "${platformKey}" (original: "${p.platform}")`);
          continue;
        }

        // Log successful platform resolution
        logger.debug(`[SearchService] Platform resolved: "${p.platform}" → ID: ${platformId}`);

        const saved = await productRepo.upsertProduct({
          title: p.title,
          price: p.price,
          originalPrice: p.originalPrice,
          promoLabel: p.promoLabel,
          rating: p.rating,
          reviews_count: p.reviews_count,
          seller_name: p.seller_name,
          product_url: p.product_url,
          image_url: p.image_url,
          platform_id: platformId,
        });

        // IMPORTANT: saved now has a real UUID from the database
        // Merge original product data with the saved record (which has real ID)
        const productWithRealId = {
          ...saved,
          platform:     p.platform,
          storeId:      p.storeId,
        };
        savedProducts.push(productWithRealId);

        // Group by store for response
        if (!groupedByStore[p.storeId]) {
          groupedByStore[p.storeId] = [];
        }
        groupedByStore[p.storeId].push(productWithRealId);

        sources.push({
          search_id: searchRecord.id,
          product_id: saved.id,
          rank: i + 1,
        });
      } catch (err) {
        logger.error(`[SearchService] Failed to save product ${p.product_url}: ${err.message}`);
      }
    }

    if (sources.length) await productSourceRepo.createMany(sources);
    logger.info(`[SearchService] Saved ${savedProducts.length} products for search #${searchRecord.id}`);
  } else {
    // DB disabled — use scraped products directly as savedProducts
    logger.info('[SearchService] DB disabled — using scraped products for ranking');
    for (const p of fallbackFiltered) {
      const prod = { ...p, platform: p.platform };
      if (!groupedByStore[p.storeId]) groupedByStore[p.storeId] = [];
      groupedByStore[p.storeId].push(prod);
      savedProducts.push(prod);
    }
  }

  // STEP 3b — NOW rank products (with real UUIDs from DB)
  // Ranking queries user_interactions by product_id, so product.id MUST be a real UUID
  const rankedProducts = await rankProducts(savedProducts, userId, normalizedQuery);
  logger.info(`[SearchService] Products ranked by multi-factor score (${rankedProducts.length} products)`);

  // DEBUG: Verify rankedProducts has data and fields
  if (rankedProducts.length === 0) {
    logger.warn('[SearchService] WARNING: rankedProducts is empty after ranking!');
  } else {
    const topRanked = rankedProducts[0];
    logger.debug(`[SearchService] Top ranked product:`, {
      title: topRanked.title?.substring(0, 50),
      score: topRanked._score,
      platform: topRanked.platform,
      hasSpecs: topRanked.specs ? 'yes' : 'no',
      specKeys: topRanked.specs ? Object.keys(topRanked.specs).length : 0,
    });
  }

  // Log ranking completion with top score
  const topScore = rankedProducts.length > 0 ? rankedProducts[0]._score : 0;
  logger.info(
    `[SearchService] Ranking complete: totalProducts=${rankedProducts.length} ` +
    `topScore=${topScore.toFixed(2)} query="${normalizedQuery}"`
  );

  // STEP 3c — SHAPE products with all fields for frontend
  // Expose snake_case AND camelCase for component compatibility
  // BUG FIX: This MUST use rankedProducts (not savedProducts) to respect ranking
  const shapedProducts = rankedProducts.map(p => ({
    ...p,
    // CRITICAL: Explicitly include core identification fields
    id: p.id,
    platform: p.platform || 'Unknown',
    platform_id: p.platform_id,
    
    // Expose camelCase aliases for backward compatibility
    originalPrice: p.original_price,
    discountPercent: p.discount_percent,
    isOnSale: p.is_on_sale,
    promoLabel: p.promo_label,
    freeItems: p.free_items,
    storeName: p.seller_name,
    imageUrl: p.image_url,
    productUrl: p.product_url,
    platformId: p.platform_id,
    reviewsCount: p.reviews_count,
    lastScraped: p.last_scraped,
    
    // Ensure specs, brand, sku, variation are always present
    specs: p.specs || {},
    brand: p.brand || null,
    sku: p.sku || null,
    variation: p.variation || null,
    
    // Ranking metadata
    _score: p._score || 0,
    _rankingBreakdown: p._rankingBreakdown || {},
    _similarity: p._similarity || 0,
  }));

  logger.debug(`[SearchService] Shaped ${shapedProducts.length} products with all fields exposed`);

  // 🆕 FIX: Log final product counts by store to verify PCExpress is included
  const finalCountByStore = { pcexpress: 0, villman: 0, pcworx: 0, other: 0 };
  for (const p of shapedProducts) {
    const key = (p.platform?.toLowerCase() || 'other').replace(/[^a-z]/g, '');
    if (key === 'pcexpress') finalCountByStore.pcexpress++;
    else if (key === 'villman') finalCountByStore.villman++;
    else if (key === 'pcworx') finalCountByStore.pcworx++;
    else finalCountByStore.other++;
  }
  
  logger.info(
    `[SearchService] FINAL SHAPED PRODUCTS: PCExpress=${finalCountByStore.pcexpress} ` +
    `VillMan=${finalCountByStore.villman} PCWorx=${finalCountByStore.pcworx} ` +
    `Other=${finalCountByStore.other} Total=${shapedProducts.length}`
  );

  // DEBUG: Log sample products to verify platform field is present
  if (shapedProducts.length > 0) {
    const samples = shapedProducts.slice(0, 3);
    logger.debug(`[SearchService] Shaped product samples (first 3):`, samples.map(s => ({
      id: s.id,
      title: s.title?.substring(0, 40),
      platform: s.platform,
      platform_id: s.platform_id,
      hasId: !!s.id,
      hasPlatform: !!s.platform,
    })));
  }

  // DEBUG: Verify shaped products have all required fields
  if (shapedProducts.length > 0) {
    const shaped = shapedProducts[0];
    const fields = {
      id: !!shaped.id,
      title: !!shaped.title,
      price: !!shaped.price,
      platform: !!shaped.platform,
      specs: !!shaped.specs,
      brand: !!shaped.brand,
      sku: !!shaped.sku,
      variation: !!shaped.variation,
      originalPrice: shaped.originalPrice !== undefined,
      promoLabel: shaped.promoLabel !== undefined,
      freeItems: shaped.freeItems !== undefined,
      scoredAndRanked: shaped._score !== undefined,
    };
    const hasAll = Object.values(fields).every(v => v);
    logger.debug(`[SearchService] Shaped product field check (first product):`, {
      ...fields,
      allPresent: hasAll,
    });
  }

  // Apply optional limit at final stage (after ranking + shaping)
  // BUG FIX: Use shapedProducts (ranked + shaped) not savedProducts
  let finalProducts = shapedProducts;
  if (resultLimit && resultLimit > 0) {
    finalProducts = shapedProducts.slice(0, resultLimit);
    logger.info(`[SearchService] Applied limit of ${resultLimit}; returning ${finalProducts.length} products`);
  } else {
    logger.info(`[SearchService] No limit applied; returning all ${finalProducts.length} products`);
  }

  // Format response with store metadata
  const storesResponse = storeResults.map((storeResult) => ({
    storeId: storeResult.store?.id,
    storeName: storeResult.store?.name,
    storeIcon: storeResult.store?.icon,
    storeColor: storeResult.store?.color,
    itemCount: groupedByStore[storeResult.store?.id]?.length || 0,
    items: groupedByStore[storeResult.store?.id] || [],
    error: storeResult.error,
  }));

  // Log response sent with final counts
  const searchDurationMs = Date.now() - searchStartTime;
  logger.info(
    `[SearchService] Response sent: query="${normalizedQuery}" ` +
    `totalProducts=${finalProducts.length} searchDurationMs=${searchDurationMs} ` +
    `storeCount=${storesResponse.length}`
  );

  return {
    search_id: searchRecord.id,
    query: normalizedQuery,
    total: finalProducts.length,
    allProductsCount: savedProducts.length,
    fallbackLevel: fallbackLevel,  // null = exact match, 'token' = token match, 'unfiltered' = all products
    stores: storesResponse,
    products: finalProducts,
  };
}

/**
 * Paginate ranked results with metadata.
 * @param {Array} rankedProducts - Full array of ranked products
 * @param {number} page - Page number (1-based, default 1)
 * @param {number} pageSize - Results per page (default 20)
 * @returns {Object} { results, totalCount, totalPages, page, pageSize }
 */
function paginateResults(rankedProducts, page = 1, pageSize = 20) {
  // Ensure valid numbers
  const validPage = Math.max(1, parseInt(page) || 1);
  const validPageSize = Math.max(1, Math.min(parseInt(pageSize) || 20, 100)); // Cap at 100

  const totalCount = rankedProducts.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / validPageSize);

  // Calculate slice boundaries
  const startIndex = (validPage - 1) * validPageSize;
  const endIndex = startIndex + validPageSize;

  // Apply slice (returns empty array if page exceeds totalPages)
  const results = validPage <= totalPages ? rankedProducts.slice(startIndex, endIndex) : [];

  logger.info(
    `[Pagination] Page ${validPage}/${totalPages}, PageSize ${validPageSize}, TotalCount ${totalCount}, Returned ${results.length}`
  );

  return {
    results,
    totalCount,
    totalPages,
    page: validPage,
    pageSize: validPageSize,
  };
}

async function getSearchResults(searchId) {
  const sources = await productSourceRepo.findBySearch(searchId);
  return sources.map((s) => ({
    rank: s.rank,
    ...s.products,
    platform: s.products?.platforms?.name || null,
  }));
}

// REMOVED: This was at module scope (line 815) and referenced rankedProducts
// which only exists inside the search() function. The shaping logic has been
// moved INSIDE the search function (after ranking) to fix the scope issue.
// See STEP 3c in search() function for the corrected implementation.

// ─── 🆕 FRESHNESS VALIDATION HELPERS ──────────────────────────────────────────
// Determine if cached products are fresh enough to serve without re-scraping

/**
 * 🆕 Check if cached products are fresh
 * Returns true if at least 3 products are < 6 hours old
 */
function validateCacheFreshness(products) {
  if (!products || !Array.isArray(products)) return false;
  
  const now = Date.now();
  const FRESHNESS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
  
  const freshCount = products.filter(p => {
    if (!p.last_scraped) return false;
    const age = now - new Date(p.last_scraped).getTime();
    return age < FRESHNESS_TTL_MS;
  }).length;
  
  // Require at least 3 fresh results to serve cache
  const isFresh = freshCount >= 3;
  logger.info(
    `[SearchService] validateCacheFreshness: ${freshCount} fresh products ` +
    `out of ${products.length} total (fresh=${isFresh})`
  );
  return isFresh;
}

/**
 * 🆕 Decide whether to re-scrape
 * Re-scrape if:
 * 1. Cache miss (no products found)
 * 2. Stale data (products > 6 hours old)
 * 3. Force flag set
 */
function shouldRescrape(cachedProducts, forceScrape) {
  if (forceScrape) {
    logger.info('[SearchService] shouldRescrape: Force-scrape requested');
    return true;
  }
  
  if (!cachedProducts || cachedProducts.length === 0) {
    logger.info('[SearchService] shouldRescrape: No cached products found');
    return true;
  }
  
  const now = Date.now();
  const FRESHNESS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
  
  const freshCount = cachedProducts.filter(p => {
    if (!p.last_scraped) return false;
    const age = now - new Date(p.last_scraped).getTime();
    return age < FRESHNESS_TTL_MS;
  }).length;
  
  // Re-scrape if fewer than 3 fresh results
  const needsReScrape = freshCount < 3;
  if (needsReScrape) {
    logger.info(`[SearchService] shouldRescrape: Only ${freshCount} fresh products, will re-scrape`);
  }
  return needsReScrape;
}

/**
 * 🆕 Get cache age in milliseconds from most recent product
 */
function getCacheAge(products) {
  if (!products || products.length === 0) return null;
  
  const mostRecent = Math.max(
    ...products
      .map(p => p.last_scraped ? new Date(p.last_scraped).getTime() : 0)
  );
  
  return mostRecent > 0 ? Date.now() - mostRecent : null;
}

/**
 * Build a standardised search response object.
 * Called by every level of searchWithFallback().
 * Ensures consistent response shape across all fallback paths.
 *
 * @param {string} query         Original search query
 * @param {Array}  products      Ranked product array
 * @param {string} source        'db_fresh' | 'db_stale' | 'scraped' | 'mixed' | 'error'
 * @param {number} elapsed       Time in ms
 * @param {object} extras        Optional: { warning, isStale, fallbackLevel }
 */
function buildResponse(query, products, source, elapsed, extras = {}) {
  return {
    query,
    total: products.length,
    products: products,
    source,
    elapsed,
    warning:       extras.warning       || null,
    isStale:       extras.isStale       || false,
    fallbackLevel: extras.fallbackLevel || null,
  };
}

/**
 * 🆕 Graceful degradation with multi-level fallback
 * 1. Try fresh cache
 * 2. Try live scrape
 * 3. Fall back to stale cache
 * 4. Return error
 */
async function searchWithFallback(query, userId, resultLimit, dealsOnly, minDiscount) {
  const startTime = Date.now();
  
  try {
    // Level 1: Fresh cache from database
    const freshResults = await productRepo.searchByQueryFresh(query);
    if (freshResults.length >= 3) {
      logger.info(`[SearchService] searchWithFallback: Fresh cache hit (${freshResults.length} products)`);
      return {
        products: freshResults,
        source: 'cache-fresh',
        elapsed: Date.now() - startTime,
        cacheAge: getCacheAge(freshResults)
      };
    }
    
    // Level 2: Live scrape
    try {
      // ── LOAD PLATFORM IDS BEFORE SCRAPING ──────────────────────────────
      // These are needed to inject platform_id into each product before upsert
      if (!Object.keys(PLATFORM_IDS).length) {
        await loadPlatformIds();
      }

      const scrapedResults = await scrapeAllStores(query);
      
      // ── INJECT PLATFORM_ID INTO EACH PRODUCT ──────────────────────────
      // This must happen BEFORE upsertProductsBatch() because platform_id
      // is a NOT NULL constraint in the products table. normalizeProduct()
      // leaves it null because scrapers don't have DB access.
      const flatResults = scrapedResults
        .filter(sr => !sr.error && sr.items && sr.items.length > 0)
        .flatMap(sr => {
          const platformId = PLATFORM_IDS[sr.store.id];
          if (!platformId) {
            logger.warn(
              `[SearchService] No platform_id found for store "${sr.store.name}" ` +
              `(id: ${sr.store.id}). Skipping ${sr.items.length} products.`
            );
            return [];
          }
          logger.debug(`[SearchService] Injecting platform_id "${platformId}" into ${sr.items.length} products from "${sr.store.name}"`);
          return sr.items.map(item => ({
            ...item,
            platform_id: platformId,
          }));
        });
      
      if (flatResults.length > 0) {
        logger.info(`[SearchService] searchWithFallback: Live scrape successful (${flatResults.length} products)`);
        // Save to DB immediately for next search and get back products with IDs
        let productsWithIds = flatResults;
        try {
          const savedProducts = await productRepo.upsertProductsBatch(flatResults);
          if (savedProducts && savedProducts.length > 0) {
            // Verify IDs are present
            const productsWithValidIds = savedProducts.filter(p => p.id);
            if (productsWithValidIds.length === savedProducts.length) {
              productsWithIds = savedProducts;
              logger.info(`[SearchService] Upserted products have IDs assigned (${savedProducts.length} products)`);
              if (savedProducts[0]?.id) {
                logger.info(`[SearchService] Sample upserted product ID: ${savedProducts[0].id}`);
              }
            } else {
              logger.warn(`[SearchService] Only ${productsWithValidIds.length}/${savedProducts.length} upserted products have IDs`);
              // If IDs are missing, try to fetch them by URL
              const productsWithUrls = flatResults.filter(p => p.product_url);
              if (productsWithUrls.length > 0) {
                const fetchedByUrl = await Promise.all(
                  productsWithUrls.map(p => productRepo.findByUrl(p.product_url).catch(() => null))
                );
                const foundProducts = fetchedByUrl.filter(Boolean);
                if (foundProducts.length > 0) {
                  productsWithIds = flatResults.map(p => 
                    foundProducts.find(fp => fp.product_url === p.product_url) || p
                  );
                  logger.info(`[SearchService] Recovered ${foundProducts.length} product IDs by URL lookup`);
                }
              }
            }
          }
        } catch (err) {
          logger.warn('[SearchService] Failed to batch upsert:', err.message);
          // Continue with flatResults (no IDs) rather than fail completely
        }
        return {
          products: productsWithIds,
          source: 'scrape',
          elapsed: Date.now() - startTime
        };
      }
    } catch (scrapeError) {
      logger.error('[SearchService] searchWithFallback: Scrape failed: ' + (scrapeError?.message || String(scrapeError)));
      // Fall through to stale cache
    }
    
    // Level 3: Stale cache (if available)
    const allResults = await productRepo.searchByQuery(query);
    if (allResults.length > 0) {
      logger.info(`[SearchService] searchWithFallback: Using stale cache (${allResults.length} products)`);
      return {
        products: allResults,
        source: 'cache-stale',
        warning: 'Results may be outdated',
        elapsed: Date.now() - startTime,
        cacheAge: getCacheAge(allResults)
      };
    }
    
    // Level 4: Complete failure
    return {
      products: [],
      source: 'none',
      error: 'No results found',
      elapsed: Date.now() - startTime
    };
  } catch (fatalError) {
    logger.error('[SearchService] searchWithFallback: Fatal error:', fatalError.message);
    return {
      products: [],
      source: 'error',
      error: fatalError.message,
      elapsed: Date.now() - startTime
    };
  }
}

/**
 * Hybrid Search Response with Background Refresh
 * 
 * FLOW:
 * 1. Return results from existing search (fast path with cache)
 * 2. Check freshness of results
 * 3. If stale, queue background refresh (non-blocking)
 * 4. Return metadata about freshness to frontend
 */
async function searchHybrid(query, userId, options = {}) {
  const startTime = Date.now();
  const {
    limit = null,
    dealsOnly = false,
    minDiscount = 0,
    store = null,  // 🆕 Optional store filter
  } = options;

  try {
    logger.info(`[SearchHybrid] Starting hybrid search for "${query}"${store ? ` [store: ${store}]` : ''}`);
    
    // Use searchWithFallback for proper 4-level DB-first fallback chain
    const result = await searchWithFallback(query, userId, limit, dealsOnly, minDiscount);
    
    if (!result || !result.products || result.products.length === 0) {
      return {
        products: [],
        metadata: {
          totalResults: 0,
          isStale: false,
          source: 'none',
          searchTime: Date.now() - startTime,
          nextRefreshIn: '—',
        },
      };
    }

    // 🆕 Filter by store if specified
    let filteredProducts = result.products;
    if (store) {
      const storeIdLower = store.toLowerCase();
      filteredProducts = result.products.filter(p => {
        const productStoreId = (p.platforms?.name || p.platform || '').toLowerCase();
        return productStoreId === storeIdLower || p.storeId?.toLowerCase() === storeIdLower;
      });
      
      if (filteredProducts.length > 0) {
        logger.info(`[SearchHybrid] Store filter "${store}": ${result.products.length} total → ${filteredProducts.length} matched`);
      } else {
        logger.warn(`[SearchHybrid] Store filter "${store}": no results found (${result.products.length} total available)`);
      }
    }

    // Check freshness of results
    let allStaleCount = 0;
    const staleQueryProducts = [];
    
    for (const product of filteredProducts) {
      const platform = product.platform || 'Unknown';
      const staleFields = freshnessEngine.getStaleFields(product, platform);
      if (staleFields.length > 0) {
        allStaleCount++;
        staleQueryProducts.push({
          productId: product.id,
          staleFields,
          platform: platform,
        });
      }
    }

    // Check if query is stale (>30% products stale)
    const isQueryStale = allStaleCount > Math.ceil(filteredProducts.length * 0.3);
    const queryFreshness = calculateFreshness(filteredProducts);

    // Queue background refresh if stale (non-blocking)
    if (isQueryStale) {
      logger.info(`[SearchHybrid] Query "${query}" is ${allStaleCount}/${filteredProducts.length} stale. Queuing refresh.`);
      
      await jobQueue.enqueue({
        job_type: 'scrape_query',
        query_text: query,
        priority: 5,
        data: {
          staleFraction: `${allStaleCount}/${filteredProducts.length}`,
          staleFields: [...new Set(staleQueryProducts.flatMap(p => p.staleFields))],
        },
      }).catch(err =>
        logger.warn('[SearchHybrid] Failed to queue background refresh:', err.message)
      );
    }

    // Track search metadata
    await updateSearchMetadata(query, filteredProducts.length, isQueryStale).catch(err =>
      logger.warn('[SearchHybrid] Failed to update search metadata: ' + (err?.message || String(err)))
    );

    const nextRefreshMinutes = isQueryStale 
      ? Math.max(1, Math.ceil(freshnessEngine.getTTL('price', 'PCExpress') / 60000)) 
      : '—';

    return {
      products: filteredProducts,
      metadata: {
        totalResults: filteredProducts.length,
        isStale: isQueryStale,
        staleFraction: `${allStaleCount}/${result.products.length}`,
        freshness: queryFreshness,
        source: 'database (background refresh scheduled)',
        searchTime: Date.now() - startTime,
        nextRefreshIn: `${nextRefreshMinutes} minutes`,
        staleFields: [...new Set(staleQueryProducts.flatMap(p => p.staleFields))],
      },
    };
  } catch (err) {
    logger.error('[SearchHybrid] Error:', err.message);
    throw err;
  }
}

/**
 * Update search metadata in database
 */
async function updateSearchMetadata(query, productCount, isStale) {
  const { error } = await supabase
    .from('search_cache_metadata')
    .upsert({
      query_text: query.toLowerCase().trim(),
      last_scraped_at: new Date().toISOString(),
      is_fresh: !isStale,
      product_count: productCount,
      scraped_stores: ['PCExpress', 'Villman', 'PCWorx'],
    }, {
      onConflict: 'query_text',
    });

  if (error) throw error;
}

/**
 * Calculate overall freshness percentage
 */
function calculateFreshness(products) {
  if (products.length === 0) return 0;

  let freshCount = 0;
  for (const product of products) {
    if (freshnessEngine.calculateFreshness(product, product.platform) >= 75) {
      freshCount++;
    }
  }

  return Math.round((freshCount / products.length) * 100);
}

module.exports = { search, getSearchResults, loadPlatformIds, scrapeAllStores, scrapeByStore, paginateResults, semanticSearch, validateCacheFreshness, shouldRescrape, getCacheAge, searchWithFallback, searchHybrid, updateSearchMetadata };