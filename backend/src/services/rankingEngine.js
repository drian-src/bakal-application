'use strict';

const logger = require('../config/logger');
const { supabase } = require('../config/db');
const { generateEmbedding, cosineSimilarity } = require('./embeddingService');

// ============================================================
// UUID VALIDATION (for Supabase ID validation)
// ============================================================

// UUID v4 regex — Supabase uses UUID v4 for all primary keys
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * ============================================================
 * RANKING ENGINE — 5-FACTOR PERSONALIZED SCORING SYSTEM
 * ============================================================
 * 
 */

// ============================================================
// WEIGHT CONSTANTS
// ============================================================

const RANKING_WEIGHTS = {
  keywordRelevance: 0.35,  // Exact search query match
  userBehavior: 0.20,     // Based on past searched queries
  itemSimilarity: 0.20,   // Based on clicked/viewed products
  popularity: 0.15,       // Aggregate engagement across all users
  priceRelevance: 0.10,   // Within user's typical spending range
};

const COLD_START_WEIGHTS = {
  keywordRelevance: 0.35,  // Relevance is king for new users
  userBehavior: 0.00,     // No past behavior to use
  itemSimilarity: 0.00,   // No click history to use
  popularity: 0.45,       // Rely heavily on platform popularity (viral effect)
  priceRelevance: 0.20,   // Budget constraints are universal
};

// ============================================================
// HELPER: Extract query/title tokens
// ============================================================

function extractTokens(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

// ============================================================
// HELPER: Extract keywords (alias for extractTokens)
// ============================================================

function extractKeywords(text) {
  return new Set(extractTokens(text));
}

// ============================================================
// HELPER: Compute Jaccard similarity between two sets
// ============================================================

function computeJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  
  return intersection / union;
}

// ============================================================
// SECTION A — KEYWORD RELEVANCE SCORER
// ============================================================

/**
 * scoreKeywordRelevance - Uses embeddings for semantic matching
 * Measures how closely the product matches the user's search query by MEANING.
 * Weight: 0.35 (normal) | 0.35 (cold-start — relevance is always most important)
 * 
 * @param {object} product - Product with {title, description, _similarity}
 * @param {string} query - Search query
 * @returns {Promise<object>} { score: [0, 1], explanation: string|null }
 */
async function scoreKeywordRelevance(product, query) {
  try {
    if (!product?.title || !query?.trim()) {
      return { score: 0, explanation: null };
    }

    // Use pre-computed similarity if available (from semantic search)
    // _similarity is set in semanticSearch() for DB results
    if (typeof product._similarity === 'number') {
      let explanation = null;
      if (product._similarity >= 0.7) explanation = `Closely matches your search for "${query}"`;
      else if (product._similarity >= 0.5) explanation = `Matches your search for "${query}"`;
      else if (product._similarity >= 0.3) explanation = `Partially matches "${query}"`;
      return { score: product._similarity, explanation };
    }

    // For live-scraped products (no pre-computed similarity):
    // Generate embedding for query and compute cosine similarity
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      // Fall back to basic title contains check
      const titleLower = (product.title || '').toLowerCase();
      const queryLower = query.toLowerCase().trim();
      const score = titleLower.includes(queryLower) ? 0.6 : 0.1;
      return { score, explanation: score >= 0.5 ? `Matches your search for "${query}"` : null };
    }

    // Get product's stored embedding from DB if available
    // For freshly scraped products, generate embedding inline
    const productText = (product.title || '').trim();
    const productEmbedding = await generateEmbedding(productText);
    if (!productEmbedding) return { score: 0, explanation: null };

    const score = cosineSimilarity(queryEmbedding, productEmbedding);

    let explanation = null;
    if (score >= 0.7) explanation = `Closely matches your search for "${query}"`;
    else if (score >= 0.5) explanation = `Matches your search for "${query}"`;
    else if (score >= 0.3) explanation = `Partially matches "${query}"`;

    return { score, explanation };

  } catch (err) {
    logger.warn(`[RankingEngine] scoreKeywordRelevance embedding error: ${err.message}`);
    return { score: 0, explanation: null };
  }
}

// ============================================================
// SUB-SCORE FUNCTIONS (Legacy — Normalized to [0, 1])
// ============================================================

