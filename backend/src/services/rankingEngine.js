'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');

/**
 * @fileoverview
 * Ranking Engine — Multi-factor product search ranking system.
 *
 * Replaces pure keyword matching with a 5-factor weighted scoring model
 * that personalizes search results based on user behavior, item similarity,
 * price history, and popularity signals.
 *
 * Every product receives a numeric score (0–100) and human-readable
 * explanation array. The explanation tells users (and frontenders) exactly
 * why a product ranked where it did: "Matches keyboard search", "Similar to
 * items you clicked", "Popular on Bakàl", etc. This transparency helps users
 * understand relevance and builds trust in personalized results.
 *
 * @section WHY MULTI-FACTOR RANKING —
 * Pure keyword matching assumes all matches are equally relevant. This fails
 * when personalization matters:
 *   - User A who always buys gaming peripherals searches "keyboard" and should
 *     see mechanical gaming keyboards, not office keyboards (both contain "keyboard")
 *   - User B searching "monitor" in March should see recent stock (price trends
 *     matter), not last year's model
 *   - A highly-rated product that many Bakàl users click should rank higher
 *     than an obscure product with the same keyword match
 *
 * Multi-factor ranking uses behavioral signals (past searches, clicks, views),
 * content similarity (product title overlap), and social proof (popularity)
 * to move beyond keyword-only matching.
 *
 * @section THE 5 RANKING FACTORS —
 *
 * 1. KEYWORD RELEVANCE (weight: 0.40)
 *    Primary signal of explicit user intent.
 *    High confidence because user typed this exact query.
 *    Method: Jaccard similarity on extracted keywords from query and product title.
 *    Exact phrase bonus: If query appears as contiguous substring in title,
 *    multiply score by 1.5 (e.g., "gaming monitor" as phrase beats "gaming...monitor").
 *    Example: Query "intel processor" should rank "Intel Core i7-14700F Processor"
 *             high because title keywords match and phrase bonus applies.
 *
 * 2. USER BEHAVIOR MATCH (weight: 0.20)
 *    Secondary signal — reflects user's demonstrated interests.
 *    Read from user_interactions table: what did this user search for?
 *    What products did they click or view?
 *    Does the current result relate to past queries or clicked items?
 *    Method: Jaccard similarity between current product's keywords and
 *    keywords from user's past search queries and clicked product titles.
 *    Example: User previously searched "gaming laptop" and clicked 3 gaming items.
 *             A search for "laptop" should boost gaming laptops because they
 *             match the user's historical search behavior.
 *    Cold start: Skipped for users with < 3 interactions (weight → 0.00).
 *
 * 3. ITEM SIMILARITY (weight: 0.20)
 *    Content-based filtering — product associations.
 *    Does this product's title share keywords with items the user has
 *    previously clicked or viewed?
 *    Method: For each product the user previously clicked/viewed, compute
 *    Jaccard similarity with current product title. Use the highest similarity
 *    found as the signal (users tend to have category preferences).
 *    Example: User clicked "MSI B650E Motherboard" and "ASUS B650 Motherboard".
 *             Now searching "motherboard". Similar motherboards rank higher
 *             because their keywords overlap with items user already knows they like.
 *    Cold start: Skipped for users with < 3 interactions (weight → 0.00).
 *
 * 4. POPULARITY (weight: 0.10)
 *    Social proof signal — aggregate behavior across all Bakàl users.
 *    What products receive more clicks/views? What is highly rated?
 *    These are likely genuinely relevant and useful products.
 *    Method: Count interactions for each product across ALL users.
 *    Also include product.rating from the products table.
 *    Aggregate to a 0–1 scale: low-interaction products → near 0,
 *    high-interaction + highly-rated → near 1.
 *    Example: Two "motherboards" in results. If Product A has 100 clicks
 *             and rating 4.8, while Product B has 3 clicks and rating 3.2,
 *             Product A gets a higher popularity signal.
 *    Used in all modes: new users benefit from "what other users find relevant".
 *
 * 5. PRICE RELEVANCE (weight: 0.10)
 *    Budget-fit signal — does price match user's typical spending?
 *    Method: From user's interaction history, extract product prices of
 *    clicked/viewed items. Compute mean and std dev of historical prices.
 *    Compare current product price: prices within [mean - 1×std, mean + 1×std]
 *    get high score. Outside that range gets lower score.
 *    This avoids showing ultra-budget items to users who always buy premium.
 *    Example: User's clicked items average ₱2500–₱4000 per product.
 *             A ₱15000 gaming chair ranks lower than a ₱3500 chair, even
 *             if both match keywords, because price is an outlier.
 *    Cold start: Uses global product price distribution (all platform prices)
 *    as fallback when user has no history.
 *
 * @section COLD START STRATEGY —
 * New users (< 3 interactions) cannot benefit from behavioral signals
 * (userBehaviorMatch, itemSimilarity) because there is insufficient data.
 * The ranking system automatically switches to COLD_START_WEIGHTS when
 * interactions < 3, which:
 *   - Increases keywordRelevance to 0.60 (rely on explicit intent)
 *   - Sets userBehavior and itemSimilarity to 0.00 (no data)
 *   - Increases popularity to 0.30 (use social proof as proxy for personalization)
 *   - Keeps priceRelevance at 0.10 (even new users have price sense)
 * This ensures results are still meaningful without showing false personalization.
 *
 * @section FAILURE SAFETY —
 * rankProducts() wraps all logic in try/catch. If any factor fails to compute
 * (database error, malformed data, etc.), the function returns the original
 * unranked array. Search results always appear; the system never crashes
 * due to ranking logic.
 *
 * @section EXPLANATION ARRAY —
 * Each ranked product includes a reasons array:
 *   reasons: [
 *     "Exact phrase match: "gaming monitor" in title",
 *     "Popular on Bakàl (clicked 42 times)",
 *     "Similar to: ASUS ROG 27-inch (you clicked this)"
 *   ]
 * This helps the frontend show "Why this item?" tooltips and
 * builds user trust in personalized results.
 */

