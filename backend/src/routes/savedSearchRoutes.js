'use strict';

const express = require('express');
const router = express.Router();
const savedSearchController = require('../controllers/savedSearchController');

/**
 * Saved Searches Routes
 * All routes require authentication (applied at app.js level)
 */

// GET /api/user/saved-searches — fetch all saved searches
router.get('/saved-searches', savedSearchController.getAll);

// POST /api/user/saved-searches — create new saved search
router.post('/saved-searches', savedSearchController.create);

// DELETE /api/user/saved-searches/:id — remove saved search
router.delete('/saved-searches/:id', savedSearchController.remove);

// PATCH /api/user/saved-searches/:id/run — mark as run
router.patch('/saved-searches/:id/run', savedSearchController.markRun);

module.exports = router;
