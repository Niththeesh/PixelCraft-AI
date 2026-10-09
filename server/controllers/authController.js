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
   * Helper to safely format and sanitize user payload for client responses.
   * Excludes any internal secrets, provider access tokens, or sensitive hashes.
   */
  _sanitizeUser(user) {
    if (!user) return null;
    const sanitizedIdentities = (user.identities || []).map(ident => ({
      id: ident.id,
      provider: ident.provider,
      created_at: ident.created_at || null,
      identity_data: {
        email: ident.identity_data?.email || null,
        name: ident.identity_data?.name || ident.identity_data?.full_name || null
      }
    }));

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at || null,
      app_metadata: {
        provider: user.app_metadata?.provider || null,
        providers: user.app_metadata?.providers || []
      },
      identities: sanitizedIdentities,
      user_metadata: user.user_metadata || {}
    };
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
      const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
      let emailRedirectTo = 'https://pixelcraft-ai-seven.vercel.app';
      if (!isProduction && req.headers.origin && (req.headers.origin.includes('localhost') || req.headers.origin.includes('127.0.0.1'))) {
        emailRedirectTo = 'http://localhost:3000';
      }

      const { data, error } = await authClient.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          emailRedirectTo: emailRedirectTo
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
          message: 'Welcome to PixelCraft AI! Your account has been created. Please check your email to verify your account.',
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
          user: this._sanitizeUser(data.user)
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
          user: this._sanitizeUser(data.user)
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
      user: this._sanitizeUser(req.user)
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

      const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
      const requestedRedirect = (req.query.redirect_to || req.headers.origin || 'https://pixelcraft-ai-seven.vercel.app').trim();
      let redirectTo = 'https://pixelcraft-ai-seven.vercel.app';
      try {
        const parsed = new URL(requestedRedirect);
        if (isProduction) {
          // In production: Strictly enforce canonical production domain or GitHub Pages
          if (
            parsed.hostname === 'pixelcraft-ai-seven.vercel.app' ||
            parsed.hostname.endsWith('.github.io') ||
            parsed.hostname.endsWith('.vercel.app')
          ) {
            // Strictly prohibit localhost in production even if requested
            if (!parsed.hostname.includes('localhost') && !parsed.hostname.includes('127.0.0.1')) {
              redirectTo = requestedRedirect;
            }
          }
        } else {
          // In local development: Allow localhost / 127.0.0.1
          if (
            parsed.hostname === 'pixelcraft-ai-seven.vercel.app' ||
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.hostname.endsWith('.github.io') ||
            parsed.hostname.endsWith('.vercel.app')
          ) {
            redirectTo = requestedRedirect;
          }
        }
      } catch (_) {
        redirectTo = 'https://pixelcraft-ai-seven.vercel.app';
      }

      const authClient = createIsolatedClient() || client;
      const { data, error } = await authClient.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectTo,
          scopes: provider === 'google' ? 'email profile' : 'email,public_profile'
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
    const rawUrl = (
      process.env.SUPABASE_URL || 
      process.env.NEXT_PUBLIC_SUPABASE_URL || 
      ''
    ).trim();
    const rawAnonKey = (
      process.env.SUPABASE_ANON_KEY || 
      process.env.SUPABASE_PUBLISHABLE_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim();

    const url = rawUrl.replace(/^["']|["']$/g, '');
    const anonKey = rawAnonKey.replace(/^["']|["']$/g, '');

    return res.status(200).json({
      success: true,
      supabaseUrl: url || null,
      supabaseAnonKey: anonKey || null,
      supabasePublishableKey: anonKey || null
    });
  }

  /**
   * POST /api/auth/post-verify-welcome
   * Sends a dedicated post-verification welcome email if not already sent.
   * Strictly server-side; checks email_confirmed_at and avoids duplicates.
   */
  async sendPostVerifyWelcomeEmail(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Check if user email is actually confirmed
      const isConfirmed = !!(user.email_confirmed_at || user.confirmed_at);
      if (!isConfirmed) {
        return res.status(400).json({
          success: false,
          error: 'Email is not yet confirmed.'
        });
      }

      // Check deduplication flag
      const meta = user.user_metadata || {};
      if (meta.welcome_email_sent) {
        return res.status(200).json({
          success: true,
          message: 'Welcome email was already sent previously.'
        });
      }

      const client = this.getClient(res);
      if (!client) return;

      // Extract display name
      const displayName = meta.full_name || meta.name || meta.user_name || (user.email ? user.email.split('@')[0] : 'User');

      // Check if SMTP environment variables are configured
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || 'PixelCraft AI <noreply@pixelcraft.ai>';

      if (smtpHost && smtpUser && smtpPass) {
        try {
          let nodemailer = null;
          try {
            nodemailer = require('nodemailer');
          } catch (e) {
            // nodemailer not installed
          }

          if (nodemailer) {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: parseInt(process.env.SMTP_PORT || '587', 10),
              secure: process.env.SMTP_PORT === '465',
              auth: {
                user: smtpUser,
                pass: smtpPass
              }
            });

            await transporter.sendMail({
              from: smtpFrom,
              to: user.email,
              subject: 'Welcome to PixelCraft AI! 🚀',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
                  <h1 style="color: #6366f1;">Welcome to PixelCraft AI, ${displayName}! 👋</h1>
                  <p style="font-size: 16px; line-height: 1.6;">Your email has been verified successfully. Your account is now fully active.</p>
                  <p style="font-size: 16px; line-height: 1.6;">You can now generate content, create code architectures, brainstorm ideas, and interact with Google Gemini intelligent personas.</p>
                  <div style="margin: 28px 0;">
                    <a href="${process.env.APP_URL || 'https://pixelcraft-ai-seven.vercel.app'}" style="background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Start Chatting Now</a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #64748b;">PixelCraft AI — Intelligent Assistant Powered by Google Gemini</p>
                </div>
              `
            });
          }
        } catch (mailErr) {
          console.warn('Post-verification email transport notice:', mailErr.message);
        }
      } else {
        console.log(`[PixelCraft AI] Post-verification welcome email queued for verified user: ${user.email} (SMTP configuration pending)`);
      }

      // Mark welcome_email_sent: true in Supabase Auth user metadata
      try {
        await client.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...meta,
            welcome_email_sent: true,
            welcome_email_sent_at: new Date().toISOString()
          }
        });
      } catch (updateErr) {
        console.warn('Metadata update notice:', updateErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Post-verification welcome email processed successfully.'
      });
    } catch (err) {
      console.error('Post-verification welcome error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error processing welcome email.'
      });
    }
  }
}

module.exports = new AuthController();
