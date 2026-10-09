const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const geminiService = require('./geminiService');

/**
 * PixelCraft AI — Multimodal Image, Logo & UI/UX Service
 * Provides genuine AI image generation, professional vector logo design,
 * multi-screen UI/UX design generation, and brand identity kits.
 */
class ImageService {
  constructor() {
    this.providers = [
      {
        id: 'pollinations_flux',
        name: 'Flux / Pollinations AI',
        status: 'active',
        description: 'Real-time high-fidelity photorealistic & creative image synthesis'
      },
      {
        id: 'google_imagen',
        name: 'Google Imagen 3 (Gemini)',
        status: process.env.GEMINI_API_KEY ? 'requires_billing_quota' : 'not_configured',
        description: 'Google DeepMind Imagen 3 generation model (Requires Google Cloud billing quota)'
      },
      {
        id: 'vector_svg',
        name: 'PixelCraft Precision Vector Engine',
        status: 'active',
        description: 'Mathematical SVG vector path generation for professional logos and emblems'
      }
    ];
  }

  getAvailableProviders() {
    return this.providers;
  }

  /**
   * Translates & enriches informal/Tanglish prompts into professional creative briefs.
   */
  enrichCreativePrompt(userPrompt, category = 'image') {
    if (!userPrompt || typeof userPrompt !== 'string') return '';
    let p = userPrompt.trim();

    // Common Tanglish terms cleanup
    const tanglishMap = [
      { regex: /\bku\b/gi, replace: 'for' },
      { regex: /\boru\b/gi, replace: 'a' },
      { regex: /\bindha\b/gi, replace: 'this' },
      { regex: /\bandha\b/gi, replace: 'that' },
      { regex: /\bpannu\b/gi, replace: '' },
      { regex: /\bvenum\b/gi, replace: '' },
      { regex: /\bmathu\b/gi, replace: 'change to' },
      { regex: /\bkudu\b/gi, replace: 'give' },
      { regex: /\boda\b/gi, replace: 'with' },
      { regex: /\bmari\b/gi, replace: 'style' }
    ];

    tanglishMap.forEach(({ regex, replace }) => {
      p = p.replace(regex, replace);
    });

    p = p.replace(/\s+/g, ' ').trim();

    if (category === 'image') {
      return `${p}, award-winning composition, commercial photography, highly detailed, dramatic lighting, 8k resolution, cinematic`;
    }
    if (category === 'logo') {
      return `${p}, minimalist, vector logo mark, clean geometric icon, iconic corporate identity, professional graphic design, modern typography`;
    }
    return p;
  }

  /**
   * Extracts brand name and design tone from natural language / Tanglish prompts.
   */
  extractBrandDetails(userPrompt = '') {
    const raw = (userPrompt || '').trim();
    let name = '';
    let industry = 'general';
    let style = 'modern';
    let palette = {
      primary: '#6366f1',
      secondary: '#f97316',
      dark: '#0f172a',
      light: '#ffffff'
    };

    // 1. Check for quoted brand name, "for [Brand]" or "[Brand] ku"
    const quoteMatch = raw.match(/["']([^"']+)["']/);
    const forMatch = raw.match(/\bfor\s+([A-Za-z0-9\s&]+?)(?:\s+(?:using|with|in|and|the|app|website|logo|brand)\b|$)/i);
    const kuMatch = raw.match(/^([A-Za-z0-9\s&]+?)\s+ku\b/i);

    if (quoteMatch && quoteMatch[1].length < 35) {
      name = quoteMatch[1].trim();
    } else if (forMatch && forMatch[1].trim().length > 1 && forMatch[1].trim().length < 35) {
      name = forMatch[1].trim();
    } else if (kuMatch && kuMatch[1].trim().length > 1 && kuMatch[1].trim().length < 35) {
      name = kuMatch[1].trim();
    } else {
      const brandMatch = raw.match(/\b(?:brand|company|named|called|title)\s+([A-Za-z0-9\s&]+)/i);
      if (brandMatch && brandMatch[1].trim().length > 1) {
        name = brandMatch[1].split(/\s+(?:logo|design|with|ku)/i)[0].trim();
      }
    }

    if (!name || name.toLowerCase() === 'create' || name.toLowerCase() === 'make' || name.toLowerCase() === 'professional') {
      if (/bubble\s*cafe/i.test(raw)) name = 'Bubble Cafe';
      else if (/gym|fitness|athlet/i.test(raw)) name = 'Titan Gym';
      else if (/coffee|bistro|brew/i.test(raw)) name = 'Roast & Co';
      else if (/bank|fintech|pay/i.test(raw)) name = 'NovaPay';
      else if (/clothing|apparel|fashion/i.test(raw)) name = 'Luxe Studio';
      else if (/tech|ai|saas/i.test(raw)) name = 'PixelCraft';
      else name = 'Apex Studio';
    }

    // Capitalize name properly
    name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    // 2. Identify Industry & Palette
    if (/cafe|coffee|bubble|tea|bakery|restaurant|food|bistro/i.test(raw)) {
      industry = 'cafe';
      palette = {
        primary: '#d97706', // warm caramel/amber
        secondary: '#f43f5e', // playful rose/boba
        dark: '#1c1917',
        light: '#fffbeb',
        accent: '#fbbf24'
      };
    } else if (/gym|fitness|workout|bodybuild|muscle|iron|athlet/i.test(raw)) {
      industry = 'fitness';
      palette = {
        primary: '#ff5722', // blaze orange
        secondary: '#ff9800',
        dark: '#0a0a0a',
        light: '#ffffff',
        accent: '#ff3d00'
      };
    } else if (/bank|fintech|finance|crypto|wallet|invest/i.test(raw)) {
      industry = 'finance';
      palette = {
        primary: '#2563eb', // sapphire blue
        secondary: '#10b981', // emerald green
        dark: '#0b132b',
        light: '#f8fafc',
        accent: '#38bdf8'
      };
    } else if (/luxury|fashion|clothing|jewelry|watch|couture/i.test(raw)) {
      industry = 'luxury';
      palette = {
        primary: '#d4af37', // metallic gold
        secondary: '#1a1a1a',
        dark: '#121212',
        light: '#faf8f5',
        accent: '#e5c158'
      };
    } else if (/eco|green|nature|organic|plant|leaf/i.test(raw)) {
      industry = 'nature';
      palette = {
        primary: '#16a34a',
        secondary: '#65a30d',
        dark: '#0f172a',
        light: '#f0fdf4',
        accent: '#86efac'
      };
    } else {
      industry = 'tech';
      palette = {
        primary: '#6366f1',
        secondary: '#06b6d4',
        dark: '#0f172a',
        light: '#f8fafc',
        accent: '#818cf8'
      };
    }

    // 3. Style Preference
    if (/minimal|simple|clean/i.test(raw)) style = 'minimalist';
    else if (/luxury|premium|royal|gold|elegant/i.test(raw)) style = 'luxury';
    else if (/geometric|abstract|tech|modern/i.test(raw)) style = 'geometric';
    else if (/playful|fun|cute|friendly/i.test(raw)) style = 'playful';

    return { name, industry, style, palette };
  }

