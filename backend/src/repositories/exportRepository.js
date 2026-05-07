'use strict';

const { supabase } = require('../config/db');
const logger = require('../config/logger');

/**
 * Aggregate all exportable data for a user.
 * Returns a structured object covering all relevant tables.
 */
async function aggregateUserData(userId) {
  logger.info(`[exportRepository] Aggregating data for user: ${userId}`);

  // Run all queries in parallel for speed
  const [
    profileResult,
    searchesResult,
    savedSearchesResult,
    cartResult,
    interactionsResult,
    productInteractionsResult,
    recommendationsResult,
  ] = await Promise.allSettled([

    // 1. Profile
    supabase
      .from('users')
      .select('email, name, auth_provider, created_at, last_login')
      .eq('id', userId)
      .single(),

    // 2. Search history
    supabase
      .from('searches')
      .select('query, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    // 3. Saved searches
    supabase
      .from('saved_searches')
      .select('query, saved_at')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false }),

    // 4. Cart items (with product details)
    supabase
      .from('cart_items')
      .select(`
        quantity,
        added_at,
        cart ( user_id ),
        products ( title, price, product_url, platforms ( name ) )
      `)
      .eq('cart.user_id', userId),

    // 5. General interactions
    supabase
      .from('user_interactions')
      .select('event_type, query, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000),

    // 6. Product interactions
    supabase
      .from('user_product_interactions')
      .select('interaction_type, query_text, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1000),

    // 7. Recommendation history
    supabase
      .from('user_recommendations')
      .select('score, explanation, reason_type, computed_at')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(500),

  ]);

  // Helper to safely extract data (graceful fallback if table doesn't exist)
  const safeData = (result, fallback = []) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      return result.value.data ?? fallback;
    }
    const errMsg = result.value?.error?.message || result.reason?.message || 'unknown';
    logger.warn(`[exportRepository] Query failed: ${errMsg}`);
    return fallback;
  };

  const profile = profileResult.status === 'fulfilled' && !profileResult.value.error
    ? profileResult.value.data
    : null;

  return {
    exported_at:          new Date().toISOString(),
    profile,
    search_history:       safeData(searchesResult),
    saved_searches:       safeData(savedSearchesResult),
    cart_items:           safeData(cartResult),
    interactions:         safeData(interactionsResult),
    product_interactions: safeData(productInteractionsResult),
    recommendations:      safeData(recommendationsResult),
  };
}

/**
 * Delete a user account with all related records.
 * Uses sequential deletes in dependency order as a safety net
 * even if CASCADE is configured (belt-and-suspenders approach).
 */
async function deleteUserAccount(userId) {
  logger.info(`[exportRepository] Initiating account deletion for user: ${userId}`);

  // Delete in dependency order (children before parent)
  const deletionSteps = [
    { table: 'cart_items',               field: 'cart_id', join: 'cart' },
    { table: 'cart',                     field: 'user_id' },
    { table: 'saved_searches',           field: 'user_id' },
    { table: 'searches',                 field: 'user_id' },
    { table: 'user_interactions',        field: 'user_id' },
    { table: 'user_product_interactions',field: 'user_id' },
    { table: 'user_recommendations',     field: 'user_id' },
  ];

  const results = [];
  
  // Step 1: Delete cart items (must join through cart table)
  try {
    const { data: cartIds, error: cartFetchError } = await supabase
      .from('cart')
      .select('id')
      .eq('user_id', userId);
    
    if (!cartFetchError && cartIds?.length > 0) {
      const cartIdList = cartIds.map(c => c.id);
      for (const cartId of cartIdList) {
        const { error, count } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cartId);
        if (error) {
          logger.warn(`[exportRepository] Delete cart_items for cart ${cartId}: ${error.message}`);
        } else {
          results.push({ table: 'cart_items', cartId, status: 'ok', deleted: count });
        }
      }
    }
  } catch (err) {
    logger.warn(`[exportRepository] Failed to delete cart_items: ${err.message}`);
    results.push({ table: 'cart_items', status: 'skip', error: err.message });
  }

  // Step 2: Delete remaining dependent tables
  for (const step of deletionSteps.slice(1)) {
    try {
      const { error, count } = await supabase
        .from(step.table)
        .delete()
        .eq(step.field, userId);

      if (error) {
        logger.warn(`[exportRepository] Delete from ${step.table}: ${error.message}`);
        results.push({ table: step.table, status: 'warn', error: error.message });
      } else {
        results.push({ table: step.table, status: 'ok', deleted: count });
      }
    } catch (err) {
      logger.warn(`[exportRepository] Step failed for ${step.table}: ${err.message}`);
      results.push({ table: step.table, status: 'skip', error: err.message });
    }
  }

  // Step 3: Delete user record
  try {
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      logger.error(`[exportRepository] Failed to delete user: ${userDeleteError.message}`);
      throw new Error(`Account deletion failed: ${userDeleteError.message}`);
    }

    logger.info(`[exportRepository] Account deleted successfully: ${userId}`);
    results.push({ table: 'users', status: 'ok', message: 'User account deleted' });
  } catch (err) {
    logger.error(`[exportRepository] Final user deletion failed: ${err.message}`);
    throw err;
  }

  return { success: true, steps: results };
}

module.exports = { aggregateUserData, deleteUserAccount };
