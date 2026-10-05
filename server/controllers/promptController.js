const promptService = require('../services/promptService');

/**
 * Controller handling requests for curated AI prompt templates
 */
class PromptController {
  /**
   * GET /api/prompts/categories
   * Returns list of supported prompt categories
   */
  getCategories(req, res) {
    try {
      const categories = promptService.getCategories();
      return res.status(200).json({
        success: true,
        categories
      });
    } catch (err) {
      console.error('Error fetching prompt categories:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve prompt categories'
      });
    }
  }

  /**
   * GET /api/prompts
   * Returns prompts filtered by optional category and search query
   */
  getPrompts(req, res) {
    try {
      const { category, q } = req.query || {};
      const prompts = promptService.getAllPrompts(category, q);
      return res.status(200).json({
        success: true,
        total: prompts.length,
        prompts
      });
    } catch (err) {
      console.error('Error fetching prompts:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve prompt templates'
      });
    }
  }

  /**
   * GET /api/prompts/:id
   * Returns a specific prompt template by ID
   */
  getPromptById(req, res) {
    try {
      const { id } = req.params;
      const prompt = promptService.getPromptById(id);
      if (!prompt) {
        return res.status(404).json({
          success: false,
          error: 'Prompt template not found'
        });
      }
      return res.status(200).json({
        success: true,
        prompt
      });
    } catch (err) {
      console.error('Error fetching prompt by id:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve prompt template'
      });
    }
  }
}

module.exports = new PromptController();
