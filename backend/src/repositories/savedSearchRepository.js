'use strict';

const { supabase } = require('../config/db');

const TABLE = 'saved_searches';

const savedSearchRepository = {
  /**
   * Get all saved searches for a user, ordered by most recently saved
   */
  async getByUserId(userId, limit = 50) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, query, saved_at, new_count, last_run_at')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Save a new search query for a user
   * Returns the created record or null if already exists
   */
  async create(userId, query) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length > 200) {
      throw new Error('Query must be between 1 and 200 characters');
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        query: trimmedQuery,
      })
      .select('id, query, saved_at, new_count, last_run_at')
      .single();

    // If unique constraint fails, error will indicate duplicate
    if (error) {
      if (error.code === '23505') {
        throw new Error('This search is already saved');
      }
      throw error;
    }

    return data;
  },

  /**
   * Delete a saved search by ID (must belong to user)
   */
  async deleteById(savedSearchId, userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', savedSearchId)
      .eq('user_id', userId)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update last_run_at timestamp and reset new_count
   */
  async updateLastRun(savedSearchId, userId) {
    const { error } = await supabase
      .from(TABLE)
      .update({
        last_run_at: new Date().toISOString(),
        new_count: 0,
      })
      .eq('id', savedSearchId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Check if a query is already saved for a user
   */
  async exists(userId, query) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id')
      .eq('user_id', userId)
      .eq('query', query.trim())
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },
};

module.exports = savedSearchRepository;
