const { getSupabaseClient, createIsolatedClient } = require('../config/supabaseClient');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Controller handling user authentication flows via Supabase Auth
 */
class AuthController {
  /**
   * Helper to get initialized Supabase client
   */
  getClient(res) {
    const client = getSupabaseClient();
    if (!client) {
      res.status(503).json({
        success: false,
        error: 'Supabase service is not configured on the server.'
      });
      return null;
    }
    return client;
  }

  /**
   * POST /api/auth/signup
   * Registers a new user with Supabase Auth and returns an authenticated session.
   */
  async signUp(req, res) {
    try {
      const { email, password } = req.body || {};

      // Validate inputs
      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({
          success: false,
          error: 'A valid email address is required.'
        });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long.'
        });
      }

      const client = this.getClient(res);
      if (!client) return;

      const normalizedEmail = email.trim().toLowerCase();

      // Use isolated client so user session never overwrites the server's admin client
      const authClient = createIsolatedClient() || client;

      // Register user with Supabase Auth (respects Supabase Email Confirmation setting)
      const origin = req.headers.origin || 'https://pixelcraft-ai-seven.vercel.app';
      const { data, error } = await authClient.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          emailRedirectTo: origin
        }
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('already registered') || msg.includes('unique') || msg.includes('already exists') || msg.includes('user already registered')) {
          return res.status(409).json({
            success: false,
            error: 'An account with this email already exists. Please sign in instead.'
          });
        }
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
          return res.status(429).json({
            success: false,
            error: 'Too many verification emails sent. Please wait a few minutes before trying again.'
          });
        }
        if (msg.includes('weak') || msg.includes('password should be at least')) {
          return res.status(400).json({
            success: false,
            error: 'Password is too weak. Please use at least 6 characters with letters and numbers.'
          });
        }
        return res.status(400).json({
          success: false,
          error: error.message || 'Failed to create user account.'
        });
      }

      // If Supabase has email confirmation enabled, session is null until verified
      if (!data.session) {
        return res.status(201).json({
          success: true,
          needsEmailVerification: true,
          message: 'Account created. Please check your email and verify your account.',
          user: {
            id: data.user?.id,
            email: data.user?.email
          }
        });
      }

      // If email confirmation is disabled in Supabase, session is returned immediately
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        session: {
          access_token: data.session.access_token,
          expires_in: data.session.expires_in,
          user: {
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata || {}
          }
        }
      });
    } catch (err) {
      console.error('Sign up error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during registration.'
      });
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates user via Supabase Auth signInWithPassword and returns JWT session
   */
  async login(req, res) {
    try {
      const { email, password } = req.body || {};

      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Please enter your email address.'
        });
      }

      if (!password || typeof password !== 'string' || !password) {
        return res.status(400).json({
          success: false,
          error: 'Please enter your password.'
        });
      }

      const client = this.getClient(res);
      if (!client) return;

      const normalizedEmail = email.trim().toLowerCase();

      // Use isolated client so user session never overwrites the server's admin client
      const authClient = createIsolatedClient() || client;
      const { data, error } = await authClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (error || !data || !data.session) {
        const errMsg = (error?.message || '').toLowerCase();
        if (errMsg.includes('email not confirmed') || errMsg.includes('not confirmed')) {
          return res.status(403).json({
            success: false,
            needsEmailVerification: true,
            error: 'Your email address has not been verified yet. Please check your inbox to activate your account.'
          });
        }
        if (errMsg.includes('invalid login credentials') || errMsg.includes('invalid credentials')) {
          return res.status(401).json({
            success: false,
            error: 'Invalid email or password. Please verify your credentials and try again.'
          });
        }
        return res.status(401).json({
          success: false,
          error: error?.message || 'Invalid email or password.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        session: {
          access_token: data.session.access_token,
          expires_in: data.session.expires_in,
          user: {
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata || {}
          }
        }
      });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during authentication.'
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Handles user logout
   */
  async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  }

  /**
   * GET /api/auth/session
   * Validates and returns current authenticated session user
   * Protected by requireAuth middleware
   */
  async getSession(req, res) {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        user_metadata: req.user.user_metadata || {}
      }
    });
  }

  /**
   * GET /api/auth/oauth/:provider
   * Fallback server-side OAuth redirect URL generator
   */
  async getOAuthUrl(req, res) {
    try {
      const provider = (req.params.provider || '').toLowerCase().trim();
      if (!['google', 'facebook'].includes(provider)) {
        return res.status(400).json({
          success: false,
          error: 'Supported OAuth providers are "google" and "facebook".'
        });
      }

      const client = this.getClient(res);
      if (!client) return;

      const redirectTo = req.headers.origin || 'https://pixelcraft-ai-seven.vercel.app';
      const authClient = createIsolatedClient() || client;
      const { data, error } = await authClient.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectTo
        }
      });

      if (error || !data || !data.url) {
        return res.status(500).json({
          success: false,
          error: error?.message || `Failed to generate OAuth URL for ${provider}.`
        });
      }

      return res.status(200).json({
        success: true,
        provider,
        url: data.url
      });
    } catch (err) {
      console.error('OAuth URL generation error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error generating OAuth redirect.'
      });
    }
  }

  /**
   * GET /api/auth/config
   * Safely returns public configuration (URL and Publishable/Anon key if present).
   * Strictly server-side SUPABASE_SECRET_KEY is NEVER exposed.
   */
  async getConfig(req, res) {
    const rawUrl = (process.env.SUPABASE_URL || '').trim();
    const rawAnonKey = (
      process.env.SUPABASE_ANON_KEY || 
      process.env.SUPABASE_PUBLISHABLE_KEY || 
      ''
    ).trim();

    const url = rawUrl.replace(/^["']|["']$/g, '');
    const anonKey = rawAnonKey.replace(/^["']|["']$/g, '');

    return res.status(200).json({
      success: true,
      supabaseUrl: url || null,
      supabaseAnonKey: anonKey || null
    });
  }
}

module.exports = new AuthController();
