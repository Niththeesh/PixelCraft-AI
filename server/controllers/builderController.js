const builderService = require('../services/builderService');

class BuilderController {
  /**
   * POST /api/builder/detect
   * Checks if an incoming user message is a website or UI creation request.
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
      if (isExplicitExclusion && !p.includes('website') && !p.includes('landing page') && !p.includes('ui/ux') && !p.includes('dashboard')) {
        return res.status(200).json({ success: true, isDesignRequest: false, prompt });
      }

      // English creation triggers
      const creationActionRegex = /\b(create|build|make|design|generate|develop|redesign|revamp|code|craft|need|want|setup)\b/i;
      const webTargetRegex = /\b(website|web site|site|webpage|landing page|portfolio|dashboard|ecommerce|e-commerce|storefront|online store|app ui|ui\/ux|user interface|hero section|pricing table|pricing section|admin panel|saas page|web app|mockup)\b/i;
      const domainCompoundRegex = /\b(gym|fitness|workout|restaurant|cafe|bistro|portfolio|developer|saas|agency|ecommerce|store|shop|doctor|clinic|hotel|travel|real estate|crypto|finance|startup)\s+(website|web site|site|landing page|ui|page)\b/i;

      // Tamil & Tanglish creation triggers
      const tanglishRegex = /\b(oru|indha|andha|enaku|namaku)\b.*\b(website|design|page|ui|portfolio|store)\b/i;
      const tanglishActionRegex = /\b(website|landing page|design|hero|navbar|theme|portfolio|ui)\b.*\b(pannu|venum|mathu|kudu|thayaar|sey|mari)\b/i;
      const tanglishThemeRegex = /\b(theme\s*la|theme\s*il|oda)\b/i;

      // Refinement triggers
      const refinementRegex = /\b(only change|change|modify|update|improve|redesign|replace|make)\b.*\b(hero|navbar|section|colors?|theme|accent|font|button|pricing|header|footer|cards?|layout|bento)\b/i;
      const tanglishRefineRegex = /\b(mattum|touch panna|mathu|change pannu)\b/i;

      const isDesign = (creationActionRegex.test(p) && webTargetRegex.test(p)) ||
                       domainCompoundRegex.test(p) ||
                       tanglishRegex.test(p) ||
                       tanglishActionRegex.test(p) ||
                       (tanglishThemeRegex.test(p) && webTargetRegex.test(p)) ||
                       refinementRegex.test(p) ||
                       (tanglishRefineRegex.test(p) && (webTargetRegex.test(p) || /hero|navbar|section|color|theme/i.test(p)));

      return res.status(200).json({
        success: true,
        isDesignRequest: isDesign,
        prompt
      });
    } catch (err) {
      console.error('Builder detect error:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to analyze prompt intent' });
    }
  }

  /**
   * POST /api/builder/generate
   * Generates a complete standalone website / UI design project based on prompt.
   */
  async generate(req, res) {
    try {
      const { prompt, options } = req.body || {};
      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ success: false, error: 'Prompt is required to generate a design' });
      }

      const project = await builderService.generateProject(prompt.trim(), options || {});
      const bundledHtml = builderService.bundleProjectDocument(project);

      return res.status(200).json({
        success: true,
        project,
        bundledHtml
      });
    } catch (err) {
      console.error('Builder generate error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate website design'
      });
    }
  }

  /**
   * POST /api/builder/refine
   * Refines an existing project with natural language instructions.
   */
  async refine(req, res) {
    try {
      const { prompt, currentProject, targetSectionId } = req.body || {};
      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ success: false, error: 'Refinement instruction is required' });
      }
      if (!currentProject || !currentProject.html) {
        return res.status(400).json({ success: false, error: 'Current project state is required for refinement' });
      }

      const updatedProject = await builderService.refineProject(prompt.trim(), currentProject, targetSectionId || null);
      const bundledHtml = builderService.bundleProjectDocument(updatedProject);

      return res.status(200).json({
        success: true,
        project: updatedProject,
        bundledHtml
      });
    } catch (err) {
      console.error('Builder refine error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to refine website design'
      });
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
