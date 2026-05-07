'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');

/**
 * Stop words — common English words with no semantic value
 * Filtered during keyword extraction to focus on meaningful product attributes
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'its', 'it',
  'this', 'that', 'from', 'by', 'as', 'into', 'up', 'out', 'but', 'not',
  'also', 'just', 'more', 'new', 'best', 'top',
]);

/**
 * ============================================================
 * SECTION A — INTERACTION TRACKING
 * ============================================================
 */

/**
 * Track user interactions (search, click, view, cart_add) for recommendation data.
 * Fails safely — never throws errors. Non-critical infrastructure.
 *
 * @param {string} userId - UUID of the authenticated user
 * @param {string} eventType - one of: 'search' | 'click' | 'view' | 'cart_add'
 * @param {Object} options - { productId, query, metadata }
 */
async function trackInteraction(userId, eventType, options = {}) {
  try {
    const { productId = null, query = null, metadata = {} } = options;

    const { error } = await supabase
      .from('user_interactions')
      .insert({
        user_id: userId,
        product_id: productId,
        event_type: eventType,
        query,
        metadata,
      });

    if (error) {
      logger.warn(`[Rec] trackInteraction failed (non-critical): ${error.message}`);
      return;
    }

    logger.debug(`[Rec] Tracked ${eventType} for user ${userId}`);
  } catch (err) {
    logger.warn(`[Rec] trackInteraction caught exception (non-critical): ${err.message}`);
  }
}

/**
 * ============================================================
 * SECTION B — KEYWORD EXTRACTION & SIMILARITY
 * ============================================================
 */

/**
 * Extract meaningful keywords from a text string (product title, search query).
 * Converts to Set of lowercase, non-stop-word tokens.
 *
 * @param {string} text - Product title or search query
 * @returns {Set<string>} Deduplicated keywords
 */
function extractKeywords(text) {
  if (!text) return new Set();

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Replace non-alphanumeric with space
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 2 && !STOP_WORDS.has(word)); // Filter short & stop words

  return new Set(words);
}

/**
 * Compute Jaccard similarity between two Sets: |A ∩ B| / |A ∪ B|
 * Measures keyword overlap between products (0–1 scale).
 * Returns 0 if either set is empty.
 *
 * @param {Set<string>} setA - First keyword set
 * @param {Set<string>} setB - Second keyword set
 * @returns {number} Similarity score (0–1)
 */
function computeJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(k => setB.has(k)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * ============================================================
 * SECTION C — EXPLANATION GENERATOR
 * ============================================================
 */

/**
 * Generate a human-readable explanation for why a product was recommended.
 * Ensures transparency and builds user trust.
 *
 * @param {string} reasonType - Type of recommendation reason
 * @param {Object} context - { query?, productTitle?, category? }
 * @returns {string} User-friendly explanation (never undefined)
 */
function generateExplanation(reasonType, context = {}) {
  // Truncate product title to 40 chars if present
  const title = context.productTitle
    ? context.productTitle.slice(0, 40) + (context.productTitle.length > 40 ? '...' : '')
    : '';

  const templates = {
    searched_for: () => `Because you searched for "${context.query}"`,
    similar_to_viewed: () => `Similar to "${title}" you viewed`,
    similar_to_clicked: () => `Related to "${title}" you clicked`,
    users_also_viewed: () => 'Shoppers with similar interests also viewed this',
    popular_in_category: () => `Popular in ${context.category || 'this category'}`,
    cart_similar: () => 'Complements an item in your saved list',
    trending: () => 'Trending among Filipino shoppers this week',
  };

  return templates[reasonType]?.() || 'Recommended for you';
}

/**
 * ============================================================
 * SECTION D — CONTENT-BASED FILTERING
 * ============================================================
 */

/**
 * Get user's cart ID from the database.
 * Private helper — not exported.
 *
 * @param {string} userId - UUID of the user
 * @returns {Promise<string|null>} Cart ID or null if not found
 */
async function getUserCartId(userId) {
  try {
    const { data, error } = await supabase
      .from('cart')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    logger.debug(`[Rec] getUserCartId error: ${err.message}`);
    return null;
  }
}

/**
 * Generate content-based recommendation candidates by finding products similar
 * to what the user searched for, viewed, or saved to cart.
 * Works with zero interaction history (no cold-start problem).
 *
 * @param {string} userId - UUID of the user
 * @param {string[]} viewedProductIds - Product IDs the user viewed/clicked
 * @param {string[]} recentSearches - Recent search query strings
 * @returns {Promise<Array>} Candidates: { productId, score, reasonType, context }
 */
async function getContentBasedCandidates(userId, viewedProductIds, recentSearches) {
  const candidates = [];

  // ── STRATEGY A: Search-intent matching (score: 0.8) ──────────────────────
  for (const query of recentSearches.slice(0, 3)) {
    const keywords = [...extractKeywords(query)].slice(0, 3);

    for (const keyword of keywords) {
      try {
        const excludeIds = viewedProductIds.length > 0
          ? viewedProductIds
          : [];

        const { data, error } = await supabase
          .from('products')
          .select('id, title')
          .ilike('title', `%${keyword}%`)
          .limit(5);

        if (error) throw error;

        for (const product of data || []) {
          if (!excludeIds.includes(product.id)) {
            candidates.push({
              productId: product.id,
              score: 0.8,
              reasonType: 'searched_for',
              context: { query },
            });
          }
        }
      } catch (err) {
        logger.warn(`[Rec] Content strategy A error for keyword "${keyword}": ${err.message}`);
      }
    }
  }

  // ── STRATEGY B: Viewed-item similarity (score: 0.6) ──────────────────────
  if (viewedProductIds.length > 0) {
    try {
      const { data: viewedProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, title')
        .in('id', viewedProductIds.slice(0, 3));

      if (fetchError) throw fetchError;

      for (const viewed of viewedProducts || []) {
        const keywords = [...extractKeywords(viewed.title)].slice(0, 2);

        for (const keyword of keywords) {
          try {
            const { data, error } = await supabase
              .from('products')
              .select('id, title')
              .ilike('title', `%${keyword}%`)
              .neq('id', viewed.id)
              .limit(5);

            if (error) throw error;

            for (const product of data || []) {
              candidates.push({
                productId: product.id,
                score: 0.6,
                reasonType: 'similar_to_viewed',
                context: { productTitle: viewed.title },
              });
            }
          } catch (err) {
            logger.warn(`[Rec] Content strategy B error: ${err.message}`);
          }
        }
      }
    } catch (err) {
      logger.warn(`[Rec] Content strategy B fetch error: ${err.message}`);
    }
  }

  // ── STRATEGY C: Cart-based similarity (score: 0.7) ───────────────────────
  try {
    const cartId = await getUserCartId(userId);
    if (!cartId) {
      logger.debug('[Rec] No cart found for user — skipping cart strategy');
    } else {
      const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('products(id, title)')
        .eq('cart_id', cartId)
        .limit(3);

      if (cartError) throw cartError;

      for (const item of cartItems || []) {
        const product = item.products;
        if (!product?.title) continue;

        const keywords = [...extractKeywords(product.title)].slice(0, 2);

        for (const keyword of keywords) {
          try {
            const { data, error } = await supabase
              .from('products')
              .select('id, title')
              .ilike('title', `%${keyword}%`)
              .neq('id', product.id)
              .limit(4);

            if (error) throw error;

            for (const p of data || []) {
              candidates.push({
                productId: p.id,
                score: 0.7,
                reasonType: 'cart_similar',
                context: { productTitle: product.title },
              });
            }
          } catch (err) {
            logger.warn(`[Rec] Content strategy C error: ${err.message}`);
          }
        }
      }
    }
  } catch (err) {
    logger.debug(`[Rec] Cart strategy error (may be empty): ${err.message}`);
  }

  // ── DEDUPLICATION: Keep highest score per productId ──────────────────────
  const deduped = {};
  for (const c of candidates) {
    if (!deduped[c.productId] || deduped[c.productId].score < c.score) {
      deduped[c.productId] = c;
    }
  }

  return Object.values(deduped);
}

/**
 * ============================================================
 * SECTION E — ITEM-BASED COLLABORATIVE FILTERING
 * ============================================================
 */

/**
 * Find products that co-occur with a seed product in user interactions.
 * Uses normalized co-occurrence frequency as the relevance score.
 * Returns products that other users who viewed the seed product also viewed.
 *
 * @param {string} productId - UUID of the seed product
 * @param {number} limit - Max recommendations to return (default 10)
 * @returns {Promise<Array>} { productId, score }
 */
async function getCollaborativeRecommendations(productId, limit = 10) {
  try {
    // Step 1: Find users who interacted with productId
    const { data: interactors, error: interactorError } = await supabase
      .from('user_interactions')
      .select('user_id')
      .eq('product_id', productId)
      .in('event_type', ['click', 'view', 'cart_add']);

    if (interactorError) throw interactorError;

    if (!interactors || interactors.length < 2) {
      logger.debug(`[Rec] Not enough interactors (${interactors?.length || 0}) for collaborative filtering`);
      return [];
    }

    const userIds = [...new Set(interactors.map(i => i.user_id))];
    const totalInteractors = userIds.length;

    // Step 2: Find other products those users interacted with
    const { data: coInteractions, error: coError } = await supabase
      .from('user_interactions')
      .select('product_id')
      .in('user_id', userIds)
      .neq('product_id', productId)
      .in('event_type', ['click', 'view', 'cart_add']);

    if (coError) throw coError;
    if (!coInteractions || coInteractions.length === 0) return [];

    // Step 3: Count co-occurrences per product
    const counts = {};
    for (const { product_id } of coInteractions) {
      if (product_id) {
        counts[product_id] = (counts[product_id] || 0) + 1;
      }
    }

    // Step 4: Normalize scores, sort, and return top N
    const recommendations = Object.entries(counts)
      .map(([pid, count]) => ({
        productId: pid,
        score: Math.min(count / totalInteractors, 1),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  } catch (err) {
    logger.warn(`[Rec] Collaborative filtering error: ${err.message}`);
    return [];
  }
}

/**
 * ============================================================
 * SECTION F — HYBRID RECOMMENDATION ENGINE
 * ============================================================
 */

/**
 * Build personalized recommendations using a switching hybrid strategy:
 * - Cold start (< 5 interactions): Return trending products
 * - Warm (≥ 5 interactions): Blend content-based (60%) + collaborative (40%)
 *
 * Returns fresh recommendations for every authenticated request.
 * The cache is no longer used for user-facing recommendation refresh.
 * Never throws — always returns array (possibly empty).
 *
 * @param {string} userId - UUID of the authenticated user
 * @param {number} limit - Max recommendations to return (default 10)
 * @returns {Promise<Array>} { product, score, explanation, reasonType }
 */
async function getRecommendations(userId, limit = 10) {
  try {
    // ── STEP 1: Fresh recommendation policy ─────────────────────────────────
    // Do not serve stale cached recommendations; compute fresh results for each
    // sign-in and page reload request.

    // ── STEP 2: Fetch user interaction history ───────────────────────────────
    const { data: interactions, error: interError } = await supabase
      .from('user_interactions')
      .select('product_id, event_type, query')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (interError) throw interError;

    const recentSearches = [
      ...new Set(
        (interactions || [])
          .filter(i => i.event_type === 'search' && i.query)
          .slice(0, 5)
          .map(i => i.query)
      ),
    ];

    const viewedProductIds = [
      ...new Set(
        (interactions || [])
          .filter(i => ['view', 'click'].includes(i.event_type) && i.product_id)
          .map(i => i.product_id)
          .slice(0, 10)
      ),
    ];

    const totalInteractions = interactions?.length || 0;

    // ── STEP 3: Cold start check ─────────────────────────────────────────────
    if (totalInteractions < 5) {
      logger.info(`[Rec] Cold start for user ${userId} (${totalInteractions} interactions) — serving trending`);
      return await getTrendingProducts(limit);
    }

    // ── STEP 4: Get candidates from BOTH algorithms in parallel ──────────────
    const [contentCandidates, collaborativeCandidates] = await Promise.all([
      getContentBasedCandidates(userId, viewedProductIds, recentSearches),
      viewedProductIds.length > 0
        ? getCollaborativeRecommendations(viewedProductIds[0], 20)
        : Promise.resolve([]),
    ]);

    logger.info(
      `[Rec] Candidates: ${contentCandidates.length} content, ${collaborativeCandidates.length} collaborative`
    );

    // ── STEP 5: Define hybrid weights ────────────────────────────────────────
    const CONTENT_WEIGHT = 0.6;
    const COLLABORATIVE_WEIGHT = 0.4;

    // ── STEP 6: Merge candidates into unified score map ──────────────────────
    const scoreMap = {};

    for (const c of contentCandidates) {
      if (!scoreMap[c.productId]) {
        scoreMap[c.productId] = { ...c, finalScore: 0 };
      }
      scoreMap[c.productId].finalScore += c.score * CONTENT_WEIGHT;
    }

    for (const c of collaborativeCandidates) {
      if (!scoreMap[c.productId]) {
        scoreMap[c.productId] = {
          productId: c.productId,
          finalScore: 0,
          reasonType: 'users_also_viewed',
          context: {},
        };
      }
      scoreMap[c.productId].finalScore += c.score * COLLABORATIVE_WEIGHT;
    }

    // ── STEP 7: Sort, filter, and fetch product details ──────────────────────
    const topIds = Object.values(scoreMap)
      .filter(c => !viewedProductIds.includes(c.productId))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
      .map(c => c.productId);

    if (topIds.length === 0) {
      logger.debug('[Rec] No hybrid candidates — falling back to trending');
      return await getTrendingProducts(limit);
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*, platforms(name)')
      .in('id', topIds);

    if (productsError) throw productsError;

    // ── STEP 8: Attach explanation to each product ───────────────────────────
    const results = (products || [])
      .map(product => {
        const candidate = scoreMap[product.id];
        const explanation = generateExplanation(
          candidate?.reasonType || 'popular_in_category',
          candidate?.context || {}
        );
        return {
          product: { ...product, platform: product.platforms?.name || null },
          score: candidate?.finalScore || 0,
          explanation,
          reasonType: candidate?.reasonType || 'popular_in_category',
        };
      })
      .sort((a, b) => b.score - a.score);

    logger.info(`[Rec] Built ${results.length} recommendations for user ${userId} (hybrid)`);
    return results;
  } catch (err) {
    logger.error(`[Rec] getRecommendations error: ${err.message}`);
    return [];
  }
}

/**
 * Cold-start fallback: Return recently scraped products.
 * Typically ~6–24 hours old depending on scraper schedule.
 *
 * @param {number} limit - Max products to return (default 10)
 * @returns {Promise<Array>} { product, score, explanation, reasonType }
 */
async function getTrendingProducts(limit = 10) {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, platforms(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (products || []).map(product => ({
      product: { ...product, platform: product.platforms?.name || null },
      score: 0.5,
      explanation: generateExplanation('trending'),
      reasonType: 'trending',
    }));
  } catch (err) {
    logger.error(`[Rec] getTrendingProducts error: ${err.message}`);
    return [];
  }
}

/**
 * ============================================================
 * MODULE EXPORTS
 * ============================================================
 */

module.exports = {
  trackInteraction,
  getRecommendations,
  getTrendingProducts,
  generateExplanation,
  extractKeywords,
  computeJaccardSimilarity,
};