/**
 * computeRelevanceScore - Token matching in title/description
 * @param {object} product - Product with {title, description}
 * @param {string} query - Search query
 * @returns {number} [0, 1]
 */
function computeRelevanceScore(product, query) {
  if (!product?.title || !query?.trim()) return 0;

  const queryTokens = extractTokens(query);
  if (queryTokens.length === 0) return 0;

  const titleLower = (product.title || '').toLowerCase();
  const descriptionLower = (product.description || '').toLowerCase();

  const TITLE_WEIGHT = 2;
  const DESC_WEIGHT = 1;
  let matchedWeight = 0;
  let maxPossibleWeight = 0;

  for (const token of queryTokens) {
    maxPossibleWeight += TITLE_WEIGHT + DESC_WEIGHT;
    if (titleLower.includes(token)) matchedWeight += TITLE_WEIGHT;
    if (descriptionLower.includes(token)) matchedWeight += DESC_WEIGHT;
  }

  if (maxPossibleWeight === 0) return 0;
  return Math.min(1, matchedWeight / maxPossibleWeight);
}

/**
 * computePriceScore - Budget fit: 1 - (price - min) / (max - min)
 * @param {number} price
 * @param {number} minPrice
 * @param {number} maxPrice
 * @returns {number} [0, 1]
 */
function computePriceScore(price, minPrice, maxPrice) {
  if (maxPrice === minPrice) return 0.5;
  const score = 1 - ((price - minPrice) / (maxPrice - minPrice));
  return Math.max(0, Math.min(1, score));
}

/**
 * computeQualityScore - Rating (60%) + Log(reviews) (40%)
 * @param {number} rating - 0-5
 * @param {number} reviewCount
 * @param {number} maxReviews
 * @returns {number} [0, 1]
 */
function computeQualityScore(rating, reviewCount, maxReviews) {
  if (!rating && !reviewCount) return 0;
  
  const ratingNorm = (rating || 0) / 5;
  const reviewNorm = maxReviews > 0
    ? Math.log1p(reviewCount || 0) / Math.log1p(maxReviews)
    : 0;

  const qualityScore = (0.6 * ratingNorm) + (0.4 * reviewNorm);
  return Math.max(0, Math.min(1, qualityScore));
}

/**
 * computePopularityScore - Log1p(viewCount) or Log1p(reviewCount)
 * @param {object} product
 * @param {number} maxViews
 * @param {number} maxReviews
 * @returns {number} [0, 1]
 */
function computePopularityScore(product, maxViews, maxReviews) {
  const viewCount = product?.viewCount || 0;
  const reviewCount = product?.reviews_count || 0;

  if (viewCount > 0 && maxViews > 0) {
    const score = Math.log1p(viewCount) / Math.log1p(maxViews);
    return Math.max(0, Math.min(1, score));
  }

  if (reviewCount > 0 && maxReviews > 0) {
    const score = Math.log1p(reviewCount) / Math.log1p(maxReviews);
    return Math.max(0, Math.min(1, score));
  }

  return 0;
}

// ============================================================
// MAIN RANKING FUNCTION
// ============================================================



