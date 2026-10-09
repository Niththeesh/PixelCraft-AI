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

      // Quick keyword + semantic evaluation
      const p = prompt.toLowerCase();
      const creationTerms = [
        'website', 'landing page', 'portfolio', 'dashboard', 'ecommerce', 'store',
        'gym website', 'restaurant website', 'app ui', 'create website', 'build website',
        'make website', 'design website', 'pannu', 'venum', 'mari design', 'hero section',
        'pricing table', 'admin panel', 'saas page'
      ];
      const isDesign = creationTerms.some(term => p.includes(term));

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
