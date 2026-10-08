const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Public Auth Endpoints
router.post('/signup', (req, res) => authController.signUp(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/config', (req, res) => authController.getConfig(req, res));
router.get('/oauth/:provider', (req, res) => authController.getOAuthUrl(req, res));

// Protected Session Endpoints
router.get('/session', requireAuth, (req, res) => authController.getSession(req, res));
router.get('/me', requireAuth, (req, res) => authController.getSession(req, res));
router.post('/post-verify-welcome', requireAuth, (req, res) => authController.sendPostVerifyWelcomeEmail(req, res));

module.exports = router;