async function scoreUserBehavior(product, userId) {
  try {
    // Guard: no userId means no interaction history
    if (!userId) {
      return { score: 0, explanation: null };
    }

    // Guard: product must have both id and title
    if (!product?.id || !product?.title) {
      return { score: 0, explanation: null };
    }

    // Fetch recent interaction history (last 30 interactions, most recent first)
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('product_id, event_type, query')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    if (!interactions || interactions.length === 0) {
      return { score: 0, explanation: null };
    }

    // Separate interactions: search queries vs viewed/clicked products
    const pastSearchQueries = interactions
      .filter(i => i.event_type === 'search' && i.query)
      .map(i => i.query);

    const viewedProductIds = new Set(
      interactions
        .filter(i => ['click', 'view', 'cart_add'].includes(i.event_type) && i.product_id)
        .map(i => i.product_id)
    );

    // Signal A: Query Similarity
    // Find the best match between current product and past search queries
    const productKeywords = extractKeywords(product.title);
    let querySimScore = 0;
    let bestMatchQuery = null;

    if (productKeywords.size > 0) {
      // Limit to first 10 searches to avoid excessive computation
      for (const q of pastSearchQueries.slice(0, 10)) {
        const sim = computeJaccardSimilarity(extractKeywords(q), productKeywords);
        if (sim > querySimScore) {
          querySimScore = sim;
          bestMatchQuery = q.trim().replace(/[.,!?;:]+$/, '');
        }
      }
    }
    // Past search is indirect signal — multiply by 0.6
    querySimScore = querySimScore * 0.6;

    // Signal B: Direct Product View Bonus
    // User explicitly clicked/viewed/added to cart this product before
    const wasViewed = viewedProductIds.has(product.id);
    const viewBonus = wasViewed ? 0.4 : 0;

    // Combine signals
    let finalScore = Math.min(1.0, querySimScore + viewBonus);
    finalScore = Math.round(finalScore * 1000) / 1000;

    // Generate explanation: prioritize direct view > high query sim > low query sim > null
    let explanation;
    const rawQuerySim = querySimScore / 0.6; // Recover Jaccard for threshold check

    if (wasViewed) {
      // Strongest signal: explicit prior interaction with this exact product
      explanation = 'Based on items you previously viewed';
    } else if (rawQuerySim >= 0.5) {
      // High similarity to past search queries
      explanation = `Related to your recent search for "${bestMatchQuery}"`;
    } else if (rawQuerySim >= 0.2) {
      // Low similarity but still relevant to browsing interests
      explanation = 'Matches your recent browsing interests';
    } else {
      // No meaningful behavioral signal
      explanation = null;
    }

    return { score: finalScore, explanation };
  } catch (err) {
    logger.warn(`[RankingEngine] scoreUserBehavior error: ${err.message}`);
    return { score: 0, explanation: null };
  }
}

/**
 * ============================================================
 * SECTION E — ITEM SIMILARITY SCORER
 * ============================================================
 * Score how similar this product is to products the user has
 * recently clicked or viewed (content-based filtering).
 * Weight: 0.20 (normal) | 0.00 (cold-start < 3 interactions)
 * ============================================================
 */

/**
 * Score how similar this product is to products the user has recently
 * clicked or viewed. Uses content-based Jaccard similarity on title keywords.
 *
 * Different from scoreUserBehavior:
 *   scoreUserBehavior asks: "Does this product match what the user SEARCHED FOR?"
 *   scoreItemSimilarity asks: "Does this product resemble products the user CLICKED?"
 *
 * These are complementary signals. A user might search "monitor" but only click
 * on gaming monitors. scoreItemSimilarity learns the gaming preference from title
 * patterns of clicked products, surfacing gaming monitors even in relevance-based searches.
 *
 * @async
 * @param {object}      product - Product object with at minimum { id, title }
 * @param {string|null} userId  - Authenticated user UUID, or null for guests
 * @returns {Promise<{ score: number, explanation: string|null, matchedTitle: string|null }>}
 *   score: 0–1 (higher = more similar to recently viewed products)
 *   explanation: human-readable reason, or null if similarity is weak (< 0.3)
 *   matchedTitle: title of the most similar previously viewed product,
 *                 or null if no strong match (< 0.3)
 *
 * Two sequential Supabase queries:
 *   1. Fetch recently viewed/clicked product IDs from user_interactions
 *   2. Fetch titles of those products from products table
 *
 * Scoring: max Jaccard(currentProductKeywords, viewedProductKeywords) → 0–1
 *
 * @example
 *   // User viewed an MSI motherboard; this is an ASUS motherboard
 *   scoreItemSimilarity(
 *     { id: 'prod-xyz', title: 'ASUS ROG STRIX B650E AM5 Motherboard' },
 *     'user-456'
 *   )
 *   → { score: 0.35, explanation: 'Similar to items you recently viewed', matchedTitle: 'MSI B650E ...' }
 *
 * @example
 *   // Guest user has no view history
 *   scoreItemSimilarity({ id: 'x', title: 'Any Product' }, null)
 *   → { score: 0, explanation: null, matchedTitle: null }
 */
