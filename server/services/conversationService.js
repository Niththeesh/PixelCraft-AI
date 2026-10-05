const { getSupabaseClient } = require('../config/supabaseClient');
const geminiService = require('./geminiService');

/**
 * Service managing conversations and messages in Supabase PostgreSQL
 * with strict user-level ownership isolation.
 */
class ConversationService {
  /**
   * Helper to retrieve active Supabase client
   */
  getClient() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client is not configured or unavailable');
    }
    return client;
  }

  /**
   * Creates a new conversation in public.conversations bound to the authenticated user
   * @param {string|object} userIdOrTitle - User UUID or options object or legacy title string
   * @param {string} [maybeTitle] - Optional conversation title
   * @returns {Promise<object>} Created conversation record
   */
  async createConversation(userIdOrTitle, maybeTitle) {
    const client = this.getClient();
    let userId = null;
    let title = null;

    if (typeof userIdOrTitle === 'object' && userIdOrTitle !== null) {
      userId = userIdOrTitle.userId || null;
      title = userIdOrTitle.title || null;
    } else if (maybeTitle !== undefined) {
      userId = userIdOrTitle;
      title = maybeTitle;
    } else {
      title = userIdOrTitle;
    }

    const payload = {};
    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      payload.user_id = userId.trim();
    }
    if (title && typeof title === 'string' && title.trim() !== '') {
      payload.title = title.trim();
    }

    const { data, error } = await client
      .from('conversations')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Retrieves conversations for a specific user ordered by updated_at descending
   * @param {string} [userId] - Optional user UUID for strict tenant isolation
   * @returns {Promise<Array<object>>}
   */
  async getConversations(userId = null) {
    const client = this.getClient();
    let query = client.from('conversations').select('*');

    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      query = query.eq('user_id', userId.trim());
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Retrieves a single conversation by ID with optional user ownership check
   * @param {string} id - Conversation UUID
   * @param {string} [userId] - Optional user UUID
   * @returns {Promise<object|null>}
   */
  async getConversationById(id, userId = null) {
    const client = this.getClient();
    let query = client.from('conversations').select('*').eq('id', id);

    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      query = query.eq('user_id', userId.trim());
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Deletes a conversation by ID if owned by user. Cascades to messages via DB foreign key.
   * @param {string} id - Conversation UUID
   * @param {string} [userId] - Optional user UUID
   * @returns {Promise<boolean>} True if record was found and deleted
   */
  async deleteConversation(id, userId = null) {
    const client = this.getClient();
    let query = client.from('conversations').delete().eq('id', id);

    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      query = query.eq('user_id', userId.trim());
    }

    const { data, error } = await query.select();

    if (error) throw error;
    return Boolean(data && data.length > 0);
  }

  /**
   * Updates a conversation (e.g. title) if owned by user.
   * @param {string} id - Conversation UUID
   * @param {string} userId - User UUID
   * @param {{title?: string}} updates - Fields to update
   * @returns {Promise<object|null>} Updated conversation record or null if not found
   */
  async updateConversation(id, userId, updates = {}) {
    const client = this.getClient();

    // Verify ownership first
    const existing = await this.getConversationById(id, userId);
    if (!existing) {
      return null;
    }

    const payload = {
      updated_at: new Date().toISOString()
    };

    if (updates.title && typeof updates.title === 'string' && updates.title.trim() !== '') {
      payload.title = updates.title.trim();
    }

    const { data, error } = await client
      .from('conversations')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Inserts a message into public.messages and updates parent conversation's updated_at.
   * Verifies conversation ownership when userId is provided.
   * Signature supports:
   *   addMessage(conversationId, userId, role, content)
   *   addMessage(conversationId, role, content, userId)
   *   addMessage(conversationId, role, content)
   *
   * @param {string} conversationId - Conversation UUID
   * @param {string} arg2 - userId or role
   * @param {string} arg3 - role or content
   * @param {string} [arg4] - content or userId
   * @returns {Promise<object>} Created message record
   */
  async addMessage(conversationId, arg2, arg3, arg4) {
    const client = this.getClient();
    let userId = null;
    let role = '';
    let content = '';

    if (arg4 !== undefined) {
      if (arg2 === 'user' || arg2 === 'assistant') {
        role = arg2;
        content = arg3;
        userId = arg4;
      } else {
        userId = arg2;
        role = arg3;
        content = arg4;
      }
    } else if (arg2 === 'user' || arg2 === 'assistant') {
      role = arg2;
      content = arg3;
    } else {
      userId = arg2;
      role = arg3;
    }

    // Verify conversation existence and user ownership if userId provided
    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      const conv = await this.getConversationById(conversationId, userId.trim());
      if (!conv) {
        const notFoundErr = new Error('Conversation not found or unauthorized');
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }
    }

    const { data, error } = await client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: (role || '').trim(),
        content: (content || '').trim()
      })
      .select()
      .single();

    if (error) throw error;

    // Refresh updated_at on the parent conversation
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  }

  /**
   * Retrieves all messages for a conversation ordered by created_at ascending.
   * Verifies conversation ownership when userId is provided.
   * @param {string} conversationId - Conversation UUID
   * @param {string} [userId] - Optional user UUID for ownership verification
   * @returns {Promise<Array<object>>}
   */
  async getMessages(conversationId, userId = null) {
    const client = this.getClient();

    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      const conv = await this.getConversationById(conversationId, userId.trim());
      if (!conv) {
        const notFoundErr = new Error('Conversation not found or unauthorized');
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }
    }

    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Searches conversation titles and message contents strictly scoped to the authenticated user.
   * @param {string} userId - Authenticated user UUID
   * @param {string} query - Search term
   * @returns {Promise<Array<object>>} List of matching conversations with match details
   */
  async searchConversations(userId, query) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return [];
    }
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return [];
    }

    const client = this.getClient();

    // 1. Fetch all conversations belonging to this user
    const { data: userConvs, error: convError } = await client
      .from('conversations')
      .select('*')
      .eq('user_id', userId.trim());

    if (convError) throw convError;
    if (!userConvs || userConvs.length === 0) {
      return [];
    }

    const convMap = new Map(userConvs.map(c => [c.id, c]));
    const matchingConvIds = new Set();
    const matchDetails = new Map();

    // 2. Identify conversations matching title
    const lowerQuery = cleanQuery.toLowerCase();
    userConvs.forEach(conv => {
      if (conv.title && conv.title.toLowerCase().includes(lowerQuery)) {
        matchingConvIds.add(conv.id);
        matchDetails.set(conv.id, {
          matchedInTitle: true,
          matchingSnippet: null,
          matchingRole: null
        });
      }
    });

    // 3. Search messages in this user's conversations
    const userConvIds = userConvs.map(c => c.id);
    const { data: matchingMessages, error: msgError } = await client
      .from('messages')
      .select('conversation_id, role, content, created_at')
      .in('conversation_id', userConvIds)
      .ilike('content', `%${cleanQuery}%`)
      .order('created_at', { ascending: false });

    if (msgError) throw msgError;

    if (matchingMessages && matchingMessages.length > 0) {
      matchingMessages.forEach(msg => {
        matchingConvIds.add(msg.conversation_id);
        if (!matchDetails.has(msg.conversation_id)) {
          const content = msg.content || '';
          const lower = content.toLowerCase();
          const idx = lower.indexOf(lowerQuery);
          let snippet = content;
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(content.length, idx + cleanQuery.length + 30);
            snippet = (start > 0 ? '...' : '') + content.substring(start, end).trim() + (end < content.length ? '...' : '');
          }
          matchDetails.set(msg.conversation_id, {
            matchedInTitle: false,
            matchingSnippet: snippet,
            matchingRole: msg.role
          });
        }
      });
    }

    // 4. Assemble and sort matching conversations by updated_at descending
    const results = Array.from(matchingConvIds)
      .map(id => {
        const conv = convMap.get(id);
        const details = matchDetails.get(id) || {};
        return {
          ...conv,
          matchedInTitle: details.matchedInTitle || false,
          matchingSnippet: details.matchingSnippet || null,
          matchingRole: details.matchingRole || null
        };
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    return results;
  }

  /**
   * Regenerates the assistant response for the latest turn in a conversation.
   * Re-prompts Gemini using preceding multi-turn dialogue history and updates public.messages.
   *
   * @param {string} conversationId - Conversation UUID
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<object>} Updated or inserted assistant message record
   */
  async retryLastResponse(conversationId, userId, options = {}) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    const client = this.getClient();

    // 1. Verify conversation ownership
    const conv = await this.getConversationById(conversationId, userId.trim());
    if (!conv) {
      const notFoundErr = new Error('Conversation not found or unauthorized');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // 2. Fetch all messages in this conversation
    const messages = await this.getMessages(conversationId, userId.trim());

    // 3. Verify at least one user message exists
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) {
      const err = new Error('Cannot retry a conversation with no user messages');
      err.statusCode = 400;
      throw err;
    }

    const lastUserMsg = messages[lastUserIdx];
    const historyBeforeLastUser = messages.slice(0, lastUserIdx);
    const existingAssistantMsg = messages.slice(lastUserIdx + 1).find(m => m.role === 'assistant');

    // 4. Request regenerated response from Gemini with optional persona options
    const geminiResult = await geminiService.generateChatResponse(historyBeforeLastUser, lastUserMsg.content, options);
    if (!geminiResult || !geminiResult.success || !geminiResult.reply) {
      const err = new Error(geminiResult?.error || 'Failed to regenerate response from AI model');
      err.statusCode = geminiResult?.statusCode || 500;
      throw err;
    }

    // 5. Update the existing assistant message or insert a new one
    let messageRecord = null;
    if (existingAssistantMsg) {
      const { data, error } = await client
        .from('messages')
        .update({
          content: geminiResult.reply.trim()
        })
        .eq('id', existingAssistantMsg.id)
        .select()
        .single();

      if (error) throw error;
      messageRecord = data;
    } else {
      messageRecord = await this.addMessage(conversationId, 'assistant', geminiResult.reply.trim(), userId.trim());
    }

    // 6. Refresh conversation updated_at
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return messageRecord;
  }

  /**
   * Exports conversation transcript into Markdown, JSON, or Plain Text format.
   *
   * @param {string} conversationId - Conversation UUID
   * @param {string} userId - Authenticated user UUID
   * @param {'markdown'|'json'|'text'} [format='markdown'] - Desired export format
   * @returns {Promise<{contentType: string, filename: string, body: string}>}
   */
  async exportConversation(conversationId, userId, format = 'markdown') {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    // 1. Verify conversation ownership
    const conv = await this.getConversationById(conversationId, userId.trim());
    if (!conv) {
      const notFoundErr = new Error('Conversation not found or unauthorized');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // 2. Fetch all messages in chronological order
    const messages = await this.getMessages(conversationId, userId.trim());

    // 3. Generate sanitized title slug for filename
    const slug = (conv.title || 'conversation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'conversation';
    const dateStr = new Date().toISOString().split('T')[0];

    // 4. Format output based on requested format
    const lowerFormat = (format || 'markdown').toLowerCase();

    if (lowerFormat === 'json') {
      const payload = {
        id: conv.id,
        title: conv.title || 'Untitled Conversation',
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        exported_at: new Date().toISOString(),
        messages_count: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at
        }))
      };

      return {
        contentType: 'application/json; charset=utf-8',
        filename: `${slug}-${dateStr}.json`,
        body: JSON.stringify(payload, null, 2)
      };
    }

    if (lowerFormat === 'text') {
      let textOut = `========================================================\n`;
      textOut += `CONVERSATION: ${conv.title || 'Untitled Conversation'}\n`;
      textOut += `Exported: ${new Date().toISOString()}\n`;
      textOut += `Total Messages: ${messages.length}\n`;
      textOut += `========================================================\n\n`;

      if (messages.length === 0) {
        textOut += `(No messages in this conversation)\n`;
      } else {
        for (const msg of messages) {
          const roleLabel = msg.role === 'user' ? 'USER' : 'AI ASSISTANT';
          textOut += `[${roleLabel}] (${msg.created_at || ''}):\n`;
          textOut += `${msg.content}\n\n`;
          textOut += `--------------------------------------------------------\n\n`;
        }
      }

      return {
        contentType: 'text/plain; charset=utf-8',
        filename: `${slug}-${dateStr}.txt`,
        body: textOut
      };
    }

    // Default: Markdown format
    let mdOut = `# ${conv.title || 'Conversation Transcript'}\n\n`;
    mdOut += `> **Exported:** ${new Date().toISOString()}  \n`;
    mdOut += `> **Total Messages:** ${messages.length}  \n`;
    mdOut += `> **Conversation ID:** \`${conv.id}\`\n\n`;
    mdOut += `---\n\n`;

    if (messages.length === 0) {
      mdOut += `*(No messages in this conversation)*\n`;
    } else {
      for (const msg of messages) {
        const isUser = msg.role === 'user';
        const header = isUser ? `### 🧑 User` : `### ⚡ Assistant`;
        mdOut += `${header}\n\n${msg.content}\n\n---\n\n`;
      }
    }

    return {
      contentType: 'text/markdown; charset=utf-8',
      filename: `${slug}-${dateStr}.md`,
      body: mdOut
    };
  }

  /**
   * Deletes a single message belonging to an authenticated user's conversation.
   *
   * @param {string} conversationId - Conversation UUID
   * @param {string} messageId - Message UUID
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<boolean>} True if message was found and deleted
   */
  async deleteMessage(conversationId, messageId, userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    const client = this.getClient();

    // 1. Verify parent conversation ownership
    const conv = await this.getConversationById(conversationId, userId.trim());
    if (!conv) {
      const notFoundErr = new Error('Conversation not found or unauthorized');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // 2. Delete message matching both messageId and conversationId
    const { data, error } = await client
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      const notFoundErr = new Error('Message not found or does not belong to conversation');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // 3. Refresh conversation updated_at
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return true;
  }

  /**
   * Clears all messages from a conversation while preserving the conversation container and title.
   *
   * @param {string} conversationId - Conversation UUID
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<{clearedCount: number}>} Number of cleared messages
   */
  async clearMessages(conversationId, userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    const client = this.getClient();

    // 1. Verify parent conversation ownership
    const conv = await this.getConversationById(conversationId, userId.trim());
    if (!conv) {
      const notFoundErr = new Error('Conversation not found or unauthorized');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // 2. Delete all messages for this conversation
    const { data, error } = await client
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)
      .select();

    if (error) throw error;

    // 3. Refresh conversation updated_at
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      clearedCount: data ? data.length : 0
    };
  }

  /**
   * Forks an existing conversation and clones all its messages into a new conversation.
   *
   * @param {string} conversationId - Source conversation UUID
   * @param {string} userId - Authenticated user UUID
   * @param {string} [customTitle] - Optional custom title for the forked conversation
   * @returns {Promise<{conversation: object, messageCount: number}>}
   */
  async forkConversation(conversationId, userId, customTitle = null) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    const client = this.getClient();

    // 1. Verify source conversation existence and ownership
    const sourceConv = await this.getConversationById(conversationId, userId.trim());
    if (!sourceConv) {
      const notFoundErr = new Error('Source conversation not found or unauthorized');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // 2. Fetch all messages in chronological order
    const sourceMessages = await this.getMessages(conversationId, userId.trim());

    // 3. Determine new title
    const forkTitle = (customTitle && typeof customTitle === 'string' && customTitle.trim() !== '')
      ? customTitle.trim().substring(0, 100)
      : `${sourceConv.title || 'New Conversation'} (Fork)`;

    // 4. Create new conversation container
    const newConv = await this.createConversation(userId.trim(), forkTitle);

    // 5. Clone messages if any exist
    if (sourceMessages && sourceMessages.length > 0) {
      const messagesToInsert = sourceMessages.map(msg => ({
        conversation_id: newConv.id,
        role: msg.role,
        content: msg.content
      }));

      const { error: msgErr } = await client
        .from('messages')
        .insert(messagesToInsert);

      if (msgErr) throw msgErr;
    }

    return {
      conversation: newConv,
      messageCount: sourceMessages ? sourceMessages.length : 0
    };
  }

  /**
   * Computes diagnostics, token estimates, and dialogue metrics for a conversation
   * @param {string} conversationId - Conversation UUID
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<object>} Analytics and statistics object
   */
  async getConversationStats(conversationId, userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    const conv = await this.getConversationById(conversationId, userId.trim());
    if (!conv) {
      const notFoundErr = new Error('Conversation not found or unauthorized');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    const messages = await this.getMessages(conversationId, userId.trim());

    let userMessages = 0;
    let assistantMessages = 0;
    let userWords = 0;
    let assistantWords = 0;
    let userCharacters = 0;
    let assistantCharacters = 0;

    const countWords = (text) => {
      if (!text || typeof text !== 'string') return 0;
      const trimmed = text.trim();
      return trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;
    };

    (messages || []).forEach(msg => {
      const content = msg.content || '';
      const charCount = content.length;
      const wordCount = countWords(content);

      if (msg.role === 'user') {
        userMessages++;
        userWords += wordCount;
        userCharacters += charCount;
      } else if (msg.role === 'assistant') {
        assistantMessages++;
        assistantWords += wordCount;
        assistantCharacters += charCount;
      }
    });

    const totalMessages = userMessages + assistantMessages;
    const totalWords = userWords + assistantWords;
    const totalCharacters = userCharacters + assistantCharacters;

    // Token estimation heuristic: ~4 characters per token
    const promptTokens = Math.ceil(userCharacters / 4);
    const completionTokens = Math.ceil(assistantCharacters / 4);
    const totalTokens = promptTokens + completionTokens;

    const avgAssistantWordsPerTurn = assistantMessages > 0
      ? parseFloat((assistantWords / assistantMessages).toFixed(1))
      : 0;

    // Timeline calculation
    let firstMessageAt = null;
    let lastMessageAt = null;
    let durationSeconds = 0;
    let durationFormatted = '0s';

    if (messages && messages.length > 0) {
      firstMessageAt = messages[0].created_at || conv.created_at;
      lastMessageAt = messages[messages.length - 1].created_at || conv.updated_at;

      const firstTime = new Date(firstMessageAt).getTime();
      const lastTime = new Date(lastMessageAt).getTime();
      if (!isNaN(firstTime) && !isNaN(lastTime)) {
        durationSeconds = Math.max(0, Math.floor((lastTime - firstTime) / 1000));

        if (durationSeconds < 60) {
          durationFormatted = `${durationSeconds}s`;
        } else if (durationSeconds < 3600) {
          const mins = Math.floor(durationSeconds / 60);
          const secs = durationSeconds % 60;
          durationFormatted = `${mins}m ${secs}s`;
        } else {
          const hours = Math.floor(durationSeconds / 3600);
          const mins = Math.floor((durationSeconds % 3600) / 60);
          durationFormatted = `${hours}h ${mins}m`;
        }
      }
    }

    return {
      conversation: {
        id: conv.id,
        title: conv.title || 'New Conversation',
        created_at: conv.created_at,
        updated_at: conv.updated_at
      },
      totalMessages,
      userMessages,
      assistantMessages,
      totalWords,
      userWords,
      assistantWords,
      avgAssistantWordsPerTurn,
      totalCharacters,
      userCharacters,
      assistantCharacters,
      estimatedTokens: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      timeline: {
        firstMessageAt,
        lastMessageAt,
        durationSeconds,
        durationFormatted
      }
    };
  }
}

module.exports = new ConversationService();
