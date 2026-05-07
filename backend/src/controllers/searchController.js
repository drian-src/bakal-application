'use strict';

const searchService = require('../services/searchService');
const searchRepo = require('../repositories/searchRepository');
const productRepo = require('../repositories/productRepository');
const logger = require('../config/logger');
const { getEnabledStores } = require('../config/stores');

async function search(req, res, next) {
  try {
    const { q: rawQuery, limit, page, pageSize, dealsOnly, minDiscount, store } = req.query;
    if (!rawQuery || !rawQuery.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter "q" is required.' });
    }
    // Normalize: trim whitespace + strip trailing punctuation from voice search
    // Example: "laptop." → "laptop", "monitor, " → "monitor"
    const q = rawQuery.trim().replace(/[.,!?;:]+$/, '').trim();

    // Guard against query becoming empty after stripping (e.g. query was just ".")
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query is empty after normalization.' });
    }

    // BUG FIX 4: Query validation — reject garbage queries
    // Minimum length: 2 characters
    if (q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters.'
      });
    }

    // Maximum length: 200 characters (prevent abuse)
    if (q.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Search query is too long (max 200 characters).'
      });
    }

    // Quality check: reject keyboard mashes like "czxcxzczx"
    // Real queries always have vowels OR spaces OR are short acronyms (<=4 chars)
    const hasVowel = /[aeiouAEIOU]/.test(q);
    const hasSpace = q.includes(' ');
    const isShortAcronym = q.length <= 4; // "cpu", "gpu", "ssd", "nvme"

    if (!hasVowel && !hasSpace && !isShortAcronym) {
      logger.warn(`[SearchController] Rejected low-quality query: "${q}"`);
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid search term.'
      });
    }

    const userId = req.user?.id || null;
    // Return ALL results by default; allow optional limit via query param
    const resultLimit = limit ? parseInt(limit, 10) : null;

    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(parseInt(pageSize) || 20, 100)); // Cap at 100

    // Parse deals filter parameters
    const dealsOnlyFlag = dealsOnly === 'true' || dealsOnly === '1';
    const minDiscountValue = parseInt(minDiscount, 10) || 0;

    // Normalize store filter (allow 'all' or specific store: pcexpress, villman, pcworx)
    const storeFilter = store && store.toLowerCase() !== 'all' ? store.toLowerCase().trim() : null;

    // USE HYBRID SEARCH (with freshness checking and background refresh)
    const result = await searchService.searchHybrid(q, userId, {
      limit: resultLimit,
      dealsOnly: dealsOnlyFlag,
      minDiscount: minDiscountValue,
      store: storeFilter,  // 🆕 Pass store filter to search service
    });

    // Apply pagination to products after ranking
    const { results: paginatedProducts, totalCount, totalPages } = searchService.paginateResults(
      result.products,
      pageNum,
      pageSizeNum
    );

    // 🆕 VALIDATE: All products must have IDs before returning to frontend
    // This is a safety check — if products don't have IDs, the upsert failed
    const productsWithIds = paginatedProducts.filter(p => p.id);
    const productsWithoutIds = paginatedProducts.filter(p => !p.id);
    
    // 🆕 FIX: Log which platforms have missing IDs
    const missingIdsByPlatform = {};
    for (const p of productsWithoutIds) {
      const platform = p.platform || 'unknown';
      missingIdsByPlatform[platform] = (missingIdsByPlatform[platform] || 0) + 1;
    }
    
    if (productsWithoutIds.length > 0) {
      // ALERT: This indicates upsertProductsBatch failed silently
      logger.error(
        `[SearchController] ❌ CRITICAL: ${productsWithoutIds.length}/${paginatedProducts.length} products WITHOUT IDs — ` +
        `by platform: ${JSON.stringify(missingIdsByPlatform)} — ` +
        `this indicates database upsert failed. Check if: ` +
        `1) onConflict is set to 'product_url' (not 'id') ` +
        `2) No fresh UUIDs are being generated for existing products ` +
        `3) Foreign key constraints are not being violated. ` +
        `Sample products: ${JSON.stringify(productsWithoutIds.slice(0, 2).map(p => ({ title: p.title?.substring(0, 30), platform: p.platform, url: p.product_url })))}`
      );
      
      // Return error to frontend instead of invalid products
      return res.status(500).json({
        success: false,
        message: 'Search results could not be saved to database. Please try again.',
        debug: process.env.NODE_ENV === 'development' ? {
          productsWithoutIds: productsWithoutIds.length,
          byPlatform: missingIdsByPlatform,
          reason: 'Upsert failed or FK constraint violated'
        } : undefined
      });
    }
    
    if (productsWithIds.length > 0) {
      // 🆕 FIX: Log product counts by platform to verify PCExpress is included
      const countByPlatform = {};
      for (const p of productsWithIds) {
        const platform = p.platform || 'unknown';
        countByPlatform[platform] = (countByPlatform[platform] || 0) + 1;
      }
      logger.info(
        `[SearchController] ✅ Response contains ${productsWithIds.length} products with valid IDs ` +
        `| PCExpress=${countByPlatform['PCExpress'] || 0} VillMan=${countByPlatform['VillMan'] || 0} PCWorx=${countByPlatform['PCWorx'] || 0}`
      );
    }

    // 🆕 Track views for top 5 results (viewed by user on first page)
    if (productsWithIds.length > 0) {
      productsWithIds.slice(0, 5).forEach(p => {
        productRepo.incrementViewCount(p.id).catch(err =>
          logger.warn('[SearchController] Failed to increment view count:', err.message)
        );
      });
    }

    // 🆕 Add cache freshness metadata to response
    const cacheMetadata = {
      ...result.metadata,
      cacheHit: true,  // Hybrid always uses cache first
      stores: ['PCExpress', 'Villman', 'PCWorx'],
    };

    // Return response with pagination metadata and cache info
    // Only return products WITH IDs to frontend to avoid undefined product ID errors
    return res.status(200).json({
      success: true,
      data: {
        ...result,
        products: productsWithIds,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          totalCount: productsWithIds.length,
          totalPages: Math.ceil(productsWithIds.length / pageSizeNum),
        },
        // 🆕 NEW: Freshness metadata from hybrid search
        metadata: cacheMetadata
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getSearchResults(req, res, next) {
  try {
    const { searchId } = req.params;
    const results = await searchService.getSearchResults(searchId);
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

async function getSearchHistory(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const history = await searchRepo.findByUserId(userId, limit);
    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

async function deleteSearchHistory(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    await searchRepo.deleteByUserId(userId);
    return res.status(200).json({ success: true, message: 'Search history cleared' });
  } catch (err) {
    next(err);
  }
}

async function getStores(req, res, next) {
  try {
    const stores = getEnabledStores().map(({ id, name, icon, color }) => ({
      id,
      name,
      icon,
      color,
    }));
    return res.status(200).json({ success: true, data: { stores } });
  } catch (err) {
    next(err);
  }
}

module.exports = { search, getSearchResults, getSearchHistory, deleteSearchHistory, getStores };