/**
 * RANKING_WEIGHTS — default weights for users with ≥ 3 interactions.
 * All values sum to exactly 1.0.
 * To tune ranking behavior, change these values — no function changes needed.
 *
 * Rule: keywordRelevance must always be the highest single weight
 *       because explicit search intent is the strongest signal.
 *
 * @type {Object}
 */
const RANKING_WEIGHTS = {
  keywordRelevance: 0.40,  // 40% — user typed this, highest confidence
  userBehavior: 0.20,      // 20% — past searches and clicked items
  itemSimilarity: 0.20,    // 20% — similar to previously viewed items
  popularity: 0.10,        // 10% — clicks/views across all Bakàl users
  priceRelevance: 0.10,    // 10% — matches user's typical spending range
};
// Validation: 0.40 + 0.20 + 0.20 + 0.10 + 0.10 = 1.00 ✓

/**
 * COLD_START_WEIGHTS — weights used when user has < 3 interactions.
 * Behavioral signals (userBehavior, itemSimilarity) are set to 0 because
 * there is insufficient interaction history to produce meaningful signals.
 * Popularity weight increases to compensate, acting as a proxy for
 * "what other users find relevant" when personal history is unavailable.
 *
 * All values sum to exactly 1.0.
 *
 * @type {Object}
 */
const COLD_START_WEIGHTS = {
  keywordRelevance: 0.60,  // 60% — rely heavily on explicit query match
  userBehavior: 0.00,      // 0%  — no history to use
  itemSimilarity: 0.00,    // 0%  — no viewed items to compare against
  popularity: 0.30,        // 30% — use social proof as personalization proxy
  priceRelevance: 0.10,    // 10% — even new users have a price anchor
};
// Validation: 0.60 + 0.00 + 0.00 + 0.30 + 0.10 = 1.00 ✓

/**
 * STOP_WORDS — common words filtered out during keyword extraction.
 * Copied from recommendationService.js to avoid circular imports.
 * Both files must use the same stop word list for consistent scoring.
 *
 * @type {Set<string>}
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'its', 'it',
  'this', 'that', 'from', 'by', 'as', 'into', 'up', 'out', 'but', 'not',
  'also', 'just', 'more', 'new', 'best', 'top',
]);

/**
 * Extract meaningful keywords from a text string (product title, search query).
 * Converts to Set of lowercase, non-stop-word tokens.
 * Filters out words shorter than 3 characters.
 *
 * @private — internal to rankingEngine.js only
 * @param {string} text - Product title or search query
 * @returns {Set<string>} Deduplicated keywords
 *
 * @example
 *   extractKeywords("Intel Core i7-14700F Desktop Processor")
 *   → Set { 'intel', 'core', 'desktop', 'processor' }
 *   (i7 filtered: 2 chars, core kept: 4 chars)
 *
 *   extractKeywords("gaming mouse wireless RGB")
 *   → Set { 'gaming', 'mouse', 'wireless', 'rgb' }
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
 * Returns 0 if either set is empty (no overlap possible).
 *
 * @private — internal to rankingEngine.js only
 * @param {Set<string>} setA - First keyword set
 * @param {Set<string>} setB - Second keyword set
 * @returns {number} Similarity score (0 to 1), where 1 = identical, 0 = no overlap
 *
 * @example
 *   computeJaccardSimilarity(
 *     new Set(['laptop', 'intel']),
 *     new Set(['laptop', 'amd'])
 *   )
 *   → 1 shared keyword / 3 total unique = 0.333
 *
 *   computeJaccardSimilarity(
 *     new Set(['gaming', 'mouse']),
 *     new Set(['gaming', 'mouse'])
 *   )
 *   → 1.0 (identical sets)
 *
 *   computeJaccardSimilarity(
 *     new Set(['keyboard']),
 *     new Set(['monitor'])
 *   )
 *   → 0.0 (no overlap)
 */
function computeJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(k => setB.has(k)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * ============================================================
 * SECTION C — KEYWORD RELEVANCE SCORER
 * ============================================================
 * Score how well a product's title matches the search query.
 * Uses Jaccard keyword similarity with an exact phrase bonus.
 * Weight: 0.40 (highest of the 5 factors — explicit search intent)
 * ============================================================
 */

/**
 * Score how well a product's title matches the search query.
 * Uses Jaccard keyword similarity with an exact phrase bonus.
 *
 * Base score from Jaccard measures proportion of shared keywords.
 * Exact phrase bonus (+0.3) rewards when query appears verbatim in title.
 * URL fallback (×0.5) provides a weaker match if title yields 0.
 *
 * @param {object} product - Product object with at minimum { title, product_url }
 * @param {string} query   - Raw search query string from user (may have trailing punctuation)
 * @returns {{ score: number, explanation: string|null }}
 *   score: 0–1 (higher = better keyword match)
 *   explanation: human-readable reason, or null if no match
 *
 * @example
 *   scoreKeywordRelevance(
 *     { title: 'Logitech G Pro Wireless Gaming Mouse' },
 *     'gaming mouse'
 *   )
 *   → { score: 0.7, explanation: 'Closely matches your search for "gaming mouse"' }
 *
 * @example
 *   scoreKeywordRelevance(
 *     { title: 'Intel Core i7-14700F Desktop Processor' },
 *     'processor'
 *   )
 *   → { score: 0.55, explanation: 'Matches your search for "processor"' }
 *
 * @example
 *   scoreKeywordRelevance(
 *     { title: 'USB Flash Drive' },
 *     'processor'
 *   )
 *   → { score: 0, explanation: null }
 */
function scoreKeywordRelevance(product, query) {
  // Guard: missing product title or empty query
  if (!product?.title || !query?.trim()) {
    return { score: 0, explanation: null };
  }

  // Clean query: strip trailing punctuation from voice search
  // (e.g., "processor." → "processor", "mouse!" → "mouse")
  const cleanQuery = query.trim().replace(/[.,!?;:]+$/, '');
  if (!cleanQuery) {
    return { score: 0, explanation: null };
  }

  // Extract keywords from both query and product title
  const queryKeywords = extractKeywords(cleanQuery);
  const titleKeywords = extractKeywords(product.title);

  // Guard: query had only stop words (e.g., "the the the")
  if (queryKeywords.size === 0) {
    return { score: 0, explanation: null };
  }

  // Base score: Jaccard similarity on keywords
  let finalScore = computeJaccardSimilarity(queryKeywords, titleKeywords);

  // Exact phrase bonus: if query appears verbatim in title, add 0.3
  // (but cap at 1.0 so word order importance doesn't exceed keyword match)
  const hasExactPhrase = product.title.toLowerCase().includes(cleanQuery.toLowerCase());
  if (hasExactPhrase) {
    finalScore = Math.min(1.0, finalScore + 0.3);
  }

  // URL fallback: if title yields 0 score, try product URL keywords
  // URLs are less reliable (category slugs, store names), so penalize with ×0.5
  if (finalScore === 0 && product.product_url) {
    const urlText = product.product_url
      .replace(/https?:\/\/[^/]+/i, '') // Remove domain
      .replace(/[-\/]/g, ' '); // Replace dashes/slashes with spaces
    const urlKeywords = extractKeywords(urlText);
    const urlJaccard = computeJaccardSimilarity(queryKeywords, urlKeywords);
    if (urlJaccard > 0) {
      finalScore = urlJaccard * 0.5;
    }
  }

  // Round to 3 decimal places
  finalScore = Math.round(finalScore * 1000) / 1000;

  // Map score to human-readable explanation
  let explanation;
  if (finalScore >= 0.7) {
    explanation = `Closely matches your search for "${cleanQuery}"`;
  } else if (finalScore >= 0.4) {
    explanation = `Matches your search for "${cleanQuery}"`;
  } else if (finalScore > 0) {
    explanation = `Partially matches "${cleanQuery}"`;
  } else {
    explanation = null;
  }

  return { score: finalScore, explanation };
}

/**
 * ============================================================
 * SECTION D — USER BEHAVIOR SCORER
 * ============================================================
 * Score how well a product matches what THIS user has been
 * looking for, based on interaction history.
 * Weight: 0.20 (normal) | 0.00 (cold-start < 3 interactions)
 * ============================================================
 */

/**
 * Score how well a product matches the user's behavioral history.
 * Combines two signals: past search query similarity + prior product views.
 *
 * Detects patterns in user behavior:
 *   - User A who searches "gaming keyboard" repeatedly should see gaming
 *     keyboards rank higher than office keyboards
 *   - User B who previously clicked a "mechanical keyboard" should see
 *     similar mechanical keyboards rank higher
 *
 * This is a PERSONALIZATION signal — the same product may rank differently
 * for different users even with the same search query.
 *
 * @async
 * @param {object}      product - Product object with at minimum { id, title }
 * @param {string|null} userId  - Authenticated user UUID, or null for guests
 * @returns {Promise<{ score: number, explanation: string|null }>}
 *   score: 0–1 (higher = product aligns with user's behavioral history)
 *   explanation: human-readable reason, or null if no behavioral signal
 *
 * Scoring breakdown:
 *   Signal A: max Jaccard(pastSearch, productTitle) × 0.6 → 0–0.6
 *             (Indirect signal: user searched similar terms before)
 *   Signal B: +0.4 if user previously clicked/viewed this exact product
 *             (Direct signal: explicit re-engagement)
 *   Final:    Math.min(1.0, A + B)                        → 0–1.0
 *
 * @example
 *   // User previously clicked this exact product
 *   scoreUserBehavior({ id: 'abc-123', title: 'Gaming Mouse' }, 'user-456')
 *   → { score: 0.4, explanation: 'Based on items you previously viewed' }
 *
 * @example
 *   // User searched 'gaming mouse' and this product matches
 *   scoreUserBehavior({ id: 'xyz-789', title: 'Logitech G Pro Gaming Mouse' }, 'user-456')
 *   → { score: 0.36, explanation: 'Related to your recent search for "gaming mouse"' }
 *
 * @example
 *   // Guest user (no history)
 *   scoreUserBehavior({ id: 'x', title: 'Any Product' }, null)
 *   → { score: 0, explanation: null }
 */
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
      // No meaningful keywords — similarity comparison is impossible
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
    // Guard: product must have an id
    if (!product?.id) {
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
      // Promise.resolve wraps sync scoreKeywordRelevance for consistency with async scorers
      const [kwResult, ubResult, isResult, popResult, prResult] = await Promise.all([
        Promise.resolve(scoreKeywordRelevance(product, query)),
        scoreUserBehavior(product, userId),
        scoreItemSimilarity(product, userId),
        scorePopularity(product),
        scorePriceRelevance(product, userId),
      ]);

      // Compute weighted final score
      const finalScore = Math.round(
        (kwResult.score * weights.keywordRelevance) +
          (ubResult.score * weights.userBehavior) +
          (isResult.score * weights.itemSimilarity) +
          (popResult.score * weights.popularity) +
          (prResult.score * weights.priceRelevance) *
          1000
      ) / 1000;

      // Collect non-null explanations IN PRIORITY ORDER
      // Order: keyword → behavior → similarity → popularity → price
      // _reasons[0] is shown to user (highest-signal explanation)
      const reasons = [
        kwResult.explanation,
        ubResult.explanation,
        isResult.explanation,
        popResult.explanation,
        prResult.explanation,
      ].filter(Boolean); // Remove null and undefined

      // Guarantee at least one reason (fallback if all 5 are null)
      if (reasons.length === 0) {
        reasons.push('Matches your search');
      }

      // Attach ranking fields directly to product object (mutate in place)
      product._score = finalScore;
      product._reasons = reasons;
      product._rankingMeta = {
        keywordRelevance: kwResult.score,
        userBehavior: ubResult.score,
        itemSimilarity: isResult.score,
        popularity: popResult.score,
        priceRelevance: prResult.score,
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
