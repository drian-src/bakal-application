'use strict';

const savedSearchRepository = require('../repositories/savedSearchRepository');
const logger = require('../config/logger');

const savedSearchController = {
  /**
   * GET /api/user/saved-searches
   * Fetch all saved searches for the authenticated user
   */
  async getAll(req, res) {
    try {
      const userId = req.user.id;
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);

      const savedSearches = await savedSearchRepository.getByUserId(userId, limit);

      return res.json({
        success: true,
        savedSearches,
        count: savedSearches.length,
      });
    } catch (error) {
      logger.error('[SavedSearchController] GET /saved-searches error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
  },

  /**
   * POST /api/user/saved-searches
   * Save a new search query
   */
  async create(req, res) {
    try {
      const userId = req.user.id;
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      if (query.trim().length > 200) {
        return res.status(400).json({ error: 'Query too long (max 200 characters)' });
      }

      const saved = await savedSearchRepository.create(userId, query);

      logger.info(`[SavedSearchController] Saved search for user ${userId}: "${query}"`);

      return res.status(201).json({
        success: true,
        message: 'Search saved successfully',
        savedSearch: saved,
      });
    } catch (error) {
      if (error.message.includes('already saved')) {
        return res.status(409).json({ error: 'This search is already saved' });
      }

      logger.error('[SavedSearchController] POST /saved-searches error:', error.message);
      return res.status(500).json({ error: 'Failed to save search' });
    }
  },

  /**
   * DELETE /api/user/saved-searches/:id
   * Remove a saved search
   */
  async remove(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const deleted = await savedSearchRepository.deleteById(id, userId);

      if (!deleted) {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      logger.info(`[SavedSearchController] Deleted saved search ${id} for user ${userId}`);

      return res.json({
        success: true,
        message: 'Saved search removed',
      });
    } catch (error) {
      logger.error('[SavedSearchController] DELETE /saved-searches/:id error:', error.message);
      return res.status(500).json({ error: 'Failed to remove saved search' });
    }
  },

  /**
   * PATCH /api/user/saved-searches/:id/run
   * Mark a saved search as run (reset new_count)
   */
  async markRun(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await savedSearchRepository.updateLastRun(id, userId);

      logger.info(`[SavedSearchController] Marked saved search ${id} as run for user ${userId}`);

      return res.json({
        success: true,
        message: 'Saved search updated',
      });
    } catch (error) {
      logger.error('[SavedSearchController] PATCH /saved-searches/:id/run error:', error.message);
      return res.status(500).json({ error: 'Failed to update saved search' });
    }
  },
};

module.exports = savedSearchController;