async function scoreItemSimilarity(product, userId) {
  try {
    // Guard: product must have a real DB UUID to query user_interactions
    // Scraped products before DB save have placeholder IDs like "villman-0"
    if (!isValidUUID(product.id)) {
      return { score: 0, explanation: null, matchedTitle: null };
    }

    // Guard: unauthenticated users have no view history
    if (!userId) {
      return { score: 0, explanation: null, matchedTitle: null };
    }

    // Guard: product must have both id and title
    if (!product?.id || !product?.title) {
      return { score: 0, explanation: null, matchedTitle: null };
    }

    // Extract keywords from current product title once (reused below)
    const currentProductKeywords = extractKeywords(product.title);
    if (currentProductKeywords.size === 0) {
      return { score: 0, explanation: null, matchedTitle: null };
    }

    // Query 1: Fetch most recent viewed/clicked product IDs (exclude current product)
    const { data: interactions, error: intError } = await supabase
      .from('user_interactions')
      .select('product_id')
      .eq('user_id', userId)
      .in('event_type', ['click', 'view', 'cart_add'])
      .neq('product_id', product.id) // CRITICAL: exclude current product
      .order('created_at', { ascending: false })
      .limit(5); // Fetch 5, dedupe, take top 3

    if (intError) throw intError;
    if (!interactions || interactions.length === 0) {
      return { score: 0, explanation: null, matchedTitle: null };
    }

    // Deduplicate product IDs (user may interact with same product multiple times)
    // then take only the 3 most recent unique products
    const viewedIds = [...new Set(
      interactions
        .filter(i => i.product_id)
        .map(i => i.product_id)
    )].slice(0, 3);

    if (viewedIds.length === 0) {
      return { score: 0, explanation: null, matchedTitle: null };
    }

    // Query 2: Fetch actual product titles for those IDs
    const { data: viewedProducts, error: prodError } = await supabase
      .from('products')
      .select('id, title')
      .in('id', viewedIds);

    if (prodError) throw prodError;
    if (!viewedProducts || viewedProducts.length === 0) {
      return { score: 0, explanation: null, matchedTitle: null };
    }

    // Compute Jaccard similarity against each viewed product
    // Keep track of the best (highest) match
    let maxSimilarity = 0;
    let bestMatchTitle = null;

    for (const viewed of viewedProducts) {
      if (!viewed.title) continue; // Skip if title is missing

      const viewedKeywords = extractKeywords(viewed.title);
      const similarity = computeJaccardSimilarity(currentProductKeywords, viewedKeywords);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatchTitle = viewed.title;
      }
    }

    // Round to 3 decimal places
    const finalScore = Math.round(maxSimilarity * 1000) / 1000;

    // Truncate bestMatchTitle to 35 characters for display (+ "..." ellipsis)
    const shortTitle = bestMatchTitle
      ? bestMatchTitle.length > 35
        ? bestMatchTitle.slice(0, 35).trimEnd() + '...'
        : bestMatchTitle
      : null;

    // Map score to explanation
    let explanation;
    if (finalScore >= 0.5) {
      // Strong match — attribute to the specific product
      explanation = `Similar to "${shortTitle}" you viewed`;
    } else if (finalScore >= 0.3) {
      // Moderate match — general similarity signal
      explanation = 'Similar to items you recently viewed';
    } else {
      // Weak match — not strong enough to explain or attribute
      explanation = null;
      bestMatchTitle = null; // Clear matchedTitle if explanation is null
    }

    return {
      score: finalScore,
      explanation,
      matchedTitle: bestMatchTitle,
    };
  } catch (err) {
    logger.warn(`[RankingEngine] scoreItemSimilarity error: ${err.message}`);
    return { score: 0, explanation: null, matchedTitle: null };
  }
}

/**
 * ============================================================
 * SECTION F — POPULARITY SCORER
 * ============================================================
 * Score how popular this product is across all Bakàl users.
 * Combines interaction count (70%) with product rating (30%).
 * Weight: 0.10 (normal) | 0.30 (cold-start < 3 interactions)
 *
 * NOTE: This scorer has a HIGHER weight in COLD_START_WEIGHTS
 * because popularity acts as a proxy for relevance when a new user
 * has no behavioral history.
 * ============================================================
 */

