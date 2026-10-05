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

      // 1. Create user in Supabase Auth with auto-confirmed email
      const { data: createData, error: createError } = await client.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true
      });

      if (createError) {
        const msg = createError.message || '';
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('exists')) {
          return res.status(409).json({
            success: false,
            error: 'An account with this email already exists. Please log in.'
          });
        }
        return res.status(400).json({
          success: false,
          error: createError.message || 'Failed to create user account.'
        });
      }

      // 2. Automatically establish session via signInWithPassword on an isolated client
      const authClient = createIsolatedClient() || client;
      const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (loginError || !loginData || !loginData.session) {
        return res.status(201).json({
          success: true,
          message: 'Account created successfully. Please sign in.',
          user: {
            id: createData.user.id,
            email: createData.user.email
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        session: {
          access_token: loginData.session.access_token,
          expires_in: loginData.session.expires_in,
          user: {
            id: loginData.user.id,
            email: loginData.user.email
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
          error: 'Email is required.'
        });
      }

      if (!password || typeof password !== 'string' || !password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required.'
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
            email: data.user.email
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
        email: req.user.email
      }
    });
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