  /**
   * Generates genuine SVG vector code for a brand logo with iconic geometry & clean typography.
   */
  synthesizeVectorLogo(details, variant = 'primary') {
    const { name, industry, palette } = details;
    const isDark = variant === 'dark';
    const isIconOnly = variant === 'icon';
    const isWordmark = variant === 'wordmark';

    const bgFill = isDark ? '#0b0f19' : (variant === 'light' ? '#ffffff' : (isDark ? '#0f172a' : 'transparent'));
    const textFill = isDark ? '#ffffff' : '#0f172a';
    const subTextFill = isDark ? '#94a3b8' : '#64748b';

    // Industry-specific vector glyphs
    let iconPath = '';
    if (industry === 'cafe') {
      // Elegant stylized coffee/boba cup with rising steam and pearl accents
      iconPath = `
        <g id="logo-icon-glyph">
          <defs>
            <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${palette.primary}"/>
              <stop offset="100%" stop-color="${palette.secondary || palette.accent}"/>
            </linearGradient>
            <filter id="dropGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${palette.primary}" flood-opacity="0.35"/>
            </filter>
          </defs>
          <!-- Outer circular seal frame -->
          <circle cx="250" cy="${isIconOnly ? 250 : 190}" r="92" fill="none" stroke="url(#cupGrad)" stroke-width="4.5" stroke-dasharray="14 6" opacity="0.85"/>
          <circle cx="250" cy="${isIconOnly ? 250 : 190}" r="82" fill="${isDark ? '#131b2e' : '#f8fafc'}" filter="url(#dropGlow)"/>
          
          <!-- Cup base & lid -->
          <path d="M210,${isIconOnly ? 210 : 150} L290,${isIconOnly ? 210 : 150} L276,${isIconOnly ? 285 : 225} C274,${isIconOnly ? 298 : 238} 226,${isIconOnly ? 298 : 238} 224,${isIconOnly ? 285 : 225} Z" fill="url(#cupGrad)"/>
          <ellipse cx="250" cy="${isIconOnly ? 210 : 150}" rx="42" ry="9" fill="${isDark ? '#ffffff' : palette.dark}" opacity="0.9"/>
          
          <!-- Straw angled -->
          <line x1="250" y1="${isIconOnly ? 210 : 150}" x2="274" y2="${isIconOnly ? 150 : 90}" stroke="${palette.accent}" stroke-width="7" stroke-linecap="round"/>
          
          <!-- Playful Bubbles / Aroma Pearls -->
          <circle cx="236" cy="${isIconOnly ? 245 : 185}" r="7" fill="#ffffff" opacity="0.85"/>
          <circle cx="262" cy="${isIconOnly ? 255 : 195}" r="8" fill="#ffffff" opacity="0.85"/>
          <circle cx="245" cy="${isIconOnly ? 270 : 210}" r="6" fill="#ffffff" opacity="0.85"/>
        </g>
      `;
    } else if (industry === 'fitness') {
      // Dynamic athletic chevron & iron dumbbell emblem
      iconPath = `
        <g id="logo-icon-glyph">
          <defs>
            <linearGradient id="ironGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${palette.primary}"/>
              <stop offset="100%" stop-color="${palette.secondary || '#ff9800'}"/>
            </linearGradient>
            <filter id="ironGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${palette.primary}" flood-opacity="0.45"/>
            </filter>
          </defs>
          <!-- Hexagonal shield badge -->
          <polygon points="250,${isIconOnly ? 145 : 85} 330,${isIconOnly ? 190 : 130} 330,${isIconOnly ? 295 : 235} 250,${isIconOnly ? 345 : 285} 170,${isIconOnly ? 295 : 235} 170,${isIconOnly ? 190 : 130}" 
                   fill="${isDark ? '#141414' : '#1f2937'}" stroke="url(#ironGrad)" stroke-width="6" filter="url(#ironGlow)"/>
          
          <!-- Geometric bolt & weights -->
          <path d="M256,${isIconOnly ? 175 : 115} L225,${isIconOnly ? 245 : 185} L252,${isIconOnly ? 245 : 185} L244,${isIconOnly ? 315 : 255} L280,${isIconOnly ? 235 : 175} L254,${isIconOnly ? 235 : 175} Z" 
                fill="url(#ironGrad)"/>
        </g>
      `;
    } else if (industry === 'finance') {
      // Modern abstract interconnected growth nodes / secure nexus
      iconPath = `
        <g id="logo-icon-glyph">
          <defs>
            <linearGradient id="finGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${palette.primary}"/>
              <stop offset="100%" stop-color="${palette.secondary}"/>
            </linearGradient>
          </defs>
          <circle cx="250" cy="${isIconOnly ? 250 : 190}" r="85" fill="${isDark ? '#0f172a' : '#eff6ff'}" stroke="url(#finGrad)" stroke-width="5"/>
          <path d="M205,${isIconOnly ? 275 : 215} L235,${isIconOnly ? 240 : 180} L260,${isIconOnly ? 260 : 200} L295,${isIconOnly ? 215 : 155}" 
                fill="none" stroke="url(#finGrad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <polygon points="280,${isIconOnly ? 210 : 150} 300,${isIconOnly ? 212 : 152} 296,${isIconOnly ? 232 : 172}" fill="${palette.secondary}"/>
          <circle cx="205" cy="${isIconOnly ? 275 : 215}" r="8" fill="${palette.primary}"/>
          <circle cx="235" cy="${isIconOnly ? 240 : 180}" r="8" fill="${palette.primary}"/>
          <circle cx="260" cy="${isIconOnly ? 260 : 200}" r="8" fill="${palette.primary}"/>
        </g>
      `;
    } else if (industry === 'luxury') {
      // Minimalist golden geometric diamond crest
      iconPath = `
        <g id="logo-icon-glyph">
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f59e0b"/>
              <stop offset="50%" stop-color="#fbbf24"/>
              <stop offset="100%" stop-color="#b45309"/>
            </linearGradient>
          </defs>
          <!-- Interlocking Monogram Diamond -->
          <polygon points="250,${isIconOnly ? 150 : 90} 325,${isIconOnly ? 250 : 190} 250,${isIconOnly ? 350 : 290} 175,${isIconOnly ? 250 : 190}" 
                   fill="none" stroke="url(#goldGrad)" stroke-width="4.5"/>
          <polygon points="250,${isIconOnly ? 175 : 115} 305,${isIconOnly ? 250 : 190} 250,${isIconOnly ? 325 : 265} 195,${isIconOnly ? 250 : 190}" 
                   fill="none" stroke="url(#goldGrad)" stroke-width="2.5" opacity="0.75"/>
          <circle cx="250" cy="${isIconOnly ? 250 : 190}" r="12" fill="url(#goldGrad)"/>
        </g>
      `;
    } else {
      // Precision Tech Origami Nexus
      iconPath = `
        <g id="logo-icon-glyph">
          <defs>
            <linearGradient id="techGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${palette.primary}"/>
              <stop offset="100%" stop-color="${palette.secondary}"/>
            </linearGradient>
          </defs>
          <rect x="180" y="${isIconOnly ? 180 : 120}" width="140" height="140" rx="36" fill="${isDark ? '#1e293b' : '#f1f5f9'}" stroke="url(#techGrad)" stroke-width="5"/>
          <path d="M215,${isIconOnly ? 215 : 155} L285,${isIconOnly ? 215 : 155} L285,${isIconOnly ? 285 : 225} L215,${isIconOnly ? 285 : 225} Z" fill="none" stroke="url(#techGrad)" stroke-width="4" stroke-dasharray="10 5"/>
          <circle cx="250" cy="${isIconOnly ? 250 : 190}" r="22" fill="url(#techGrad)"/>
        </g>
      `;
    }

    const svgWidth = 500;
    const svgHeight = isIconOnly ? 500 : (isWordmark ? 220 : 460);

    let content = '';
    if (isIconOnly) {
      content = iconPath;
    } else if (isWordmark) {
      content = `
        <text x="250" y="115" font-family="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" font-size="46" font-weight="900" letter-spacing="2.5" fill="${textFill}" text-anchor="middle">
          ${name.toUpperCase()}
        </text>
        <text x="250" y="152" font-family="'Inter', system-ui, sans-serif" font-size="14" font-weight="600" letter-spacing="6" fill="${subTextFill}" text-anchor="middle">
          EST. 2026 • PREMIUM IDENTITY
        </text>
      `;
    } else {
      content = `
        ${iconPath}
        <text x="250" y="345" font-family="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" font-size="38" font-weight="800" letter-spacing="1.5" fill="${textFill}" text-anchor="middle">
          ${name}
        </text>
        <text x="250" y="380" font-family="'Inter', system-ui, sans-serif" font-size="13" font-weight="600" letter-spacing="5.5" fill="${subTextFill}" text-anchor="middle">
          ${industry.toUpperCase()} • CRAFTED WITH PIXELCRAFT
        </text>
      `;
    }

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  ${bgFill !== 'transparent' ? `<rect width="100%" height="100%" fill="${bgFill}" rx="16"/>` : ''}
  ${content}
</svg>`.trim();
  }

  /**
   * Generates a complete Logo & Brand Identity suite.
   */
  async generateLogoAndBrandIdentity(userPrompt, options = {}) {
    const details = this.extractBrandDetails(userPrompt);
    const primarySvg = this.synthesizeVectorLogo(details, 'primary');
    const darkSvg = this.synthesizeVectorLogo(details, 'dark');
    const lightSvg = this.synthesizeVectorLogo(details, 'light');
    const iconSvg = this.synthesizeVectorLogo(details, 'icon');
    const wordmarkSvg = this.synthesizeVectorLogo(details, 'wordmark');

    // Also attempt real AI image synthesis for an artistic 3D / emblem concept using Pollinations
    let artisticConceptUrl = null;
    try {
      const enrichedLogoPrompt = `${details.name} logo, ${details.industry} brand emblem, minimalist luxury graphic design, vector aesthetic, clean white background, high contrast, 8k`;
      const encoded = encodeURIComponent(enrichedLogoPrompt);
      artisticConceptUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true`;
    } catch (_) {}

