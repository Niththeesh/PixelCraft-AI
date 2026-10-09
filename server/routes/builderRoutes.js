const express = require('express');
const router = express.Router();
const builderController = require('../controllers/builderController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Check if message is a creation intent
router.post('/detect', (req, res) => builderController.detectIntent(req, res));

// Generate a complete visual design / website / logo / image / UI
router.post('/generate', optionalAuth, (req, res) => builderController.generate(req, res));

// Dedicated creative workflow endpoints
router.post('/image', optionalAuth, (req, res) => builderController.generateImage(req, res));
router.post('/logo', optionalAuth, (req, res) => builderController.generateLogo(req, res));
router.post('/uiux', optionalAuth, (req, res) => builderController.generateUiUx(req, res));
router.get('/providers', (req, res) => builderController.getProviders(req, res));

// Refine existing design with prompt delta
router.post('/refine', optionalAuth, (req, res) => builderController.refine(req, res));

// Bundle project into standalone preview document
router.post('/bundle', (req, res) => builderController.bundle(req, res));

module.exports = router;
