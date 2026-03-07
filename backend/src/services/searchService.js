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

// ============================================================
// BACKEND SEARCH CACHE — Prevent re-scraping same query
// ============================================================
const scrapeCache = new Map();
const BACKEND_CACHE_MS = 15 * 60 * 1000; // 15 minutes

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

  logger.info(`[Backend Cache MISS] Scraping: "${key}"...`);
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
};

let PLATFORM_IDS = {};

async function loadPlatformIds() {
  if (!supabase) {
    PLATFORM_IDS = {};
    logger.warn('[SearchService] Supabase not configured; skipping platform ID load.');
    return;
  }

  const { data, error } = await supabase.from('platforms').select('id, name');
  if (error) throw error;
  for (const p of data) PLATFORM_IDS[p.name.toLowerCase().trim()] = p.id;
  logger.info(`[SearchService] Platform IDs loaded: ${JSON.stringify(PLATFORM_IDS)}`);
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

async function search(query, userId = null, maxPerPlatform = 5) {
  if (!Object.keys(PLATFORM_IDS).length) await loadPlatformIds();

  // FIX: Strip trailing punctuation added by voice recognition (e.g. "CPU." → "CPU")
  // Chrome's Web Speech API appends periods, commas, and question marks automatically.
  // These break the relevance filter's includes() check and store search APIs.
  const normalizedQuery = query.trim().replace(/[.,!?;:]+$/, '');

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

  // Scrape all stores in parallel with timeouts
  const storeResults = await getCachedOrScrape(normalizedQuery, async () => {
    const enabledStores = getEnabledStores();
    
    // Fire all scrappers simultaneously
    const scrapePromises = enabledStores.map((store) => {
      const scraper = scraperMap[store.id];
      if (!scraper) {
        return Promise.resolve({
          store,
          items: [],
          error: `No scraper found for ${store.name}`,
        });
      }

      return withTimeout(
        scraper.search(normalizedQuery, maxPerPlatform),
        SCRAPER_TIMEOUT_MS,
        store.name
      )
        .then((items) => ({
          store,
          items: items || [],
          error: null,
        }))
        .catch((err) => ({
          store,
          items: [],
          error: err.message || 'Scrape failed',
        }));
    });

    // Wait for all scrapers to finish
    const results = await Promise.allSettled(scrapePromises);

    return results.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      return { store: null, items: [], error: 'Unexpected failure' };
    });
  });

  // Flatten products and add store tracking
  const allProducts = [];
  for (const storeResult of storeResults) {
    if (storeResult.error) {
      logger.warn(`[SearchService] ${storeResult.store?.name}: ${storeResult.error}`);
    }
    
    for (const product of storeResult.items) {
      allProducts.push({
        ...product,
        platform: storeResult.store?.name,
        storeId: storeResult.store?.id,
      });
    }
  }

  logger.info(`[SearchService] Raw products: ${allProducts.length}`);

  // Step 1 — Deduplicate by product_url
  const seen = new Set();
  const uniqueProducts = allProducts.filter((p) => {
    if (!p || !p.product_url || seen.has(p.product_url)) return false;
    seen.add(p.product_url);
    return true;
  });

  logger.info(`[SearchService] Unique products after dedup: ${uniqueProducts.length}`);

  // Step 2 — Relevance filter: remove products unrelated to the query
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

  if (rejectedProducts.length > 0 && rejectedProducts.length <= 3) {
    logger.info(`[SearchService] Sample rejected products for query "${normalizedQuery}":`);
    rejectedProducts.slice(0, 3).forEach(p => {
      logger.info(`  - ${p.title}`);
    });
  }

  // Step 3 — Save relevant products to DB grouped by store (if DB enabled)
  const savedProducts = [];
  const sources = [];
  const groupedByStore = {};

  if (dbEnabled) {
    for (let i = 0; i < relevantProducts.length; i++) {
      const p = relevantProducts[i];
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
          rating: p.rating,
          reviews_count: p.reviews_count,
          seller_name: p.seller_name,
          product_url: p.product_url,
          image_url: p.image_url,
          platform_id: platformId,
        });

        const productWithMeta = { ...saved, platform: p.platform, storeId: p.storeId };
        savedProducts.push(productWithMeta);

        // Group by store for response
        if (!groupedByStore[p.storeId]) {
          groupedByStore[p.storeId] = [];
        }
        groupedByStore[p.storeId].push(productWithMeta);

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
    // DB disabled — return scraped products directly (no persistence)
    logger.info('[SearchService] DB disabled — returning scraped products without saving');
    // Group relevant products by store
    for (const p of relevantProducts) {
      if (!groupedByStore[p.storeId]) groupedByStore[p.storeId] = [];
      groupedByStore[p.storeId].push({ ...p, platform: p.platform });
      savedProducts.push({ ...p, platform: p.platform });
    }
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

  return {
    search_id: searchRecord.id,
    query: normalizedQuery,
    total: savedProducts.length,
    stores: storesResponse,
    products: savedProducts, // Keep this for backward compatibility
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

module.exports = { search, getSearchResults, loadPlatformIds };