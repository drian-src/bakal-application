'use strict';

const logger = require('../config/logger');
const productSourceRepo = require('../repositories/productSourceRepository');
const recommendationRepo = require('../repositories/recommendationRepository');

/**
 * Score a product based on heuristic signals.
 * Weights: rating (40%), review volume (30%), price competitiveness (30%).
 * Returns a score 0-1.
 */
function scoreProduct(product, allProducts) {
  const prices = allProducts.map((p) => p.price).filter((v) => v != null && v > 0);
  const maxReviews = Math.max(...allProducts.map((p) => p.reviews_count || 0), 1);

  // Normalize price — lower is better (inverted)
  let priceScore = 0.5;
  if (prices.length > 1 && product.price != null) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    priceScore = range > 0 ? 1 - (product.price - minPrice) / range : 0.5;
  }

  const ratingScore = product.rating ? product.rating / 5 : 0;
  const reviewScore = product.reviews_count ? Math.min(product.reviews_count / maxReviews, 1) : 0;

  return 0.4 * ratingScore + 0.3 * reviewScore + 0.3 * priceScore;
}

/**
 * Generate recommendations for a given search.
 */
async function recommend(searchId) {
  const sources = await productSourceRepo.findBySearch(searchId);
  if (!sources.length) return [];

  const products = sources.map((s) => s.products).filter(Boolean);
  const scored = products.map((p) => ({
    product: p,
    score: scoreProduct(p, products),
  }));

  scored.sort((a, b) => b.score - a.score);

  const topN = scored.slice(0, 5);

  const recs = topN.map(({ product, score }) => ({
    search_id: searchId,
    product_id: product.id,
    score: parseFloat(score.toFixed(4)),
  }));

  const saved = await recommendationRepo.createMany(recs);
  logger.info(`[RecommendationService] Saved ${saved.length} recommendations for search #${searchId}`);

  return topN.map(({ product, score }) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    rating: product.rating,
    reviews_count: product.reviews_count,
    seller_name: product.seller_name,
    product_url: product.product_url,
    image_url: product.image_url,
    platform: product.platforms?.name || null,
    score: parseFloat(score.toFixed(4)),
  }));
}

async function getRecommendations(searchId) {
  const recs = await recommendationRepo.findBySearch(searchId);
  return recs.map((r) => ({
    score: r.score,
    ...r.products,
    platform: r.products?.platforms?.name || null,
  }));
}

module.exports = { recommend, getRecommendations };