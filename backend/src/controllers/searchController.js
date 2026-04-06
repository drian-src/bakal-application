'use strict';

const searchService = require('../services/searchService');
const searchRepo = require('../repositories/searchRepository');
const { getEnabledStores } = require('../config/stores');

async function search(req, res, next) {
  try {
    const { q, max_per_platform } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter "q" is required.' });
    }
    const userId = req.user?.id || null;
    const maxPerPlatform = parseInt(max_per_platform, 10) || 5;

    const result = await searchService.search(q.trim(), userId, Math.min(maxPerPlatform, 20));
    return res.status(200).json({ success: true, data: result });
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