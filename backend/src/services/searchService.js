'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');
const pcexpressScraper = require('../scrapers/pcexpressScraper');
const villmanScraper = require('../scrapers/villmanScraper');
const pcworxScraper = require('../scrapers/pcworxScraper');
const searchRepo = require('../repositories/searchRepository');
const productRepo = require('../repositories/productRepository');
const productSourceRepo = require('../repositories/productSourceRepository');

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
  const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  const titleLower = (product.title || '').toLowerCase();
  const urlLower = (product.product_url || '').toLowerCase();
  return queryWords.some(word => titleLower.includes(word) || urlLower.includes(word));
}

async function search(query, userId = null, maxPerPlatform = 5) {
  if (!Object.keys(PLATFORM_IDS).length) await loadPlatformIds();

  const searchRecord = await searchRepo.create(userId, query);
  logger.info(`[SearchService] Search #${searchRecord.id} - "${query}"`);

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

  const rawProducts = [
    ...(pcexpressResults.status === 'fulfilled' ? pcexpressResults.value : []),
    ...(villmanResults.status === 'fulfilled' ? villmanResults.value : []),
    ...(pcworxResults.status === 'fulfilled' ? pcworxResults.value : []),
  ];

  logger.info(`[SearchService] Raw products scraped: ${rawProducts.length}`);

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