const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');

/**
 * AI Prompt Library Routes
 * Base path: /api/prompts (mounted under /api/prompts or /api in server.js)
 */

// GET /api/prompts/categories - List available prompt categories
router.get('/prompts/categories', (req, res) => promptController.getCategories(req, res));

// GET /api/prompts - List curated prompts with optional category & search query
router.get('/prompts', (req, res) => promptController.getPrompts(req, res));

// GET /api/prompts/:id - Get a specific prompt template
router.get('/prompts/:id', (req, res) => promptController.getPromptById(req, res));

module.exports = router;
