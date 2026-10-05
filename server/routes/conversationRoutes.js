const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { requireAuth } = require('../middleware/authMiddleware');

/**
 * Conversations API Routes
 * Base path: /api/conversations
 * Strictly protected by requireAuth middleware to enforce tenant isolation.
 */

// GET /api/personas - List available AI persona presets
router.get('/personas', (req, res) => conversationController.getPersonas(req, res));

// POST /api/conversations - Create new conversation for authenticated user
router.post('/conversations', requireAuth, (req, res) => conversationController.createConversation(req, res));

// GET /api/conversations - List conversations for authenticated user ordered by updated_at descending
router.get('/conversations', requireAuth, (req, res) => conversationController.getConversations(req, res));

// GET /api/conversations/search - Search conversations & messages for authenticated user
router.get('/conversations/search', requireAuth, (req, res) => conversationController.searchConversations(req, res));

// POST /api/conversations/:conversationId/messages - Append message to authenticated user's conversation
router.post('/conversations/:conversationId/messages', requireAuth, (req, res) => conversationController.createMessage(req, res));

// GET /api/conversations/:conversationId/messages - List messages for authenticated user's conversation
router.get('/conversations/:conversationId/messages', requireAuth, (req, res) => conversationController.getMessages(req, res));

// PATCH /api/conversations/:conversationId - Update conversation title for authenticated user
router.patch('/conversations/:conversationId', requireAuth, (req, res) => conversationController.updateConversation(req, res));

// POST /api/conversations/:conversationId/retry - Regenerate AI response for the latest turn in conversation
router.post('/conversations/:conversationId/retry', requireAuth, (req, res) => conversationController.retryLastResponse(req, res));

// POST /api/conversations/:conversationId/fork - Fork conversation and messages into a new branch
router.post('/conversations/:conversationId/fork', requireAuth, (req, res) => conversationController.forkConversation(req, res));

// GET /api/conversations/:conversationId/export - Export conversation transcript (markdown, json, text)
router.get('/conversations/:conversationId/export', requireAuth, (req, res) => conversationController.exportConversation(req, res));

// GET /api/conversations/:conversationId/stats - Get conversation diagnostics, token estimates, and metrics
router.get('/conversations/:conversationId/stats', requireAuth, (req, res) => conversationController.getConversationStats(req, res));

// DELETE /api/conversations/:conversationId/messages/:messageId - Delete a single message from conversation
router.delete('/conversations/:conversationId/messages/:messageId', requireAuth, (req, res) => conversationController.deleteMessage(req, res));

// DELETE /api/conversations/:conversationId/messages - Clear all messages in conversation
router.delete('/conversations/:conversationId/messages', requireAuth, (req, res) => conversationController.clearMessages(req, res));

// DELETE /api/conversations/:conversationId - Delete conversation & cascade messages
router.delete('/conversations/:conversationId', requireAuth, (req, res) => conversationController.deleteConversation(req, res));

module.exports = router;