/**
 * Score how popular this product is across all Bakàl users.
 * Combines interaction count (70% weight) with product rating (30% weight).
 *
 * This is NOT a personalized signal — it measures aggregate engagement
 * across ALL users on the platform. It acts as social proof:
 * "This product has been clicked 30 times by other users on Bakàl,
 * and it has a 4.5-star rating."
 *
 * Two signals:
 *   A. Interaction count: clicks, views, cart_adds by any user on Bakàl
 *   B. Product rating: star rating scraped from store pages (0–5)
 *
 * Soft cap at 50 interactions prevents one "viral" product from
 * overwhelming relevance-based ranking. 50+ interactions = max score.
 *
 * Rating validation prevents scrapers' invalid values (strings, out-of-range,
 * NaN) from affecting ranking.
 *
 * @async
 * @param {object} product - Product object with at minimum { id, rating }
 * @returns {Promise<{ score: number, explanation: string|null }>}
 *   score: 0–1 (higher = more popular across all users)
 *   explanation: human-readable reason, or null if signal is weak
 *
 * One Supabase COUNT query (head: true — no row data fetched).
 *
 * Scoring breakdown:
 *   interactionScore = Math.min(count / 50, 1.0)  × 0.7
 *   ratingScore      = (rating / 5)               × 0.3
 *   finalScore       = sum of above, rounded to 3 decimals
 *
 * @example
 *   // Very popular product with good rating
 *   scorePopularity({
 *     id: 'prod-abc',
 *     rating: 4.8
 *   })
 *   // Assume 25 interactions in DB
 *   → { score: 0.638, explanation: 'Very popular among Bakàl users' }
 *
 * @example
 *   // New product, no interactions yet
 *   scorePopularity({ id: 'prod-new', rating: null })
 *   → { score: 0, explanation: null }
 */
