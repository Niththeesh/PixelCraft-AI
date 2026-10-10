/**
 * PixelCraft AI - Production Client Configuration (config.js)
 *
 * INSTRUCTIONS:
 * 1. When running locally on http://localhost:3000, leave RENDER_BACKEND_URL as '' (empty).
 * 2. After deploying the Express backend to Render, set RENDER_BACKEND_URL to your
 *    live Render Web Service URL, e.g. 'https://pixelcraft-ai.onrender.com'
 *    then git add, git commit, git push — GitHub Actions will redeploy the site automatically.
 * 3. NEVER put GEMINI_API_KEY or SUPABASE_SECRET_KEY in this file!
 *    Those secrets live ONLY inside the Render dashboard → Environment Variables.
 */
window.PIXELCRAFT_CONFIG = {
  // ← Set your Render backend URL here once the service is deployed:
  RENDER_BACKEND_URL: ''
};

/**
 * Global Google Material Symbols Icon Component Helper
 * Generates consistent, accessible Material Symbols Rounded icon markup
 * Compatible with Vanilla JavaScript throughout PixelCraft AI
 */
window.PixelCraftIcons = {
  render(iconName, sizeClass = '', extraClass = '') {
    const size = sizeClass ? ` ${sizeClass}` : '';
    const extra = extraClass ? ` ${extraClass}` : '';
    return `<span class="material-symbols-rounded ui-icon${size}${extra}" aria-hidden="true">${iconName}</span>`;
  }
};
window.renderUiIcon = window.PixelCraftIcons.render;
