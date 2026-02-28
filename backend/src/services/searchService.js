'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');
const pcexpressScraper = require('../scrapers/pcexpressScraper');
const villmanScraper = require('../scrapers/villmanScraper');
const pcworxScraper = require('../scrapers/pcworxScraper');
const searchRepo = require('../repositories/searchRepository');
const productRepo = require('../repositories/productRepository');
const productSourceRepo = require('../repositories/productSourceRepository');

// ============================================================
// BACKEND SEARCH CACHE — Prevent re-scraping same query
// ============================================================
const scrapeCache = new Map();
const BACKEND_CACHE_MS = 15 * 60 * 1000; // 15 minutes

const getCachedOrScrape = async (query, scrapeFn) => {
  const key = query.toLowerCase().trim();
  const cached = scrapeCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < BACKEND_CACHE_MS) {
    logger.info(`[Backend Cache HIT] Query: "${key}"`);
    return cached.data;
  }

  logger.info(`[Backend Cache MISS] Scraping: "${key}"...`);
  const result = await scrapeFn();
  scrapeCache.set(key, { data: result, timestamp: Date.now() });
  return result;
};

let PLATFORM_IDS = {};

async function loadPlatformIds() {
  const { data, error } = await supabase.from('platforms').select('id, name');
  if (error) throw error;
  for (const p of data) PLATFORM_IDS[p.name] = p.id;
  logger.info(`[SearchService] Platform IDs loaded: ${JSON.stringify(PLATFORM_IDS)}`);
}

/**
 * Check if a scraped product is relevant to the search query.
 * At least ONE query word must appear in the product title or URL.
 */
function isRelevantProduct(product, query) {
  // Split query into words, trim, and remove empty strings
  // Don't filter by length — keep all words (even 1-2 char like "tv", "4k", "pc")
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  // If no query words, accept all products (shouldn't happen)
  if (queryWords.length === 0) return true;
  
  const titleLower = (product.title || '').toLowerCase();
  const urlLower = (product.product_url || '').toLowerCase();
  
  // At least ONE query word must appear in title or URL
  return queryWords.some(word => titleLower.includes(word) || urlLower.includes(word));
}

async function search(query, userId = null, maxPerPlatform = 5) {
  if (!Object.keys(PLATFORM_IDS).length) await loadPlatformIds();

  const searchRecord = await searchRepo.create(userId, query);
  logger.info(`[SearchService] Search #${searchRecord.id} - "${query}"`);

  // Use backend cache to avoid re-scraping
  const rawProducts = await getCachedOrScrape(query, async () => {
    // Search all 3 platforms in parallel
    const [pcexpressResults, villmanResults, pcworxResults] = await Promise.allSettled([
      pcexpressScraper.search(query, maxPerPlatform),
      villmanScraper.search(query, maxPerPlatform),
      pcworxScraper.search(query, maxPerPlatform),
    ]);

    if (pcexpressResults.status === 'rejected')
      logger.error(`[SearchService] PC Express failed: ${pcexpressResults.reason?.message}`);
    if (villmanResults.status === 'rejected')
      logger.error(`[SearchService] Villman failed: ${villmanResults.reason?.message}`);
    if (pcworxResults.status === 'rejected')
      logger.error(`[SearchService] PC Worx failed: ${pcworxResults.reason?.message}`);

    return [
      ...(pcexpressResults.status === 'fulfilled' ? pcexpressResults.value : []),
      ...(villmanResults.status === 'fulfilled' ? villmanResults.value : []),
      ...(pcworxResults.status === 'fulfilled' ? pcworxResults.value : []),
    ];
  });

  logger.info(`[SearchService] Raw products: ${rawProducts.length}`);

  // Step 1 — Deduplicate by product_url
  const seen = new Set();
  const uniqueProducts = rawProducts.filter((p) => {
    if (!p || !p.product_url || seen.has(p.product_url)) return false;
    seen.add(p.product_url);
    return true;
  });

  // Step 2 — Relevance filter: remove products unrelated to the query
  const relevantProducts = uniqueProducts.filter(p => isRelevantProduct(p, query));

  logger.info(
    `[SearchService] Relevance filter: ${relevantProducts.length}/${uniqueProducts.length} products kept`
  );

  // Step 3 — Save relevant products to DB
  const savedProducts = [];
  const sources = [];

  for (let i = 0; i < relevantProducts.length; i++) {
    const p = relevantProducts[i];
    try {
      const platformId = PLATFORM_IDS[p.platform];
      if (!platformId) {
        logger.warn(`[SearchService] Unknown platform: ${p.platform} — run SQL to fix platforms table`);
        continue;
      }

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

      savedProducts.push({ ...saved, platform: p.platform });
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

  return {
    search_id: searchRecord.id,
    query,
    total: savedProducts.length,
    products: savedProducts,
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