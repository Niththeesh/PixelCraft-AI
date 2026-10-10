/**
 * PixelCraft AI — Multimodal Intent Routing & Classification Engine
 *
 * Detects user intent accurately across English, Tamil, and Tanglish (Tamil-English):
 * 1. general_conversation (greetings, pleasantries, chit-chat)
 * 2. factual_explanation (explanations, concepts, definitions, e.g. "Explain AI in simple terms", "Explain machine learning")
 * 3. code_assistance (writing code, debugging, explaining code, syntax)
 * 4. logo_generation (brand identity, logos, monograms, emblems, e.g. "Bubble Cafe ku logo create pannu", "Generate a professional logo for Bubble Cafe")
 * 5. image_generation (visual art, photography, posters, banners, e.g. "Create a futuristic city image", "Bubble Cafe promotional poster with cream and pastel pink colours")
 * 6. uiux_generation (mobile app UI, dashboard screens, interactive app prototypes, e.g. "Oru modern mobile app UI design pannu")
 * 7. website_generation (full websites, landing pages, storefronts, e.g. "Enaku oru gym website create pannu", "Create a complete gym website")
 * 8. design_refinement (modifications, updates, theme/section tweaks, e.g. "Make this logo more premium", "Only change the hero section", "Continue the previous design")
 */