async function scorePopularity(product) {
  try {
    // Guard: product must have a real DB UUID to count interactions
    if (!isValidUUID(product.id)) {
      return { score: 0, explanation: null };
    }

    // Query: COUNT interactions for this product across ALL users
    // Use head: true to fetch ONLY the count metadata, not row data
    const { count: interactionCount, error } = await supabase
      .from('user_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product.id)
      .in('event_type', ['click', 'view', 'cart_add']);

    if (error) throw error;

    // Use nullish coalescing: count may be null if no rows exist (not 0)
    const safeCount = interactionCount ?? 0;

    // Signal A: Interaction count (70% weight)
    // Soft cap at 50 — a product with 50+ interactions scores max 1.0
    const interactionScore = Math.min(safeCount / 50, 1.0);

    // Signal B: Product rating (30% weight) with validation
    // Ratings come from scrapers and may be invalid (strings, NaN, out-of-range)
    const rating = product.rating;
    const isValidRating = typeof rating === 'number' &&
                          !isNaN(rating) &&
                          rating >= 0 &&
                          rating <= 5;
    const ratingScore = isValidRating ? rating / 5 : 0;

    // Combine signals: 70% interaction + 30% rating
    const finalScore = Math.round(
      ((interactionScore * 0.7) + (ratingScore * 0.3)) * 1000
    ) / 1000;

    // Build explanation: prioritize interaction count > rating
    // Interaction count is more meaningful (Bakàl-specific data)
    // than ratings from external stores that may reflect different user bases
    let explanation;
    if (safeCount >= 20) {
      // Very popular: 20+ interactions is a strong signal
      explanation = 'Very popular among Bakàl users';
    } else if (safeCount >= 5) {
      // Moderately popular: 5–19 interactions
      explanation = 'Popular among Bakàl users';
    } else if (isValidRating && rating >= 4.5) {
      // New/unpopular but highly rated
      explanation = 'Highly rated product';
    } else if (isValidRating && rating >= 4.0) {
      // New/unpopular but well-rated
      explanation = 'Well-rated product';
    } else {
      // No strong signal — but score may still contribute
      explanation = null;
    }

    return { score: finalScore, explanation };
  } catch (err) {
    logger.warn(`[RankingEngine] scorePopularity error: ${err.message}`);
    return { score: 0, explanation: null };
  }
}

/**
 * ============================================================
 * SECTION G — PRICE RELEVANCE SCORER
 * ============================================================
 * Score whether this product's price fits the user's typical spending range.
 * Uses mean ± population standard deviation of previously viewed product prices.
 * Weight: 0.10 (normal) | 0.10 (cold-start — equal in both modes)
 *
 * Price relevance is the only factor with EQUAL weight in cold-start.
 * Unlike popularity (0.30 in cold-start) or behavioral signals (0.00),
 * price is independent of Bakàl history — it's a universal budget constraint.
 * ============================================================
 */

/**
 * Score whether this product's price fits the user's typical spending range.
 * Returns 0.5 (neutral) when no price history exists — new users not penalized.
 *
 * Uses mean ± population std dev of previously viewed/clicked product prices.
 * Population std dev (not sample) is correct because user's past interactions
 * ARE all the data we have (not a sample from a larger population).
 *
 * @async
 * @param {object}      product - Product object { price: number|null }
 * @param {string|null} userId  - Authenticated user UUID, or null for guests
 * @returns {Promise<{ score: number, explanation: string|null }>}
 *   score: 0–1 (0.5 = neutral/no data, 1.0 = within budget, 0.2 = too expensive)
 *   explanation: human-readable reason, or null if signal is weak
 *
 * One Supabase JOIN query fetching user_interactions with product prices.
 *
 * Scoring breakdown:
 *   avgPrice   = mean of past 20 referenced product prices
 *   stdDev     = sqrt(variance) using population formula
 *   range      = [avg - stdDev, avg + stdDev]
 *
 *   Within range [lower, upper]:      1.0 — "Within your usual price range"
 *   < lower × 0.5 (much cheaper):    0.7 — "More affordable than items you usually view"
 *   > upper × 2 (much more expensive): 0.2 — null explanation (no "too expensive")
 *   Near range (other cases):         0.5 — null (neutral)
 *   No data / error:                  0.5 — null (neutral default)
 *
 * @example
 *   // User typically browses $10k–$15k laptops, current product is $12k
 *   scorePriceRelevance({ price: 12000 }, userId)
 *   → { score: 1.0, explanation: "Within your usual price range" }
 *
 * @example
 *   // Same user, product is $3k (much cheaper)
 *   scorePriceRelevance({ price: 3000 }, userId)
 *   → { score: 0.7, explanation: "More affordable than items you usually view" }
 *
 * @example
 *   // New user with no price history
 *   scorePriceRelevance({ price: 5000 }, null)
 *   → { score: 0.5, explanation: null }
 */
async function scorePriceRelevance(product, userId) {
  try {
    // STEP 6-1: Guards — return neutral without DB query if preconditions fail

    // No user = no price history
    if (!userId) {
      return { score: 0.5, explanation: null };
    }

    // Product price is missing or invalid
    if (product.price === null || product.price === undefined) {
      return { score: 0.5, explanation: null };
    }

    // Validate price is a real positive number
    if (typeof product.price !== 'number' || isNaN(product.price) || product.price < 0) {
      return { score: 0.5, explanation: null };
    }

    // STEP 6-2: Fetch prices of products the user previously viewed/clicked
    // Join user_interactions with products table to get product prices
    const { data: priceData, error } = await supabase
      .from('user_interactions')
      .select('products(price)')
      .eq('user_id', userId)
      .in('event_type', ['click', 'view'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // No interaction history
    if (!priceData || priceData.length === 0) {
      return { score: 0.5, explanation: null };
    }

    // Extract valid price numbers from the join result
    const prices = priceData
      .map(row => row.products?.price)
      .filter(p => typeof p === 'number' && !isNaN(p) && p > 0);

    // Need at least 3 data points for a meaningful price range
    if (prices.length < 3) {
      return { score: 0.5, explanation: null };
    }

    // STEP 6-3: Compute user's typical price range using population std deviation
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Population variance (divide by n, not n-1)
    // User's past interactions ARE all their data, not a sample
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Define price range: [avg - std, avg + std]
    // Never go below 0 PHP
    const lowerBound = Math.max(0, avgPrice - stdDev);
    const upperBound = avgPrice + stdDev;

    // STEP 6-4: Score the current product's price
    const productPrice = product.price;

    // Case 1: Within typical range [lower, upper]
    if (productPrice >= lowerBound && productPrice <= upperBound) {
      return { score: 1.0, explanation: 'Within your usual price range' };
    }

    // Case 2: Much cheaper than usual (< 50% of lower bound)
    if (productPrice < lowerBound * 0.5) {
      return {
        score: 0.7,
        explanation: 'More affordable than items you usually view',
      };
    }

    // Case 3: Much more expensive than usual (> 2× upper bound)
    // No explanation — avoid negative framing that discourages good purchases
    if (productPrice > upperBound * 2) {
      return { score: 0.2, explanation: null };
    }

    // Case 4: Near the range (between bounds × thresholds)
    // Slightly cheaper, slightly higher — neutral signal
    return { score: 0.5, explanation: null };
  } catch (err) {
    logger.warn(`[RankingEngine] scorePriceRelevance error: ${err.message}`);
    return { score: 0.5, explanation: null };
  }
}

/**
 * ============================================================
 * SECTION H — MAIN ORCHESTRATOR — rankProducts()
 * ============================================================
 * Calls all 5 scorers, combines weighted scores, attaches explanations,
 * sorts by final score, and returns annotated products.
 *
 * This is the PRIMARY exported function used by searchService.js.
 * ============================================================
 */

/**
 * Rank and annotate products using 5-factor weighted scoring.
 * Calls all scorers for each product, combines weights based on cold-start
 * detection, sorts by final score DESC, and attaches _score, _reasons, _rankingMeta.
 *
 * Cold-start detection: if user has < 3 total interactions, use COLD_START_WEIGHTS
 * which heavily favor keyword relevance (0.60) and popularity (0.30), while
 * suppressing behavioral signals (0.00) that would be unreliable with sparse data.
 *
 * Failure safety: if any error occurs, returns products unsorted with a log message.
 * Search still works, just without ranking — degraded but functional.
 *
 * @async
 * @param {Array}       products - Flat product array from scraper
 *                                Each product: { id, title, price, image_url, product_url, platform, rating }
 * @param {string|null} userId   - Authenticated user UUID, or null for guests
 * @param {string}      query    - Raw search query entered by user
 * @returns {Promise<Array>}     - Same products array, sorted by _score DESC
 *                                Each product now has:
 *                                  _score:       number (0–1, 3 decimals)
 *                                  _reasons:     string[] (≥1 element, never empty)
 *                                  _rankingMeta: { factor scores, weights used }
 *
 * Processing order:
 *   1. Guard against empty/invalid input
 *   2. Detect cold-start, choose weight set, log decision
 *   3. Score each product SEQUENTIALLY (not all-in-parallel)
 *      For each product, call all 5 scorers IN PARALLEL
 *      Combine weights, compute final score, collect explanations
 *   4. Sort products by _score DESC (highest first)
 *   5. Log top 3 results for development verification
 *   6. Return annotated, sorted products
 *
 * Why sequential products + parallel scorers?
 *   15 products × 4 async scorers in full parallel = 60 concurrent Supabase
 *   queries, risking rate limits, connection pool exhaustion, and timeout.
 *   Sequential products (1 at a time) with parallel scorers per product is the
 *   correct balance: solves 5 scoring equations in parallel (fast per-product),
 *   but processes products one-by-one (avoids connection storms).
 *
 * @example
 *   const products = await rankProducts(
 *     [
 *       { id: 'p1', title: 'Intel i7', price: 18000, rating: 4.5, ... },
 *       { id: 'p2', title: 'AMD Ryzen 9', price: 20000, rating: 4.7, ... }
 *     ],
 *     'user-uuid-123',
 *     'processor'
 *   );
 *   // Returns:
 *   // [
 *   //   {
 *   //     id: 'p2', ...,
 *   //     _score: 0.782,
 *   //     _reasons: [ 'Closely matches your search for "processor"', 'Very popular among Bakàl users' ],
 *   //     _rankingMeta: { keywordRelevance: 0.85, userBehavior: 0.40, ..., weightsUsed: 'personalized' }
 *   //   },
 *   //   {
 *   //     id: 'p1', ...,
 *   //     _score: 0.756,
 *   //     _reasons: [ 'Closely matches your search for "processor"' ],
 *   //     _rankingMeta: { keywordRelevance: 0.83, ..., weightsUsed: 'personalized' }
 *   //   }
 *   // ]
 */
async function rankProducts(products, userId, query) {
  try {
    // STEP 7-1: Guard — empty or invalid input
    if (!products || !Array.isArray(products) || products.length === 0) {
      return products ?? [];
    }

    // STEP 7-2: Determine which weight set to use via cold-start detection
    let interactionCount = 0;
    if (userId) {
      const { count } = await supabase
        .from('user_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      interactionCount = count ?? 0;
    }

    const coldStart = !userId || interactionCount < 3;
    const weights = coldStart ? COLD_START_WEIGHTS : RANKING_WEIGHTS;

    logger.info(
      `[RankingEngine] Ranking ${products.length} products for user ${userId ?? 'guest'} — weights: ${coldStart ? 'cold_start' : 'personalized'}`
    );

    // STEP 7-3: Score each product SEQUENTIALLY (not all-in-parallel)
    for (const product of products) {
      // Run all 5 scorers for THIS product in parallel
      // scoreKeywordRelevance is now async — await it directly
      const [kwResult, ubResult, isResult, popResult, prResult] = await Promise.all([
        scoreKeywordRelevance(product, query),
        scoreUserBehavior(product, userId),
        scoreItemSimilarity(product, userId),
        scorePopularity(product),
        scorePriceRelevance(product, userId),
      ]);

      // COMPUTE DISCOUNT SCORE
      const discountScore = product.is_on_sale
        ? Math.min((product.discount_percent || 0) / 100, 1)
        : 0;

      // BUG FIX 2: Fix ranking score calculation — parentheses were wrong
      // Previous: (discountScore * 0.20) * 1000 was outside the sum — now moved inside
      const finalScore = Math.round(
        ((kwResult.score * weights.keywordRelevance) +
          (ubResult.score * weights.userBehavior) +
          (isResult.score * weights.itemSimilarity) +
          (popResult.score * weights.popularity) +
          (prResult.score * weights.priceRelevance) +
          (discountScore * 0.20)) *
          1000
      ) / 1000;

      // Collect non-null explanations IN PRIORITY ORDER
      // Order: keyword → behavior → similarity → popularity → price → discount
      // _reasons[0] is shown to user (highest-signal explanation)
      const explanations = [
        kwResult.explanation,
        ubResult.explanation,
        isResult.explanation,
        popResult.explanation,
        prResult.explanation,
        discountScore > 0.2 ? `${Math.round(product.discount_percent)}% off` : null,
      ].filter(Boolean); // Remove null and undefined

      // BUG FIX 3: Unify explanation text — always include query word
      // Guarantee at least one reason (fallback if all 6 are null)
      if (explanations.length === 0) {
        explanations.push(`Matches your search for "${query}"`);
      }

      // Attach ranking fields directly to product object (mutate in place)
      product._score = finalScore;
      product._reasons = explanations;
      product._rankingMeta = {
        keywordRelevance: kwResult.score,
        userBehavior: ubResult.score,
        itemSimilarity: isResult.score,
        popularity: popResult.score,
        priceRelevance: prResult.score,
        discountScore: discountScore,
        weightsUsed: coldStart ? 'cold_start' : 'personalized',
      };
    }

    // STEP 7-4: Sort products by _score descending (highest first)
    products.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));

    // STEP 7-5: Log top 3 for development verification
    const top3 = products.slice(0, 3).map(p => ({
      title: p.title?.slice(0, 40),
      score: p._score,
      reason: p._reasons?.[0],
    }));
    logger.info(`[RankingEngine] Top 3 results: ${JSON.stringify(top3)}`);

    // STEP 7-6: Return sorted annotated products
    return products;
  } catch (err) {
    logger.error(`[RankingEngine] rankProducts failed: ${err.message}`);
    // Return original unsorted array on error — search still works, just unranked
    return products ?? [];
  }
}

module.exports = {
  // Primary function — called by searchService.js
  rankProducts,

  // Individual scorers — exported for unit testing only
  // Do NOT call these directly from outside rankingEngine.js in production
  scoreKeywordRelevance,
  scoreUserBehavior,
  scoreItemSimilarity,
  scorePopularity,
  scorePriceRelevance,

  // Weight constants — exported so other modules can inspect them
  RANKING_WEIGHTS,
  COLD_START_WEIGHTS,
};
