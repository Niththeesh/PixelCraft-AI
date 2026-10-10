const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { GoogleGenAI } = require('@google/genai');

// AI Persona Catalog and Tailored System Prompt Instructions
const PERSONA_DEFINITIONS = {
  general: {
    id: 'general',
    name: 'General Assistant',
    icon: 'auto_awesome',
    description: 'Balanced, multimodal, and intelligent',
    instruction: `You are PixelCraft AI — a world-class multimodal conversational AI assistant and creative architect inspired by state-of-the-art AI.
Key Guidelines:
1. Conversational Intelligence: Understand follow-up messages, retain context from earlier turns, and understand incomplete or colloquial prompts.
2. Multilingual & Tanglish: Fluently understand English, Tamil, and Tanglish (Tamil phrases transliterated in Latin script, e.g., "oru gym website", "Bubble Cafe ku logo", "indha mathiri", "epdi pannradhu", "enaku oru...", "venum", "kudu", "mathu"). Respond naturally in helpful English or matching polite Tanglish as appropriate.
3. Natural Distinction: Distinguish ordinary conversational questions (e.g., "Explain AI in simple terms", "Explain machine learning", "How does async/await work?") from creative generation requests. For questions, provide direct, crystal-clear, structured answers with headings and bullet points.
4. Code Mastery: When explaining code or writing software, provide production-ready solutions with syntax highlighting, clear architectural rationale, Big-O complexity notes, and security best practices.
5. Multimodal Creative Awareness: PixelCraft AI includes an integrated Visual Studio for real mathematical SVG vector logos, high-fidelity AI image synthesis, interactive UI/UX screen prototypes, and responsive website building. Guide users creatively and help them plan and refine projects.
6. Tone: Warm, intelligent, concise, helpful, and empowering. Avoid fluff.`
  },
  code_architect: {
    id: 'code_architect',
    name: 'Code Architect',
    icon: 'terminal',
    description: 'Production code, patterns & best practices',
    instruction: `You are PixelCraft AI acting as a Principal Software Architect and Staff Engineer.
Provide production-ready, clean, modular, and well-architected code solutions.
Emphasize software engineering best practices, security, maintainability, type safety, modular design, clean separation of concerns, and asymptotic complexity (Big-O).
Understand English and Tanglish technical prompts seamlessly. When explaining code, provide line-by-line clarity and debugging suggestions.`
  },
  technical_writer: {
    id: 'technical_writer',
    name: 'Technical Writer',
    icon: 'menu_book',
    description: 'In-depth explanations & clear guides',
    instruction: `You are PixelCraft AI acting as a Senior Technical Writer and Pedagogical Mentor.
Explain concepts with exceptional clarity, pedagogical depth, step-by-step breakdowns, clear real-world analogies, and comprehensive reference notes.
Understand informal prompts, English, and Tanglish questions. Break down difficult concepts into simple, intuitive mental models.`
  },
  executive_summarizer: {
    id: 'executive_summarizer',
    name: 'Executive Summarizer',
    icon: 'business_center',
    description: 'High-level bullets & actionable takeaways',
    instruction: `You are PixelCraft AI acting as an Executive Briefing Assistant.
Provide high-density, concise executive briefings.
Emphasize key takeaways, strategic implications, bulleted action items, risk factors, and bottom-line recommendations without fluff.`
  },
  creative_brainstormer: {
    id: 'creative_brainstormer',
    name: 'Creative Thinker',
    icon: 'palette',
    description: 'Lateral thinking, metaphors & ideation',
    instruction: `You are PixelCraft AI acting as a Creative Strategist and Multimodal Ideation Partner.
Think laterally, explore unconventional angles, generate innovative metaphors, brainstorm rich possibilities, and challenge default assumptions.
Help users envision brand identities, visual color palettes, typographic pairings, and creative design concepts.`
  }
};

/**
 * Gemini Service Module
 * Uses official @google/genai Node.js SDK
 * Supports single-turn prompts, context-aware multi-turn conversations, and adaptive system instruction personas.
 */
