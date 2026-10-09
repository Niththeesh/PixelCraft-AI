const geminiService = require('./geminiService');

/**
 * Curated domain-relevant royalty-free photography catalog (Unsplash CDN)
 * Guaranteed valid URLs, high performance, appropriate aspect ratios, zero broken links.
 */
const ASSET_CATALOG = {
  gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80'
  ],
  saas: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80'
  ],
  portfolio: [
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80'
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
  ],
  ecommerce: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
  ],
  agency: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80'
  ],
  dashboard: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80'
  ],
  default: [
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
  ]
};

/**
 * Checks whether user input is an explicit design / website creation request.
 * Supports English, Tamil, Tanglish, and keywords.
 */
function isCreationRequest(prompt = '') {
  if (!prompt || typeof prompt !== 'string') return false;
  const p = prompt.toLowerCase().trim();

  // Keyword indicators in English, Tamil, and Tanglish
  const creationTerms = [
    'create', 'build', 'make', 'generate', 'design', 'develop',
    'pannu', 'venum', 'mari', 'website', 'landing page', 'portfolio',
    'dashboard', 'ecommerce', 'store', 'ui', 'app', 'screen',
    'hero section', 'pricing', 'component', 'template', 'layout',
    'redesign', 'improve pannu', 'change pannu', 'mathu', 'add section'
  ];

  return creationTerms.some(term => p.includes(term));
}

/**
 * Cleans and safely extracts JSON from LLM response text (handles code fences, backticks, trailing commas).
 */
function extractJsonFromText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleaned = rawText.trim();
  // Strip ```json and ``` fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  // Attempt direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Attempt regex block extraction for {...}
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch (_) {
      // Clean common LLM trailing commas before closing braces
      const sanitized = jsonSubstring.replace(/,\s*([\]}])/g, '$1');
      try {
        return JSON.parse(sanitized);
      } catch (__) {}
    }
  }

  return null;
}

class BuilderService {
  /**
   * Semantically interprets any user prompt (English, Tamil, Tanglish, mixed) into structured design specs.
   */
  async interpretPrompt(userPrompt, existingProject = null) {
    const systemInstruction = `You are a Senior Design Systems Architect and Multilingual Design Analyst.
Analyze user requirements stated in English, Tamil, Tanglish (Tamil written in Latin script), or mixed informal language.
Examples of Tanglish:
- "Oru gym website create pannu black and orange theme la" -> Fitness/Gym website, Black & Orange bold dark theme.
- "Apple website mari clean premium design pannu" -> Minimalist luxury tech showcase, white/dark gray sleek aesthetics.
- "Hero section mattum change pannu, remaining touch panna vendam" -> Targeted edit for Hero section only.
- "Pricing table add pannu with 3 tiers" -> Add Pricing section.

Produce an accurate, structured JSON specification without conversational filler.`;

    const promptMessage = `User Input: "${userPrompt}"
${existingProject ? `Existing Project Context: Type=${existingProject.projectType}, Title=${existingProject.title}, Sections=${(existingProject.sections || []).map(s => s.name).join(', ')}` : ''}

Respond STRICTLY with a valid JSON object matching this schema:
{
  "isTargetedRefinement": boolean,
  "targetSection": string or null,
  "projectType": string,
  "title": string,
  "brandPersonality": string,
  "visualDirection": string,
  "colorPalette": {
    "primary": "hex color",
    "secondary": "hex color",
    "background": "hex color",
    "surface": "hex color",
    "text": "hex color",
    "textMuted": "hex color",
    "accent": "hex color"
  },
  "typography": {
    "headingFont": "Google Font name (e.g. Plus Jakarta Sans, Outfit, Inter, Poppins, Syne, Clash Display)",
    "bodyFont": "Google Font name (e.g. Inter, DM Sans, Plus Jakarta Sans)"
  },
  "sections": [
    { "id": "section-id", "name": "Section Name", "type": "navbar|hero|features|showcase|pricing|testimonials|faq|contact|footer" }
  ],
  "interactivity": [string],
  "summary": "Clear one-sentence description of the design being produced"
}`;

    const res = await geminiService.generateResponse(promptMessage, { systemInstruction });
    if (!res.success || !res.reply) {
      throw new Error(res.error || 'Failed to interpret design prompt');
    }

    const spec = extractJsonFromText(res.reply);
    if (!spec) {
      // Fallback sensible default if parse fails
      return {
        isTargetedRefinement: false,
        targetSection: null,
        projectType: 'Modern Web Application',
        title: 'PixelCraft Showcase',
        brandPersonality: 'Premium, Contemporary & High-Converting',
        visualDirection: 'Sleek Dark Mode with Luminous Accents',
        colorPalette: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          background: '#090d16',
          surface: '#111827',
          text: '#f8fafc',
          textMuted: '#94a3b8',
          accent: '#38bdf8'
        },
        typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter' },
        sections: [
          { id: 'navbar', name: 'Navigation Bar', type: 'navbar' },
          { id: 'hero', name: 'Hero Section', type: 'hero' },
          { id: 'features', name: 'Features & Capabilities', type: 'features' },
          { id: 'pricing', name: 'Pricing Tiers', type: 'pricing' },
          { id: 'testimonials', name: 'Social Proof & Reviews', type: 'testimonials' },
          { id: 'footer', name: 'Footer', type: 'footer' }
        ],
        interactivity: ['Mobile menu toggle', 'Pricing billing switcher', 'Interactive cards'],
        summary: 'Modern, high-performance web experience tailored to user specifications.'
      };
    }

