'use strict';

const recommendationService = require('../services/recommendationService');

async function recommend(req, res, next) {
  try {
    const { searchId } = req.params;
    const results = await recommendationService.recommend(searchId);
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

async function getRecommendations(req, res, next) {
  try {
    const { searchId } = req.params;
    const results = await recommendationService.getRecommendations(searchId);
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = { recommend, getRecommendations };