class GeminiService {
  /**
   * Helper to initialize GoogleGenAI client safely
   */
  getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_gemini_api_key_here') {
      return null;
    }
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  }

  /**
   * Returns list of available AI persona presets for client UI and documentation
   * @returns {Array<{id: string, name: string, icon: string, description: string}>}
   */
  getAvailablePersonas() {
    return Object.values(PERSONA_DEFINITIONS).map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      description: p.description
    }));
  }

  /**
   * Resolves the effective system instruction string based on persona or custom instruction
   * @param {object} [options] - Options containing persona or systemInstruction
   * @returns {string}
   */
  resolveSystemInstruction(options = {}) {
    if (options.systemInstruction && typeof options.systemInstruction === 'string' && options.systemInstruction.trim() !== '') {
      return options.systemInstruction.trim().substring(0, 1000);
    }

    if (options.persona && typeof options.persona === 'string') {
      const key = options.persona.trim().toLowerCase();
      if (PERSONA_DEFINITIONS[key]) {
        return PERSONA_DEFINITIONS[key].instruction;
      }
    }

    return PERSONA_DEFINITIONS.general.instruction;
  }

  /**
   * Generates response text from Gemini model for a given single user prompt.
   * Preserved for 100% backward compatibility with unauthenticated checks.
   * @param {string} promptText - User message string
   * @param {object} [options] - Optional persona or systemInstruction
   * @returns {Promise<{success: boolean, reply?: string, error?: string, statusCode?: number}>}
   */
  async generateResponse(promptText, options = {}) {
    return this.generateChatResponse([], promptText, options);
  }

  /**
   * Generates a context-aware response from Gemini model given conversation history, current prompt, and persona.
   * Translates previous turns (user/assistant) into Gemini's multi-turn dialogue structure (user/model).
   *
   * @param {Array<{role: string, content: string}>} history - Previous chronological messages
   * @param {string} promptText - Latest user message
   * @param {object} [options] - Optional persona or systemInstruction
   * @returns {Promise<{success: boolean, reply?: string, error?: string, statusCode?: number}>}
   */
  async generateChatResponse(history = [], promptText = '', options = {}) {
    const ai = this.getClient();
    if (!ai) {
      return {
        success: false,
        statusCode: 400,
        error: 'GEMINI_API_KEY is missing or invalid in .env file'
      };
    }

    if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
      return {
        success: false,
        statusCode: 400,
        error: 'Prompt message is required'
      };
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    // 1. Construct multi-turn contents array
    const contents = [];

    // Format previous conversation turns (limit to last 20 messages for context safety)
    const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
    for (const msg of recentHistory) {
      if (!msg.content || typeof msg.content !== 'string') continue;
      const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      contents.push({
        role: role,
        parts: [{ text: msg.content.trim() }]
      });
    }

    // Append the latest user prompt turn
    contents.push({
      role: 'user',
      parts: [{ text: promptText.trim() }]
    });

    // 2. Resolve system instruction from persona / custom option
    const systemInstruction = this.resolveSystemInstruction(options);

    // 3. Safe retry parameters for temporary 503 high-demand spikes
    const maxRetries = 3;
    let baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const generateParams = {
          model: model,
          contents: contents
        };
        if (systemInstruction) {
          generateParams.config = {
            systemInstruction: systemInstruction
          };
        }

        const response = await ai.models.generateContent(generateParams);
        const text = response?.text || (typeof response?.text === 'function' ? response.text() : '');
        if (text) {
          return { success: true, reply: text };
        }
      } catch (err) {
        const errMsg = err.message || '';
        const is503 = 
          errMsg.includes('503') || 
          errMsg.includes('UNAVAILABLE') || 
          errMsg.includes('high demand');

        if (is503 && attempt <= maxRetries) {
          const jitter = Math.random() * 300;
          const waitMs = Math.round(baseDelay + jitter);
          console.warn(`Gemini (${model}) 503 high demand spike (attempt ${attempt}/${maxRetries + 1}). Retrying in ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          baseDelay *= 2;
          continue;
        }

        console.error(`Gemini model (${model}) error: ${errMsg}`);
        return {
          success: false,
          statusCode: errMsg.includes('API key') ? 401 : (is503 ? 503 : 500),
          error: `Gemini SDK error: ${errMsg || 'Failed to generate response'}`
        };
      }
    }

    return {
      success: false,
      statusCode: 500,
      error: 'Failed to generate response from Gemini API'
    };
  }
}

module.exports = new GeminiService();