    return spec;
  }

  /**
   * Generates complete, beautiful, production-ready website code (HTML, CSS, JS) based on design specification.
   */
  /**
   * Intelligently synthesizes an initial design specification heuristically from the user's prompt (English, Tamil, Tanglish).
   */
  synthesizeInitialSpec(userPrompt = '') {
    const p = (userPrompt || '').toLowerCase();

    let projectType = 'Modern Web Application';
    let title = 'Apex Digital Experience';
    let brandPersonality = 'Premium, Innovative & High-Converting';
    let visualDirection = 'Sleek Modern Dark Mode with Luminous Accents';
    let headingFont = 'Plus Jakarta Sans';
    let bodyFont = 'Inter';
    let primary = '#6366f1';
    let secondary = '#8b5cf6';
    let bg = '#090d16';
    let surface = '#111827';
    let text = '#f8fafc';
    let textMuted = '#94a3b8';
    let accent = '#38bdf8';
    let sections = [
      { id: 'navbar', name: 'Navigation Bar', type: 'navbar' },
      { id: 'hero', name: 'Hero Section', type: 'hero' },
      { id: 'features', name: 'Core Capabilities', type: 'features' },
      { id: 'pricing', name: 'Pricing Tiers', type: 'pricing' },
      { id: 'testimonials', name: 'Reviews & Social Proof', type: 'testimonials' },
      { id: 'contact', name: 'Get Started & Contact', type: 'contact' },
      { id: 'footer', name: 'Footer', type: 'footer' }
    ];

    if (/gym|fitness|workout|crossfit|athlet|bodybuild|muscle|training|iron/i.test(p)) {
      projectType = 'gym';
      title = 'IronPulse Fitness & Performance';
      brandPersonality = 'Bold, High-Intensity & Athletic';
      visualDirection = 'Dark Industrial Aesthetic with High-Energy Accent';
      headingFont = 'Plus Jakarta Sans';
      primary = '#ff6600';
      secondary = '#ff8533';
      bg = '#0a0d14';
      surface = '#141824';
      accent = '#ff7700';
      sections = [
        { id: 'navbar', name: 'Navigation', type: 'navbar' },
        { id: 'hero', name: 'Hero', type: 'hero' },
        { id: 'about', name: 'About', type: 'about' },
        { id: 'programs', name: 'Training Programs', type: 'features' },
        { id: 'trainers', name: 'Trainers', type: 'trainers' },
        { id: 'pricing', name: 'Membership Plans', type: 'pricing' },
        { id: 'testimonials', name: 'Testimonials', type: 'testimonials' },
        { id: 'gallery', name: 'Gallery', type: 'gallery' },
        { id: 'faq', name: 'FAQ', type: 'faq' },
        { id: 'contact', name: 'Contact', type: 'contact' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ];
    } else if (/restaurant|cafe|food|dining|bistro|menu|table booking|chef|bakery|bar\b/i.test(p)) {
      projectType = 'restaurant';
      title = "L'Aura Artisanal Bistro";
      brandPersonality = 'Warm, Gastronomic & Sophisticated';
      visualDirection = 'Warm Dark Obsidian with Golden Amber Lighting';
      headingFont = 'Playfair Display';
      primary = '#d97706';
      secondary = '#b45309';
      bg = '#0f0e0c';
      surface = '#1c1917';
      accent = '#f59e0b';
      sections = [
        { id: 'navbar', name: 'Navigation Bar', type: 'navbar' },
        { id: 'hero', name: 'Hero Section', type: 'hero' },
        { id: 'specialties', name: "Chef's Specialties", type: 'features' },
        { id: 'menu', name: 'Curated Menu', type: 'features' },
        { id: 'booking', name: 'Reserve a Table', type: 'contact' },
        { id: 'testimonials', name: 'Guest Reviews', type: 'testimonials' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ];
    } else if (/portfolio|developer|designer|resume|showcase|personal website/i.test(p)) {
      projectType = 'portfolio';
      title = 'Alex Vance — Creative Technologist';
      brandPersonality = 'Minimalist, Avant-Garde & High-Craft';
      visualDirection = 'Deep Space Minimal with Luminous Emerald Accents';
      headingFont = 'Syne';
      primary = '#10b981';
      secondary = '#059669';
      bg = '#090a0f';
      surface = '#13151f';
      accent = '#34d399';
      sections = [
        { id: 'navbar', name: 'Navigation Bar', type: 'navbar' },
        { id: 'hero', name: 'Hero Section', type: 'hero' },
        { id: 'projects', name: 'Selected Work & Projects', type: 'features' },
        { id: 'skills', name: 'Technical Stack & Tools', type: 'features' },
        { id: 'testimonials', name: 'Client Testimonials', type: 'testimonials' },
        { id: 'contact', name: 'Get In Touch', type: 'contact' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ];
    } else if (/saas|cloud|platform|software|analytics|startup|ai\b/i.test(p)) {
      projectType = 'saas';
      title = 'ApexCloud Intelligent Platform';
      brandPersonality = 'Futuristic, High-Velocity & Trusted';
      visualDirection = 'Hyper-Modern Dark UI with Indigo Glow and Bento Grids';
      headingFont = 'Outfit';
      primary = '#6366f1';
      secondary = '#8b5cf6';
      bg = '#080c14';
      surface = '#111827';
      accent = '#38bdf8';
      sections = [
        { id: 'navbar', name: 'Navigation Bar', type: 'navbar' },
        { id: 'hero', name: 'Hero Section', type: 'hero' },
        { id: 'features', name: 'Platform Capabilities', type: 'features' },
        { id: 'metrics', name: 'Performance Metrics', type: 'features' },
        { id: 'pricing', name: 'Transparent Pricing', type: 'pricing' },
        { id: 'testimonials', name: 'Customer Stories', type: 'testimonials' },
        { id: 'contact', name: 'Start Free Trial', type: 'contact' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ];
    } else if (/ecommerce|store|shop|fashion|merch|clothing|apparel/i.test(p)) {
      projectType = 'ecommerce';
      title = 'Aura Modern Goods & Apparel';
      brandPersonality = 'Chic, Minimalist & Trendsetting';
      visualDirection = 'Clean Editorial Composition with High-Contrast Typography';
      headingFont = 'Plus Jakarta Sans';
      primary = '#3b82f6';
      secondary = '#2563eb';
      bg = '#0a0d14';
      surface = '#141923';
      accent = '#60a5fa';
      sections = [
        { id: 'navbar', name: 'Navigation Bar', type: 'navbar' },
        { id: 'hero', name: 'Hero Section', type: 'hero' },
        { id: 'collection', name: 'Featured Collection', type: 'features' },
        { id: 'features', name: 'Craftsmanship & Quality', type: 'features' },
        { id: 'pricing', name: 'Curated Bundles', type: 'pricing' },
        { id: 'testimonials', name: 'Customer Reviews', type: 'testimonials' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ];
    }

    // Specific color override if explicitly requested (e.g., in English or Tanglish)
    if (/black and orange|orange and black|orange theme/i.test(p)) {
      primary = '#ff6600';
      secondary = '#ff8533';
      bg = '#0a0a0c';
      surface = '#16161a';
      accent = '#ff7700';
    } else if (/electric blue|neon blue|cyan|blue theme/i.test(p)) {
      primary = '#0284c7';
      secondary = '#0369a1';
      bg = '#070d18';
      surface = '#0f172a';
      accent = '#38bdf8';
    } else if (/emerald|lime|green theme/i.test(p)) {
      primary = '#10b981';
      secondary = '#059669';
      bg = '#06120e';
      surface = '#0d221a';
      accent = '#34d399';
    } else if (/purple|violet|magenta/i.test(p)) {
      primary = '#8b5cf6';
      secondary = '#7c3aed';
      bg = '#0c0717';
      surface = '#19112e';
      accent = '#a78bfa';
    }

    return {
      projectType,
      title,
      brandPersonality,
      visualDirection,
      colorPalette: { primary, secondary, background: bg, surface, text, textMuted, accent },
      typography: { headingFont, bodyFont },
      sections,
      interactivity: ['Mobile menu toggle', 'Pricing billing switcher', 'Interactive cards', 'Form validation feedback'],
      summary: `Tailored ${projectType} design with ${visualDirection}.`
    };
  }

  /**
   * Generates complete, beautiful, production-ready website code (HTML, CSS, JS) based on design specification.
   */
  async generateProject(userPrompt, options = {}) {
    // 1. Synthesize domain specification immediately (0ms latency)
    const spec = this.synthesizeInitialSpec(userPrompt);

    // 2. Pick domain-relevant curated photography
    const categoryKey = Object.keys(ASSET_CATALOG).find(k => spec.projectType.toLowerCase().includes(k)) || 'default';
    const suggestedImages = ASSET_CATALOG[categoryKey] || ASSET_CATALOG.default;

    const systemInstruction = `You are a Principal Frontend Architect and World-Class UI/UX Designer.
Generate a COMPLETE, GORGEOUS, HIGH-CONVERTING, STANDALONE WEBSITE for the user's project.
Adhere strictly to:
1. Modern Professional Aesthetics: Bento grids, luminous glow, subtle borders (1px solid rgba(255,255,255,0.08)), glassmorphic card overlays, refined contrast.
2. Real Copywriting: Write authentic, compelling, domain-specific headlines, descriptions, features, pricing figures, and testimonials. NEVER use generic placeholder 'Lorem Ipsum' or dummy repeats.
3. Clean Separation: Provide valid HTML (body content and containers), modern CSS (using the specified custom properties), and interactive Vanilla JavaScript.
4. Fully Responsive: Mobile first + desktop layout, smooth hamburger menu, responsive grid wrapping, fluid typography.
5. Working Interactive Elements: Tab switchers, FAQ accordions, pricing monthly/annual billing toggle with active state, contact form submission simulated success feedback.
6. Images: Use the provided curated image URLs: ${suggestedImages.join(', ')}.

Respond ONLY with valid JSON matching the schema.`;

    const generationPrompt = `Design Specification:
- Project Type: ${spec.projectType}
- Title: ${spec.title}
- Visual Direction: ${spec.visualDirection}
- Color Palette: ${JSON.stringify(spec.colorPalette)}
- Typography: Heading=${spec.typography.headingFont}, Body=${spec.typography.bodyFont}
- Sections Required: ${spec.sections.map(s => s.name).join(', ')}
- Original Prompt: "${userPrompt}"

Generate the complete project. Return STRICTLY a JSON object with this format:
{
  "title": "${spec.title}",
  "projectType": "${spec.projectType}",
  "designSpec": ${JSON.stringify(spec)},
  "sections": ${JSON.stringify(spec.sections)},
  "html": "Full semantic HTML body structure with all sections and working elements (excluding <html>, <head>, <body> tags)",
  "css": "Comprehensive modern CSS with CSS variables, Google font import, resets, components, animations, and responsive media queries",
  "js": "Clean Vanilla JavaScript powering navigation toggle, tabs, accordion, pricing toggle, and form interactions"
}`;

    let project = null;

    try {
      // Execute Gemini call with 22-second timeout guard
      const geminiPromise = geminiService.generateResponse(generationPrompt, { systemInstruction });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Generation timeout')), 22000));
      const res = await Promise.race([geminiPromise, timeoutPromise]);

      if (res && res.success && res.reply) {
        project = extractJsonFromText(res.reply);
      }
    } catch (llmErr) {
      console.warn('Gemini generation skipped or timed out, utilizing bespoke design engine:', llmErr.message);
    }

    // If model truncated, timed out, or syntax failed, produce bespoke guaranteed high-quality site
    if (!project || !project.html || !project.css) {
      project = this.createGuaranteedFallbackProject(spec, suggestedImages);
    }

    // Enrich with metadata
    project.id = 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    project.originalPrompt = userPrompt;
    project.createdAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    project.version = 1;
    project.previewUrl = null;

    return project;
  }

  /**
   * Refines an existing project with natural language instructions (English, Tamil, Tanglish).
   * Preserves unrelated sections and user edits!
   */
  async refineProject(deltaPrompt, currentProject, targetSectionId = null) {
    if (!currentProject || !currentProject.html) {
      return this.generateProject(deltaPrompt);
    }

    // Detect if targeted section is specified in prompt (e.g. "Only change the hero section and keep the remaining design unchanged")
    const p = deltaPrompt.toLowerCase();
    let detectedTarget = targetSectionId;
    if (!detectedTarget) {
      if (/hero/i.test(p)) detectedTarget = 'hero';
      else if (/navbar|nav|header|menu/i.test(p)) detectedTarget = 'navbar';
      else if (/pricing/i.test(p)) detectedTarget = 'pricing';
      else if (/trainer|coach/i.test(p)) detectedTarget = 'trainers';
      else if (/feature|program/i.test(p)) detectedTarget = 'features';
      else if (/testimonial|review/i.test(p)) detectedTarget = 'testimonials';
      else if (/contact|trial/i.test(p)) detectedTarget = 'contact';
      else if (/footer/i.test(p)) detectedTarget = 'footer';
    }

    const systemInstruction = `You are an Expert Visual Web Builder Refinement Engine.
The user wants to refine an existing website design using natural language (English, Tamil, or Tanglish).
CRITICAL CONSTRAINT:
- If the user requested a specific change (e.g. "${deltaPrompt}"), apply that modification accurately.
${detectedTarget ? `- Target section is specifically: '${detectedTarget}'. DO NOT change or regenerate other sections. KEEP all other sections, copywriting, and CSS untouched.` : ''}
- If the user asked to change color (e.g. "electric blue"), update the corresponding CSS variables (--primary, --accent, etc.).
- PRESERVE all unrelated sections, existing structure, copywriting, and custom changes.
- Return the updated complete HTML, CSS, JS, and sections list.
Respond STRICTLY with valid JSON.`;

    const refineMessage = `User Refinement Request: "${deltaPrompt}"
${detectedTarget ? `Target Section: ${detectedTarget}` : 'Target: Contextually identify from prompt'}

Current Project:
- Title: ${currentProject.title}
- Project Type: ${currentProject.projectType}
- Current Sections: ${(currentProject.sections || []).map(s => s.name).join(', ')}

Current HTML:
${currentProject.html}

Current CSS:
${currentProject.css}

Current JS:
${currentProject.js || ''}

Return JSON with:
{
  "title": "${currentProject.title}",
  "projectType": "${currentProject.projectType}",
  "sections": [updated list of section objects { id, name, type }],
  "html": "Updated complete HTML string",
  "css": "Updated complete CSS string",
  "js": "Updated complete JS string",
  "changeSummary": "Concise summary of what was changed"
}`;

    let updated = null;
    try {
      const geminiPromise = geminiService.generateResponse(refineMessage, { systemInstruction });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Refine timeout')), 22000));
      const res = await Promise.race([geminiPromise, timeoutPromise]);

      if (res && res.success && res.reply) {
        updated = extractJsonFromText(res.reply);
      }
    } catch (refineErr) {
      console.warn('LLM refine timed out or failed, applying deterministic refinement:', refineErr.message);
    }

    // Fallback deterministic refinement if LLM was unreachable
    if (!updated || !updated.html || !updated.css) {
      let updatedCss = currentProject.css;
      let updatedHtml = currentProject.html;

      // Section-specific targeted modifications
      if (detectedTarget) {
        // 1. Background color change on target section
        if (/background.*(?:to|be|is)\s*(?:black|#000|dark)/i.test(p) || /change the background of this section to black/i.test(p)) {
          const bgRule = `\n#${detectedTarget} { background: #000000 !important; background-color: #000000 !important; }\n`;
          if (!updatedCss.includes(`#${detectedTarget} { background: #000000`)) {
            updatedCss += bgRule;
          }
        } else if (/background.*(?:to|be|is)\s*#?([a-f0-9]{3,6})/i.test(p)) {
          const hexMatch = p.match(/background.*(?:to|be|is)\s*#?([a-f0-9]{3,6})/i);
          if (hexMatch) {
            updatedCss += `\n#${detectedTarget} { background-color: #${hexMatch[1]} !important; }\n`;
          }
        }

        // 2. Add trainer cards to section
        if (/add.*(?:three|3|modern)?.*trainer.*card/i.test(p) || /trainer/i.test(p) && /card/i.test(p)) {
          const trainerCardsHtml = `
          <div class="trainers-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-top: 36px;">
            <div class="trainer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; padding: 18px; text-align: center;">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" alt="Elena Rostova" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Elena Rostova</h3>
              <p style="color: var(--primary, #ff6600); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Head Strength Coach</p>
              <p style="color: var(--text-muted, #9ca3af); font-size: 0.88rem;">Olympic weightlifting champion specializing in biomechanics & velocity power.</p>
            </div>
            <div class="trainer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; padding: 18px; text-align: center;">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" alt="Marcus Sterling" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Marcus Sterling</h3>
              <p style="color: var(--primary, #ff6600); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">High-Performance Conditioning</p>
              <p style="color: var(--text-muted, #9ca3af); font-size: 0.88rem;">Ex-collegiate sprint coach optimizing VO2 max, metabolic agility & stamina.</p>
            </div>
            <div class="trainer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; padding: 18px; text-align: center;">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80" alt="Derrick Vance" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Derrick Vance</h3>
              <p style="color: var(--primary, #ff6600); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Mobility & Functional Recovery</p>
              <p style="color: var(--text-muted, #9ca3af); font-size: 0.88rem;">Doctor of Physical Therapy guiding injury prevention & regenerative protocols.</p>
            </div>
          </div>`;

          // Inject into target section
          const sectionRegex = new RegExp(`(<section[^>]*id=["']${detectedTarget}["'][^>]*>)([\\s\\S]*?)(<\\/section>)`, 'i');
          if (sectionRegex.test(updatedHtml)) {
            updatedHtml = updatedHtml.replace(sectionRegex, (match, openTag, content, closeTag) => {
              return `${openTag}${content}${trainerCardsHtml}${closeTag}`;
            });
          }
        }

        // 3. Make hero section more premium
        if (/premium/i.test(p) && (detectedTarget === 'hero' || /hero/i.test(p))) {
          updatedHtml = updatedHtml.replace(/<div class="badge"[^>]*>.*?<\/div>/s, '<div class="badge" style="background: linear-gradient(90deg, rgba(255,102,0,0.2), rgba(255,255,255,0.05)); border: 1px solid var(--primary, #ff6600); color: #ffffff; padding: 6px 16px; border-radius: 9999px; font-weight: 700; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 0 20px rgba(255,102,0,0.3);">⚡ ELITE PERFORMANCE ARCHITECTURE • WORLD CLASS</div>');
          updatedCss += `\n#hero { position: relative; overflow: hidden; }\n#hero::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,102,0,0.08) 0%, transparent 60%); pointer-events: none; }\n`;
        }

        // 4. Improve membership pricing cards
        if (/pricing/i.test(p) && /card|improve|plan/i.test(p)) {
          updatedCss += `\n.pricing-card { backdrop-filter: blur(16px); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; }\n.pricing-card:hover { transform: translateY(-8px) !important; border-color: var(--primary, #ff6600) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 30px rgba(255,102,0,0.2) !important; }\n`;
        }

        // 5. Mobile responsiveness on target section
        if (/mobile|responsive/i.test(p)) {
          updatedCss += `\n@media (max-width: 768px) { #${detectedTarget} { padding: 40px 16px !important; } #${detectedTarget} .container { padding: 0 !important; } #${detectedTarget} h1, #${detectedTarget} h2 { font-size: 1.85rem !important; } #${detectedTarget} [class*="grid"] { grid-template-columns: 1fr !important; } }\n`;
        }
      }

      // Handle general color changes deterministically
      if (/blue|electric blue|cyan/i.test(p)) {
        updatedCss = updatedCss.replace(/--primary:\s*[^;]+;/, '--primary: #0284c7;')
                               .replace(/--accent:\s*[^;]+;/, '--accent: #38bdf8;');
      } else if (/orange/i.test(p)) {
        updatedCss = updatedCss.replace(/--primary:\s*[^;]+;/, '--primary: #ff6600;')
                               .replace(/--accent:\s*[^;]+;/, '--accent: #ff8533;');
      } else if (/green|emerald/i.test(p)) {
        updatedCss = updatedCss.replace(/--primary:\s*[^;]+;/, '--primary: #10b981;')
                               .replace(/--accent:\s*[^;]+;/, '--accent: #34d399;');
      }

      // Handle heading replacement if requested
      const headingMatch = deltaPrompt.match(/replace (?:the )?(?:current )?heading with ["']?([^"']+)["']?/i);
      if (headingMatch && headingMatch[1]) {
        updatedHtml = updatedHtml.replace(/<h1[^>]*>.*?<\/h1>/s, `<h1 class="hero-title">${headingMatch[1].trim()}</h1>`);
      }

      updated = {
        title: currentProject.title,
        sections: currentProject.sections,
        html: updatedHtml,
        css: updatedCss,
        js: currentProject.js || '',
        changeSummary: `Applied refinement: ${deltaPrompt}`
      };
    }

    // If targeted section refinement without adding/deleting sections, strictly preserve original sections list
    const isExplicitSectionMutation = /\b(add|insert|remove|delete)\b.*\b(section|page)\b/i.test(deltaPrompt);
    const finalSections = (!isExplicitSectionMutation || !updated.sections || updated.sections.length < currentProject.sections.length)
      ? currentProject.sections
      : updated.sections;

    return {
      ...currentProject,
      title: updated.title || currentProject.title,
      sections: finalSections,
      html: updated.html,
      css: updated.css,
      js: updated.js || currentProject.js || '',
      lastChangeSummary: updated.changeSummary || 'Design updated successfully',
      updatedAt: new Date().toISOString(),
      version: (currentProject.version || 1) + 1
    };
  }

  /**
   * Bundles the generated project into a standalone, executable HTML document
   * suitable for sandboxed iframe preview or single-file export.
   */
  bundleProjectDocument(project) {
    const headingFont = project.designSpec?.typography?.headingFont || 'Plus Jakarta Sans';
    const bodyFont = project.designSpec?.typography?.bodyFont || 'Inter';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title || 'PixelCraft Generated Design'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800&family=${encodeURIComponent(bodyFont)}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Reset & Base Standards */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html {
      scroll-behavior: smooth;
      font-size: 16px;
      height: 100%;
    }
    body {
      font-family: '${bodyFont}', sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
      min-height: 100%;
      overflow-y: auto !important;
      scrollbar-width: thin;
      scrollbar-color: rgba(99, 102, 241, 0.4) transparent;
    }
    body::-webkit-scrollbar {
      width: 8px;
    }
    body::-webkit-scrollbar-track {
      background: transparent;
    }
    body::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.35);
      border-radius: 4px;
    }
    body::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.65);
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    button, input, textarea, select {
      font-family: inherit;
    }

    /* Section Selection Highlighting */
    [data-pixelcraft-section-selected="true"] {
      outline: 3px solid #6366f1 !important;
      outline-offset: -3px !important;
      box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.6), 0 0 25px rgba(99, 102, 241, 0.35) !important;
      position: relative;
    }

    /* Selection Highlighting for Visual Editor */
    [data-pixelcraft-selected="true"] {
      outline: 2px solid #6366f1 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.45) !important;
    }
    [data-pixelcraft-hover="true"] {
      outline: 1px dashed #38bdf8 !important;
      outline-offset: 2px !important;
    }

    /* Generated Stylesheet */
    ${project.css || ''}
  </style>
</head>
<body>
  ${project.html || ''}

  <!-- Sandbox Message Bridge & Visual Selection Listener -->
  <script>
    (function() {
      let isEditorMode = true;
      let selectedElement = null;
      let selectedSectionEl = null;

      // Handle element and section selection
      document.body.addEventListener('click', function(e) {
        if (!isEditorMode) return;
        const target = e.target.closest('h1, h2, h3, h4, p, a, button, img, section, div.card, div.pricing-card, [data-section]');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        if (selectedElement) {
          selectedElement.removeAttribute('data-pixelcraft-selected');
        }

        selectedElement = target;
        selectedElement.setAttribute('data-pixelcraft-selected', 'true');

        const computed = window.getComputedStyle(target);
        const parentSec = target.closest('section, header, footer, nav, [data-section]');
        const parentSectionId = parentSec ? (parentSec.id || parentSec.getAttribute('data-section') || '') : '';

        // Notify parent workspace
        window.parent.postMessage({
          type: 'PIXELCRAFT_ELEMENT_SELECTED',
          payload: {
            tagName: target.tagName.toLowerCase(),
            id: target.id || '',
            className: target.className || '',
            textContent: (target.children.length === 0 || ['BUTTON', 'A', 'P', 'H1', 'H2', 'H3', 'H4'].includes(target.tagName)) ? target.innerText.trim() : '',
            src: target.getAttribute('src') || '',
            href: target.getAttribute('href') || '',
            parentSectionId: parentSectionId,
            styles: {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              borderRadius: computed.borderRadius,
              padding: computed.padding,
              margin: computed.margin,
              textAlign: computed.textAlign
            }
          }
        }, '*');
      }, true);

      // Track sections entering visible viewport
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
              const secId = entry.target.id || entry.target.getAttribute('data-section') || '';
              if (secId) {
                window.parent.postMessage({
                  type: 'PIXELCRAFT_SECTION_IN_VIEW',
                  sectionId: secId
                }, '*');
              }
            }
          });
        }, { threshold: [0.2, 0.5] });

        document.querySelectorAll('header, nav, section, footer, [data-section]').forEach(el => observer.observe(el));
      }

      // Listen for updates from parent properties inspector
      window.addEventListener('message', function(event) {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'PIXELCRAFT_SET_MODE') {
          isEditorMode = data.mode === 'edit';
          if (!isEditorMode) {
            if (selectedElement) {
              selectedElement.removeAttribute('data-pixelcraft-selected');
              selectedElement = null;
            }
            if (selectedSectionEl) {
              selectedSectionEl.removeAttribute('data-pixelcraft-section-selected');
              selectedSectionEl = null;
            }
          }
        }

        if (data.type === 'PIXELCRAFT_UPDATE_SELECTED_ELEMENT' && selectedElement) {
          const updates = data.payload;
          if (updates.textContent !== undefined) {
            selectedElement.textContent = updates.textContent;
          }
          if (updates.src !== undefined && selectedElement.tagName === 'IMG') {
            selectedElement.src = updates.src;
          }
          if (updates.href !== undefined && selectedElement.tagName === 'A') {
            selectedElement.href = updates.href;
          }
          if (updates.styles) {
            for (const [prop, val] of Object.entries(updates.styles)) {
              selectedElement.style[prop] = val;
            }
          }

          // Report updated full HTML back to parent for syncing
          window.parent.postMessage({
            type: 'PIXELCRAFT_HTML_UPDATED',
            html: document.body.innerHTML
          }, '*');
        }

        if (data.type === 'PIXELCRAFT_SELECT_SECTION' && data.sectionId) {
          if (selectedSectionEl) {
            selectedSectionEl.removeAttribute('data-pixelcraft-section-selected');
          }
          const sec = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (sec) {
            selectedSectionEl = sec;
            sec.setAttribute('data-pixelcraft-section-selected', 'true');
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }

        if (data.type === 'PIXELCRAFT_SCROLL_TO_SECTION' && data.sectionId) {
          const el = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (selectedSectionEl) selectedSectionEl.removeAttribute('data-pixelcraft-section-selected');
            selectedSectionEl = el;
            selectedSectionEl.setAttribute('data-pixelcraft-section-selected', 'true');
          }
        }

        if (data.type === 'PIXELCRAFT_UPDATE_SECTION_PROPERTIES' && data.sectionId) {
          const sec = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (sec) {
            const p = data.payload || {};
            if (p.headingText !== undefined) {
              const h = sec.querySelector('h1, h2, h3, h4');
              if (h) h.textContent = p.headingText;
            }
            if (p.paragraphText !== undefined) {
              const desc = sec.querySelector('p');
              if (desc) desc.textContent = p.paragraphText;
            }
            if (p.backgroundColor !== undefined) {
              sec.style.backgroundColor = p.backgroundColor;
            }
            if (p.textColor !== undefined) {
              sec.style.color = p.textColor;
            }
            if (p.fontSize !== undefined) {
              const h = sec.querySelector('h1, h2, h3, h4');
              if (h) h.style.fontSize = p.fontSize;
            }
            if (p.padding !== undefined) {
              sec.style.padding = p.padding;
            }
            if (p.textAlign !== undefined) {
              sec.style.textAlign = p.textAlign;
            }
            if (p.imageUrl !== undefined) {
              const img = sec.querySelector('img');
              if (img) img.src = p.imageUrl;
            }
            if (p.buttonText !== undefined) {
              const btn = sec.querySelector('button, a.btn, a.btn-primary, a.btn-secondary, a[href]');
              if (btn) btn.textContent = p.buttonText;
            }
            if (p.buttonLink !== undefined) {
              const btn = sec.querySelector('a');
              if (btn) btn.href = p.buttonLink;
            }

            window.parent.postMessage({
              type: 'PIXELCRAFT_HTML_UPDATED',
              html: document.body.innerHTML
            }, '*');
          }
        }
      });
    })();
  </script>

  <!-- Project Interactive Script -->
  <script>
    ${project.js || ''}
  </script>
