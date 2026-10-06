const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const conversationService = require('../services/conversationService');
const { requireAuth } = require('../middleware/authMiddleware');

// Standard PostgreSQL UUID format (8-4-4-4-12 hex digits)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid) {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid.trim());
}

/**
 * POST /api/chat
 * Strictly protected route: Requires authenticated Supabase session.
 * Accepts user message prompt, binds to conversationId,
 * dispatches to Gemini Service, and persists conversation messages in Supabase.
 */
router.post('/chat', requireAuth, async (req, res) => {
  const { message, conversationId, persona, systemInstruction } = req.body || {};

  // Payload Validation: Message must be a non-empty string
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      error: 'Message is required'
    });
  }

  const userId = req.user?.id || null;

  // Options for persona and custom instructions
  const options = {};
  if (persona && typeof persona === 'string') {
    options.persona = persona.trim();
  }
  if (systemInstruction && typeof systemInstruction === 'string') {
    options.systemInstruction = systemInstruction.trim().substring(0, 1000);
  }

  // If conversationId is supplied, validate it and verify ownership
  if (conversationId !== undefined && conversationId !== null) {
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    // A conversation cannot be updated without an authenticated session
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to link messages to a conversation'
      });
    }

    // Verify the conversation exists and belongs to the authenticated user
    try {
      const existingConv = await conversationService.getConversationById(conversationId.trim(), userId);
      if (!existingConv) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }
    } catch (dbErr) {
      console.error('Error verifying conversation existence:', dbErr.message);
      return res.status(500).json({
        success: false,
        error: 'Database error verifying conversation'
      });
    }
  }

  try {
    let history = [];

    let savedUserMsg = null;
    let savedAssistantMsg = null;

    // 1. If authenticated and conversationId is present, fetch prior history and persist user message
    if (conversationId && userId) {
      try {
        history = await conversationService.getMessages(conversationId.trim(), userId);
        savedUserMsg = await conversationService.addMessage(conversationId.trim(), 'user', message.trim(), userId);
      } catch (saveErr) {
        console.error('Error retrieving or saving conversation history:', saveErr.message);
      }
    }

    // 2. Generate response from Gemini (with conversation history and persona options)
    const result = (conversationId && userId)
      ? await geminiService.generateChatResponse(history, message.trim(), options)
      : await geminiService.generateResponse(message.trim(), options);
    
    if (result.success) {
      // 3. If authenticated and conversationId is present, persist the assistant response
      if (conversationId && userId) {
        try {
          savedAssistantMsg = await conversationService.addMessage(conversationId.trim(), 'assistant', result.reply, userId);
        } catch (saveErr) {
          console.error('Error saving assistant message to database:', saveErr.message);
        }
      }

      const responsePayload = {
        success: true,
        reply: result.reply,
        persona: options.persona || 'general'
      };

      if (conversationId) {
        responsePayload.conversationId = conversationId.trim();
        if (savedUserMsg && savedUserMsg.id) {
          responsePayload.userMessageId = savedUserMsg.id;
        }
        if (savedAssistantMsg && savedAssistantMsg.id) {
          responsePayload.assistantMessageId = savedAssistantMsg.id;
        }
      }

      return res.json(responsePayload);
    } else {
      const statusCode = result.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Failed to generate response from Gemini API'
      });
    }
  } catch (err) {
    console.error('Chat Route Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing your request'
    });
  }
});

module.exports = router;
