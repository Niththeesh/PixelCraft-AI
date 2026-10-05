const conversationService = require('../services/conversationService');
const geminiService = require('../services/geminiService');

// Standard PostgreSQL UUID format (8-4-4-4-12 hex digits)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid) {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid.trim());
}

/**
 * Controller handling conversation and message endpoints with strict user ownership
 */
class ConversationController {
  /**
   * POST /api/conversations
   * Creates a new conversation record strictly belonging to the authenticated user
   */
  async createConversation(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: User identity could not be verified'
        });
      }

      const { title } = req.body || {};
      const conversation = await conversationService.createConversation(userId, title);
      return res.status(201).json({
        success: true,
        conversation
      });
    } catch (err) {
      console.error('Error creating conversation:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to create conversation'
      });
    }
  }

  /**
   * GET /api/conversations
   * Retrieves all conversations belonging to the authenticated user
   */
  async getConversations(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: User identity could not be verified'
        });
      }

      const conversations = await conversationService.getConversations(userId);
      return res.status(200).json({
        success: true,
        conversations
      });
    } catch (err) {
      console.error('Error fetching conversations:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations'
      });
    }
  }

  /**
   * POST /api/conversations/:conversationId/messages
   * Inserts a message into public.messages for a user's conversation
   */
  async createMessage(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;
    const { role, content } = req.body || {};

    // Validate conversationId
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    // Validate role
    if (!role || typeof role !== 'string' || !['user', 'assistant'].includes(role.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be either "user" or "assistant"'
      });
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required and cannot be empty'
      });
    }

    try {
      const message = await conversationService.addMessage(
        conversationId.trim(),
        userId,
        role.trim(),
        content.trim()
      );

      return res.status(201).json({
        success: true,
        message
      });
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      console.error('Error creating message:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to save message'
      });
    }
  }

  /**
   * GET /api/conversations/:conversationId/messages
   * Retrieves messages for an authenticated user's conversation
   */
  async getMessages(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;

    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    try {
      const messages = await conversationService.getMessages(conversationId.trim(), userId);
      return res.status(200).json({
        success: true,
        messages
      });
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      console.error('Error fetching messages:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch messages'
      });
    }
  }

  /**
   * DELETE /api/conversations/:conversationId
   * Deletes a conversation owned by the authenticated user and cascades to its messages
   */
  async deleteConversation(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;

    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    try {
      const deleted = await conversationService.deleteConversation(conversationId.trim(), userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (err) {
      console.error('Error deleting conversation:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete conversation'
      });
    }
  }

  /**
   * PATCH /api/conversations/:conversationId
   * Updates a conversation's title for the authenticated user
   */
  async updateConversation(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;
    const { title } = req.body || {};

    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Conversation title is required and cannot be empty'
      });
    }

    const cleanedTitle = title.trim();
    if (cleanedTitle.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Conversation title cannot exceed 100 characters'
      });
    }

    try {
      const updated = await conversationService.updateConversation(conversationId.trim(), userId, {
        title: cleanedTitle
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      return res.status(200).json({
        success: true,
        conversation: updated
      });
    } catch (err) {
      console.error('Error updating conversation:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to update conversation'
      });
    }
  }

  /**
   * GET /api/conversations/search?q=:query
   * Searches conversation titles and message contents for the authenticated user
   */
  async searchConversations(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const query = req.query?.q;
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query parameter "q" is required and cannot be empty'
      });
    }

    const cleanedQuery = query.trim();
    if (cleanedQuery.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Search query cannot exceed 100 characters'
      });
    }

    try {
      const conversations = await conversationService.searchConversations(userId, cleanedQuery);
      return res.status(200).json({
        success: true,
        query: cleanedQuery,
        count: conversations.length,
        conversations
      });
    } catch (err) {
      console.error('Error searching conversations:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to execute conversation search'
      });
    }
  }

  /**
   * POST /api/conversations/:conversationId/retry
   * Regenerates the AI response for the latest turn in the user's conversation
   */
  async retryLastResponse(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    const { persona, systemInstruction } = req.body || {};
    const options = {};
    if (persona && typeof persona === 'string') options.persona = persona.trim();
    if (systemInstruction && typeof systemInstruction === 'string') options.systemInstruction = systemInstruction.trim().substring(0, 1000);

    try {
      const message = await conversationService.retryLastResponse(conversationId.trim(), userId, options);
      return res.status(200).json({
        success: true,
        message,
        persona: options.persona || 'general'
      });
    } catch (err) {
      if (err.statusCode === 400) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      console.error('Error in retryLastResponse:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to regenerate response'
      });
    }
  }

  /**
   * GET /api/personas
   * Returns list of supported AI personas
   */
  getPersonas(req, res) {
    try {
      const personas = geminiService.getAvailablePersonas();
      return res.status(200).json({
        success: true,
        personas
      });
    } catch (err) {
      console.error('Error in getPersonas:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve AI personas'
      });
    }
  }

  /**
   * GET /api/conversations/:conversationId/export?format=markdown|json|text
   * Exports conversation transcript in the requested format with attachment headers
   */
  async exportConversation(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    const rawFormat = (req.query?.format || 'markdown').toLowerCase().trim();
    const allowedFormats = ['markdown', 'json', 'text'];
    if (!allowedFormats.includes(rawFormat)) {
      return res.status(400).json({
        success: false,
        error: `Invalid export format "${rawFormat}". Supported formats are: ${allowedFormats.join(', ')}`
      });
    }

    try {
      const result = await conversationService.exportConversation(conversationId.trim(), userId, rawFormat);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.body);
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      console.error('Error exporting conversation:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to export conversation'
      });
    }
  }

  /**
   * DELETE /api/conversations/:conversationId/messages/:messageId
   * Deletes a specific message belonging to an authenticated user's conversation
   */
  async deleteMessage(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId, messageId } = req.params;
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    if (!isValidUUID(messageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid messageId. Must be a valid UUID'
      });
    }

    try {
      await conversationService.deleteMessage(conversationId.trim(), messageId.trim(), userId);
      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: err.message || 'Message or conversation not found or unauthorized'
        });
      }

      console.error('Error deleting message:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
    }
  }

  /**
   * DELETE /api/conversations/:conversationId/messages
   * Clears all messages in a conversation for the authenticated user
   */
  async clearMessages(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    try {
      const result = await conversationService.clearMessages(conversationId.trim(), userId);
      return res.status(200).json({
        success: true,
        message: 'All messages cleared successfully',
        count: result.clearedCount
      });
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      console.error('Error clearing messages:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to clear conversation messages'
      });
    }
  }

  /**
   * POST /api/conversations/:conversationId/fork
   * Forks an existing conversation and its messages into a new conversation
   */
  async forkConversation(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    const { title } = req.body || {};
    if (title !== undefined && title !== null && typeof title === 'string' && title.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Conversation title cannot exceed 100 characters'
      });
    }

    try {
      const result = await conversationService.forkConversation(conversationId.trim(), userId, title);
      return res.status(201).json({
        success: true,
        message: 'Conversation forked successfully',
        conversation: result.conversation,
        messageCount: result.messageCount
      });
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'Source conversation not found or unauthorized'
        });
      }

      console.error('Error forking conversation:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fork conversation'
      });
    }
  }

  /**
   * GET /api/conversations/:conversationId/stats
   * Returns conversation analytics, token estimates, and dialogue metrics
   */
  async getConversationStats(req, res) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User identity could not be verified'
      });
    }

    const { conversationId } = req.params;
    if (!isValidUUID(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    try {
      const stats = await conversationService.getConversationStats(conversationId.trim(), userId);
      return res.status(200).json({
        success: true,
        stats
      });
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }

      console.error('Error fetching conversation stats:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversation statistics'
      });
    }
  }
}

module.exports = new ConversationController();