</body>
</html>`;
  }

  /**
   * Guaranteed fallback generator if external model experiences intermittent outage.
   */
  createGuaranteedFallbackProject(spec, images) {
    const primary = spec.colorPalette?.primary || '#ff6600';
    const bg = spec.colorPalette?.background || '#0f1117';
    const surface = spec.colorPalette?.surface || '#1a1d26';
    const text = spec.colorPalette?.text || '#ffffff';
    const accent = spec.colorPalette?.accent || '#ff8533';

    if (spec.projectType === 'gym') {
      return {
        title: spec.title || 'IronPulse Athletic Performance',
        projectType: 'gym',
        designSpec: spec,
        sections: [
          { id: 'navbar', name: 'Navigation', type: 'navbar' },
          { id: 'hero', name: 'Hero', type: 'hero' },
          { id: 'about', name: 'About', type: 'about' },
          { id: 'programs', name: 'Training Programs', type: 'features' },
          { id: 'trainers', name: 'Trainers', type: 'trainers' },
          { id: 'pricing', name: 'Membership Plans', type: 'pricing' },
          { id: 'testimonials', name: 'Testimonials', type: 'testimonials' },
          { id: 'gallery', name: 'Gallery', type: 'gallery' },
          { id: 'faq', name: 'FAQ', type: 'faq' },
          { id: 'contact', name: 'Contact', type: 'contact' },
          { id: 'footer', name: 'Footer', type: 'footer' }
        ],
        html: `
  <header class="site-header" id="navbar" data-section-name="Navigation">
    <div class="nav-container">
      <div class="logo">
        <span class="logo-mark">⚡</span>
        <span class="logo-text">${spec.title || 'IRONPULSE'}</span>
      </div>
      <nav class="nav-menu" id="nav-menu">
        <a href="#hero" class="nav-link active">Home</a>
        <a href="#about" class="nav-link">About</a>
        <a href="#programs" class="nav-link">Programs</a>
        <a href="#trainers" class="nav-link">Trainers</a>
        <a href="#pricing" class="nav-link">Pricing</a>
        <a href="#testimonials" class="nav-link">Stories</a>
        <a href="#faq" class="nav-link">FAQ</a>
        <a href="#contact" class="nav-link">Contact</a>
      </nav>
      <div class="nav-actions">
        <a href="#contact" class="btn btn-primary">Free Pass</a>
        <button class="mobile-toggle-btn" id="mobile-toggle-btn" aria-label="Toggle navigation">☰</button>
      </div>
    </div>
  </header>

  <main>
    <section class="hero-section" id="hero" data-section-name="Hero">
      <div class="hero-glow"></div>
      <div class="container hero-grid">
        <div class="hero-content">
          <div class="badge">🔥 Premier Performance Architecture</div>
          <h1 class="hero-title">Transform Your Ambitions Into Reality</h1>
          <p class="hero-description">Experience high-impact strength coaching engineered for peak athletic transformation, metabolic power, and uncompromised digital excellence.</p>
          <div class="hero-cta-group">
            <a href="#pricing" class="btn btn-primary btn-lg">Explore Programs</a>
            <a href="#about" class="btn btn-secondary btn-lg">Learn More ➔</a>
          </div>
          <div class="social-proof-strip">
            <span class="stars">★★★★★</span>
            <span class="proof-text">Trusted by 10,000+ elite members worldwide</span>
          </div>
        </div>
        <div class="hero-visual">
          <div class="visual-card">
            <img src="${images[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'}" alt="Showcase Visual" class="hero-image">
            <div class="floating-stat">
              <span class="stat-number">+180%</span>
              <span class="stat-label">Performance Boost</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="about-section" id="about" data-section-name="About" style="padding: 80px 0; border-top: 1px solid var(--border);">
      <div class="container">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;">
          <div>
            <img src="${images[1] || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80'}" alt="About Facility" style="width: 100%; border-radius: 16px; border: 1px solid var(--border);">
          </div>
          <div>
            <span class="sub-badge" style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Our Mission</span>
            <h2 class="section-title" style="text-align: left; margin: 12px 0 16px;">Built for Those Who Demand Distinction</h2>
            <p style="color: var(--text-muted); line-height: 1.7; margin-bottom: 24px;">Founded by Olympic strength trainers, IronPulse combines biomechanical science with elite equipment to produce tangible, lifelong physical results.</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div style="background: var(--surface); padding: 18px; border-radius: 12px; border: 1px solid var(--border);">
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">15,000+</div>
                <div style="color: var(--text-muted); font-size: 0.85rem;">Transformations Achieved</div>
              </div>
              <div style="background: var(--surface); padding: 18px; border-radius: 12px; border: 1px solid var(--border);">
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">35+</div>
                <div style="color: var(--text-muted); font-size: 0.85rem;">Master Coaches On Floor</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="features-section" id="programs" data-section-name="Training Programs">
      <div class="container">
        <div class="section-header">
          <span class="sub-badge">Core Disciplines</span>
          <h2 class="section-title">Engineered Training Programs</h2>
          <p class="section-sub">State-of-the-art methodology combined with expert guidance.</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🔥</div>
            <h3 class="feature-title">High-Intensity Training</h3>
            <p class="feature-text">Tailored regimes developed by certified professionals to accelerate real results.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-title">Smart Metric Tracking</h3>
            <p class="feature-text">Real-time performance analytics tracking progress across every milestone.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🛡️</div>
            <h3 class="feature-title">Elite Recovery Protocols</h3>
            <p class="feature-text">Comprehensive nutrition and regenerative wellness plans designed for longevity.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="trainers-section" id="trainers" data-section-name="Trainers" style="padding: 80px 0; border-top: 1px solid var(--border);">
      <div class="container">
        <div class="section-header" style="text-align: center; margin-bottom: 40px;">
          <span class="sub-badge" style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">World-Class Mentors</span>
          <h2 class="section-title" style="margin-top: 8px;">Elite Coaching Staff</h2>
          <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Dedicated specialists committed to guiding every step of your journey.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; text-align: center;">
            <img src="${images[2] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}" alt="Elena Rostova" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Elena Rostova</h3>
            <p style="color: var(--primary); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Head Strength Coach</p>
            <p style="color: var(--text-muted); font-size: 0.88rem;">Certified Olympic biomechanics specialist accelerating peak power and physical agility.</p>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; text-align: center;">
            <img src="${images[3] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'}" alt="Marcus Sterling" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Marcus Sterling</h3>
            <p style="color: var(--primary); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Conditioning & Stamina</p>
            <p style="color: var(--text-muted); font-size: 0.88rem;">High-intensity metabolic conditioning expert optimizing VO2 max and core velocity.</p>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; text-align: center;">
            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80" alt="Derrick Vance" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Derrick Vance</h3>
            <p style="color: var(--primary); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Mobility & Functional Recovery</p>
            <p style="color: var(--text-muted); font-size: 0.88rem;">Doctor of Physical Therapy guiding injury prevention and regenerative wellness protocols.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="pricing-section" id="pricing" data-section-name="Membership Plans">
      <div class="container">
        <div class="section-header">
          <span class="sub-badge">Flexible Memberships</span>
          <h2 class="section-title">Membership Plans</h2>
          <p class="section-sub">Choose the tier that matches your commitment level.</p>
          <div class="billing-toggle-wrap">
            <span class="toggle-label">Monthly</span>
            <button class="billing-toggle" id="billing-toggle" aria-label="Toggle annual billing">
              <span class="toggle-handle"></span>
            </button>
            <span class="toggle-label">Annually <span class="discount-pill">Save 20%</span></span>
          </div>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <h3 class="tier-name">Starter Plan</h3>
            <div class="tier-price"><span class="currency">$</span><span class="amount" data-monthly="39" data-yearly="31">39</span><span class="period">/mo</span></div>
            <p class="tier-desc">Essential access for driven individuals beginning their journey.</p>
            <ul class="tier-perks">
              <li>✓ Full Access to All Equipment</li>
              <li>✓ Locker Room & Sauna Access</li>
              <li>✓ Digital Progress Companion App</li>
              <li>✕ Dedicated 1-on-1 Coaching</li>
            </ul>
            <a href="#contact" class="btn btn-secondary w-full">Join Starter</a>
          </div>
          <div class="pricing-card popular">
            <div class="popular-ribbon">Most Popular</div>
            <h3 class="tier-name">Pro Athlete</h3>
            <div class="tier-price"><span class="currency">$</span><span class="amount" data-monthly="79" data-yearly="63">79</span><span class="period">/mo</span></div>
            <p class="tier-desc">Comprehensive access with personalized coaching and nutrition protocols.</p>
            <ul class="tier-perks">
              <li>✓ Full Access + Unlimited Guest Passes</li>
              <li>✓ Weekly 1-on-1 Personal Coaching</li>
              <li>✓ Tailored Nutrition & Meal Blueprint</li>
              <li>✓ Priority Booking for Elite Masterclasses</li>
            </ul>
            <a href="#contact" class="btn btn-primary w-full">Claim Pro Tier</a>
          </div>
          <div class="pricing-card">
            <h3 class="tier-name">Executive VIP</h3>
            <div class="tier-price"><span class="currency">$</span><span class="amount" data-monthly="149" data-yearly="119">149</span><span class="period">/mo</span></div>
            <p class="tier-desc">The ultimate all-inclusive experience for peak lifestyle transformation.</p>
            <ul class="tier-perks">
              <li>✓ 24/7 Unlimited Facility Access</li>
              <li>✓ Daily Dedicated Master Trainer</li>
              <li>✓ Private Spa & Recovery Suite Access</li>
              <li>✓ Custom Supplementation Regimen</li>
            </ul>
            <a href="#contact" class="btn btn-secondary w-full">Join Executive</a>
          </div>
        </div>
      </div>
    </section>

    <section class="testimonials-section" id="testimonials" data-section-name="Testimonials" style="padding: 80px 0; border-top: 1px solid var(--border);">
      <div class="container">
        <div class="section-header" style="text-align: center; margin-bottom: 40px;">
          <span class="sub-badge" style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Member Stories</span>
          <h2 class="section-title" style="margin-top: 8px;">Real Transformations</h2>
          <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Discover what our members achieved with our guidance.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px;">
            <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
            <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"The coaches and modern methodologies completely redefined my stamina and mental drive. Best fitness decision of my life."</p>
            <div style="font-weight: 700;">Sarah Jenkins</div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">Triathlon Finisher • Member 2 Years</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px;">
            <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
            <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"Unmatched facilities, knowledgeable trainers, and an inspiring community that pushes you to exceed your limits daily."</p>
            <div style="font-weight: 700;">David Chen</div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">Executive • Member 1 Year</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px;">
            <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
            <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"Within 6 months, my posture, strength, and energy levels spiked. The personalized nutrition plan was a game-changer."</p>
            <div style="font-weight: 700;">Emma Watson</div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">Marathon Runner • Member 8 Months</div>
          </div>
        </div>
      </div>
    </section>

    <section class="gallery-section" id="gallery" data-section-name="Gallery" style="padding: 80px 0; border-top: 1px solid var(--border);">
      <div class="container">
        <div class="section-header" style="text-align: center; margin-bottom: 40px;">
          <span class="sub-badge" style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Visual Tour</span>
          <h2 class="section-title" style="margin-top: 8px;">State-of-the-Art Facilities</h2>
          <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Experience the atmosphere and equipment designed for high-performance training.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80" alt="Main Floor" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
          <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80" alt="Free Weights" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
          <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80" alt="Cardio Zone" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
          <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80" alt="Recovery Suite" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
        </div>
      </div>
    </section>

    <section class="faq-section" id="faq" data-section-name="FAQ" style="padding: 80px 0; border-top: 1px solid var(--border);">
      <div class="container" style="max-width: 800px;">
        <div class="section-header" style="text-align: center; margin-bottom: 40px;">
          <span class="sub-badge" style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Got Questions?</span>
          <h2 class="section-title" style="margin-top: 8px;">Frequently Asked Questions</h2>
          <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Everything you need to know about our memberships and services.</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <details style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; cursor: pointer;">
            <summary style="font-weight: 700; font-size: 1.05rem;">How do I claim my 7-day complimentary trial pass?</summary>
            <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Simply fill out the form at the bottom of the page or visit our front desk. No credit card required, instant access granted upon check-in.</p>
          </details>
          <details style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; cursor: pointer;">
            <summary style="font-weight: 700; font-size: 1.05rem;">Can I freeze or cancel my membership anytime?</summary>
            <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Yes, we offer complete flexibility without hidden lockdown contracts. You can freeze your account for up to 60 days per calendar year.</p>
          </details>
          <details style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; cursor: pointer;">
            <summary style="font-weight: 700; font-size: 1.05rem;">Are personalized nutrition plans included with memberships?</summary>
            <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Our Pro Athlete and VIP Elite tiers come with complete personalized macro and nutrition coaching tailored directly to your fitness goals.</p>
          </details>
        </div>
      </div>
    </section>

    <section class="cta-banner" id="contact" data-section-name="Contact">
      <div class="container cta-container">
        <h2 class="cta-heading">Ready to Level Up Your Life?</h2>
        <p class="cta-sub">Claim your complimentary 7-day all-access trial today. No contracts, cancel anytime.</p>
        <form class="cta-form" id="contact-form">
          <input type="email" class="cta-input" placeholder="Enter your email address..." required>
          <button type="submit" class="btn btn-primary">Claim Free Trial</button>
        </form>
        <div id="form-feedback" class="form-feedback" style="display: none;"></div>
      </div>
    </section>
  </main>

  <footer class="site-footer" id="footer" data-section-name="Footer">
    <div class="container footer-content">
      <div class="footer-brand">
        <div class="logo">
          <span class="logo-mark">⚡</span>
          <span class="logo-text">${spec.title || 'IronPulse'}</span>
        </div>
        <p class="footer-tagline">Pioneering athletic craftsmanship and transformative strength systems.</p>
      </div>
      <div class="footer-links">
        <div class="link-col">
          <h4>Disciplines</h4>
          <a href="#programs">Hypertrophy</a>
          <a href="#trainers">Coaches</a>
          <a href="#pricing">Memberships</a>
        </div>
        <div class="link-col">
          <h4>Facility</h4>
          <a href="#about">About</a>
          <a href="#gallery">Showcase</a>
          <a href="#faq">FAQ</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© ${new Date().getFullYear()} ${spec.title || 'IronPulse Performance'}. All rights reserved. Created with PixelCraft AI Studio.</p>
    </div>
  </footer>
        `,
        css: this.getGuaranteedCss(primary, bg, surface, text, accent, spec.typography?.headingFont, spec.typography?.bodyFont),
        js: this.getGuaranteedJs()
      };
    }

    return {
      title: spec.title || 'Elevate - Modern Experience',
      projectType: spec.projectType || 'Modern Website',
      designSpec: spec,
      sections: spec.sections || [
        { id: 'navbar', name: 'Navbar', type: 'navbar' },
        { id: 'hero', name: 'Hero', type: 'hero' },
        { id: 'features', name: 'Features', type: 'features' },
        { id: 'pricing', name: 'Pricing', type: 'pricing' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ],
      html: `
  <header class="site-header" id="navbar">
    <div class="nav-container">
      <div class="logo">
        <span class="logo-mark">⚡</span>
        <span class="logo-text">${spec.title || 'PixelCraft'}</span>
      </div>
      <nav class="nav-menu" id="nav-menu">
        <a href="#hero" class="nav-link active">Home</a>
        <a href="#features" class="nav-link">Features</a>
        <a href="#pricing" class="nav-link">Pricing</a>
        <a href="#contact" class="nav-link">Contact</a>
      </nav>
      <div class="nav-actions">
        <a href="#pricing" class="btn btn-primary">Get Started</a>
        <button class="mobile-toggle-btn" id="mobile-toggle-btn" aria-label="Toggle navigation">☰</button>
      </div>
    </div>
  </header>

  <main>
    <section class="hero-section" id="hero">
      <div class="hero-glow"></div>
      <div class="container hero-grid">
        <div class="hero-content">
          <div class="badge">✨ Next-Generation Performance</div>
          <h1 class="hero-title">Transform Your Ambitions Into Reality</h1>
          <p class="hero-description">Experience high-impact design engineered for peak engagement, seamless conversion, and uncompromised digital excellence.</p>
          <div class="hero-cta-group">
            <a href="#pricing" class="btn btn-primary btn-lg">Explore Programs</a>
            <a href="#features" class="btn btn-secondary btn-lg">Learn More ➔</a>
          </div>
          <div class="social-proof-strip">
            <span class="stars">★★★★★</span>
            <span class="proof-text">Trusted by 10,000+ elite members worldwide</span>
          </div>
        </div>
        <div class="hero-visual">
          <div class="visual-card">
            <img src="${images[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'}" alt="Showcase Visual" class="hero-image">
            <div class="floating-stat">
              <span class="stat-number">+180%</span>
              <span class="stat-label">Performance Boost</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="features-section" id="features">
      <div class="container">
        <div class="section-header">
          <span class="sub-badge">Why Choose Us</span>
          <h2 class="section-title">Built for Those Who Demand the Best</h2>
          <p class="section-sub">State-of-the-art methodology combined with expert guidance.</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🔥</div>
            <h3 class="feature-title">High-Intensity Training</h3>
            <p class="feature-text">Tailored regimes developed by certified professionals to accelerate real results.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-title">Smart Metric Tracking</h3>
            <p class="feature-text">Real-time performance analytics tracking progress across every milestone.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🛡️</div>
            <h3 class="feature-title">Elite Recovery Protocols</h3>
            <p class="feature-text">Comprehensive nutrition and regenerative wellness plans designed for longevity.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="pricing-section" id="pricing">
      <div class="container">
        <div class="section-header">
          <span class="sub-badge">Flexible Memberships</span>
          <h2 class="section-title">Transparent, Value-Packed Plans</h2>
          <p class="section-sub">Choose the tier that matches your commitment level.</p>
          <div class="billing-toggle-wrap">
            <span class="toggle-label">Monthly</span>
            <button class="billing-toggle" id="billing-toggle" aria-label="Toggle annual billing">
              <span class="toggle-handle"></span>
            </button>
            <span class="toggle-label">Annually <span class="discount-pill">Save 20%</span></span>
          </div>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <h3 class="tier-name">Starter Plan</h3>
            <div class="tier-price"><span class="currency">$</span><span class="amount" data-monthly="39" data-yearly="31">39</span><span class="period">/mo</span></div>
            <p class="tier-desc">Essential access for driven individuals beginning their journey.</p>
            <ul class="tier-perks">
              <li>✓ Full Access to All Equipment</li>
              <li>✓ Locker Room & Sauna Access</li>
              <li>✓ Digital Progress Companion App</li>
              <li>✕ Dedicated 1-on-1 Coaching</li>
            </ul>
            <a href="#contact" class="btn btn-secondary w-full">Join Starter</a>
          </div>
          <div class="pricing-card popular">
            <div class="popular-ribbon">Most Popular</div>
            <h3 class="tier-name">Pro Athlete</h3>
            <div class="tier-price"><span class="currency">$</span><span class="amount" data-monthly="79" data-yearly="63">79</span><span class="period">/mo</span></div>
            <p class="tier-desc">Comprehensive access with personalized coaching and nutrition protocols.</p>
            <ul class="tier-perks">
              <li>✓ Full Access + Unlimited Guest Passes</li>
              <li>✓ Weekly 1-on-1 Personal Coaching</li>
              <li>✓ Tailored Nutrition & Meal Blueprint</li>
              <li>✓ Priority Booking for Elite Masterclasses</li>
            </ul>
            <a href="#contact" class="btn btn-primary w-full">Claim Pro Tier</a>
          </div>
          <div class="pricing-card">
            <h3 class="tier-name">Executive VIP</h3>
            <div class="tier-price"><span class="currency">$</span><span class="amount" data-monthly="149" data-yearly="119">149</span><span class="period">/mo</span></div>
            <p class="tier-desc">The ultimate all-inclusive experience for peak lifestyle transformation.</p>
            <ul class="tier-perks">
              <li>✓ 24/7 Unlimited Facility Access</li>
              <li>✓ Daily Dedicated Master Trainer</li>
              <li>✓ Private Spa & Recovery Suite Access</li>
              <li>✓ Custom Supplementation Regimen</li>
            </ul>
            <a href="#contact" class="btn btn-secondary w-full">Join Executive</a>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-banner" id="contact">
      <div class="container cta-container">
        <h2 class="cta-heading">Ready to Level Up Your Life?</h2>
        <p class="cta-sub">Claim your complimentary 7-day all-access trial today. No contracts, cancel anytime.</p>
        <form class="cta-form" id="contact-form">
          <input type="email" class="cta-input" placeholder="Enter your email address..." required>
          <button type="submit" class="btn btn-primary">Claim Free Trial</button>
        </form>
        <div id="form-feedback" class="form-feedback" style="display: none;"></div>
      </div>
    </section>
  </main>

  <footer class="site-footer" id="footer">
    <div class="container footer-content">
      <div class="footer-brand">
        <div class="logo">
          <span class="logo-mark">⚡</span>
          <span class="logo-text">${spec.title || 'PixelCraft'}</span>
        </div>
        <p class="footer-tagline">Pioneering digital craftsmanship and transformative design systems.</p>
      </div>
      <div class="footer-links">
        <div class="link-col">
          <h4>Product</h4>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#hero">Overview</a>
        </div>
        <div class="link-col">
          <h4>Company</h4>
          <a href="#hero">About</a>
          <a href="#contact">Contact</a>
          <a href="#footer">Privacy Policy</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© ${new Date().getFullYear()} ${spec.title || 'PixelCraft AI'}. All rights reserved. Created with PixelCraft AI Studio.</p>
    </div>
  </footer>
      `,
      css: `
  :root {
    --primary: ${primary};
    --primary-glow: ${primary}40;
    --accent: ${accent};
    --bg: ${bg};
    --surface: ${surface};
    --surface-hover: #222632;
    --border: rgba(255, 255, 255, 0.08);
    --border-highlight: rgba(255, 255, 255, 0.16);
    --text: ${text};
    --text-muted: #9ca3af;
    --radius-sm: 8px;
    --radius-md: 14px;
    --radius-lg: 20px;
    --radius-full: 9999px;
    --shadow-card: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
  }

  body {
    background-color: var(--bg);
    color: var(--text);
  }

  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Navigation Bar */
  .site-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(15, 17, 23, 0.85);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }
  .nav-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 1.25rem;
    color: var(--text);
    text-decoration: none;
  }
  .logo-mark {
    color: var(--primary);
  }
  .nav-menu {
    display: flex;
    align-items: center;
    gap: 32px;
  }
  .nav-link {
    color: var(--text-muted);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }
  .nav-link:hover, .nav-link.active {
    color: var(--primary);
  }
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .mobile-toggle-btn {
    display: none;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 1.2rem;
    cursor: pointer;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 22px;
    border-radius: var(--radius-full);
    font-weight: 600;
    text-decoration: none;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    border: none;
    font-size: 0.95rem;
  }
  .btn-primary {
    background: var(--primary);
    color: #ffffff;
    box-shadow: 0 4px 18px var(--primary-glow);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px var(--primary-glow);
    filter: brightness(1.1);
  }
  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--border-highlight);
    transform: translateY(-2px);
  }
  .btn-lg {
    padding: 14px 28px;
    font-size: 1.05rem;
  }
  .w-full {
    width: 100%;
  }

  /* Hero Section */
  .hero-section {
    position: relative;
    padding: 90px 0 100px;
    overflow: hidden;
  }
  .hero-glow {
    position: absolute;
    top: -150px;
    right: 10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(80px);
  }
  .hero-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 60px;
    align-items: center;
  }
  .badge {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 24px;
  }
  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.12;
    margin-bottom: 22px;
    letter-spacing: -0.03em;
  }
  .hero-description {
    font-size: 1.2rem;
    color: var(--text-muted);
    margin-bottom: 34px;
    max-width: 540px;
    line-height: 1.65;
  }
  .hero-cta-group {
    display: flex;
    gap: 16px;
    margin-bottom: 40px;
  }
  .social-proof-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  .stars {
    color: #fbbf24;
    letter-spacing: 2px;
  }
  .visual-card {
    position: relative;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
  }
  .hero-image {
    width: 100%;
    height: 480px;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  .visual-card:hover .hero-image {
    transform: scale(1.03);
  }
  .floating-stat {
    position: absolute;
    bottom: 24px;
    left: 24px;
    background: rgba(15, 17, 23, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    padding: 14px 20px;
    border-radius: var(--radius-md);
  }
  .stat-number {
    display: block;
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--primary);
  }
  .stat-label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* Section Headers */
  .section-header {
    text-align: center;
    max-width: 640px;
    margin: 0 auto 56px;
  }
  .sub-badge {
    color: var(--primary);
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: block;
    margin-bottom: 12px;
  }
  .section-title {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
  }
  .section-sub {
    color: var(--text-muted);
    font-size: 1.1rem;
  }

  /* Features Bento Grid */
  .features-section {
    padding: 100px 0;
    background: rgba(255, 255, 255, 0.015);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .feature-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 36px 28px;
    transition: all 0.3s ease;
  }
  .feature-card:hover {
    border-color: var(--primary);
    transform: translateY(-6px);
    box-shadow: 0 14px 30px -10px var(--primary-glow);
  }
  .feature-icon {
    font-size: 2.2rem;
    margin-bottom: 20px;
  }
  .feature-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .feature-text {
    color: var(--text-muted);
    line-height: 1.6;
    font-size: 0.98rem;
  }

  /* Pricing Section */
  .pricing-section {
    padding: 100px 0;
  }
  .billing-toggle-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 24px;
  }
  .billing-toggle {
    width: 52px;
    height: 28px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-full);
    border: none;
    padding: 3px;
    cursor: pointer;
    transition: background 0.3s;
    position: relative;
  }
  .billing-toggle.active {
    background: var(--primary);
  }
  .toggle-handle {
    display: block;
    width: 22px;
    height: 22px;
    background: #ffffff;
    border-radius: 50%;
    transition: transform 0.3s;
  }
  .billing-toggle.active .toggle-handle {
    transform: translateX(24px);
  }
  .discount-pill {
    background: rgba(56, 189, 248, 0.15);
    color: var(--accent);
    padding: 3px 8px;
    border-radius: var(--radius-full);
    font-size: 0.78rem;
    font-weight: 700;
  }
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    align-items: stretch;
  }
  .pricing-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: all 0.3s ease;
  }
  .pricing-card:hover {
    transform: translateY(-4px);
    border-color: var(--border-highlight);
  }
  .pricing-card.popular {
    border-color: var(--primary);
    background: linear-gradient(180deg, rgba(34, 38, 50, 0.9) 0%, var(--surface) 100%);
    box-shadow: 0 14px 40px -15px var(--primary-glow);
  }
  .popular-ribbon {
    position: absolute;
    top: -13px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--primary);
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 4px 14px;
    border-radius: var(--radius-full);
  }
  .tier-name {
    font-size: 1.35rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .tier-price {
    font-size: 3rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 14px;
    color: var(--text);
  }
  .tier-price .currency {
    font-size: 1.8rem;
    vertical-align: super;
  }
  .tier-price .period {
    font-size: 1rem;
    color: var(--text-muted);
    font-weight: 500;
  }
  .tier-desc {
    color: var(--text-muted);
    font-size: 0.92rem;
    margin-bottom: 24px;
  }
  .tier-perks {
    list-style: none;
    margin-bottom: 32px;
    flex-grow: 1;
  }
  .tier-perks li {
    padding: 8px 0;
    color: var(--text);
    font-size: 0.95rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  /* CTA Banner */
  .cta-banner {
    padding: 80px 0;
    background: linear-gradient(180deg, transparent 0%, rgba(255, 102, 0, 0.05) 100%);
    border-top: 1px solid var(--border);
  }
  .cta-container {
    max-width: 680px;
    text-align: center;
  }
  .cta-heading {
    font-size: 2.4rem;
    font-weight: 800;
    margin-bottom: 16px;
  }
  .cta-sub {
    color: var(--text-muted);
    font-size: 1.1rem;
    margin-bottom: 32px;
  }
  .cta-form {
    display: flex;
    gap: 12px;
    max-width: 520px;
    margin: 0 auto;
  }
  .cta-input {
    flex: 1;
    padding: 14px 20px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 1rem;
    outline: none;
  }
  .cta-input:focus {
    border-color: var(--primary);
  }
  .form-feedback {
    margin-top: 16px;
    padding: 12px;
    border-radius: var(--radius-sm);
    font-weight: 600;
  }
  .form-feedback.success {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
  }

  /* Footer */
  .site-footer {
    padding: 70px 0 30px;
    background: #090a0d;
    border-top: 1px solid var(--border);
  }
  .footer-content {
    display: flex;
    justify-content: space-between;
    margin-bottom: 50px;
  }
  .footer-tagline {
    color: var(--text-muted);
    max-width: 320px;
    margin-top: 14px;
    font-size: 0.92rem;
  }
  .footer-links {
    display: flex;
    gap: 60px;
  }
  .link-col h4 {
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 18px;
  }
  .link-col a {
    display: block;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 10px;
    transition: color 0.2s;
  }
  .link-col a:hover {
    color: var(--primary);
  }
  .footer-bottom {
    text-align: center;
    padding-top: 30px;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  /* Responsive Media Queries */
  @media (max-width: 992px) {
    .hero-grid {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .hero-description {
      margin: 0 auto 34px;
    }
    .hero-cta-group {
      justify-content: center;
    }
    .social-proof-strip {
      justify-content: center;
    }
    .features-grid, .pricing-grid {
      grid-template-columns: 1fr;
    }
    .footer-content {
      flex-direction: column;
      gap: 40px;
    }
  }

  @media (max-width: 768px) {
    .hero-title {
      font-size: 2.4rem;
    }
    .nav-menu {
      display: none;
      position: absolute;
      top: 72px;
      left: 0;
      right: 0;
      background: var(--surface);
      flex-direction: column;
      padding: 24px;
      border-bottom: 1px solid var(--border);
    }
    .nav-menu.open {
      display: flex;
    }
    .mobile-toggle-btn {
      display: block;
    }
    .cta-form {
      flex-direction: column;
    }
  }
      `,
      js: `
  // Interactive Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle-btn');
  const navMenu = document.getElementById('nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // Interactive Pricing Annual/Monthly Switcher
  const billingToggle = document.getElementById('billing-toggle');
  const amounts = document.querySelectorAll('.tier-price .amount');
  if (billingToggle) {
    billingToggle.addEventListener('click', () => {
      billingToggle.classList.toggle('active');
      const isYearly = billingToggle.classList.contains('active');
      amounts.forEach(el => {
        const val = isYearly ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
        if (val) el.textContent = val;
      });
    });
  }

  // Interactive Contact/Trial Form
  const contactForm = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  if (contactForm && feedback) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      feedback.style.display = 'block';
      feedback.className = 'form-feedback success';
      feedback.textContent = '🎉 Thank you! Your 7-day all-access trial passes have been activated.';
      contactForm.reset();
    });
  }
      `
    };
  }

  getGuaranteedCss(primary, bg, surface, text, accent, headingFont = 'Plus Jakarta Sans', bodyFont = 'Inter') {
    return `
  :root {
    --primary: ${primary};
    --primary-glow: ${primary}40;
    --accent: ${accent};
    --bg: ${bg};
    --surface: ${surface};
    --surface-hover: #222632;
    --border: rgba(255, 255, 255, 0.08);
    --border-highlight: rgba(255, 255, 255, 0.16);
    --text: ${text};
    --text-muted: #9ca3af;
    --radius-sm: 8px;
    --radius-md: 14px;
    --radius-lg: 20px;
    --radius-full: 9999px;
    --shadow-card: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
  }

  body {
    background-color: var(--bg);
    color: var(--text);
  }

  .container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Header & Navigation */
  .site-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(10, 13, 20, 0.85);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }
  .nav-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    text-decoration: none;
  }
  .logo-mark {
    color: var(--primary);
  }
  .nav-menu {
    display: flex;
    align-items: center;
    gap: 32px;
  }
  .nav-link {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 500;
    transition: color 0.2s ease;
  }
  .nav-link:hover, .nav-link.active {
    color: #fff;
  }
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .mobile-toggle-btn {
    display: none;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 22px;
    border-radius: var(--radius-full);
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    border: none;
  }
  .btn-primary {
    background: var(--primary);
    color: #fff;
    box-shadow: 0 4px 20px -2px var(--primary-glow);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
    box-shadow: 0 8px 24px -2px var(--primary-glow);
  }
  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border: 1px solid var(--border);
  }
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--border-highlight);
    transform: translateY(-2px);
  }
  .btn-lg {
    padding: 14px 30px;
    font-size: 1.05rem;
  }
  .w-full {
    width: 100%;
  }

  /* Hero Section */
  .hero-section {
    position: relative;
    padding: 90px 0 110px;
    overflow: hidden;
  }
  .hero-glow {
    position: absolute;
    top: -20%;
    left: 30%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .hero-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 56px;
    align-items: center;
    position: relative;
    z-index: 1;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 24px;
  }
  .hero-title {
    font-size: 3.8rem;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
    margin-bottom: 20px;
  }
  .hero-description {
    font-size: 1.2rem;
    color: var(--text-muted);
    line-height: 1.6;
    margin-bottom: 32px;
    max-width: 540px;
  }
  .hero-cta-group {
    display: flex;
    gap: 16px;
    margin-bottom: 40px;
  }
  .social-proof-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .stars {
    color: #fbbf24;
    letter-spacing: 2px;
  }
  .hero-visual {
    position: relative;
  }
  .visual-card {
    position: relative;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.7);
  }
  .hero-image {
    width: 100%;
    height: 480px;
    object-fit: cover;
  }
  .floating-stat {
    position: absolute;
    bottom: 24px;
    left: 24px;
    background: rgba(15, 17, 23, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    padding: 14px 20px;
    border-radius: var(--radius-md);
  }
  .stat-number {
    display: block;
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--primary);
  }
  .stat-label {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* Section Headers */
  .section-header {
    text-align: center;
    max-width: 640px;
    margin: 0 auto 56px;
  }
  .sub-badge {
    color: var(--primary);
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: block;
    margin-bottom: 12px;
  }
  .section-title {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
  }
  .section-sub {
    color: var(--text-muted);
    font-size: 1.1rem;
  }

  /* Features Bento Grid */
  .features-section {
    padding: 100px 0;
    background: rgba(255, 255, 255, 0.015);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .feature-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 36px 28px;
    transition: all 0.3s ease;
  }
  .feature-card:hover {
    border-color: var(--primary);
    transform: translateY(-6px);
    box-shadow: 0 14px 30px -10px var(--primary-glow);
  }
  .feature-icon {
    font-size: 2.2rem;
    margin-bottom: 20px;
  }
  .feature-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .feature-text {
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  /* Pricing Cards */
  .pricing-section {
    padding: 100px 0;
  }
  .billing-toggle-wrap {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: var(--surface);
    padding: 6px 14px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    margin-top: 24px;
  }
  .toggle-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-muted);
  }
  .discount-pill {
    background: rgba(99, 102, 241, 0.15);
    color: var(--primary);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
  }
  .billing-toggle {
    width: 44px;
    height: 24px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-full);
    border: none;
    position: relative;
    cursor: pointer;
    transition: background 0.25s;
  }
  .billing-toggle.active {
    background: var(--primary);
  }
  .toggle-handle {
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.25s;
  }
  .billing-toggle.active .toggle-handle {
    transform: translateX(20px);
  }
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    align-items: stretch;
  }
  .pricing-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .pricing-card.popular {
    border-color: var(--primary);
    box-shadow: 0 16px 36px -8px var(--primary-glow);
    transform: translateY(-8px);
  }
  .popular-ribbon {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--primary);
    color: #fff;
    padding: 4px 14px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .tier-name {
    font-size: 1.35rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .tier-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 16px;
  }
  .currency {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .amount {
    font-size: 3.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .period {
    color: var(--text-muted);
    font-size: 0.95rem;
  }
  .tier-desc {
    color: var(--text-muted);
    font-size: 0.95rem;
    margin-bottom: 28px;
  }
  .tier-perks {
    list-style: none;
    margin-bottom: 36px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .tier-perks li {
    font-size: 0.92rem;
    color: var(--text);
  }

  /* CTA Banner */
  .cta-banner {
    padding: 100px 0;
    background: linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.08) 100%);
    border-top: 1px solid var(--border);
  }
  .cta-container {
    text-align: center;
    max-width: 680px;
  }
  .cta-heading {
    font-size: 2.8rem;
    font-weight: 800;
    margin-bottom: 16px;
  }
  .cta-sub {
    color: var(--text-muted);
    font-size: 1.15rem;
    margin-bottom: 36px;
  }
  .cta-form {
    display: flex;
    gap: 12px;
    max-width: 500px;
    margin: 0 auto;
  }
  .cta-input {
    flex: 1;
    padding: 14px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: #fff;
    font-size: 0.95rem;
    outline: none;
  }
  .cta-input:focus {
    border-color: var(--primary);
  }
  .form-feedback {
    margin-top: 16px;
    font-size: 0.95rem;
    font-weight: 600;
  }
  .form-feedback.success {
    color: #34d399;
  }

  /* Footer */
  .site-footer {
    padding: 80px 0 32px;
    border-top: 1px solid var(--border);
    background: var(--bg);
  }
  .footer-content {
    display: flex;
    justify-content: space-between;
    gap: 48px;
    margin-bottom: 48px;
  }
  .footer-brand {
    max-width: 320px;
  }
  .footer-tagline {
    color: var(--text-muted);
    font-size: 0.92rem;
    margin-top: 12px;
    line-height: 1.6;
  }
  .footer-links {
    display: flex;
    gap: 64px;
  }
  .link-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .link-col h4 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .link-col a {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
  }
  .link-col a:hover {
    color: #fff;
  }
  .footer-bottom {
    text-align: center;
    padding-top: 32px;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  /* Responsive Queries */
  @media (max-width: 900px) {
    .hero-grid {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .hero-description {
      margin-left: auto;
      margin-right: auto;
    }
    .hero-cta-group {
      justify-content: center;
    }
    .social-proof-strip {
      justify-content: center;
    }
    .features-grid, .pricing-grid {
      grid-template-columns: 1fr;
    }
    .footer-content {
      flex-direction: column;
    }
    .hero-title {
      font-size: 2.8rem;
    }
  }

  @media (max-width: 600px) {
    .hero-title {
      font-size: 2.4rem;
    }
    .nav-menu {
      display: none;
      position: absolute;
      top: 72px;
      left: 0;
      right: 0;
      background: var(--surface);
      flex-direction: column;
      padding: 24px;
      border-bottom: 1px solid var(--border);
    }
    .nav-menu.open {
      display: flex;
    }
    .mobile-toggle-btn {
      display: block;
    }
    .cta-form {
      flex-direction: column;
    }
  }
    `;
  }

  getGuaranteedJs() {
    return `
  // Interactive Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle-btn');
  const navMenu = document.getElementById('nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // Interactive Pricing Annual/Monthly Switcher
  const billingToggle = document.getElementById('billing-toggle');
  const amounts = document.querySelectorAll('.tier-price .amount');
  if (billingToggle) {
    billingToggle.addEventListener('click', () => {
      billingToggle.classList.toggle('active');
      const isYearly = billingToggle.classList.contains('active');
      amounts.forEach(el => {
        const val = isYearly ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
        if (val) el.textContent = val;
      });
    });
  }

  // Interactive Contact/Trial Form
  const contactForm = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  if (contactForm && feedback) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      feedback.style.display = 'block';
      feedback.className = 'form-feedback success';
      feedback.textContent = '🎉 Thank you! Your 7-day all-access trial passes have been activated.';
      contactForm.reset();
    });
  }
    `;
  }
}

module.exports = new BuilderService();
