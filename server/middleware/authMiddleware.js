const { getSupabaseClient } = require('../config/supabaseClient');

/**
 * Authentication Middleware for Supabase JWT verification.
 * Extracts and verifies the Bearer token against Supabase Auth.
 * Strictly guarantees that user_id is derived from the verified token,
 * preventing any client-side user_id spoofing.
 */

/**
 * Enforces authenticated session.
 * Rejects requests without a valid, unexpired Supabase JWT.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header. Bearer token required.'
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Empty token provided.'
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Authentication service unavailable: Supabase client not configured.'
      });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired session token.'
      });
    }

    // Attach authenticated user payload to request
    req.user = data.user;
    next();
  } catch (err) {
    console.error('requireAuth middleware error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication verification error.'
    });
  }
}

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, attaches req.user.
 * If no token is provided or token is invalid, sets req.user = null without failing.
 * Used for endpoints like /api/chat that support both authenticated persistence and unauthenticated tests.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      req.user = null;
      return next();
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      req.user = null;
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data && data.user) {
      req.user = data.user;
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    console.error('optionalAuth middleware error:', err.message);
    req.user = null;
    next();
  }
}

module.exports = {
  requireAuth,
  optionalAuth
};