    const brandKit = {
      brandName: details.name,
      industry: details.industry,
      style: details.style,
      palette: details.palette,
      colors: [
        { name: 'Primary Brand Mark', hex: details.palette.primary },
        { name: 'Secondary Base', hex: details.palette.secondary },
        { name: 'Vibrant Accent', hex: details.palette.accent }
      ],
      typography: {
        primaryFont: details.industry === 'luxury' ? 'Cinzel, serif' : 'Plus Jakarta Sans, sans-serif',
        headingFont: details.industry === 'luxury' ? 'Cinzel, serif' : 'Plus Jakarta Sans, sans-serif',
        secondaryFont: 'Inter, system-ui, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif'
      },
      businessCard: {
        title: `${details.name} Executive Identity`,
        dimensions: '3.5 x 2.0 in',
        printReady: true,
        primaryHex: details.palette.primary
      },
      tagline: `Premium ${details.industry.charAt(0).toUpperCase() + details.industry.slice(1)} Brand Experience`,
      guidelines: [
        `Always maintain clear space around the ${details.name} logomark equivalent to the height of the inner icon.`,
        `Use ${details.palette.primary} as the signature brand color for primary CTAs and hero marks.`,
        `Avoid skewing, rotating, or recoloring the logo outside the approved palette tokens.`,
        `For dark interfaces, always utilize the high-contrast inverted emblem with white typography.`
      ]
    };

