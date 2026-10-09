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
  async generateProject(userPrompt, options = {}) {
    const spec = await this.interpretPrompt(userPrompt);

    // Pick domain-relevant images
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

    const res = await geminiService.generateResponse(generationPrompt, { systemInstruction });
    if (!res.success || !res.reply) {
      throw new Error(res.error || 'Failed to generate website design');
    }

    let project = extractJsonFromText(res.reply);

    // If model truncated or syntax failed, produce a robust guaranteed fail-safe site
    if (!project || !project.html || !project.css) {
      project = this.createGuaranteedFallbackProject(spec, suggestedImages);
    }

    // Enrich with metadata
    project.id = 'proj_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    project.originalPrompt = userPrompt;
    project.createdAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    project.version = 1;
    project.previewUrl = null; // rendered via srcdoc sandbox

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

    const systemInstruction = `You are an Expert Visual Web Builder Refinement Engine.
The user wants to refine an existing website design using natural language (English, Tamil, or Tanglish).
TASK:
- Apply the requested modifications accurately.
- Examples:
  * "Hero section ah blue gradient ah mathu" -> Update hero section background/styling to a rich blue gradient.
  * "Change heading to Build Better Products" -> Update heading text.
  * "Add FAQ section after pricing" -> Insert an interactive FAQ accordion section.
  * "Make buttons rounded and brighter" -> Update button border-radius and accent styles.
- PRESERVE all unrelated sections, existing structure, copywriting, and custom changes.
- Return the updated complete HTML, CSS, JS, and sections list.
Respond STRICTLY with valid JSON.`;

    const refineMessage = `User Refinement Request: "${deltaPrompt}"
${targetSectionId ? `Target Section: ${targetSectionId}` : 'Target: Contextually identify from prompt'}

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

    const res = await geminiService.generateResponse(refineMessage, { systemInstruction });
    if (!res.success || !res.reply) {
      throw new Error(res.error || 'Failed to refine project');
    }

    const updated = extractJsonFromText(res.reply);
    if (!updated || !updated.html || !updated.css) {
      throw new Error('Refinement generated an unparseable response. Please retry.');
    }

    return {
      ...currentProject,
      title: updated.title || currentProject.title,
      sections: updated.sections || currentProject.sections,
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
    }
    body {
      font-family: '${bodyFont}', sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
      min-height: 100vh;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    button, input, textarea, select {
      font-family: inherit;
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

      // Handle element selection for parent visual properties inspector
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
        const rect = target.getBoundingClientRect();

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

      // Listen for updates from parent properties inspector
      window.addEventListener('message', function(event) {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'PIXELCRAFT_SET_MODE') {
          isEditorMode = data.mode === 'edit';
          if (!isEditorMode && selectedElement) {
            selectedElement.removeAttribute('data-pixelcraft-selected');
            selectedElement = null;
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

        if (data.type === 'PIXELCRAFT_SCROLL_TO_SECTION' && data.sectionId) {
          const el = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (selectedElement) selectedElement.removeAttribute('data-pixelcraft-selected');
            selectedElement = el;
            selectedElement.setAttribute('data-pixelcraft-selected', 'true');
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
}

module.exports = new BuilderService();
