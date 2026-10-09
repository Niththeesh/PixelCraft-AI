const builderService = require('../services/builderService');
const imageService = require('../services/imageService');

class BuilderController {
  /**
   * Detects creative mode from user prompt.
   * Returns 'logo', 'image', 'uiux', 'website', or null.
   */
  detectModeFromPrompt(prompt = '') {
    const p = prompt.toLowerCase().trim();

    // Logo & Brand triggers
    if (/\b(logo|brand identity|branding|monogram|emblem|wordmark|symbol|brand mark|logomark)\b/i.test(p)) {
      return 'logo';
    }

    // Image & Visual Art triggers
    if (/\b(poster|image|photo|photography|illustration|banner|wallpaper|graphic|artwork|visual|packaging concept)\b/i.test(p) && !p.includes('website') && !p.includes('app ui')) {
      return 'image';
    }

    // UI/UX App triggers
    if (/\b(app ui|ui\/ux|mobile app|mobile banking|ordering app|dashboard ui|management dashboard|screen ui|saas app|interface design)\b/i.test(p) || (/\b(app|dashboard)\b/i.test(p) && /\b(ui|design|screen)\b/i.test(p))) {
      return 'uiux';
    }

    // Default to website
    return 'website';
  }

  /**
   * POST /api/builder/detect
   * Checks if an incoming user message is a creative design, logo, image or website request.
   */
  async detectIntent(req, res) {
    try {
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }

      const p = prompt.trim().toLowerCase();

      // Negative exclusion for ordinary conversational/informational questions
      const nonDesignPatterns = [
        /^explain\s+(?!how to (?:create|build|make|design)\b)/i,
        /^(?:what|who|why|when|where)\s+is\b/i,
        /^(?:what|who|why|when|where)\s+are\b/i,
        /^define\s+/i,
        /^tell me about\b/i,
        /^summarize\b/i,
        /^translate\b/i,
        /^write (?:an essay|a poem|a letter|a story|an email)\b/i
      ];

      const isExplicitExclusion = nonDesignPatterns.some(pattern => pattern.test(p));
      const hasCreativeKeyword = /\b(website|landing page|ui\/ux|dashboard|logo|brand|poster|image|app)\b/i.test(p);
      if (isExplicitExclusion && !hasCreativeKeyword) {
        return res.status(200).json({ success: true, isDesignRequest: false, prompt });
      }

      // English creation triggers
      const creationActionRegex = /\b(create|build|make|design|generate|develop|redesign|revamp|code|craft|need|want|setup)\b/i;
      const creativeTargetRegex = /\b(website|web site|site|webpage|landing page|portfolio|dashboard|ecommerce|storefront|app ui|ui\/ux|user interface|hero section|pricing table|logo|brand|brand identity|poster|image|illustration|banner)\b/i;
      const domainCompoundRegex = /\b(gym|fitness|workout|restaurant|cafe|bistro|portfolio|developer|saas|agency|ecommerce|store|shop|doctor|clinic|hotel|travel|real estate|crypto|finance|startup)\s+(website|web site|site|landing page|ui|page|logo|poster|app)\b/i;

      // Tamil & Tanglish creation triggers
      const tanglishRegex = /\b(oru|indha|andha|enaku|namaku)\b.*\b(website|design|page|ui|portfolio|store|logo|poster|app)\b/i;
      const tanglishActionRegex = /\b(website|landing page|design|hero|navbar|theme|portfolio|ui|logo|brand|poster|app)\b.*\b(pannu|venum|mathu|kudu|thayaar|sey|mari)\b/i;
      const tanglishThemeRegex = /\b(theme\s*la|theme\s*il|oda)\b/i;

      // Refinement triggers
      const refinementRegex = /\b(only change|change|modify|update|improve|redesign|replace|make)\b.*\b(hero|navbar|section|colors?|theme|accent|font|button|pricing|header|footer|cards?|layout|bento|logo|poster|screen)\b/i;
      const tanglishRefineRegex = /\b(mattum|touch panna|mathu|change pannu)\b/i;

      const isDesign = (creationActionRegex.test(p) && creativeTargetRegex.test(p)) ||
                       domainCompoundRegex.test(p) ||
                       tanglishRegex.test(p) ||
                       tanglishActionRegex.test(p) ||
                       (tanglishThemeRegex.test(p) && creativeTargetRegex.test(p)) ||
                       refinementRegex.test(p) ||
                       (tanglishRefineRegex.test(p) && (creativeTargetRegex.test(p) || /hero|navbar|section|color|theme|logo|poster/i.test(p)));

      const detectedMode = isDesign ? this.detectModeFromPrompt(p) : null;

      return res.status(200).json({
        success: true,
        isDesignRequest: isDesign,
        detectedMode: detectedMode,
        prompt
      });
    } catch (err) {
      console.error('Builder detect error:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to analyze prompt intent' });
    }
  }

  /**
   * POST /api/builder/generate
   * Generates a complete project (Website, UI/UX, Logo, or AI Image) based on prompt & mode.
   */
  async generate(req, res) {
    try {
      const { prompt, options = {} } = req.body || {};
      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ success: false, error: 'Prompt is required to generate a design' });
      }

      const mode = options.mode || this.detectModeFromPrompt(prompt.trim());

      // 1. Logo & Brand Identity Mode
      if (mode === 'logo') {
        const logoData = await imageService.generateLogoAndBrandIdentity(prompt.trim(), options);
        return res.status(200).json({
          success: true,
          mode: 'logo',
          logo: logoData,
          logoData: logoData,
          project: {
            id: 'proj_logo_' + Date.now(),
            mode: 'logo',
            title: `${logoData.brandName} Brand Identity`,
            logo: logoData,
            logoData: logoData,
            html: `<div class="logo-preview-wrapper">${logoData.svg}</div>`,
            css: 'body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0b0f19; margin: 0; }',
            sections: [
              { id: 'logo-primary', name: 'Primary Logo', type: 'logo' },
              { id: 'logo-brand-kit', name: 'Brand Identity Kit', type: 'brand_kit' }
            ]
          }
        });
      }

      // 2. AI Image Generation Mode
      if (mode === 'image') {
        const imageData = await imageService.generateImage(prompt.trim(), options);
        return res.status(200).json({
          success: true,
          mode: 'image',
          image: imageData,
          imageData: imageData,
          project: {
            id: 'proj_img_' + Date.now(),
            mode: 'image',
            title: `Creative Image: ${prompt.trim().slice(0, 30)}...`,
            image: imageData,
            imageData: imageData,
            html: `<div style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#05070a;"><img src="${imageData.imageUrl || imageData.url}" style="max-width:90%;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.8);" alt="${prompt}"></div>`,
            css: '',
            sections: [{ id: 'image-canvas', name: 'Generated Visual Asset', type: 'image' }]
          }
        });
      }

      // 3. UI/UX Design Mode
      if (mode === 'uiux') {
        const uiuxData = await imageService.generateUiUxProject(prompt.trim(), options);
        return res.status(200).json({
          success: true,
          mode: 'uiux',
          uiux: uiuxData,
          uiuxData: uiuxData,
          project: {
            id: 'proj_uiux_' + Date.now(),
            mode: 'uiux',
            title: uiuxData.appTitle || uiuxData.appName,
            uiux: uiuxData,
            uiuxData: uiuxData,
            html: uiuxData.screens[0].html,
            css: 'body { background: #0b0f19; color: #ffffff; font-family: -apple-system, sans-serif; margin: 0; }',
            sections: uiuxData.screens.map(s => ({ id: s.id, name: s.name, type: 'screen' }))
          }
        });
      }

      // 4. Default: Full Website Builder Mode
      const project = await builderService.generateProject(prompt.trim(), options || {});
      project.mode = 'website';
      const bundledHtml = builderService.bundleProjectDocument(project);

      return res.status(200).json({
        success: true,
        mode: 'website',
        project,
        bundledHtml
      });
    } catch (err) {
      console.error('Builder generate error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate design'
      });
    }
  }

  /**
   * POST /api/builder/refine
   * Refines an existing project with natural language instructions across any mode.
   */
   async refine(req, res) {
    try {
      const { prompt, currentProject, currentAsset, targetSectionId, targetElement, mode: reqMode, options = {} } = req.body || {};
      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ success: false, error: 'Refinement instruction is required' });
      }

      const activeAsset = currentAsset || currentProject?.logoData || currentProject?.imageData || currentProject?.uiuxData || currentProject;
      const mode = reqMode || options.mode || currentProject?.mode || 'website';

      if (mode === 'logo' || mode === 'brand') {
        const refinedLogo = await imageService.refineCreativeAsset(prompt.trim(), activeAsset, 'logo');
        const updatedProject = {
          ...(currentProject || {}),
          id: currentProject?.id || ('proj_logo_' + Date.now()),
          title: `${refinedLogo.brandName} Brand Identity`,
          mode: 'logo',
          logo: refinedLogo,
          logoData: refinedLogo,
          html: `<div class="logo-preview-wrapper">${refinedLogo.svg}</div>`
        };
        return res.status(200).json({
          success: true,
          mode: 'logo',
          logo: refinedLogo,
          logoData: refinedLogo,
          project: updatedProject,
          summary: `Refined ${refinedLogo.brandName} logo & brand kit`
        });
      }

      if (mode === 'image') {
        const refinedImage = await imageService.refineCreativeAsset(prompt.trim(), activeAsset, 'image');
        const updatedProject = {
          ...(currentProject || {}),
          id: currentProject?.id || ('proj_img_' + Date.now()),
          mode: 'image',
          image: refinedImage,
          imageData: refinedImage,
          html: `<div style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#05070a;"><img src="${refinedImage.imageUrl || refinedImage.url}" style="max-width:90%;border-radius:16px;" alt="${prompt}"></div>`
        };
        return res.status(200).json({
          success: true,
          mode: 'image',
          image: refinedImage,
          imageData: refinedImage,
          project: updatedProject,
          summary: 'Generated refined image asset'
        });
      }

      if (mode === 'uiux') {
        const refinedUiUx = await imageService.refineCreativeAsset(prompt.trim(), activeAsset, 'uiux');
        const updatedProject = {
          ...(currentProject || {}),
          id: currentProject?.id || ('proj_uiux_' + Date.now()),
          mode: 'uiux',
          uiux: refinedUiUx,
          uiuxData: refinedUiUx,
          html: refinedUiUx.screens[0].html
        };
        return res.status(200).json({
          success: true,
          mode: 'uiux',
          uiux: refinedUiUx,
          uiuxData: refinedUiUx,
          project: updatedProject,
          summary: 'Updated UI/UX application screens'
        });
      }

      // Website refinement
      if (!currentProject) {
        return res.status(400).json({ success: false, error: 'Current project state is required for website refinement' });
      }
      const updatedProject = await builderService.refineProject(prompt.trim(), currentProject, targetSectionId || null, targetElement || null);
      updatedProject.mode = 'website';
      const bundledHtml = builderService.bundleProjectDocument(updatedProject);

      return res.status(200).json({
        success: true,
        mode: 'website',
        project: updatedProject,
        bundledHtml
      });
    } catch (err) {
      console.error('Builder refine error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to refine design'
      });
    }
  }

  /**
   * POST /api/builder/image
   */
  async generateImage(req, res) {
    try {
      const { prompt, options = {} } = req.body || {};
      if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
      const result = await imageService.generateImage(prompt, options);
      return res.status(200).json({
        success: true,
        image: result,
        imageData: result,
        ...result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/builder/logo
   */
  async generateLogo(req, res) {
    try {
      const { prompt, options = {} } = req.body || {};
      if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
      const result = await imageService.generateLogoAndBrandIdentity(prompt, options);
      return res.status(200).json({
        success: true,
        logo: result,
        logoData: result,
        ...result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/builder/uiux
   */
  async generateUiUx(req, res) {
    try {
      const { prompt, options = {} } = req.body || {};
      if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });
      const result = await imageService.generateUiUxProject(prompt, options);
      return res.status(200).json({
        success: true,
        uiux: result,
        uiuxData: result,
        ...result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/builder/providers
   */
  getProviders(req, res) {
    try {
      const providers = imageService.getAvailableProviders();
      return res.status(200).json({ success: true, providers });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/builder/bundle
   * Takes project object and returns a self-contained HTML document.
   */
  async bundle(req, res) {
    try {
      const { project } = req.body || {};
      if (!project) {
        return res.status(400).json({ success: false, error: 'Project data is required' });
      }

      const bundledHtml = builderService.bundleProjectDocument(project);
      return res.status(200).json({
        success: true,
        bundledHtml
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to bundle project' });
    }
  }
}

module.exports = new BuilderController();