class IntentRouter {
  /**
   * Normalizes input text and handles common Tanglish terms for uniform matching.
   */
  normalizePrompt(prompt = '') {
    if (!prompt || typeof prompt !== 'string') return '';
    return prompt.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Checks if prompt is an ordinary conversational query or factual question
   * that should NOT generate a creative artifact.
   */
  isPureConversationalOrExplanation(p) {
    // 1. Direct factual/explanation questions: "explain ...", "what is ...", "how does ...", "why is ..."
    const explanationPrefixes = [
      /^explain\s+(?:ai|machine learning|deep learning|data science|blockchain|cloud|quantum|algorithms?|recursion|closure|react|node|javascript|python|sql|html|css|dns|http|rest|api|physics|biology|history|math)\b/i,
      /^explain\s+(?!how to (?:create|build|make|design)\b)/i,
      /^(?:what|who|why|when|where)\s+(?:is|are|was|were|does|do|can)\b/i,
      /^define\s+/i,
      /^tell me about\b/i,
      /^summarize\b/i,
      /^compare\s+/i,
      /^how does\s+/i,
      /^how do\s+(?!i (?:create|build|make|design)\b)/i,
      /^difference between\b/i
    ];

    if (explanationPrefixes.some(regex => regex.test(p))) {
      // Exclude if user explicitly asks for a visual design or image asset inside the question
      const hasExplicitCreativeTarget = /\b(generate|create|build|draw)\b.*\b(logo|image|poster|photo|picture|website|ui|screen)\b/i.test(p);
      if (!hasExplicitCreativeTarget) {
        return true;
      }
    }

    // 2. Pure greetings & chit-chat
    const greetings = [
      /^(?:hi|hello|hey|greetings|vanakkam|namaste|good\s*(?:morning|afternoon|evening|night)|howdy|sup)\b/i,
      /^how are you\b/i,
      /^who are you\b/i,
      /^what can you do\b/i,
      /^help me\b/i,
      /^thank(?:s| you)\b/i
    ];

    if (greetings.some(regex => regex.test(p))) {
      return true;
    }

    // 3. Tanglish conversational explanation queries: "pathi explain pannu", "enna nu explain pannu"
    const tanglishExplanation = /\b(?:pathi|bathi|enna nu|na enna|epdi nu)\s+(?:solli kudu|solren|explain pannu|sollu)\b/i;
    if (tanglishExplanation.test(p)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if prompt is a code assistance request.
   */
  isCodeAssistance(p) {
    const codePatterns = [
      /\b(?:write|code|implement|create|give me)\s+(?:a\s+)?(?:python|javascript|typescript|c\+\+|java|rust|go|sql|html|css|bash)\s+(?:script|code|function|program|query|algorithm)\b/i,
      /\b(?:how to|fix|debug|refactor|optimize)\s+(?:this\s+)?(?:code|function|error|bug|issue|exception|query)\b/i,
      /\b(?:parse csv|fetch api|binary search|quicksort|merge sort|linked list|regex|regular expression)\b/i
    ];

    return codePatterns.some(regex => regex.test(p));
  }

  /**
   * Checks if prompt is a refinement of an existing asset/design.
   */
  isRefinement(p, history = []) {
    // If prompt explicitly starts with "create", "generate", "build", "make a", it's new creation, not refinement
    const isExplicitCreation = /^(?:create|generate|build|make a|make an|design a|design an|craft a|setup a|develop a|draw a)\b/i.test(p);
    if (isExplicitCreation && !/\b(?:only change|modify|update|tweak|replace|redo)\b/i.test(p)) {
      return false;
    }

    // Refinement keywords
    const refinementPrefixes = [
      /\b(?:make this|make it|change this|change it|only change|modify|update|tweak|replace|redesign|improve|continue)\b/i,
      /\b(?:more premium|more luxury|more modern|more minimal|more colorful|darker|brighter|cleaner)\b/i,
      /\b(?:change (?:the )?(?:color|colors|theme|font|fonts|accent|hero|navbar|footer|background|header))\b/i,
      /\b(?:pastel pink|cream and pastel|black and gold|gold and black|dark mode|light mode)\b/i,
      /\b(?:only (?:the )?hero section|only (?:the )?pricing|only (?:the )?navbar)\b/i,
      /\b(?:indha (?:design|logo|website|image|ui|section))\b.*\b(?:mathu|change pannu)\b/i,
      /\b(?:mattum mathu|innum premium ah mathu)\b/i
    ];

    if (refinementPrefixes.some(regex => regex.test(p))) {
      return true;
    }

    // If prompt is short and comparative, e.g. "Add pricing section", "Make it darker"
    if (history && history.length > 0) {
      if (/^(?:add|remove|change|make)\s+/i.test(p) && p.length < 50) {
        return true;
      }
    }

    return false;
  }

  /**
   * Infers creative target mode from prompt.
   * Returns 'logo' | 'image' | 'uiux' | 'website' | null
   */
  detectCreativeMode(p) {
    // 0. Website Section triggers (hero, navbar, pricing section, footer)
    if (/\b(?:hero section|hero|navbar|footer|pricing table|pricing section|testimonial section|faq section)\b/i.test(p)) {
      return 'website';
    }

    // 1. Logo & Brand Triggers
    const logoTriggers = [
      /\b(?:logo|logomark|wordmark|monogram|emblem|brand identity|branding|brand mark|seal|symbol)\b/i,
      /\b[a-z0-9\s&]+(?:ku|for)\s+(?:oru\s+)?logo\b/i,
      /\blogo\s+(?:create|make|design|generate|pannu|venum)\b/i
    ];
    if (logoTriggers.some(r => r.test(p))) {
      return 'logo';
    }

    // 2. Poster, Image & Visual Art Triggers
    const imageTriggers = [
      /\b(?:poster|image|photo|photography|picture|wallpaper|illustration|promotional artwork|artwork|concept art|visual|banner|graphic art)\b/i,
      /\b(?:photorealistic|cyberpunk|cinematic lighting|8k|render)\b/i
    ];
    const isImageExcluded = /\b(?:website|landing page|app ui|mobile app|dashboard ui|hero section)\b/i.test(p);
    if (!isImageExcluded && imageTriggers.some(r => r.test(p))) {
      return 'image';
    }

    // 3. UI/UX App Triggers
    const uiuxTriggers = [
      /\b(?:app ui|ui\/ux|mobile app|mobile banking|ordering app|dashboard ui|management dashboard|screen ui|saas app|interface design|user interface)\b/i,
      /\b(?:app|dashboard)\b.*\b(?:ui|design|screens?|interface)\b/i,
      /\boru\s+(?:modern\s+)?(?:mobile\s+)?app\s+ui\b/i
    ];
    if (uiuxTriggers.some(r => r.test(p))) {
      return 'uiux';
    }

    // 4. Website Triggers
    const websiteTriggers = [
      /\b(?:website|web site|site|webpage|landing page|portfolio|dashboard|ecommerce|storefront|store|shop)\b/i,
      /\b(?:gym|fitness|restaurant|cafe|bistro|agency|startup|clinic|doctor|hotel)\s+(?:website|site|page)\b/i,
      /\b(?:enaku\s+)?oru\s+(?:gym|restaurant|portfolio|store)\s+website\b/i,
      /\bwebsite\s+(?:create|build|make|design|generate|pannu|venum)\b/i
    ];
    if (websiteTriggers.some(r => r.test(p))) {
      return 'website';
    }

    return null;
  }

  /**
   * Infers active mode from recent conversation history when refining.
   */
  inferModeFromHistory(history = []) {
    if (!Array.isArray(history) || history.length === 0) return 'website';

    // Scan backwards from most recent message
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const text = (msg.content || '').toLowerCase();
      if (/\b(?:logo|brand identity|wordmark|monogram)\b/i.test(text)) return 'logo';
      if (/\b(?:poster|image|photorealistic|artwork|wallpaper)\b/i.test(text) && !text.includes('website')) return 'image';
      if (/\b(?:app ui|mobile app|dashboard ui|screens)\b/i.test(text)) return 'uiux';
      if (/\b(?:website|landing page|hero section|pricing table)\b/i.test(text)) return 'website';
    }

    return 'website';
  }

  /**
   * Main classification method.
   * Returns:
   * {
   *   intent: 'general_conversation' | 'factual_explanation' | 'code_assistance' | 'logo_generation' | 'image_generation' | 'uiux_generation' | 'website_generation' | 'design_refinement',
   *   isCreative: boolean,
   *   mode: 'logo' | 'image' | 'uiux' | 'website' | null,
   *   rawPrompt: string
   * }
   */
  classifyIntent(prompt = '', history = []) {
    const raw = prompt.trim();
    const p = this.normalizePrompt(raw);

    // 1. Check for pure explanation or conversation FIRST
    if (this.isPureConversationalOrExplanation(p)) {
      if (/explain|what is|how does|why is|difference between|summarize|define/i.test(p)) {
        return {
          intent: 'factual_explanation',
          isCreative: false,
          mode: null,
          rawPrompt: raw
        };
      }
      return {
        intent: 'general_conversation',
        isCreative: false,
        mode: null,
        rawPrompt: raw
      };
    }

    // 2. Check for code assistance
    if (this.isCodeAssistance(p)) {
      return {
        intent: 'code_assistance',
        isCreative: false,
        mode: null,
        rawPrompt: raw
      };
    }

    // 3. Check for refinement / modification
    if (this.isRefinement(p, history)) {
      const explicitMode = this.detectCreativeMode(p);
      const inferredMode = explicitMode || this.inferModeFromHistory(history);
      return {
        intent: 'design_refinement',
        isCreative: true,
        mode: inferredMode,
        rawPrompt: raw
      };
    }

    // 4. Check for creative generation modes
    const detectedMode = this.detectCreativeMode(p);
    if (detectedMode) {
      if (detectedMode === 'logo') {
        return {
          intent: 'logo_generation',
          isCreative: true,
          mode: 'logo',
          rawPrompt: raw
        };
      }
      if (detectedMode === 'image') {
        return {
          intent: 'image_generation',
          isCreative: true,
          mode: 'image',
          rawPrompt: raw
        };
      }
      if (detectedMode === 'uiux') {
        return {
          intent: 'uiux_generation',
          isCreative: true,
          mode: 'uiux',
          rawPrompt: raw
        };
      }
      if (detectedMode === 'website') {
        return {
          intent: 'website_generation',
          isCreative: true,
          mode: 'website',
          rawPrompt: raw
        };
      }
    }

    // 5. Default fallback: intelligent conversational assistant
    return {
      intent: 'general_conversation',
      isCreative: false,
      mode: null,
      rawPrompt: raw
    };
  }
}

module.exports = new IntentRouter();