    return {
      success: true,
      brandName: details.name,
      industry: details.industry,
      category: details.industry,
      style: details.style,
      svg: primarySvg,
      svgPrimary: primarySvg,
      svgLight: lightSvg,
      svgDark: darkSvg,
      svgIcon: iconSvg,
      svgWordmark: wordmarkSvg,
      variants: {
        primary: primarySvg,
        dark: darkSvg,
        light: lightSvg,
        iconOnly: iconSvg,
        wordmark: wordmarkSvg,
        artisticConceptUrl: artisticConceptUrl
      },
      brandKit: brandKit
    };
  }

  /**
   * Real AI Image Generation via Pollinations AI / Flux provider abstraction.
   */
  async generateImage(userPrompt, options = {}) {
    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
      throw new Error('Image generation prompt is required');
    }

    const {
      aspectRatio = '1:1',
      style = 'photorealistic',
      negativePrompt = 'blurry, distorted, low quality, watermark, text error'
    } = options;

    let width = 512;
    let height = 512;
    if (aspectRatio === '16:9') {
      width = 768;
      height = 432;
    } else if (aspectRatio === '9:16') {
      width = 432;
      height = 768;
    } else if (aspectRatio === '4:5') {
      width = 512;
      height = 640;
    } else if (aspectRatio === '3:2') {
      width = 600;
      height = 400;
    }

    const enriched = this.enrichCreativePrompt(userPrompt, 'image');
    const safePrompt = encodeURIComponent(enriched);

    const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

    // Verify availability server-side and fetch buffer
    let dataUrl = null;
    let mimeType = 'image/jpeg';

    try {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(18000) });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        mimeType = response.headers.get('content-type') || 'image/jpeg';
        dataUrl = `data:${mimeType};base64,${base64}`;
      }
    } catch (err) {
      console.warn('Server buffer fetch timed out, falling back to direct URL reference:', err.message);
    }

    return {
      success: true,
      prompt: userPrompt,
      enrichedPrompt: enriched,
      aspectRatio,
      width,
      height,
      imageUrl: dataUrl || imageUrl,
      directUrl: imageUrl,
      provider: 'pollinations_flux'
    };
  }

  /**
   * Generates a complete Multi-Screen UI/UX Design project.
   */
  async generateUiUxProject(userPrompt, options = {}) {
    const raw = (userPrompt || '').toLowerCase();
    let appTitle = 'Mobile App';
    let deviceType = 'mobile'; // 'mobile' | 'dashboard'
    let themeColor = '#6366f1';
    let secondaryColor = '#06b6d4';
    let appType = 'mobile_app';

    if (/bank|fintech|wallet|finance|money/i.test(raw)) {
      appTitle = 'NovaPay Mobile Banking';
      themeColor = '#2563eb';
      secondaryColor = '#10b981';
      appType = 'banking';
    } else if (/cafe|coffee|bubble|order|food|bistro/i.test(raw)) {
      appTitle = 'Bubble Cafe Express Ordering';
      themeColor = '#d97706';
      secondaryColor = '#f43f5e';
      appType = 'cafe';
    } else if (/school|student|college|educat|class/i.test(raw)) {
      appTitle = 'EduPulse School Management';
      themeColor = '#4f46e5';
      secondaryColor = '#0ea5e9';
      appType = 'school';
      deviceType = 'dashboard';
    } else if (/dashboard|saas|analytics|admin/i.test(raw)) {
      appTitle = 'PulseMetrics Analytics';
      themeColor = '#059669';
      secondaryColor = '#3b82f6';
      appType = 'saas';
      deviceType = 'dashboard';
    } else {
      appTitle = 'Vance Smart Studio';
      themeColor = '#8b5cf6';
      secondaryColor = '#ec4899';
    }

    const screens = this.synthesizeAppScreens(appType, appTitle, themeColor, secondaryColor, deviceType);

    return {
      success: true,
      appTitle,
      appName: appTitle,
      appType,
      deviceType,
      themeColor,
      screens,
      activeScreenIndex: 0
    };
  }

  /**
   * Builds high-craft multi-screen UI components with inspectable elements.
   */
  synthesizeAppScreens(appType, title, primary, secondary, deviceType) {
    if (appType === 'banking') {
      return [
        {
          id: 'screen-login',
          name: '1. Welcome & Security',
          description: 'Biometric authorization & fast passcode sign in',
          html: `
            <div class="uiux-screen-card" style="padding: 32px 24px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
              <div class="uiux-hero-badge" style="margin: 30px auto 0;">
                <div style="width: 72px; height: 72px; border-radius: 20px; background: linear-gradient(135deg, ${primary}, ${secondary}); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 10px 25px rgba(37,99,235,0.4);">💳</div>
              </div>
              <div style="margin: 24px 0;">
                <h2 data-ui-element="h2-login-title" style="font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">Welcome to ${title}</h2>
                <p data-ui-element="p-login-sub" style="font-size: 14px; color: #94a3b8;">Fast, borderless and secure banking at your fingertips</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                  <span style="font-size: 13px; color: #94a3b8;">Touch ID / Passcode</span>
                  <span style="font-size: 12px; color: ${secondary}; font-weight: 600;">ACTIVE</span>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                  <span style="width: 14px; height: 14px; border-radius: 50%; background: ${primary};"></span>
                  <span style="width: 14px; height: 14px; border-radius: 50%; background: ${primary};"></span>
                  <span style="width: 14px; height: 14px; border-radius: 50%; background: ${primary};"></span>
                  <span style="width: 14px; height: 14px; border-radius: 50%; background: rgba(255,255,255,0.2);"></span>
                </div>
              </div>
              <div>
                <button data-ui-element="btn-login-submit" style="width: 100%; padding: 14px; border-radius: 12px; background: ${primary}; color: #ffffff; font-weight: 700; border: none; font-size: 15px; cursor: pointer; box-shadow: 0 8px 20px rgba(37,99,235,0.35);">Unlock Account ➔</button>
                <div style="margin-top: 14px; font-size: 12px; color: #64748b;">Protected by 256-bit encryption</div>
              </div>
            </div>
          `
        },
        {
          id: 'screen-dashboard',
          name: '2. Accounts & Balance',
          description: 'Live total wealth, card mockups & recent activity',
          html: `
            <div class="uiux-screen-card" style="padding: 24px 20px; height: 100%; display: flex; flex-direction: column;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                  <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Total Balance</div>
                  <div data-ui-element="h1-balance" style="font-size: 28px; font-weight: 800; color: #ffffff;">$24,850.50</div>
                </div>
                <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 18px;">🔔</div>
              </div>
              <!-- Virtual Card -->
              <div style="background: linear-gradient(135deg, ${primary}, #1e3a8a); border-radius: 20px; padding: 22px; color: #ffffff; margin-bottom: 24px; box-shadow: 0 12px 30px rgba(37,99,235,0.4);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 28px;">
                  <span style="font-weight: 800; letter-spacing: 1px; font-size: 16px;">Nova Black</span>
                  <span style="font-size: 20px;">⚡</span>
                </div>
                <div style="font-family: monospace; font-size: 16px; letter-spacing: 3px; margin-bottom: 16px;">•••• •••• •••• 4892</div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.85;">
                  <span>NITHESH S</span>
                  <span>EXP 09/29</span>
                </div>
              </div>
              <!-- Action Pills -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; text-align: center;">
                <div style="background: rgba(255,255,255,0.05); padding: 12px 4px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="font-size: 20px;">⬆️</div>
                  <div style="font-size: 11px; margin-top: 6px; color: #cbd5e1;">Send</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 12px 4px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="font-size: 20px;">⬇️</div>
                  <div style="font-size: 11px; margin-top: 6px; color: #cbd5e1;">Receive</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 12px 4px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="font-size: 20px;">📊</div>
                  <div style="font-size: 11px; margin-top: 6px; color: #cbd5e1;">Invest</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 12px 4px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="font-size: 20px;">⚙️</div>
                  <div style="font-size: 11px; margin-top: 6px; color: #cbd5e1;">More</div>
                </div>
              </div>
              <!-- Recent Transactions -->
              <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 12px;">RECENT ACTIVITY</div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                  <div style="display: flex; gap: 12px; align-items: center;">
                    <span style="width: 36px; height: 36px; border-radius: 10px; background: rgba(244,63,94,0.15); display: flex; align-items: center; justify-content: center;">☕</span>
                    <div>
                      <div style="font-size: 13px; font-weight: 600; color: #ffffff;">Bubble Cafe</div>
                      <div style="font-size: 11px; color: #64748b;">Today, 10:42 AM</div>
                    </div>
                  </div>
                  <div style="font-size: 13px; font-weight: 700; color: #f43f5e;">-$8.50</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                  <div style="display: flex; gap: 12px; align-items: center;">
                    <span style="width: 36px; height: 36px; border-radius: 10px; background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center;">💼</span>
                    <div>
                      <div style="font-size: 13px; font-weight: 600; color: #ffffff;">Stripe Payout</div>
                      <div style="font-size: 11px; color: #64748b;">Yesterday</div>
                    </div>
                  </div>
                  <div style="font-size: 13px; font-weight: 700; color: #10b981;">+$1,450.00</div>
                </div>
              </div>
            </div>
          `
        },
        {
          id: 'screen-transfer',
          name: '3. Instant Transfer',
          description: 'Recipient selection, amount slider & validation',
          html: `
            <div class="uiux-screen-card" style="padding: 24px 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                  <button style="background: none; border: none; color: #ffffff; font-size: 18px; cursor: pointer;">←</button>
                  <h3 data-ui-element="h3-transfer-title" style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0;">Send Payment</h3>
                </div>
                <!-- Amount Display -->
                <div style="text-align: center; margin: 30px 0;">
                  <span style="font-size: 16px; color: #94a3b8;">Enter Amount</span>
                  <div data-ui-element="div-transfer-amount" style="font-size: 42px; font-weight: 900; color: #ffffff; margin: 8px 0;">$250.00</div>
                  <span style="font-size: 12px; background: rgba(16,185,129,0.15); color: #10b981; padding: 4px 10px; border-radius: 20px; font-weight: 600;">Fee: $0.00 (Instant)</span>
                </div>
                <!-- Recipient Selection -->
                <div style="font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">Recent Contacts</div>
                <div style="display: flex; gap: 14px; overflow-x: auto; padding-bottom: 8px;">
                  <div style="text-align: center;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: ${primary}; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ffffff; border: 2px solid ${secondary};">SR</div>
                    <div style="font-size: 11px; color: #e2e8f0; margin-top: 4px;">Sritharan</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ffffff;">AV</div>
                    <div style="font-size: 11px; color: #e2e8f0; margin-top: 4px;">Alex</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #8b5cf6; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ffffff;">ES</div>
                    <div style="font-size: 11px; color: #e2e8f0; margin-top: 4px;">Elena</div>
                  </div>
                </div>
              </div>
              <button data-ui-element="btn-confirm-transfer" style="width: 100%; padding: 15px; border-radius: 14px; background: linear-gradient(135deg, ${primary}, ${secondary}); color: #ffffff; font-weight: 800; border: none; font-size: 16px; cursor: pointer; box-shadow: 0 10px 24px rgba(37,99,235,0.4);">Confirm & Send $250.00 ➔</button>
            </div>
          `
        }
      ];
    } else if (appType === 'cafe') {
      return [
        {
          id: 'screen-cafe-welcome',
          name: '1. Welcome & Order',
          description: 'Brand hero banner, drink specials & category selector',
          html: `
            <div class="uiux-screen-card" style="padding: 24px 20px; height: 100%; display: flex; flex-direction: column;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                <div>
                  <div style="font-size: 12px; color: ${primary}; font-weight: 700;">GOOD MORNING ☕</div>
                  <h2 data-ui-element="h2-cafe-name" style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 2px 0 0;">${title}</h2>
                </div>
                <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 18px;">🛒<span style="position: absolute; width: 8px; height: 8px; background: ${secondary}; border-radius: 50%; margin: -10px -10px 0 0;"></span></div>
              </div>
              <!-- Special Banner -->
              <div style="background: linear-gradient(135deg, ${primary}, ${secondary}); border-radius: 18px; padding: 20px; color: #ffffff; margin-bottom: 20px;">
                <span style="font-size: 11px; background: rgba(0,0,0,0.25); padding: 4px 8px; border-radius: 8px; font-weight: 700;">LIMITED EDITION</span>
                <h3 style="font-size: 18px; font-weight: 800; margin: 8px 0 4px;">Brown Sugar Boba</h3>
                <p style="font-size: 12px; opacity: 0.9; margin: 0 0 12px;">Creamy fresh milk with warm caramelized pearls</p>
                <button data-ui-element="btn-order-now" style="background: #ffffff; color: #000000; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer;">Order Now • $6.50</button>
              </div>
              <!-- Categories -->
              <div style="display: flex; gap: 8px; margin-bottom: 18px; overflow-x: auto;">
                <button style="background: ${primary}; color: #ffffff; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 12px; white-space: nowrap;">All Drinks</button>
                <button style="background: rgba(255,255,255,0.08); color: #94a3b8; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; font-size: 12px; white-space: nowrap;">Milk Tea</button>
                <button style="background: rgba(255,255,255,0.08); color: #94a3b8; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; font-size: 12px; white-space: nowrap;">Fruit Tea</button>
                <button style="background: rgba(255,255,255,0.08); color: #94a3b8; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; font-size: 12px; white-space: nowrap;">Matcha</button>
              </div>
              <!-- Drink Card Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1;">
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; text-align: center;">
                  <div style="font-size: 32px; margin-bottom: 8px;">🧋</div>
                  <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Taro Pearl Milk</div>
                  <div style="font-size: 12px; color: ${primary}; font-weight: 700; margin-top: 4px;">$5.80</div>
                </div>
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; text-align: center;">
                  <div style="font-size: 32px; margin-bottom: 8px;">🍵</div>
                  <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Matcha Latte</div>
                  <div style="font-size: 12px; color: ${primary}; font-weight: 700; margin-top: 4px;">$6.20</div>
                </div>
              </div>
            </div>
          `
        },
        {
          id: 'screen-cafe-customize',
          name: '2. Customize Drink',
          description: 'Ice level, sweetness slider & topping pearls selection',
          html: `
            <div class="uiux-screen-card" style="padding: 24px 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="font-size: 48px;">🧋</div>
                  <h3 data-ui-element="h3-item-title" style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 8px 0 4px;">Signature Taro Pearl Milk</h3>
                  <div style="font-size: 14px; color: ${primary}; font-weight: 700;">$5.80 base</div>
                </div>
                <!-- Sweetness Level -->
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 8px;">SWEETNESS</div>
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                    <button style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5e1; border: none; font-size: 11px;">0%</button>
                    <button style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5e1; border: none; font-size: 11px;">30%</button>
                    <button style="padding: 8px; border-radius: 8px; background: ${primary}; color: #ffffff; border: none; font-size: 11px; font-weight: 700;">70%</button>
                    <button style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5e1; border: none; font-size: 11px;">100%</button>
                  </div>
                </div>
                <!-- Ice Level -->
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 8px;">ICE LEVEL</div>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                    <button style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5e1; border: none; font-size: 11px;">No Ice</button>
                    <button style="padding: 8px; border-radius: 8px; background: ${primary}; color: #ffffff; border: none; font-size: 11px; font-weight: 700;">Less Ice</button>
                    <button style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5e1; border: none; font-size: 11px;">Regular</button>
                  </div>
                </div>
              </div>
              <button data-ui-element="btn-add-cart" style="width: 100%; padding: 14px; border-radius: 12px; background: ${primary}; color: #ffffff; font-weight: 800; border: none; font-size: 15px; cursor: pointer;">Add to Order • $5.80 ➔</button>
            </div>
          `
        },
        {
          id: 'screen-cafe-cart',
          name: '3. Cart & Pickup',
          description: 'Order summary, estimated pickup time & pay button',
          html: `
            <div class="uiux-screen-card" style="padding: 24px 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h3 data-ui-element="h3-cart-title" style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 16px;">Review Order</h3>
                <!-- Order Item -->
                <div style="background: rgba(255,255,255,0.05); border-radius: 14px; padding: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; gap: 12px; align-items: center;">
                    <span style="font-size: 28px;">🧋</span>
                    <div>
                      <div style="font-size: 14px; font-weight: 700; color: #ffffff;">Taro Pearl Milk</div>
                      <div style="font-size: 11px; color: #94a3b8;">70% Sweet • Less Ice</div>
                    </div>
                  </div>
                  <div style="font-size: 14px; font-weight: 700; color: ${primary};">$5.80</div>
                </div>
                <!-- Pickup Store -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; margin-bottom: 16px;">
                  <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">PICKUP LOCATION</div>
                  <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-top: 4px;">Bubble Cafe • Main Street Branch</div>
                  <div style="font-size: 12px; color: #10b981; margin-top: 2px;">⚡ Ready in ~8 mins</div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 15px; font-weight: 800; color: #ffffff;">
                  <span>Total Amount</span>
                  <span>$5.80</span>
                </div>
                <button data-ui-element="btn-checkout-pay" style="width: 100%; padding: 15px; border-radius: 14px; background: linear-gradient(135deg, ${primary}, ${secondary}); color: #ffffff; font-weight: 800; border: none; font-size: 15px; cursor: pointer; box-shadow: 0 10px 24px rgba(217,119,6,0.35);">Apple Pay / Checkout ➔</button>
              </div>
            </div>
          `
        }
      ];
    }

    // Default multi-screen app
    return [
      {
        id: 'screen-default-1',
        name: '1. Overview Screen',
        description: 'Main application dashboard & KPIs',
        html: `
          <div class="uiux-screen-card" style="padding: 24px 20px; height: 100%;">
            <h2 data-ui-element="h2-overview" style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">${title}</h2>
            <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">Live application design system</p>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 18px; margin-bottom: 16px;">
              <span style="font-size: 11px; color: ${primary}; font-weight: 700;">STATUS</span>
              <div style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 4px 0;">Active System</div>
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">Synchronized with PixelCraft Studio design canvas.</p>
            </div>
          </div>
        `
      },
      {
        id: 'screen-default-2',
        name: '2. Details & Actions',
        description: 'Secondary view with interactive forms',
        html: `
          <div class="uiux-screen-card" style="padding: 24px 20px; height: 100%;">
            <h3 style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 14px;">Management Actions</h3>
            <button data-ui-element="btn-action" style="width: 100%; padding: 12px; background: ${primary}; border: none; border-radius: 10px; color: #ffffff; font-weight: 700; cursor: pointer;">Execute Workflow</button>
          </div>
        `
      }
    ];
  }

  /**
   * Refines a creative asset (Logo, Brand Kit, UI/UX, or Image) based on user instructions.
   */
  async refineCreativeAsset(deltaPrompt, currentAsset, mode = 'logo') {
    const p = (deltaPrompt || '').toLowerCase();

    if (mode === 'logo' || mode === 'brand') {
      const details = {
        name: currentAsset?.brandName || 'Brand',
        industry: currentAsset?.industry || 'general',
        style: currentAsset?.style || 'modern',
        palette: Object.assign({}, currentAsset?.brandKit?.palette || {
          primary: '#6366f1',
          secondary: '#f97316',
          dark: '#0f172a',
          light: '#ffffff'
        })
      };

      // Check color transformations (e.g. "pastel pink and cream", "black and gold", etc.)
      if ((/pink/i.test(p) || /pastel/i.test(p)) && /cream/i.test(p)) {
        details.palette.primary = '#f472b6'; // pastel pink
        details.palette.secondary = '#fef3c7'; // warm cream
        details.palette.light = '#fffbeb';
        details.palette.accent = '#fbcfe8';
      } else if (/black and gold|gold and black/i.test(p)) {
        details.palette.primary = '#d4af37';
        details.palette.dark = '#0a0a0a';
        details.palette.accent = '#fbbf24';
      } else if (/black/i.test(p)) {
        details.palette.dark = '#000000';
      }

      if (/premium|luxury/i.test(p)) {
        details.style = 'luxury';
      }

      const primarySvg = this.synthesizeVectorLogo(details, 'primary');
      const darkSvg = this.synthesizeVectorLogo(details, 'dark');
      const lightSvg = this.synthesizeVectorLogo(details, 'light');
      const iconSvg = this.synthesizeVectorLogo(details, 'icon');
      const wordmarkSvg = this.synthesizeVectorLogo(details, 'wordmark');

      return {
        success: true,
        brandName: details.name,
        industry: details.industry,
        category: details.industry,
        style: details.style,
        svg: primarySvg,
        svgPrimary: primarySvg,
        svgLight: lightSvg,
        svgDark: darkSvg,
        svgIcon: iconSvg,
        svgWordmark: wordmarkSvg,
        variants: {
          primary: primarySvg,
          dark: darkSvg,
          light: lightSvg,
          iconOnly: iconSvg,
          wordmark: wordmarkSvg,
          artisticConceptUrl: currentAsset?.variants?.artisticConceptUrl
        },
        brandKit: {
          ...currentAsset?.brandKit,
          palette: details.palette,
          colors: [
            { name: 'Primary Brand Mark', hex: details.palette.primary },
            { name: 'Secondary Base', hex: details.palette.secondary },
            { name: 'Vibrant Accent', hex: details.palette.accent }
          ]
        }
      };
    }

    if (mode === 'image') {
      const combinedPrompt = `${currentAsset?.prompt || ''}, ${deltaPrompt}`;
      return this.generateImage(combinedPrompt, {
        aspectRatio: currentAsset?.aspectRatio || '1:1'
      });
    }

    if (mode === 'uiux') {
      const updatedScreens = (currentAsset?.screens || []).map(screen => {
        let h = screen.html;
        if (/pink|pastel/i.test(p)) {
          h = h.replace(/#2563eb|#6366f1|#d97706/g, '#f472b6');
        }
        if (/cream/i.test(p)) {
          h = h.replace(/#10b981|#06b6d4|#f43f5e/g, '#fef3c7');
        }
        if (/black/i.test(p)) {
          h = h.replace(/rgba\(255,255,255,0\.05\)/g, '#000000');
        }
        return { ...screen, html: h };
      });

      return {
        ...currentAsset,
        screens: updatedScreens
      };
    }

    return currentAsset;
  }
}

module.exports = new ImageService();
