/**
 * PixelCraft AI - Production Client Script (app.js)
 * Connects frontend UI to Express backend APIs & Supabase Auth:
 * - POST /api/auth/signup (User registration via Supabase Auth)
 * - POST /api/auth/login (User authentication via Supabase Auth)
 * - POST /api/auth/logout (Session termination)
 * - GET  /api/auth/session (Session validation)
 * - POST /api/chat (Google Gemini AI generation & user-scoped persistence)
 * - POST /api/conversations (Create conversation for authenticated user)
 * - GET  /api/conversations (List user's conversations)
 * - GET  /api/conversations/:id/messages (Load user's conversation history)
 * - DELETE /api/conversations/:id (Delete user's conversation)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Resolve API Base URL (empty for localhost, Render URL for GitHub Pages / external hosts)
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const backendUrl = (window.PIXELCRAFT_CONFIG && window.PIXELCRAFT_CONFIG.RENDER_BACKEND_URL)
    ? window.PIXELCRAFT_CONFIG.RENDER_BACKEND_URL.replace(/\/$/, '')
    : '';
  const API_BASE_URL = isLocal ? '' : backendUrl;

  // Transparent fetch interceptor for relative /api routes
  const nativeFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = `${API_BASE_URL}${input}`;
    }
    return nativeFetch.call(this, input, init);
  };

  // Application State
  const state = {
    authToken: localStorage.getItem('supabase_access_token') || null,
    authUser: null,
    authMode: 'login', // 'login' | 'signup'
    supabaseClient: null,
    conversations: [],
    currentConversationId: null,
    messages: [],
    isGenerating: false,
    isLoadingMessages: false,
    searchQuery: '',
    searchResults: null,
    isSearching: false,
    activePersona: localStorage.getItem('assistant_persona') || 'general',
    customInstructions: localStorage.getItem('assistant_custom_instructions') || '',
    prompts: [],
    activePromptCategory: 'all',
    promptSearchQuery: '',
    pendingDraftMessage: (function() { try { return sessionStorage.getItem('pixelcraft_pending_draft') || null; } catch(_) { return null; } })(),
    welcomeToastTimer: null,
    isInitializingAuth: false,
    isProcessingOAuthCallback: false
  };

  // Try to parse saved user object ONLY if authToken exists
  if (state.authToken) {
    try {
      const savedUser = localStorage.getItem('supabase_user');
      if (savedUser) {
        state.authUser = JSON.parse(savedUser);
      }
    } catch (e) {
      state.authUser = null;
    }
  } else {
    state.authUser = null;
  }

  // DOM Selectors
  const elements = {
    // Auth elements
    authView: document.getElementById('auth-view'),
    appContainer: document.getElementById('app-container'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    btnOAuthGoogle: document.getElementById('btn-oauth-google'),
    btnOAuthFacebook: document.getElementById('btn-oauth-facebook'),
    tabLogin: document.getElementById('tab-login'),
    tabSignup: document.getElementById('tab-signup'),
    authAlert: document.getElementById('auth-alert'),
    authNotice: document.getElementById('auth-notice'),
    authForm: document.getElementById('auth-form'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    authConfirmPassword: document.getElementById('auth-confirm-password'),
    confirmPasswordGroup: document.getElementById('confirm-password-group'),
    passwordHint: document.getElementById('password-hint'),
    btnTogglePassword: document.getElementById('btn-toggle-password'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    btnAuthText: document.getElementById('btn-auth-text'),
    btnAuthSpinner: document.getElementById('btn-auth-spinner'),
    authFooterPrompt: document.getElementById('auth-footer-prompt'),
    authSwitchLink: document.getElementById('auth-switch-link'),

    // Welcome Greeting Toast element
    welcomeToastBanner: document.getElementById('welcome-toast-banner'),
    welcomeToastText: document.getElementById('welcome-toast-text'),

    // User profile and account elements
    btnProfileTrigger: document.getElementById('btn-profile-trigger'),
    userAvatarWrap: document.getElementById('user-avatar-wrap'),
    userAvatar: document.getElementById('user-avatar'),
    userAvatarStatusDot: document.getElementById('user-avatar-status-dot'),
    userDisplayName: document.getElementById('user-display-name'),
    userDisplayEmail: document.getElementById('user-display-email'),
    userStatusText: document.getElementById('user-status-text'),
    profileChevron: document.getElementById('profile-chevron'),
    btnLogout: document.getElementById('btn-logout'),
    btnSidebarLogin: document.getElementById('btn-sidebar-login'),
    btnHeaderLogin: document.getElementById('btn-header-login'),
    btnCloseAuthView: document.getElementById('btn-close-auth-view'),

    // Profile Popover Menu elements
    profilePopoverMenu: document.getElementById('profile-popover-menu'),
    popoverAvatar: document.getElementById('popover-avatar'),
    popoverName: document.getElementById('popover-name'),
    popoverEmail: document.getElementById('popover-email'),
    menuItemProfile: document.getElementById('menu-item-profile'),
    menuItemSettings: document.getElementById('menu-item-settings'),
    menuItemConnectedAccounts: document.getElementById('menu-item-connected-accounts'),

    // Profile Modal elements
    modalUserProfile: document.getElementById('modal-user-profile'),
    btnCloseProfileModal: document.getElementById('btn-close-profile-modal'),
    btnDismissProfile: document.getElementById('btn-dismiss-profile'),
    btnEditProfile: document.getElementById('btn-edit-profile'),
    profileEditNotice: document.getElementById('profile-edit-feedback'),
    profileModalAvatar: document.getElementById('profile-modal-avatar'),
    profileModalHeroName: document.getElementById('profile-modal-hero-name'),
    profileModalHeroEmail: document.getElementById('profile-modal-hero-email'),
    profileModalBadge: document.getElementById('profile-modal-badge'),
    profileModalFullName: document.getElementById('profile-modal-full-name'),
    profileModalEmailVal: document.getElementById('profile-modal-email-val'),
    profileModalMemberSince: document.getElementById('profile-modal-member-since'),

    // Settings Modal elements
    modalUserSettings: document.getElementById('modal-user-settings'),
    btnCloseSettingsModal: document.getElementById('btn-close-settings-modal'),
    btnDismissSettings: document.getElementById('btn-dismiss-settings'),
    settingsTabBtns: document.querySelectorAll('.settings-tab-btn'),
    settingsTabContents: document.querySelectorAll('.settings-tab-content'),
    btnSettingsSignout: document.getElementById('btn-settings-signout'),
    badgeStatusGoogle: document.getElementById('badge-status-google'),
    badgeStatusFacebook: document.getElementById('badge-status-facebook'),
    badgeStatusEmail: document.getElementById('badge-status-email'),
    providerIdentGoogle: document.getElementById('provider-ident-google'),
    providerIdentFacebook: document.getElementById('provider-ident-facebook'),
    providerIdentEmail: document.getElementById('provider-ident-email'),
    themeOptionBtns: document.querySelectorAll('.theme-option-btn'),
    densityRadioInputs: document.querySelectorAll('input[name="ui-density"]'),
    accentSwatches: document.querySelectorAll('.accent-swatch'),

    // Authentication Gate Modal elements
    modalAuthGate: document.getElementById('modal-auth-gate'),
    btnCloseAuthGateModal: document.getElementById('btn-close-auth-gate-modal'),
    btnGateLogin: document.getElementById('btn-gate-login'),
    btnGateSignup: document.getElementById('btn-gate-signup'),

    // Chat Workspace elements
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    mobileToggle: document.getElementById('mobile-toggle'),
    btnCloseSidebar: document.getElementById('btn-close-sidebar'),
    btnNewChat: document.getElementById('btn-new-chat'),
    btnClearChat: document.getElementById('btn-clear-chat'),
    btnForkChat: document.getElementById('btn-fork-chat'),
    btnExportChat: document.getElementById('btn-export-chat'),
    exportMenu: document.getElementById('export-menu'),
    btnPersonaSelector: document.getElementById('btn-persona-selector'),
    personaMenu: document.getElementById('persona-menu'),
    currentPersonaLabel: document.getElementById('current-persona-label'),
    personaOptions: document.querySelectorAll('.persona-option[data-persona]'),
    btnCustomInstructionOpen: document.getElementById('btn-custom-instruction-open'),
    modalCustomInstructions: document.getElementById('modal-custom-instructions'),
    btnCloseCustomModal: document.getElementById('btn-close-custom-modal'),
    customInstructionInput: document.getElementById('custom-instruction-input'),
    customInstructionCharCount: document.getElementById('custom-instruction-char-count'),
    btnSaveCustomInstructions: document.getElementById('btn-save-custom-instructions'),
    btnClearCustomInstructions: document.getElementById('btn-clear-custom-instructions'),
    customInstructionPreview: document.getElementById('custom-instruction-preview'),
    currentChatTitle: document.getElementById('current-chat-title'),
    chatSearchInput: document.getElementById('chat-search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    chatList: document.getElementById('chat-list'),
    welcomeState: document.getElementById('welcome-state'),
    messagesContainer: document.getElementById('messages-container'),
    typingIndicator: document.getElementById('typing-indicator'),
    chatStream: document.getElementById('chat-stream'),
    inputBoxWrapper: document.getElementById('input-box-wrapper'),
    chatTextarea: document.getElementById('chat-textarea'),
    btnGuestGateTrigger: document.getElementById('btn-guest-gate-trigger'),
    btnSend: document.getElementById('btn-send'),
    suggestionCards: document.querySelectorAll('.suggestion-card'),

    // Conversation Analytics elements
    btnChatStats: document.getElementById('btn-chat-stats'),
    modalChatStats: document.getElementById('modal-chat-stats'),
    btnCloseStatsModal: document.getElementById('btn-close-stats-modal'),
    btnDismissStats: document.getElementById('btn-dismiss-stats'),
    btnCopyStats: document.getElementById('btn-copy-stats'),
    statsConvTitle: document.getElementById('stats-conv-title'),
    statTotalMessages: document.getElementById('stat-total-messages'),
    statMsgBreakdown: document.getElementById('stat-msg-breakdown'),
    statTotalTokens: document.getElementById('stat-total-tokens'),
    statTokenBreakdown: document.getElementById('stat-token-breakdown'),
    statTotalWords: document.getElementById('stat-total-words'),
    statWordBreakdown: document.getElementById('stat-word-breakdown'),
    statThreadDuration: document.getElementById('stat-thread-duration'),
    statDurationSublabel: document.getElementById('stat-duration-sublabel'),
    statsRatioLabels: document.getElementById('stats-ratio-labels'),
    statsBarUser: document.getElementById('stats-bar-user'),
    statsBarAi: document.getElementById('stats-bar-ai'),
    statAvgAiWords: document.getElementById('stat-avg-ai-words'),
    statTotalChars: document.getElementById('stat-total-chars'),
    statFirstMsgTime: document.getElementById('stat-first-msg-time'),
    statLastMsgTime: document.getElementById('stat-last-msg-time'),

    // AI Prompt Library elements
    btnPromptVault: document.getElementById('btn-prompt-vault'),
    modalPromptLibrary: document.getElementById('modal-prompt-library'),
    btnClosePromptModal: document.getElementById('btn-close-prompt-modal'),
    btnDismissPrompts: document.getElementById('btn-dismiss-prompts'),
    promptSearchInput: document.getElementById('prompt-search-input'),
    btnClearPromptSearch: document.getElementById('btn-clear-prompt-search'),
    promptCategoryPills: document.getElementById('prompt-category-pills'),
    promptCardsContainer: document.getElementById('prompt-cards-container'),
    promptCounterText: document.getElementById('prompt-counter-text')
  };

  // Initialize UI Application
  init();

  async function init() {
    setupAuthListeners();
    setupSidebarToggle();
    setupTextarea();
    setupMessaging();
    setupSuggestions();
    setupNewChat();
    setupSearch();
    setupExport();
    setupPersonaSelector();
    setupStatsModal();
    setupPromptLibrary();
    setupLogout();
    setupAccountExperience();
    initCustomizationPreferences();

    // 1. Detect OAuth callback parameters early before asynchronous steps
    const earlyCheck = parseUrlAuthParams();
    if (earlyCheck && earlyCheck.handled && earlyCheck.token) {
      state.isProcessingOAuthCallback = true;
    }

    // 2. Initialize public Supabase client in browser if anon key is available
    await initSupabaseBrowserClient();

    // 3. Check for OAuth callbacks, verification links, or existing session on startup
    await checkInitialSession(earlyCheck);
  }

  // ==========================================================================
  // Helper: Request Headers with Bearer Token
  // ==========================================================================
  function getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (state.authToken) {
      headers['Authorization'] = `Bearer ${state.authToken}`;
    }
    return headers;
  }

  // ==========================================================================
  // Helper: Extract Friendly Display Name & Account Metadata
  // ==========================================================================
  function getUserDisplayName(user) {
    if (!user) return 'User';
    const meta = user.user_metadata || {};
    if (meta.full_name && typeof meta.full_name === 'string' && meta.full_name.trim()) {
      return meta.full_name.trim();
    }
    if (meta.name && typeof meta.name === 'string' && meta.name.trim()) {
      return meta.name.trim();
    }
    if (meta.user_name && typeof meta.user_name === 'string' && meta.user_name.trim()) {
      return meta.user_name.trim();
    }
    if (user.email && typeof user.email === 'string') {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'User';
  }

  function getUserAvatarUrl(user) {
    if (!user) return null;
    const meta = user.user_metadata || {};
    if (meta.avatar_url && typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) {
      return meta.avatar_url.trim();
    }
    if (meta.picture && typeof meta.picture === 'string' && meta.picture.trim()) {
      return meta.picture.trim();
    }
    return null;
  }

  function getUserInitials(displayName) {
    if (!displayName || typeof displayName !== 'string') return 'U';
    const clean = displayName.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  }

  function setAvatarElement(targetElement, avatarUrl, initials) {
    if (!targetElement) return;
    targetElement.innerHTML = '';
    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = initials || 'Avatar';
      img.onerror = () => {
        targetElement.textContent = initials || 'U';
      };
      targetElement.appendChild(img);
    } else {
      targetElement.textContent = initials || 'U';
    }
  }

  function formatMemberSinceDate(dateString) {
    if (!dateString) return 'Active Member';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Active Member';
      return date.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return 'Active Member';
    }
  }

  /**
   * Displays the modern "Welcome, [User Name] 👋" greeting banner
   * Uses authenticated user metadata: full_name -> name -> user_name -> email prefix
   */
  function showWelcomeGreeting(user) {
    if (!user) return;
    const displayName = getUserDisplayName(user);
    const greetingText = `Welcome, ${displayName} 👋`;

    if (elements.welcomeToastText) {
      elements.welcomeToastText.textContent = greetingText;
    }
    if (elements.welcomeToastBanner) {
      elements.welcomeToastBanner.style.display = 'inline-flex';
      // Force reflow for CSS transition
      void elements.welcomeToastBanner.offsetWidth;
      elements.welcomeToastBanner.classList.add('show');

      if (state.welcomeToastTimer) clearTimeout(state.welcomeToastTimer);
      state.welcomeToastTimer = setTimeout(() => {
        if (elements.welcomeToastBanner) {
          elements.welcomeToastBanner.classList.remove('show');
          setTimeout(() => {
            if (elements.welcomeToastBanner && !elements.welcomeToastBanner.classList.contains('show')) {
              elements.welcomeToastBanner.style.display = 'none';
            }
          }, 400);
        }
      }, 4500);
    }
  }

  /**
   * Triggers the dedicated post-verification welcome email flow on the server.
   * Completely safe and asynchronous; verifies email_confirmed_at server-side.
   */
  async function triggerPostVerifyWelcome(token) {
    if (!token) return;
    try {
      await fetch('/api/auth/post-verify-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.warn('Post-verification welcome email notice:', e.message);
    }
  }

  /**
   * Restores any pending draft prompt message that the user typed while unauthenticated.
   */
  function restoreDraftMessage() {
    let draft = state.pendingDraftMessage;
    if (!draft) {
      try {
        draft = sessionStorage.getItem('pixelcraft_pending_draft');
      } catch (_) {}
    }

    if (draft && elements.chatTextarea) {
      elements.chatTextarea.value = draft;
      elements.chatTextarea.style.height = 'auto';
      elements.chatTextarea.style.height = Math.min(elements.chatTextarea.scrollHeight, 160) + 'px';
      if (elements.btnSend) {
        elements.btnSend.disabled = false;
      }
      elements.chatTextarea.focus();
    }
  }

  /**
   * Safe identity & provider resolution from authenticated Supabase user.
   * Excludes any tokens or secrets; strictly evaluates connection status and identifiers.
   */
  function getConnectedProviders(user) {
    const connected = {
      google: false,
      facebook: false,
      email: false
    };
    const identifiers = {
      google: null,
      facebook: null,
      email: null
    };

    if (!user) return { connected, identifiers };

    // 1. Inspect user.identities array (highest fidelity)
    if (Array.isArray(user.identities) && user.identities.length > 0) {
      user.identities.forEach(ident => {
        const prov = (ident.provider || '').toLowerCase().trim();
        if (prov === 'google') {
          connected.google = true;
          identifiers.google = ident.identity_data?.email || user.email || 'Connected Gmail';
        } else if (prov === 'facebook') {
          connected.facebook = true;
          identifiers.facebook = ident.identity_data?.name || 'Connected Facebook Account';
        } else if (prov === 'email') {
          connected.email = true;
          identifiers.email = ident.identity_data?.email || user.email;
        }
      });
    }

    // 2. Check app_metadata.providers
    const appProviders = user.app_metadata?.providers || [];
    if (Array.isArray(appProviders)) {
      appProviders.forEach(p => {
        const prov = (p || '').toLowerCase().trim();
        if (prov === 'google') {
          connected.google = true;
          if (!identifiers.google) identifiers.google = user.email || 'Connected Gmail';
        } else if (prov === 'facebook') {
          connected.facebook = true;
          if (!identifiers.facebook) identifiers.facebook = 'Connected';
        } else if (prov === 'email') {
          connected.email = true;
          if (!identifiers.email) identifiers.email = user.email;
        }
      });
    }

    // 3. Check primary provider in app_metadata
    const primaryProv = (user.app_metadata?.provider || '').toLowerCase().trim();
    if (primaryProv === 'google') {
      connected.google = true;
      if (!identifiers.google) identifiers.google = user.email;
    } else if (primaryProv === 'facebook') {
      connected.facebook = true;
      if (!identifiers.facebook) identifiers.facebook = 'Connected';
    } else if (primaryProv === 'email') {
      connected.email = true;
      if (!identifiers.email) identifiers.email = user.email;
    }

    // 4. Default: If user has email and no social provider marked it, email auth is active
    if (user.email && !connected.google && !connected.facebook) {
      connected.email = true;
      if (!identifiers.email) identifiers.email = user.email;
    }

    return { connected, identifiers };
  }

  // ==========================================================================
  // Helper: Centralized Authentication State Synchronizer
  // ==========================================================================
  function setAuthenticatedSession(session, userFallback = null, tokenFallback = null) {
    const token = session?.access_token || tokenFallback || state.authToken;
    const user = session?.user || userFallback || state.authUser;

    if (token) {
      state.authToken = token;
      try {
        localStorage.setItem('supabase_access_token', token);
      } catch (_) {}
    }

    if (user) {
      state.authUser = user;
      try {
        localStorage.setItem('supabase_user', JSON.stringify(user));
      } catch (_) {}
    }

    return { token: state.authToken, user: state.authUser };
  }

  function clearAuthenticatedSession() {
    state.authToken = null;
    state.authUser = null;
    try {
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase_user');
    } catch (_) {}
  }

  // ==========================================================================
  // Helper: Initialize Browser Supabase Client (Public Anon / Publishable Key Only)
  // ==========================================================================
  let authListenerAttached = false;

  async function initSupabaseBrowserClient() {
    try {
      let supabaseUrl = null;
      let supabaseKey = null;

      try {
        const res = await fetch('/api/auth/config');
        if (res.ok) {
          const data = await res.json();
          if (data.supabaseUrl) supabaseUrl = data.supabaseUrl;
          if (data.supabasePublishableKey || data.supabaseAnonKey) {
            supabaseKey = data.supabasePublishableKey || data.supabaseAnonKey;
          }
        }
      } catch (e) {
        // Config fetch notice
      }

      // Initialize ONLY when both supabaseUrl and a valid public anon key exist
      // NEVER use dummy or fake placeholder keys
      if (supabaseUrl && supabaseKey && window.supabase) {
        state.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });

        // Register single auth state change listener
        setupSupabaseAuthListener();
      } else {
        state.supabaseClient = null;
      }
    } catch (e) {
      state.supabaseClient = null;
    }
  }

  function setupSupabaseAuthListener() {
    if (!state.supabaseClient || !state.supabaseClient.auth || authListenerAttached) return;
    authListenerAttached = true;

    state.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      // Do not allow background auth events to race or clobber active initialization
      if (state.isProcessingOAuthCallback || state.isInitializingAuth) return;

      if (session && session.access_token) {
        setAuthenticatedSession(session, session.user, session.access_token);
        renderAuthenticatedState();

        if (event === 'SIGNED_IN') {
          showWelcomeGreeting(session.user);
          restoreDraftMessage();
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuthenticatedSession();
        renderGuestState();
      }
      // CRITICAL: Do NOT wipe tokens on INITIAL_SESSION when session is null.
    });
  }

  // ==========================================================================
  // Helper: Decode JWT Payload Client-Side (Fallback for metadata extraction)
  // ==========================================================================
  function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonStr);
      if (parsed && (parsed.sub || parsed.email)) {
        return {
          id: parsed.sub,
          email: parsed.email || '',
          user_metadata: parsed.user_metadata || {},
          app_metadata: parsed.app_metadata || {}
        };
      }
    } catch (_) {}
    return null;
  }

  // ==========================================================================
  // Helper: Parse URL OAuth & Verification Parameters
  // ==========================================================================
  function parseUrlAuthParams() {
    const rawHash = (window.location.hash || '').replace(/^[#\/?]+/, '');
    const rawSearch = (window.location.search || '').replace(/^[?]+/, '');
    const hashParams = new URLSearchParams(rawHash);
    const searchParams = new URLSearchParams(rawSearch);

    const getParam = (key) => hashParams.get(key) || searchParams.get(key);

    // 1. Check for Auth Errors (Expired links, OAuth cancellation, access denied)
    const error = getParam('error');
    const errorCode = getParam('error_code');
    const errorDescription = getParam('error_description');

    if (error || errorCode || errorDescription) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (_) {}

      const errLower = (errorDescription || error || '').toLowerCase();
      if (errorCode === 'otp_expired' || errLower.includes('expired') || errLower.includes('otp')) {
        showAuthAlert('The verification link has expired or has already been used. Please sign in or request a new link.', 'error');
        showAuthView();
        return { handled: true, error: true };
      }
      if (error === 'access_denied' || errLower.includes('cancel')) {
        showAuthAlert('Sign-in was cancelled or access was denied. Please try again.', 'error');
        showAuthView();
        return { handled: true, error: true };
      }

      showAuthAlert(decodeURIComponent(errorDescription || error || 'Authentication could not be completed. Please try again.'), 'error');
      showAuthView();
      return { handled: true, error: true };
    }

    // 2. Check for Auth Tokens (Successful OAuth callback or Email verification link)
    const accessToken = getParam('access_token');
    const refreshToken = getParam('refresh_token');
    const type = getParam('type'); // 'signup' | 'recovery' | 'invite' | 'bearer'

    if (accessToken) {
      // Return captured tokens WITHOUT removing URL hash yet.
      // Cleanup happens strictly after session is safely restored and persisted.
      return { handled: true, token: accessToken, refreshToken, type };
    }

    return { handled: false };
  }

  // ==========================================================================
  // 1. Session Detection and Verification & Auth Gate
  // ==========================================================================
  async function checkInitialSession(preParsedCheck = null) {
    state.isInitializingAuth = true;

    // 1. Detect OAuth callback
    const urlCheck = preParsedCheck || parseUrlAuthParams();
    const isOAuthCallback = Boolean(urlCheck && urlCheck.handled && urlCheck.token);
    if (isOAuthCallback) {
      state.isProcessingOAuthCallback = true;
    }

    // If OAuth error was already handled and displayed
    if (urlCheck && urlCheck.error) {
      state.isProcessingOAuthCallback = false;
      state.isInitializingAuth = false;
      return;
    }

    let session = null;

    // 2 & 3. Capture callback parameters & Establish/restore Supabase session
    if (state.supabaseClient && state.supabaseClient.auth) {
      if (isOAuthCallback) {
        try {
          const { data: setRes } = await state.supabaseClient.auth.setSession({
            access_token: urlCheck.token,
            refresh_token: urlCheck.refreshToken || urlCheck.token
          });
          if (setRes && setRes.session) {
            session = setRes.session;
          }
        } catch (_) {}
      }

      // Explicitly verify getSession() as requested:
      try {
        const { data: getRes } = await state.supabaseClient.auth.getSession();
        if (getRes && getRes.session) {
          session = getRes.session;
        }
      } catch (_) {}
    }

    // 4. Confirm authenticated user/session
    // If client session is not present but OAuth token exists in callback:
    if ((!session || !session.access_token) && isOAuthCallback) {
      try {
        const res = await fetch('/api/auth/session', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${urlCheck.token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            session = {
              access_token: urlCheck.token,
              refresh_token: urlCheck.refreshToken || urlCheck.token,
              user: data.user
            };
          }
        }
      } catch (_) {}

      // Fallback: decode JWT payload if backend fetch had temporary glitch
      if (!session) {
        const decodedUser = decodeJwtPayload(urlCheck.token);
        if (decodedUser) {
          session = {
            access_token: urlCheck.token,
            refresh_token: urlCheck.refreshToken || urlCheck.token,
            user: decodedUser
          };
        }
      }

      if (urlCheck.type === 'signup') {
        showAuthAlert('Email verified successfully! Welcome to PixelCraft AI.', 'success');
        triggerPostVerifyWelcome(urlCheck.token);
      }
    }

    // Existing session restore from localStorage (for normal page reloads)
    if (!session && !isOAuthCallback) {
      const storedToken = state.authToken || localStorage.getItem('supabase_access_token');
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/session', {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              session = {
                access_token: storedToken,
                user: data.user
              };
            }
          } else if (res.status === 401) {
            clearAuthenticatedSession();
          }
        } catch (_) {
          if (state.authToken) {
            session = {
              access_token: state.authToken,
              user: state.authUser
            };
          }
        }
      }
    }

    // 5 & 6. Synchronize application state & Persist required token/session state
    if (session && session.access_token) {
      setAuthenticatedSession(session, session.user, session.access_token);

      // 7. Clean URL — ONLY AFTER session/token has been captured, verified, and persisted!
      if (isOAuthCallback || (window.location.hash && window.location.hash.includes('access_token'))) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
      }

      // 8. Render authenticated state
      hideAuthGateModal();
      renderAuthenticatedState();

      if (isOAuthCallback) {
        showWelcomeGreeting(state.authUser);
        restoreDraftMessage();
      }
    } else {
      // 7. Clean URL if leftover hash exists
      if (window.location.hash && window.location.hash.includes('access_token')) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
      }

      // Guest state
      clearAuthenticatedSession();
      renderGuestState();
    }

    state.isProcessingOAuthCallback = false;
    state.isInitializingAuth = false;
  }

  function renderAuthenticatedState() {
    hideAuthView();
    if (elements.appContainer) {
      elements.appContainer.classList.remove('hidden');
    }
    renderUserProfile();
    loadConversations();
    restoreDraftMessage();
  }

  function showAuthGateModal(message = 'Sign in or create an account to continue.') {
    showAuthView(message);
  }

  function hideAuthGateModal() {
    hideAuthView();
  }

  /**
   * Guard for protected actions:
   * Returns true if authenticated; if unauthenticated, shows the Auth Gate modal and returns false.
   */
  function requireUserAuth(actionDescription = 'use PixelCraft AI') {
    const token = state.authToken || localStorage.getItem('supabase_access_token');
    if (token) {
      return true;
    }
    showAuthView('Sign in or create an account to continue.');
    return false;
  }

  function showAuthView(alertMessage = null, initialMode = null) {
    if (initialMode) {
      switchAuthMode(initialMode);
    }
    if (elements.authView) elements.authView.classList.add('active');

    if (alertMessage) {
      showAuthAlert(alertMessage, 'info');
    } else {
      hideAuthAlert();
    }
  }

  function hideAuthView() {
    if (elements.authView) {
      elements.authView.classList.remove('active');
    }
    hideAuthAlert();
    if (elements.chatTextarea && state.pendingDraftMessage && !elements.chatTextarea.value) {
      elements.chatTextarea.value = state.pendingDraftMessage;
    }
  }

  function showChatWorkspace() {
    hideAuthView();
    if (elements.appContainer) elements.appContainer.classList.remove('hidden');

    const token = state.authToken || localStorage.getItem('supabase_access_token');
    if (token) {
      renderUserProfile();
    } else {
      renderGuestState();
    }
  }

  function renderUserProfile() {
    const token = state.authToken || localStorage.getItem('supabase_access_token');
    if (!token && !state.authUser) {
      renderGuestState();
      return;
    }

    if (elements.appContainer) {
      elements.appContainer.classList.remove('guest-mode');
    }

    if (elements.chatTextarea) {
      elements.chatTextarea.readOnly = false;
      elements.chatTextarea.placeholder = 'Ask PixelCraft AI anything...';
    }

    const displayName = getUserDisplayName(state.authUser);
    const email = state.authUser?.email || `${displayName.toLowerCase()}@pixelcraft.ai`;
    const avatarUrl = getUserAvatarUrl(state.authUser);
    const initials = getUserInitials(displayName);

    // Update bottom-left profile card trigger
    if (elements.userDisplayName) {
      elements.userDisplayName.textContent = displayName;
      elements.userDisplayName.title = displayName;
    }

    if (elements.userDisplayEmail) {
      elements.userDisplayEmail.textContent = email;
      elements.userDisplayEmail.title = email;
    }

    if (elements.userAvatar) {
      setAvatarElement(elements.userAvatar, avatarUrl, initials);
    }

    if (elements.userAvatarStatusDot) {
      elements.userAvatarStatusDot.className = 'avatar-status-dot online';
      elements.userAvatarStatusDot.title = 'Active';
    }

    if (elements.userStatusText) {
      elements.userStatusText.textContent = '● Authenticated';
      elements.userStatusText.style.color = 'var(--accent-emerald)';
    }

    // Update Popover user header
    if (elements.popoverName) {
      elements.popoverName.textContent = displayName;
    }
    if (elements.popoverEmail) {
      elements.popoverEmail.textContent = email;
    }
    if (elements.popoverAvatar) {
      setAvatarElement(elements.popoverAvatar, avatarUrl, initials);
    }

    if (elements.btnSidebarLogin) {
      elements.btnSidebarLogin.style.display = 'none';
    }
    if (elements.btnProfileTrigger) {
      elements.btnProfileTrigger.style.display = 'flex';
    }
    if (elements.btnHeaderLogin) {
      elements.btnHeaderLogin.style.display = 'none';
    }
    if (elements.btnLogout) {
      elements.btnLogout.style.display = 'flex';
    }

    // Refresh Connected Accounts UI in settings modal
    updateConnectedAccountsUI();
  }

  function renderGuestState() {
    if (elements.appContainer) {
      elements.appContainer.classList.add('guest-mode');
    }

    if (elements.chatTextarea) {
      elements.chatTextarea.readOnly = false;
      elements.chatTextarea.disabled = false;
      elements.chatTextarea.placeholder = 'Ask PixelCraft AI anything...';
      const hasContent = elements.chatTextarea.value.trim().length > 0;
      if (elements.btnSend) {
        elements.btnSend.disabled = !hasContent;
      }
    }

    if (elements.userDisplayName) {
      elements.userDisplayName.textContent = 'Guest Visitor';
      elements.userDisplayName.title = 'Guest Visitor';
    }

    if (elements.userDisplayEmail) {
      elements.userDisplayEmail.textContent = 'Sign in to access chats';
      elements.userDisplayEmail.title = 'Sign in to access chats';
    }

    if (elements.userAvatar) {
      elements.userAvatar.innerHTML = '👤';
    }

    if (elements.userAvatarStatusDot) {
      elements.userAvatarStatusDot.className = 'avatar-status-dot offline';
      elements.userAvatarStatusDot.title = 'Not signed in';
    }

    if (elements.userStatusText) {
      elements.userStatusText.textContent = '○ Not Signed In';
      elements.userStatusText.style.color = 'var(--text-muted)';
    }

    if (elements.btnLogout) {
      elements.btnLogout.style.display = 'none';
    }
    if (elements.btnProfileTrigger) {
      elements.btnProfileTrigger.style.display = 'flex';
    }
    if (elements.btnSidebarLogin) {
      elements.btnSidebarLogin.style.display = 'inline-flex';
    }
    if (elements.btnHeaderLogin) {
      elements.btnHeaderLogin.style.display = 'inline-flex';
    }

    hideProfilePopover();

    if (elements.chatList) {
      elements.chatList.innerHTML = `
        <li class="chat-list-empty" style="text-align: center; padding: 1.5rem 1rem; color: var(--text-muted); font-size: 0.82rem;">
          <div style="font-size: 1.4rem; margin-bottom: 0.4rem;">🔒</div>
          <p style="margin-bottom: 0.6rem; line-height: 1.4;">Sign in to save and access your conversations.</p>
          <button type="button" class="btn-sidebar-login" style="margin: 0 auto; display: inline-flex;" onclick="document.getElementById('btn-sidebar-login').click();">Sign In</button>
        </li>
      `;
    }
  }

  // ==========================================================================
  // 2. Authentication UI & Handlers
  // ==========================================================================
  function setupAuthListeners() {
    // Mode Switch: Login vs Signup
    if (elements.tabLogin) {
      elements.tabLogin.addEventListener('click', () => switchAuthMode('login'));
    }
    if (elements.tabSignup) {
      elements.tabSignup.addEventListener('click', () => switchAuthMode('signup'));
    }
    if (elements.authSwitchLink) {
      elements.authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthMode(state.authMode === 'login' ? 'signup' : 'login');
      });
    }

    // Continue with Google OAuth Button
    if (elements.btnOAuthGoogle) {
      elements.btnOAuthGoogle.addEventListener('click', () => {
        handleOAuthSignIn('google');
      });
    }

    // Continue with Facebook OAuth Button
    if (elements.btnOAuthFacebook) {
      elements.btnOAuthFacebook.addEventListener('click', () => {
        handleOAuthSignIn('facebook');
      });
    }

    // Toggle Password Visibility
    if (elements.btnTogglePassword) {
      elements.btnTogglePassword.addEventListener('click', () => {
        const isPassword = elements.authPassword.type === 'password';
        elements.authPassword.type = isPassword ? 'text' : 'password';
        if (elements.authConfirmPassword) {
          elements.authConfirmPassword.type = isPassword ? 'text' : 'password';
        }
        elements.btnTogglePassword.textContent = isPassword ? '🔒' : '👁️';
      });
    }

    // Auth Form Submission
    if (elements.authForm) {
      elements.authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Close Auth View (Return to Homepage)
    if (elements.btnCloseAuthView) {
      elements.btnCloseAuthView.addEventListener('click', () => {
        hideAuthView();
      });
    }

    // Dismiss when clicking directly on auth-view overlay backdrop
    if (elements.authView) {
      elements.authView.addEventListener('click', (e) => {
        if (e.target === elements.authView) {
          hideAuthView();
        }
      });
    }

    // Sidebar & Header Guest Login Buttons
    if (elements.btnSidebarLogin) {
      elements.btnSidebarLogin.addEventListener('click', () => {
        switchAuthMode('login');
        showAuthView();
      });
    }
    if (elements.btnHeaderLogin) {
      elements.btnHeaderLogin.addEventListener('click', () => {
        switchAuthMode('login');
        showAuthView();
      });
    }

    // Auth Gate Modal Actions
    if (elements.btnGateLogin) {
      elements.btnGateLogin.addEventListener('click', () => {
        hideAuthGateModal();
        switchAuthMode('login');
        showAuthView();
      });
    }
    if (elements.btnGateSignup) {
      elements.btnGateSignup.addEventListener('click', () => {
        hideAuthGateModal();
        switchAuthMode('signup');
        showAuthView();
      });
    }
    if (elements.btnCloseAuthGateModal) {
      elements.btnCloseAuthGateModal.addEventListener('click', () => {
        hideAuthGateModal();
      });
    }
    if (elements.modalAuthGate) {
      elements.modalAuthGate.addEventListener('click', (e) => {
        if (e.target === elements.modalAuthGate) {
          hideAuthGateModal();
        }
      });
    }
  }

  /**
   * Initiates Google or Facebook OAuth with Supabase Auth
   * Uses client-side browser SDK with public anon key first; falls back to server redirect
   */
  async function handleOAuthSignIn(provider) {
    hideAuthAlert();
    setAuthLoading(true);

    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';

    // Preserve any draft text typed into the textarea across OAuth redirects
    const currentInput = elements.chatTextarea ? elements.chatTextarea.value.trim() : '';
    if (currentInput) {
      state.pendingDraftMessage = currentInput;
      try {
        sessionStorage.setItem('pixelcraft_pending_draft', currentInput);
      } catch (_) {}
    }

    try {
      const origin = window.location.origin;

      // Primary Flow: Direct Browser Supabase OAuth (Client-Side with Public Anon Key)
      if (state.supabaseClient) {
        const { data, error } = await state.supabaseClient.auth.signInWithOAuth({
          provider: provider,
          options: {
            redirectTo: origin
          }
        });

        if (error) {
          const errMsg = (error.message || '').toLowerCase();
          if (errMsg.includes('not enabled') || errMsg.includes('unsupported provider')) {
            showAuthAlert(`${providerLabel} sign-in is not yet enabled in your Supabase Dashboard. Please enable the ${providerLabel} provider in Authentication → Providers.`, 'error');
          } else {
            showAuthAlert(`Unable to sign in with ${providerLabel}: ${error.message}`, 'error');
          }
          setAuthLoading(false);
          return;
        }

        // Browser automatically redirects to provider authorization URL
        return;
      }

      // Fallback Flow: Server-Assisted OAuth Redirect URL Generator
      const response = await fetch(`/api/auth/oauth/${provider}`);
      const result = await response.json();

      if (response.ok && result.success && result.url) {
        window.location.href = result.url;
        return;
      }

      const errMsg = (result.error || '').toLowerCase();
      if (errMsg.includes('not enabled') || errMsg.includes('unsupported provider')) {
        showAuthAlert(`${providerLabel} sign-in is not yet enabled in the Supabase Dashboard. Please sign in with email or enable ${providerLabel} in Supabase settings.`, 'error');
      } else {
        showAuthAlert(result.error || `Unable to start ${providerLabel} login. Please try again.`, 'error');
      }
    } catch (err) {
      console.error(`OAuth ${provider} error:`, err);
      showAuthAlert(`Network error connecting to ${providerLabel}. Please check your connection and try again.`, 'error');
    } finally {
      setAuthLoading(false);
    }
  }

  function switchAuthMode(mode) {
    state.authMode = mode;
    hideAuthAlert();

    if (mode === 'signup') {
      elements.tabSignup.classList.add('active');
      elements.tabLogin.classList.remove('active');
      elements.tabSignup.setAttribute('aria-selected', 'true');
      elements.tabLogin.setAttribute('aria-selected', 'false');

      elements.authTitle.textContent = 'Create an account';
      elements.authSubtitle.textContent = 'Sign up to personalize and persist your conversations';
      elements.confirmPasswordGroup.style.display = 'flex';
      elements.passwordHint.style.display = 'block';
      elements.btnAuthText.textContent = 'Sign Up';

      elements.authFooterPrompt.innerHTML = `
        Already have an account? <button type="button" class="auth-link" id="auth-switch-link">Sign In</button>
      `;
    } else {
      elements.tabLogin.classList.add('active');
      elements.tabSignup.classList.remove('active');
      elements.tabLogin.setAttribute('aria-selected', 'true');
      elements.tabSignup.setAttribute('aria-selected', 'false');

      elements.authTitle.textContent = 'Welcome back';
      elements.authSubtitle.textContent = 'Sign in to access your personal AI assistant';
      elements.confirmPasswordGroup.style.display = 'none';
      elements.passwordHint.style.display = 'none';
      elements.btnAuthText.textContent = 'Sign In';

      elements.authFooterPrompt.innerHTML = `
        Don't have an account? <button type="button" class="auth-link" id="auth-switch-link">Sign Up</button>
      `;
    }

    // Re-bind footer switch link
    const newSwitchLink = document.getElementById('auth-switch-link');
    if (newSwitchLink) {
      newSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthMode(state.authMode === 'login' ? 'signup' : 'login');
      });
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    hideAuthAlert();

    const email = (elements.authEmail.value || '').trim();
    const password = elements.authPassword.value || '';
    const confirmPassword = elements.authConfirmPassword ? elements.authConfirmPassword.value || '' : '';
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side input validations
    if (!email) {
      showAuthAlert('Please enter your email address.', 'error');
      elements.authEmail.focus();
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      showAuthAlert('Please enter a valid email address (e.g., name@domain.com).', 'error');
      elements.authEmail.focus();
      return;
    }

    if (!password) {
      showAuthAlert('Please enter your password.', 'error');
      elements.authPassword.focus();
      return;
    }

    if (password.length < 6) {
      showAuthAlert('Password must be at least 6 characters long.', 'error');
      elements.authPassword.focus();
      return;
    }

    if (state.authMode === 'signup' && password !== confirmPassword) {
      showAuthAlert('Passwords do not match. Please verify your password.', 'error');
      elements.authConfirmPassword.focus();
      return;
    }

    // Indicate loading
    setAuthLoading(true);

    try {
      const endpoint = state.authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Case A: Email verification required
        if (data.needsEmailVerification) {
          showAuthAlert(data.message || 'Welcome to PixelCraft AI! Your account has been created. Please check your email to verify your account.', 'info');
          elements.authPassword.value = '';
          if (elements.authConfirmPassword) elements.authConfirmPassword.value = '';
          switchAuthMode('login');
          return;
        }

        // Case B: Direct active session (Login or unconfirmed signup)
        if (data.session && data.session.access_token) {
          // Sync into Supabase browser client if configured
          if (state.supabaseClient && state.supabaseClient.auth) {
            try {
              await state.supabaseClient.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token || data.session.access_token
              });
            } catch (_) {}
          }

          setAuthenticatedSession(data.session, data.session.user, data.session.access_token);

          // Clear auth inputs
          elements.authPassword.value = '';
          if (elements.authConfirmPassword) elements.authConfirmPassword.value = '';

          // Transition to Chat Workspace
          renderAuthenticatedState();
          showWelcomeGreeting(state.authUser);
          restoreDraftMessage();
        } else if (data.user) {
          showAuthAlert(data.message || 'Registration successful! Please sign in.', 'success');
          switchAuthMode('login');
        }
      } else {
        // Handle error responses with explicit friendly messages
        const errorMsg = data.error || (state.authMode === 'signup' ? 'Failed to create account.' : 'Invalid credentials.');
        showAuthAlert(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Auth request failed:', err);
      showAuthAlert('Network error connecting to authentication server. Please try again.', 'error');
    } finally {
      setAuthLoading(false);
    }
  }

  function setAuthLoading(loading) {
    if (elements.btnAuthSubmit) {
      elements.btnAuthSubmit.disabled = loading;
    }
    if (elements.btnOAuthGoogle) {
      elements.btnOAuthGoogle.disabled = loading;
    }
    if (elements.btnOAuthFacebook) {
      elements.btnOAuthFacebook.disabled = loading;
    }
    if (elements.btnAuthText) {
      elements.btnAuthText.style.display = loading ? 'none' : 'inline';
    }
    if (elements.btnAuthSpinner) {
      elements.btnAuthSpinner.style.display = loading ? 'inline' : 'none';
    }
  }

  function showAuthAlert(msg, type = 'error') {
    if (!elements.authAlert) return;
    elements.authAlert.className = `auth-alert ${type}`;
    elements.authAlert.textContent = msg;
    elements.authAlert.style.display = 'block';
  }

  function hideAuthAlert() {
    if (!elements.authAlert) return;
    elements.authAlert.style.display = 'none';
    elements.authAlert.textContent = '';
  }

  // ==========================================================================
  // 3. Logout
  // ==========================================================================
  function setupLogout() {
    if (elements.btnLogout) {
      elements.btnLogout.addEventListener('click', () => {
        hideProfilePopover();
        handleLogout();
      });
    }
  }

  async function handleLogout(message = null) {
    const token = state.authToken;

    hideProfilePopover();
    closeProfileModal();
    closeSettingsModal();

    // Reset local state
    clearAuthenticatedSession();
    state.conversations = [];
    state.currentConversationId = null;
    state.messages = [];

    // Sign out from browser Supabase client if available
    try {
      if (state.supabaseClient && state.supabaseClient.auth) {
        await state.supabaseClient.auth.signOut();
      }
    } catch (e) {
      // Ignore
    }

    // Notify backend if token existed
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        // Ignore network failure on logout
      }
    }

    // Reset chat workspace UI
    if (elements.chatList) elements.chatList.innerHTML = '';
    if (elements.messagesContainer) elements.messagesContainer.innerHTML = '';
    if (elements.currentChatTitle) elements.currentChatTitle.textContent = 'AI Assistant Workspace';
    if (elements.welcomeState) elements.welcomeState.style.display = 'flex';

    // Show Workspace in Guest state (keeps public homepage accessible)
    showChatWorkspace();
    renderGuestState();

    if (message) {
      showAuthView(message);
    }
  }

  // ==========================================================================
  // 4. User Account, Profile & Settings Experience
  // ==========================================================================
  function setupAccountExperience() {
    // 1. Profile Trigger in sidebar footer
    if (elements.btnProfileTrigger) {
      elements.btnProfileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!state.authUser) {
          showAuthGateModal();
          return;
        }
        toggleProfilePopover();
      });
    }

    // 2. Profile Popover Menu items
    if (elements.menuItemProfile) {
      elements.menuItemProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        openProfileModal();
      });
    }

    if (elements.menuItemSettings) {
      elements.menuItemSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        openSettingsModal('account');
      });
    }

    if (elements.menuItemConnectedAccounts) {
      elements.menuItemConnectedAccounts.addEventListener('click', (e) => {
        e.stopPropagation();
        openSettingsModal('account');
      });
    }

    // 3. Document click-outside listener
    document.addEventListener('click', (e) => {
      if (elements.profilePopoverMenu && 
          elements.profilePopoverMenu.style.display === 'flex' &&
          !elements.profilePopoverMenu.contains(e.target) && 
          elements.btnProfileTrigger && 
          !elements.btnProfileTrigger.contains(e.target)) {
        hideProfilePopover();
      }
    });

    // 4. Keyboard accessibility: Escape key closes popover & modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideAuthView();
        hideProfilePopover();
        closeProfileModal();
        closeSettingsModal();
        hideAuthGateModal();
      }
    });

    // 5. Profile Modal controls
    if (elements.btnCloseProfileModal) {
      elements.btnCloseProfileModal.addEventListener('click', closeProfileModal);
    }
    if (elements.btnDismissProfile) {
      elements.btnDismissProfile.addEventListener('click', closeProfileModal);
    }
    if (elements.modalUserProfile) {
      elements.modalUserProfile.addEventListener('click', (e) => {
        if (e.target === elements.modalUserProfile) closeProfileModal();
      });
    }

    // 6. Edit Profile Action
    if (elements.btnEditProfile) {
      elements.btnEditProfile.addEventListener('click', () => {
        if (elements.profileEditNotice) {
          elements.profileEditNotice.textContent = 'Account profile identity is managed securely via your authenticated Supabase credentials. Display name and avatar sync automatically on login.';
          elements.profileEditNotice.style.display = 'block';
        }
      });
    }

    // 7. Settings Modal controls & tab navigation
    if (elements.btnCloseSettingsModal) {
      elements.btnCloseSettingsModal.addEventListener('click', closeSettingsModal);
    }
    if (elements.btnDismissSettings) {
      elements.btnDismissSettings.addEventListener('click', closeSettingsModal);
    }
    if (elements.modalUserSettings) {
      elements.modalUserSettings.addEventListener('click', (e) => {
        if (e.target === elements.modalUserSettings) closeSettingsModal();
      });
    }

    if (elements.settingsTabBtns) {
      elements.settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          if (tab) switchSettingsTab(tab);
        });
      });
    }

    // 8. Sign Out in Settings
    if (elements.btnSettingsSignout) {
      elements.btnSettingsSignout.addEventListener('click', () => {
        closeSettingsModal();
        handleLogout();
      });
    }
  }

  function toggleProfilePopover() {
    const isVisible = elements.profilePopoverMenu && elements.profilePopoverMenu.style.display === 'flex';
    if (isVisible) {
      hideProfilePopover();
    } else {
      showProfilePopover();
    }
  }

  function showProfilePopover() {
    if (!elements.profilePopoverMenu) return;
    elements.profilePopoverMenu.style.display = 'flex';
    elements.profilePopoverMenu.setAttribute('aria-hidden', 'false');
    if (elements.btnProfileTrigger) {
      elements.btnProfileTrigger.classList.add('active');
      elements.btnProfileTrigger.setAttribute('aria-expanded', 'true');
    }
    // Close other dropdowns
    if (elements.exportMenu) elements.exportMenu.style.display = 'none';
    if (elements.personaMenu) elements.personaMenu.style.display = 'none';
  }

  function hideProfilePopover() {
    if (!elements.profilePopoverMenu) return;
    elements.profilePopoverMenu.style.display = 'none';
    elements.profilePopoverMenu.setAttribute('aria-hidden', 'true');
    if (elements.btnProfileTrigger) {
      elements.btnProfileTrigger.classList.remove('active');
      elements.btnProfileTrigger.setAttribute('aria-expanded', 'false');
    }
  }

  function openProfileModal() {
    hideProfilePopover();
    if (!state.authUser) {
      showAuthGateModal();
      return;
    }

    const displayName = getUserDisplayName(state.authUser);
    const email = state.authUser.email || `${displayName.toLowerCase()}@pixelcraft.ai`;
    const avatarUrl = getUserAvatarUrl(state.authUser);
    const initials = getUserInitials(displayName);

    if (elements.profileModalHeroName) elements.profileModalHeroName.textContent = displayName;
    if (elements.profileModalHeroEmail) elements.profileModalHeroEmail.textContent = email;
    if (elements.profileModalFullName) elements.profileModalFullName.textContent = displayName;
    if (elements.profileModalEmailVal) elements.profileModalEmailVal.textContent = email;
    if (elements.profileModalMemberSince) {
      elements.profileModalMemberSince.textContent = formatMemberSinceDate(state.authUser.created_at);
    }
    if (elements.profileModalAvatar) {
      setAvatarElement(elements.profileModalAvatar, avatarUrl, initials);
    }
    if (elements.profileEditNotice) {
      elements.profileEditNotice.style.display = 'none';
      elements.profileEditNotice.textContent = '';
    }

    if (elements.modalUserProfile) {
      elements.modalUserProfile.style.display = 'flex';
    }
  }

  function closeProfileModal() {
    if (elements.modalUserProfile) {
      elements.modalUserProfile.style.display = 'none';
    }
  }

  function openSettingsModal(targetTab = 'account') {
    hideProfilePopover();
    if (!state.authUser) {
      showAuthGateModal();
      return;
    }

    updateConnectedAccountsUI();
    switchSettingsTab(targetTab);

    if (elements.modalUserSettings) {
      elements.modalUserSettings.style.display = 'flex';
    }
  }

  function closeSettingsModal() {
    if (elements.modalUserSettings) {
      elements.modalUserSettings.style.display = 'none';
    }
  }

  function switchSettingsTab(tabName) {
    if (elements.settingsTabBtns) {
      elements.settingsTabBtns.forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    if (elements.settingsTabContents) {
      elements.settingsTabContents.forEach(content => {
        const isMatch = content.id === `tab-content-${tabName}`;
        content.style.display = isMatch ? 'flex' : 'none';
        content.classList.toggle('active', isMatch);
      });
    }
  }

  // ==========================================================================
  // 5. Client Customization Preferences
  // ==========================================================================
  function initCustomizationPreferences() {
    // 1. Theme (dark / light / system)
    const savedTheme = localStorage.getItem('pixelcraft_theme') || 'dark';
    applyThemePreference(savedTheme);

    if (elements.themeOptionBtns) {
      elements.themeOptionBtns.forEach(btn => {
        const themeVal = btn.getAttribute('data-theme-val');
        btn.classList.toggle('active', themeVal === savedTheme);
        btn.addEventListener('click', () => {
          elements.themeOptionBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          applyThemePreference(themeVal);
        });
      });
    }

    // Listen for OS theme changes if in system mode
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentPref = localStorage.getItem('pixelcraft_theme');
        if (currentPref === 'system') {
          applyThemePreference('system');
        }
      });
    }

    // 2. UI Density (comfortable / compact)
    const savedDensity = localStorage.getItem('pixelcraft_density') || 'comfortable';
    applyDensityPreference(savedDensity);

    if (elements.densityRadioInputs) {
      elements.densityRadioInputs.forEach(radio => {
        radio.checked = radio.value === savedDensity;
        radio.addEventListener('change', () => {
          if (radio.checked) {
            applyDensityPreference(radio.value);
          }
        });
      });
    }

    // 3. Accent Color
    const savedAccent = localStorage.getItem('pixelcraft_accent') || '#6366f1';
    applyAccentPreference(savedAccent);

    if (elements.accentSwatches) {
      elements.accentSwatches.forEach(swatch => {
        const accentVal = swatch.getAttribute('data-accent');
        swatch.classList.toggle('active', accentVal === savedAccent);
        swatch.addEventListener('click', () => {
          elements.accentSwatches.forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          applyAccentPreference(accentVal);
        });
      });
    }
  }

  function applyThemePreference(theme) {
    localStorage.setItem('pixelcraft_theme', theme);
    if (theme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  function applyDensityPreference(density) {
    localStorage.setItem('pixelcraft_density', density);
    document.documentElement.setAttribute('data-density', density);
  }

  function applyAccentPreference(accentColor) {
    localStorage.setItem('pixelcraft_accent', accentColor);
    document.documentElement.style.setProperty('--accent-primary', accentColor);
  }

  function handleUnauthorized(message = 'Your session has expired. Please sign in again to continue.') {
    clearAuthenticatedSession();
    state.conversations = [];
    state.currentConversationId = null;
    state.messages = [];
    if (state.supabaseClient && state.supabaseClient.auth) {
      try {
        state.supabaseClient.auth.signOut();
      } catch (_) {}
    }
    showChatWorkspace();
    renderGuestState();
    showAuthView(message);
  }

  // ==========================================================================
  // 4. Mobile & Tablet Sidebar Off-Canvas Drawer Toggle
  // ==========================================================================
  function setupSidebarToggle() {
    if (elements.mobileToggle) {
      elements.mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.sidebar.classList.add('open');
        elements.sidebarOverlay.classList.add('open');
      });
    }

    if (elements.btnCloseSidebar) {
      elements.btnCloseSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSidebar();
      });
    }

    if (elements.sidebarOverlay) {
      elements.sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Keyboard support: Escape closes mobile drawer or open menus
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        if (elements.exportMenu) elements.exportMenu.style.display = 'none';
        if (elements.personaMenu) elements.personaMenu.style.display = 'none';
      }
    });

    // Auto-close overlay when rotating/resizing back to large desktop screens
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeSidebar();
      }
    });
  }

  function closeSidebar() {
    if (elements.sidebar) elements.sidebar.classList.remove('open');
    if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('open');
  }

  // ==========================================================================
  // 5. Textarea Auto-Expansion & Keyboard Listeners
  // ==========================================================================
  function setupTextarea() {
    if (!elements.chatTextarea) return;

    elements.chatTextarea.addEventListener('input', () => {
      elements.chatTextarea.style.height = 'auto';
      elements.chatTextarea.style.height = Math.min(elements.chatTextarea.scrollHeight, 160) + 'px';

      const hasContent = elements.chatTextarea.value.trim().length > 0;
      if (elements.btnSend) {
        elements.btnSend.disabled = !hasContent || state.isGenerating;
      }
    });

    elements.chatTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (elements.btnSend) {
      elements.btnSend.disabled = true;
    }
  }

  // ==========================================================================
  // 6. Message Dispatcher & Backend API Integration
  // ==========================================================================
  function setupMessaging() {
    if (elements.btnSend) {
      elements.btnSend.addEventListener('click', (e) => {
        e.preventDefault();
        sendMessage();
      });
    }

    if (elements.btnClearChat) {
      elements.btnClearChat.addEventListener('click', () => {
        if (!requireUserAuth('manage conversation messages')) return;
        if (state.currentConversationId && state.messages.length > 0) {
          clearCurrentConversationMessages();
        } else {
          startNewChat();
        }
      });
    }

    if (elements.btnForkChat) {
      elements.btnForkChat.addEventListener('click', () => {
        if (!requireUserAuth('fork conversation')) return;
        if (state.currentConversationId) {
          const currentConv = state.conversations.find(c => c.id === state.currentConversationId);
          forkConversation(state.currentConversationId, currentConv?.title);
        } else {
          alert('Please select an active conversation to fork.');
        }
      });
    }

    if (elements.btnChatStats) {
      elements.btnChatStats.addEventListener('click', () => {
        if (!requireUserAuth('view conversation statistics')) return;
        if (state.currentConversationId) {
          const currentConv = state.conversations.find(c => c.id === state.currentConversationId);
          openConversationStats(state.currentConversationId, currentConv?.title);
        } else {
          alert('Please select an active conversation to view its analytics.');
        }
      });
    }
  }

  // ==========================================================================
  // Setup Conversation Export
  // ==========================================================================
  function setupExport() {
    if (!elements.btnExportChat || !elements.exportMenu) return;

    elements.btnExportChat.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!requireUserAuth('export conversation')) return;
      const isVisible = elements.exportMenu.style.display === 'flex';
      elements.exportMenu.style.display = isVisible ? 'none' : 'flex';
      if (elements.personaMenu) elements.personaMenu.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      if (elements.exportMenu && !elements.exportMenu.contains(e.target) && e.target !== elements.btnExportChat) {
        elements.exportMenu.style.display = 'none';
      }
    });

    const exportOptions = elements.exportMenu.querySelectorAll('.export-option');
    exportOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportMenu.style.display = 'none';
        const format = opt.getAttribute('data-format') || 'markdown';
        exportCurrentConversation(format);
      });
    });
  }

  async function exportCurrentConversation(format = 'markdown') {
    if (!requireUserAuth('export conversations')) return;

    if (!state.currentConversationId) {
      alert('Please select an active conversation to export.');
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${state.currentConversationId}/export?format=${encodeURIComponent(format)}`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        let errorMsg = 'Failed to export conversation';
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch (_) {}
        alert(errorMsg);
        return;
      }

      let filename = `conversation-${format}.${format === 'markdown' ? 'md' : (format === 'json' ? 'json' : 'txt')}`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1].trim();
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error during conversation export:', err);
      alert('Network error while exporting conversation');
    }
  }

  // ==========================================================================
  // Setup AI Persona & Custom Instructions Selector
  // ==========================================================================
  const PERSONA_LABELS = {
    general: { name: 'General Assistant', icon: '🎯' },
    code_architect: { name: 'Code Architect', icon: '💻' },
    technical_writer: { name: 'Technical Writer', icon: '📝' },
    executive_summarizer: { name: 'Executive Summarizer', icon: '💼' },
    creative_brainstormer: { name: 'Creative Thinker', icon: '🎨' }
  };

  function setupPersonaSelector() {
    if (!elements.btnPersonaSelector || !elements.personaMenu) return;

    updatePersonaUI();

    elements.btnPersonaSelector.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = elements.personaMenu.style.display === 'flex';
      elements.personaMenu.style.display = isVisible ? 'none' : 'flex';
      if (elements.exportMenu) elements.exportMenu.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      if (elements.personaMenu && !elements.personaMenu.contains(e.target) && e.target !== elements.btnPersonaSelector) {
        elements.personaMenu.style.display = 'none';
      }
    });

    elements.personaOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const personaKey = opt.getAttribute('data-persona');
        if (personaKey) {
          state.activePersona = personaKey;
          localStorage.setItem('assistant_persona', personaKey);
          updatePersonaUI();
          elements.personaMenu.style.display = 'none';
        }
      });
    });

    if (elements.btnCustomInstructionOpen) {
      elements.btnCustomInstructionOpen.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.personaMenu.style.display = 'none';
        openCustomInstructionModal();
      });
    }

    if (elements.btnCloseCustomModal) {
      elements.btnCloseCustomModal.addEventListener('click', closeCustomInstructionModal);
    }

    if (elements.modalCustomInstructions) {
      elements.modalCustomInstructions.addEventListener('click', (e) => {
        if (e.target === elements.modalCustomInstructions) {
          closeCustomInstructionModal();
        }
      });
    }

    if (elements.customInstructionInput) {
      elements.customInstructionInput.addEventListener('input', () => {
        const len = elements.customInstructionInput.value.length;
        if (elements.customInstructionCharCount) {
          elements.customInstructionCharCount.textContent = len;
        }
      });
    }

    if (elements.btnSaveCustomInstructions) {
      elements.btnSaveCustomInstructions.addEventListener('click', () => {
        const text = elements.customInstructionInput.value.trim();
        state.customInstructions = text;
        if (text) {
          localStorage.setItem('assistant_custom_instructions', text);
        } else {
          localStorage.removeItem('assistant_custom_instructions');
        }
        updatePersonaUI();
        closeCustomInstructionModal();
      });
    }

    if (elements.btnClearCustomInstructions) {
      elements.btnClearCustomInstructions.addEventListener('click', () => {
        elements.customInstructionInput.value = '';
        state.customInstructions = '';
        localStorage.removeItem('assistant_custom_instructions');
        if (elements.customInstructionCharCount) elements.customInstructionCharCount.textContent = '0';
        updatePersonaUI();
        closeCustomInstructionModal();
      });
    }
  }

  function updatePersonaUI() {
    const hasCustom = state.customInstructions && state.customInstructions.trim().length > 0;
    
    if (elements.currentPersonaLabel) {
      if (hasCustom) {
        elements.currentPersonaLabel.textContent = '⚙️ Custom';
      } else {
        const p = PERSONA_LABELS[state.activePersona] || PERSONA_LABELS.general;
        elements.currentPersonaLabel.textContent = `${p.icon} ${p.name}`;
      }
    }

    if (elements.personaOptions) {
      elements.personaOptions.forEach(opt => {
        const key = opt.getAttribute('data-persona');
        if (key === state.activePersona && !hasCustom) {
          opt.classList.add('active');
        } else {
          opt.classList.remove('active');
        }
      });
    }

    if (elements.customInstructionPreview) {
      if (hasCustom) {
        const preview = state.customInstructions.length > 26 
          ? state.customInstructions.substring(0, 26) + '...' 
          : state.customInstructions;
        elements.customInstructionPreview.textContent = `Active: "${preview}"`;
      } else {
        elements.customInstructionPreview.textContent = 'Personalize AI system prompt';
      }
    }
  }

  function openCustomInstructionModal() {
    if (!requireUserAuth('set custom instructions')) return;
    if (!elements.modalCustomInstructions) return;
    if (elements.customInstructionInput) {
      elements.customInstructionInput.value = state.customInstructions || '';
      if (elements.customInstructionCharCount) {
        elements.customInstructionCharCount.textContent = (state.customInstructions || '').length;
      }
    }
    elements.modalCustomInstructions.style.display = 'flex';
    if (elements.customInstructionInput) {
      elements.customInstructionInput.focus();
    }
  }

  function closeCustomInstructionModal() {
    if (elements.modalCustomInstructions) {
      elements.modalCustomInstructions.style.display = 'none';
    }
  }

  // ==========================================================================
  // Setup Conversation Analytics & Stats Modal
  // ==========================================================================
  let currentStatsData = null;

  function setupStatsModal() {
    if (!elements.modalChatStats) return;

    if (elements.btnCloseStatsModal) {
      elements.btnCloseStatsModal.addEventListener('click', closeStatsModal);
    }

    if (elements.btnDismissStats) {
      elements.btnDismissStats.addEventListener('click', closeStatsModal);
    }

    elements.modalChatStats.addEventListener('click', (e) => {
      if (e.target === elements.modalChatStats) {
        closeStatsModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.modalChatStats && elements.modalChatStats.style.display === 'flex') {
        closeStatsModal();
      }
    });

    if (elements.btnCopyStats) {
      elements.btnCopyStats.addEventListener('click', () => {
        if (!currentStatsData) return;
        const s = currentStatsData;
        const markdown = [
          `# 📊 Conversation Analytics: ${s.conversation?.title || 'Thread'}`,
          `- **Total Messages**: ${s.totalMessages} (${s.userMessages} user / ${s.assistantMessages} AI)`,
          `- **Estimated Tokens**: ${(s.estimatedTokens?.totalTokens || 0).toLocaleString()} (${(s.estimatedTokens?.promptTokens || 0).toLocaleString()} prompt / ${(s.estimatedTokens?.completionTokens || 0).toLocaleString()} output)`,
          `- **Total Words**: ${(s.totalWords || 0).toLocaleString()} (User: ${(s.userWords || 0).toLocaleString()} | AI: ${(s.assistantWords || 0).toLocaleString()})`,
          `- **Avg AI Response Length**: ${s.avgAssistantWordsPerTurn || 0} words/turn`,
          `- **Total Characters**: ${(s.totalCharacters || 0).toLocaleString()}`,
          `- **Active Duration**: ${s.timeline?.durationFormatted || '0s'}`,
          `- **First Message**: ${s.timeline?.firstMessageAt ? new Date(s.timeline.firstMessageAt).toLocaleString() : 'N/A'}`,
          `- **Last Activity**: ${s.timeline?.lastMessageAt ? new Date(s.timeline.lastMessageAt).toLocaleString() : 'N/A'}`
        ].join('\n');

        const onSuccess = () => {
          const originalText = elements.btnCopyStats.textContent;
          elements.btnCopyStats.textContent = '✓ Copied!';
          setTimeout(() => {
            if (elements.btnCopyStats) elements.btnCopyStats.textContent = originalText;
          }, 2000);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(markdown).then(onSuccess).catch(() => {
            prompt('Copy analytics summary below:', markdown);
          });
        } else {
          prompt('Copy analytics summary below:', markdown);
        }
      });
    }
  }

  function closeStatsModal() {
    if (elements.modalChatStats) {
      elements.modalChatStats.style.display = 'none';
    }
  }

  async function openConversationStats(conversationId, fallbackTitle = null) {
    if (!requireUserAuth('view conversation statistics')) {
      return;
    }

    if (!elements.modalChatStats) return;

    if (elements.statsConvTitle) {
      elements.statsConvTitle.textContent = fallbackTitle || 'Loading conversation diagnostics...';
    }

    // Reset fields to loading state
    if (elements.statTotalMessages) elements.statTotalMessages.textContent = '...';
    if (elements.statMsgBreakdown) elements.statMsgBreakdown.textContent = 'Calculating...';
    if (elements.statTotalTokens) elements.statTotalTokens.textContent = '...';
    if (elements.statTokenBreakdown) elements.statTokenBreakdown.textContent = 'Estimating...';
    if (elements.statTotalWords) elements.statTotalWords.textContent = '...';
    if (elements.statWordBreakdown) elements.statWordBreakdown.textContent = 'Analyzing...';
    if (elements.statThreadDuration) elements.statThreadDuration.textContent = '...';
    if (elements.statDurationSublabel) elements.statDurationSublabel.textContent = 'calculating...';
    if (elements.statsRatioLabels) elements.statsRatioLabels.textContent = 'Analyzing...';
    if (elements.statsBarUser) elements.statsBarUser.style.width = '50%';
    if (elements.statsBarAi) elements.statsBarAi.style.width = '50%';
    if (elements.statAvgAiWords) elements.statAvgAiWords.textContent = '...';
    if (elements.statTotalChars) elements.statTotalChars.textContent = '...';
    if (elements.statFirstMsgTime) elements.statFirstMsgTime.textContent = '...';
    if (elements.statLastMsgTime) elements.statLastMsgTime.textContent = '...';

    elements.modalChatStats.style.display = 'flex';

    try {
      const response = await fetch(`/api/conversations/${conversationId}/stats`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        closeStatsModal();
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success || !data.stats) {
        alert(data.error || 'Failed to fetch conversation statistics');
        closeStatsModal();
        return;
      }

      const s = data.stats;
      currentStatsData = s;

      if (elements.statsConvTitle) {
        elements.statsConvTitle.textContent = s.conversation?.title || fallbackTitle || 'Thread Insights';
      }

      if (elements.statTotalMessages) {
        elements.statTotalMessages.textContent = (s.totalMessages || 0).toLocaleString();
      }
      if (elements.statMsgBreakdown) {
        elements.statMsgBreakdown.textContent = `${s.userMessages || 0} user / ${s.assistantMessages || 0} AI`;
      }

      if (elements.statTotalTokens) {
        elements.statTotalTokens.textContent = (s.estimatedTokens?.totalTokens || 0).toLocaleString();
      }
      if (elements.statTokenBreakdown) {
        elements.statTokenBreakdown.textContent = `${(s.estimatedTokens?.promptTokens || 0).toLocaleString()} in / ${(s.estimatedTokens?.completionTokens || 0).toLocaleString()} out`;
      }

      if (elements.statTotalWords) {
        elements.statTotalWords.textContent = (s.totalWords || 0).toLocaleString();
      }
      if (elements.statWordBreakdown) {
        elements.statWordBreakdown.textContent = `${(s.userWords || 0).toLocaleString()} user / ${(s.assistantWords || 0).toLocaleString()} AI`;
      }

      if (elements.statThreadDuration) {
        elements.statThreadDuration.textContent = s.timeline?.durationFormatted || '0s';
      }
      if (elements.statDurationSublabel) {
        elements.statDurationSublabel.textContent = s.totalMessages > 0 ? 'active duration' : 'no messages yet';
      }

      // Proportional ratio
      const userW = s.userWords || 0;
      const aiW = s.assistantWords || 0;
      const totalW = userW + aiW;

      let userPercent = 50;
      let aiPercent = 50;

      if (totalW > 0) {
        userPercent = Math.round((userW / totalW) * 100);
        aiPercent = 100 - userPercent;
      } else if (s.totalMessages === 0) {
        userPercent = 0;
        aiPercent = 0;
      }

      if (elements.statsRatioLabels) {
        elements.statsRatioLabels.textContent = s.totalMessages > 0
          ? `You ${userPercent}% / AI ${aiPercent}%`
          : 'No dialogue data';
      }
      if (elements.statsBarUser) {
        elements.statsBarUser.style.width = `${userPercent}%`;
      }
      if (elements.statsBarAi) {
        elements.statsBarAi.style.width = `${aiPercent}%`;
      }

      if (elements.statAvgAiWords) {
        elements.statAvgAiWords.textContent = `${s.avgAssistantWordsPerTurn || 0} words/turn`;
      }
      if (elements.statTotalChars) {
        elements.statTotalChars.textContent = `${(s.totalCharacters || 0).toLocaleString()} (You: ${(s.userCharacters || 0).toLocaleString()} | AI: ${(s.assistantCharacters || 0).toLocaleString()})`;
      }
      if (elements.statFirstMsgTime) {
        elements.statFirstMsgTime.textContent = s.timeline?.firstMessageAt
          ? new Date(s.timeline.firstMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })
          : '—';
      }
      if (elements.statLastMsgTime) {
        elements.statLastMsgTime.textContent = s.timeline?.lastMessageAt
          ? new Date(s.timeline.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })
          : '—';
      }
    } catch (err) {
      console.error('Error fetching conversation stats:', err);
      alert('Network error while fetching conversation statistics');
      closeStatsModal();
    }
  }

  // ==========================================================================
  // Setup AI Prompt Library & Template Vault
  // ==========================================================================
  function setupPromptLibrary() {
    if (!elements.btnPromptVault || !elements.modalPromptLibrary) return;

    elements.btnPromptVault.addEventListener('click', () => {
      openPromptLibraryModal();
    });

    if (elements.btnClosePromptModal) {
      elements.btnClosePromptModal.addEventListener('click', closePromptLibraryModal);
    }

    if (elements.btnDismissPrompts) {
      elements.btnDismissPrompts.addEventListener('click', closePromptLibraryModal);
    }

    elements.modalPromptLibrary.addEventListener('click', (e) => {
      if (e.target === elements.modalPromptLibrary) {
        closePromptLibraryModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.modalPromptLibrary && elements.modalPromptLibrary.style.display === 'flex') {
        closePromptLibraryModal();
      }
    });

    // Search input
    if (elements.promptSearchInput) {
      elements.promptSearchInput.addEventListener('input', () => {
        state.promptSearchQuery = elements.promptSearchInput.value.trim();
        if (elements.btnClearPromptSearch) {
          elements.btnClearPromptSearch.style.display = state.promptSearchQuery ? 'inline-block' : 'none';
        }
        renderPromptCards();
      });
    }

    if (elements.btnClearPromptSearch) {
      elements.btnClearPromptSearch.addEventListener('click', () => {
        if (elements.promptSearchInput) {
          elements.promptSearchInput.value = '';
          state.promptSearchQuery = '';
          elements.btnClearPromptSearch.style.display = 'none';
          renderPromptCards();
          elements.promptSearchInput.focus();
        }
      });
    }

    // Category pills
    if (elements.promptCategoryPills) {
      const pills = elements.promptCategoryPills.querySelectorAll('.category-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          state.activePromptCategory = pill.getAttribute('data-cat') || 'all';
          renderPromptCards();
        });
      });
    }
  }

  async function openPromptLibraryModal() {
    if (!elements.modalPromptLibrary) return;
    elements.modalPromptLibrary.style.display = 'flex';

    if (state.prompts.length === 0) {
      await loadPrompts();
    } else {
      renderPromptCards();
    }

    if (elements.promptSearchInput) {
      elements.promptSearchInput.focus();
    }
  }

  function closePromptLibraryModal() {
    if (elements.modalPromptLibrary) {
      elements.modalPromptLibrary.style.display = 'none';
    }
  }

  async function loadPrompts() {
    if (!elements.promptCardsContainer) return;
    elements.promptCardsContainer.innerHTML = '<div class="prompt-loading">Loading prompt library...</div>';

    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();

      if (response.ok && data.success && Array.isArray(data.prompts)) {
        state.prompts = data.prompts;
        renderPromptCards();
      } else {
        elements.promptCardsContainer.innerHTML = '<div class="prompt-empty-notice">Could not load prompt library.</div>';
      }
    } catch (err) {
      console.error('Error fetching prompts:', err);
      elements.promptCardsContainer.innerHTML = '<div class="prompt-empty-notice">Failed to connect to prompt service.</div>';
    }
  }

  function renderPromptCards() {
    if (!elements.promptCardsContainer) return;

    let filtered = state.prompts || [];

    // Filter by category
    if (state.activePromptCategory && state.activePromptCategory !== 'all') {
      filtered = filtered.filter(p => p.category === state.activePromptCategory);
    }

    // Filter by search query
    if (state.promptSearchQuery) {
      const q = state.promptSearchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.template.toLowerCase().includes(q) ||
        (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q))
      );
    }

    if (elements.promptCounterText) {
      elements.promptCounterText.textContent = `Showing ${filtered.length} of ${state.prompts.length} prompt templates`;
    }

    if (filtered.length === 0) {
      elements.promptCardsContainer.innerHTML = `
        <div class="prompt-empty-notice">
          <span>🔍</span> No prompts found matching your criteria.
        </div>
      `;
      return;
    }

    elements.promptCardsContainer.innerHTML = '';

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'prompt-card';

      const topDiv = document.createElement('div');
      topDiv.className = 'prompt-card-top';

      const badge = document.createElement('span');
      badge.className = `prompt-badge ${item.category || 'coding'}`;
      badge.textContent = item.categoryLabel || item.category || 'Prompt';
      topDiv.appendChild(badge);

      const title = document.createElement('h4');
      title.className = 'prompt-card-title';
      title.textContent = item.title;

      const desc = document.createElement('p');
      desc.className = 'prompt-card-desc';
      desc.textContent = item.description;

      const preview = document.createElement('div');
      preview.className = 'prompt-card-preview';
      preview.textContent = item.template;
      preview.title = item.template;

      const actions = document.createElement('div');
      actions.className = 'prompt-card-actions';

      const runBtn = document.createElement('button');
      runBtn.type = 'button';
      runBtn.className = 'btn-prompt-act btn-prompt-run';
      runBtn.textContent = '🚀 Run';
      runBtn.title = 'Run prompt immediately against AI Assistant';
      runBtn.addEventListener('click', () => {
        closePromptLibraryModal();
        runPromptInstantly(item.template, item.recommendedPersona);
      });

      const insertBtn = document.createElement('button');
      insertBtn.type = 'button';
      insertBtn.className = 'btn-prompt-act btn-prompt-insert';
      insertBtn.textContent = '✏️ Insert';
      insertBtn.title = 'Insert template into chat textarea to customize';
      insertBtn.addEventListener('click', () => {
        closePromptLibraryModal();
        insertPromptIntoChat(item.template, item.recommendedPersona);
      });

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-prompt-act btn-prompt-copy';
      copyBtn.textContent = '📋 Copy';
      copyBtn.title = 'Copy template to clipboard';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(item.template).then(() => {
            copyBtn.textContent = '✓ Copied';
            setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
          });
        }
      });

      actions.appendChild(runBtn);
      actions.appendChild(insertBtn);
      actions.appendChild(copyBtn);

      card.appendChild(topDiv);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(preview);
      card.appendChild(actions);

      elements.promptCardsContainer.appendChild(card);
    });
  }

  function insertPromptIntoChat(template, recommendedPersona = null) {
    if (!requireUserAuth('use prompt templates')) return;
    if (!elements.chatTextarea) return;

    if (recommendedPersona && PERSONA_LABELS[recommendedPersona]) {
      state.activePersona = recommendedPersona;
      localStorage.setItem('assistant_persona', recommendedPersona);
      updatePersonaUI();
    }

    elements.chatTextarea.value = template;
    elements.chatTextarea.style.height = 'auto';
    elements.chatTextarea.style.height = Math.min(elements.chatTextarea.scrollHeight, 160) + 'px';
    elements.chatTextarea.disabled = false;
    elements.chatTextarea.focus();

    if (elements.btnSend) {
      elements.btnSend.disabled = false;
    }
  }

  function runPromptInstantly(template, recommendedPersona = null) {
    if (!requireUserAuth('run prompt templates')) return;
    if (!elements.chatTextarea) return;

    insertPromptIntoChat(template, recommendedPersona);
    sendMessage();
  }

  // ==========================================================================
  // 7. Load Conversations for Authenticated User (GET /api/conversations)
  // ==========================================================================
  async function loadConversations(preserveActiveId = null) {
    if (!state.authToken) return;

    try {
      const response = await fetch('/api/conversations', {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        state.conversations = data.conversations || [];
        renderConversationsList();

        if (preserveActiveId) {
          state.currentConversationId = preserveActiveId;
          highlightActiveConversation();
        }
      } else {
        renderConversationsError('Could not load conversations');
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      renderConversationsError('Failed to connect to server');
    }
  }

  // Render Conversations into Sidebar
  function renderConversationsList(itemsToRender = null, isSearch = false) {
    if (!elements.chatList) return;
    elements.chatList.innerHTML = '';

    const items = itemsToRender !== null ? itemsToRender : state.conversations;

    if (items.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'chat-list-empty';
      emptyLi.textContent = isSearch 
        ? `No conversations matching "${escapeHtml(state.searchQuery)}"`
        : 'No conversations yet';
      elements.chatList.appendChild(emptyLi);
      return;
    }

    items.forEach(conv => {
      const li = document.createElement('li');
      li.className = 'chat-item' + (conv.id === state.currentConversationId ? ' active' : '');
      li.setAttribute('data-id', conv.id);

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'chat-item-content';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'chat-item-title';
      titleSpan.textContent = `💬 ${conv.title || 'New Conversation'}`;
      titleSpan.title = conv.title || 'New Conversation';
      contentWrapper.appendChild(titleSpan);

      // If matched in message content, render match preview snippet
      if (conv.matchingSnippet) {
        const snippetSpan = document.createElement('span');
        snippetSpan.className = 'chat-item-snippet';
        const roleLabel = conv.matchingRole === 'user' ? 'You: ' : 'AI: ';
        snippetSpan.textContent = `${roleLabel}${conv.matchingSnippet}`;
        snippetSpan.title = conv.matchingSnippet;
        contentWrapper.appendChild(snippetSpan);
      }

      const actionsSpan = document.createElement('span');
      actionsSpan.className = 'chat-item-actions';

      const renameBtn = document.createElement('button');
      renameBtn.className = 'chat-item-action-btn chat-item-rename';
      renameBtn.setAttribute('aria-label', 'Rename conversation');
      renameBtn.title = 'Rename conversation';
      renameBtn.textContent = '✏️';
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startRenamingConversation(conv, li, titleSpan, contentWrapper);
      });

      const statsBtn = document.createElement('button');
      statsBtn.className = 'chat-item-action-btn chat-item-stats';
      statsBtn.setAttribute('aria-label', 'Conversation Statistics');
      statsBtn.title = 'View conversation analytics & token estimates';
      statsBtn.textContent = '📊';
      statsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openConversationStats(conv.id, conv.title);
      });

      const forkBtn = document.createElement('button');
      forkBtn.className = 'chat-item-action-btn chat-item-fork';
      forkBtn.setAttribute('aria-label', 'Fork conversation');
      forkBtn.title = 'Fork conversation into a new branch';
      forkBtn.textContent = '🔀';
      forkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        forkConversation(conv.id, conv.title);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'chat-item-action-btn chat-item-delete';
      deleteBtn.setAttribute('aria-label', 'Delete conversation');
      deleteBtn.title = 'Delete conversation';
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
      });

      actionsSpan.appendChild(renameBtn);
      actionsSpan.appendChild(statsBtn);
      actionsSpan.appendChild(forkBtn);
      actionsSpan.appendChild(deleteBtn);
      li.appendChild(contentWrapper);
      li.appendChild(actionsSpan);

      li.addEventListener('click', () => {
        selectConversation(conv.id);
      });

      titleSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRenamingConversation(conv, li, titleSpan, contentWrapper);
      });

      elements.chatList.appendChild(li);
    });
  }

  function startRenamingConversation(conv, li, titleSpan, container = li) {
    if (li.classList.contains('editing')) return;
    li.classList.add('editing');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'chat-item-input';
    input.value = conv.title || 'New Conversation';
    input.maxLength = 100;

    container.replaceChild(input, titleSpan);
    input.focus();
    input.select();

    let committed = false;

    const commitChange = async () => {
      if (committed) return;
      committed = true;
      const newTitle = input.value.trim();
      if (!newTitle || newTitle === conv.title) {
        if (container.contains(input)) container.replaceChild(titleSpan, input);
        li.classList.remove('editing');
        return;
      }
      await saveConversationTitle(conv, newTitle, li, titleSpan, input, container);
    };

    const cancelChange = () => {
      if (committed) return;
      committed = true;
      if (container.contains(input)) container.replaceChild(titleSpan, input);
      li.classList.remove('editing');
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitChange();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelChange();
      }
    });

    input.addEventListener('blur', () => {
      commitChange();
    });
  }

  async function saveConversationTitle(conv, newTitle, li, titleSpan, input, container = li) {
    try {
      const response = await fetch(`/api/conversations/${conv.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: newTitle })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success && data.conversation) {
        conv.title = data.conversation.title;
        titleSpan.textContent = `💬 ${data.conversation.title}`;
        titleSpan.title = data.conversation.title;

        // Also update search results if active
        if (state.searchResults) {
          const match = state.searchResults.find(c => c.id === conv.id);
          if (match) match.title = data.conversation.title;
        }

        if (state.currentConversationId === conv.id && elements.currentChatTitle) {
          elements.currentChatTitle.textContent = data.conversation.title;
        }
      } else {
        alert(data.error || 'Failed to update conversation title');
      }
    } catch (err) {
      console.error('Error updating conversation title:', err);
      alert('Network error updating conversation title');
    } finally {
      if (container.contains(input)) {
        container.replaceChild(titleSpan, input);
      }
      li.classList.remove('editing');
    }
  }

  // ==========================================================================
  // Setup Conversation Search & Filter
  // ==========================================================================
  function setupSearch() {
    if (!elements.chatSearchInput) return;

    let debounceTimer = null;

    elements.chatSearchInput.addEventListener('input', () => {
      const q = elements.chatSearchInput.value.trim();
      state.searchQuery = q;

      if (elements.btnClearSearch) {
        elements.btnClearSearch.style.display = q ? 'block' : 'none';
      }

      clearTimeout(debounceTimer);

      if (!q) {
        state.isSearching = false;
        state.searchResults = null;
        renderConversationsList(state.conversations, false);
        return;
      }

      debounceTimer = setTimeout(() => {
        performSearch(q);
      }, 250);
    });

    if (elements.btnClearSearch) {
      elements.btnClearSearch.addEventListener('click', () => {
        elements.chatSearchInput.value = '';
        state.searchQuery = '';
        state.isSearching = false;
        state.searchResults = null;
        elements.btnClearSearch.style.display = 'none';
        renderConversationsList(state.conversations, false);
        elements.chatSearchInput.focus();
      });
    }
  }

  async function performSearch(query) {
    if (!state.authToken || !query) return;

    state.isSearching = true;

    try {
      const response = await fetch(`/api/conversations/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        state.searchResults = data.conversations || [];
        renderConversationsList(state.searchResults, true);
      } else {
        renderConversationsError(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Error searching conversations:', err);
      renderConversationsError('Search connection failed');
    }
  }

  function renderConversationsError(msg) {
    if (!elements.chatList) return;
    elements.chatList.innerHTML = `<li class="chat-list-empty">${escapeHtml(msg)}</li>`;
  }

  function highlightActiveConversation() {
    if (!elements.chatList) return;
    const items = elements.chatList.querySelectorAll('.chat-item');
    items.forEach(item => {
      if (item.getAttribute('data-id') === state.currentConversationId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // 8. Select & Load User Conversation (GET /api/conversations/:id/messages)
  // ==========================================================================
  async function selectConversation(conversationId) {
    if (state.isGenerating || state.isLoadingMessages) return;

    state.currentConversationId = conversationId;
    highlightActiveConversation();

    const currentConv = state.conversations.find(c => c.id === conversationId);
    if (currentConv && elements.currentChatTitle) {
      elements.currentChatTitle.textContent = currentConv.title || 'Conversation';
    }

    state.isLoadingMessages = true;
    if (elements.welcomeState) elements.welcomeState.style.display = 'none';
    elements.messagesContainer.innerHTML = `
      <div class="messages-loading">
        <span>⏳</span> Loading conversation messages...
      </div>
    `;

    closeSidebar();

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      elements.messagesContainer.innerHTML = '';

      if (response.ok && data.success) {
        state.messages = data.messages || [];
        if (state.messages.length === 0) {
          if (elements.welcomeState) elements.welcomeState.style.display = 'flex';
        } else {
          state.messages.forEach(msg => {
            appendMessage(msg.role, msg.content, msg.id);
          });
          scrollToBottom();
        }
      } else {
        appendMessage('assistant', `⚠️ Could not load messages: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      elements.messagesContainer.innerHTML = '';
      appendMessage('assistant', '❌ Network Error: Failed to fetch conversation messages.');
    } finally {
      state.isLoadingMessages = false;
    }
  }

  // ==========================================================================
  // 9. Delete Conversation (DELETE /api/conversations/:id)
  // ==========================================================================
  async function deleteConversation(conversationId) {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        state.conversations = state.conversations.filter(c => c.id !== conversationId);
        if (state.searchResults) {
          state.searchResults = state.searchResults.filter(c => c.id !== conversationId);
        }

        if (state.currentConversationId === conversationId) {
          startNewChat();
        } else {
          renderConversationsList(state.isSearching ? state.searchResults : state.conversations, state.isSearching);
        }
      } else {
        alert(data.error || 'Failed to delete conversation');
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      alert('Network error deleting conversation');
    }
  }

  // ==========================================================================
  // Fork Conversation (POST /api/conversations/:id/fork)
  // ==========================================================================
  async function forkConversation(conversationId, currentTitle = null) {
    if (!state.authToken) {
      alert('Please sign in to fork conversations.');
      return;
    }

    if (!conversationId) return;

    const defaultTitle = `${currentTitle || 'Conversation'} (Fork)`;
    const customTitle = prompt('Enter a title for the new forked branch:', defaultTitle);
    if (customTitle === null) return; // user cancelled prompt

    const finalTitle = customTitle.trim() || defaultTitle;

    try {
      const response = await fetch(`/api/conversations/${conversationId}/fork`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: finalTitle })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success && data.conversation) {
        state.conversations.unshift(data.conversation);
        renderConversationsList();
        selectConversation(data.conversation.id);
      } else {
        alert(data.error || 'Failed to fork conversation');
      }
    } catch (err) {
      console.error('Error forking conversation:', err);
      alert('Network error while forking conversation');
    }
  }

  // ==========================================================================
  // 10. Start New Chat View
  // ==========================================================================
  function setupNewChat() {
    if (elements.btnNewChat) {
      elements.btnNewChat.addEventListener('click', () => {
        if (!requireUserAuth('start a new conversation')) return;
        startNewChat();
      });
    }
  }

  function startNewChat() {
    if (state.isGenerating) return;

    state.currentConversationId = null;
    state.messages = [];
    highlightActiveConversation();

    if (elements.messagesContainer) {
      elements.messagesContainer.innerHTML = '';
    }
    showTypingIndicator(false);

    if (elements.currentChatTitle) {
      elements.currentChatTitle.textContent = 'AI Assistant Workspace';
    }

    if (elements.welcomeState) {
      elements.welcomeState.style.display = 'flex';
    }

    if (elements.chatTextarea) {
      elements.chatTextarea.value = '';
      elements.chatTextarea.style.height = 'auto';
      elements.chatTextarea.disabled = false;
      elements.chatTextarea.focus();
    }

    elements.btnSend.disabled = true;
    closeSidebar();
  }

  // ==========================================================================
  // 11. Send Message Flow with Authenticated Persistence
  // ==========================================================================
  async function sendMessage() {
    const text = elements.chatTextarea.value.trim();
    if (!text || state.isGenerating) return;

    // Resolve active token following strict priority:
    // 1. Current valid Supabase session if browser client is configured and active
    let activeToken = null;
    let activeUser = null;

    if (state.supabaseClient && state.supabaseClient.auth) {
      try {
        const { data } = await state.supabaseClient.auth.getSession();
        if (data?.session?.access_token) {
          activeToken = data.session.access_token;
          activeUser = data.session.user || null;
        }
      } catch (_) {}
    }

    // 2. In-memory state.authToken
    if (!activeToken && state.authToken) {
      activeToken = state.authToken;
      activeUser = state.authUser || null;
    }

    // 3. Stored access token in localStorage
    if (!activeToken) {
      const storedToken = localStorage.getItem('supabase_access_token');
      if (storedToken) {
        activeToken = storedToken;
        try {
          const storedUser = localStorage.getItem('supabase_user');
          if (storedUser) activeUser = JSON.parse(storedUser);
        } catch (_) {}
      }
    }

    // If genuinely NO token exists: preserve draft message and prompt for authentication
    if (!activeToken) {
      state.pendingDraftMessage = text;
      try {
        sessionStorage.setItem('pixelcraft_pending_draft', text);
      } catch (_) {}
      showAuthView('Sign in or create an account to continue.');
      return;
    }

    // Synchronize active state atomically
    setAuthenticatedSession({ access_token: activeToken, user: activeUser }, activeUser, activeToken);

    // Reset textarea input and clear draft
    elements.chatTextarea.value = '';
    elements.chatTextarea.style.height = 'auto';
    state.pendingDraftMessage = null;
    try {
      sessionStorage.removeItem('pixelcraft_pending_draft');
    } catch (_) {}

    state.isGenerating = true;
    elements.chatTextarea.disabled = true;
    elements.btnSend.disabled = true;

    if (elements.welcomeState) {
      elements.welcomeState.style.display = 'none';
    }

    const userRow = appendMessage('user', text);
    state.messages.push({ role: 'user', content: text });

    showTypingIndicator(true);
    scrollToBottom();

    try {
      // 1. If this is a new chat, create a conversation in Supabase for this authenticated user
      if (!state.currentConversationId && activeToken) {
        const titleSnippet = text.length > 32 ? text.substring(0, 32).trim() + '...' : text;
        try {
          const convRes = await fetch('/api/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeToken}`
            },
            body: JSON.stringify({ title: titleSnippet })
          });

          if (convRes.status === 401) {
            handleUnauthorized();
            return;
          }

          const convData = await convRes.json();

          if (convRes.ok && convData.success && convData.conversation) {
            state.currentConversationId = convData.conversation.id;
            state.conversations.unshift(convData.conversation);
            renderConversationsList();

            if (elements.currentChatTitle) {
              elements.currentChatTitle.textContent = convData.conversation.title;
            }
          }
        } catch (convErr) {
          console.error('Failed to create conversation entry:', convErr);
        }
      }

      // 2. Dispatch to backend POST /api/chat with Bearer Token
      const payload = { 
        message: text,
        persona: state.activePersona
      };
      if (state.customInstructions && state.customInstructions.trim()) {
        payload.systemInstruction = state.customInstructions.trim();
      }
      if (state.currentConversationId) {
        payload.conversationId = state.currentConversationId;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      showTypingIndicator(false);

      if (response.ok && data.success && data.reply) {
        const assistantRow = appendMessage('assistant', data.reply, data.assistantMessageId, data.persona);
        state.messages.push({ role: 'assistant', content: data.reply, id: data.assistantMessageId, persona: data.persona });

        if (data.userMessageId && userRow) {
          attachDeleteActionToRow(userRow, data.userMessageId);
          if (state.messages.length >= 2) {
            state.messages[state.messages.length - 2].id = data.userMessageId;
          }
        }

        // Refresh sidebar conversation list to reflect updated timestamp order
        if (state.authToken) {
          loadConversations(state.currentConversationId);
        }
      } else {
        const errorMsg = data.error || `HTTP ${response.status}: Failed to receive AI response`;
        appendMessage('assistant', `⚠️ ${errorMsg}`);
      }
    } catch (err) {
      showTypingIndicator(false);
      appendMessage('assistant', `❌ Network Error: Could not connect to Express server.`);
    } finally {
      state.isGenerating = false;
      elements.chatTextarea.disabled = false;
      elements.chatTextarea.focus();
      scrollToBottom();
    }
  }

  // Render message bubble in chat container
  function appendMessage(role, text, messageId = null, persona = null) {
    const messageRow = document.createElement('div');
    messageRow.className = `message-row ${role}`;
    if (messageId) {
      messageRow.setAttribute('data-id', messageId);
    }

    if (role === 'user') {
      messageRow.innerHTML = `
        <div class="message-bubble">
          <div class="message-text">${escapeHtml(text)}</div>
          <div class="message-actions">
            <button class="action-btn btn-delete-msg" aria-label="Delete message" title="Delete message" ${!messageId ? 'style="display:none;"' : ''}>🗑️</button>
          </div>
        </div>
      `;
    } else {
      let personaBadgeHtml = '';
      if (persona && persona !== 'general') {
        const pInfo = PERSONA_LABELS[persona];
        const badgeLabel = pInfo ? `${pInfo.icon} ${pInfo.name}` : `⚙️ ${persona}`;
        personaBadgeHtml = `<div class="message-persona-badge">${escapeHtml(badgeLabel)}</div>`;
      }

      const avatarContent = (!persona || persona === 'general') 
        ? '<img src="images/logo.png" alt="PixelCraft AI" class="avatar-logo-img">'
        : (PERSONA_LABELS[persona] ? PERSONA_LABELS[persona].icon : '⚡');

      messageRow.innerHTML = `
        <div class="message-avatar ai">${avatarContent}</div>
        <div class="message-bubble">
          ${personaBadgeHtml}
          <div class="message-text">${formatResponseText(text)}</div>
          <div class="message-actions">
            <button class="action-btn btn-copy" aria-label="Copy response text">📋 Copy</button>
            <button class="action-btn btn-useful" aria-label="Rate response as helpful">👍 Useful</button>
            <button class="action-btn btn-retry" aria-label="Retry response generation">🔄 Retry</button>
            <button class="action-btn btn-delete-msg" aria-label="Delete message" title="Delete message" ${!messageId ? 'style="display:none;"' : ''}>🗑️</button>
          </div>
        </div>
      `;
    }

    elements.messagesContainer.appendChild(messageRow);

    const copyBtn = messageRow.querySelector('.btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const textDiv = messageRow.querySelector('.message-text');
        const contentToCopy = textDiv ? (textDiv.getAttribute('data-raw') || text) : text;
        navigator.clipboard.writeText(contentToCopy);
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
      });
    }

    const usefulBtn = messageRow.querySelector('.btn-useful');
    if (usefulBtn) {
      usefulBtn.addEventListener('click', () => {
        usefulBtn.classList.toggle('active');
        usefulBtn.textContent = usefulBtn.classList.contains('active') ? '👍 Saved' : '👍 Useful';
      });
    }

    const retryBtn = messageRow.querySelector('.btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        handleRetryResponse(messageRow);
      });
    }

    const deleteBtn = messageRow.querySelector('.btn-delete-msg');
    if (deleteBtn && messageId) {
      deleteBtn.addEventListener('click', () => {
        deleteSingleMessage(messageId, messageRow);
      });
    }

    return messageRow;
  }

  function attachDeleteActionToRow(messageRow, messageId) {
    if (!messageRow || !messageId) return;
    messageRow.setAttribute('data-id', messageId);
    const deleteBtn = messageRow.querySelector('.btn-delete-msg');
    if (deleteBtn) {
      deleteBtn.style.display = 'inline-flex';
      deleteBtn.onclick = () => {
        deleteSingleMessage(messageId, messageRow);
      };
    }
  }

  async function deleteSingleMessage(messageId, messageRow) {
    if (!state.currentConversationId || !state.authToken) return;
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/conversations/${state.currentConversationId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        messageRow.classList.add('deleting');
        setTimeout(() => {
          if (messageRow.parentNode) {
            messageRow.parentNode.removeChild(messageRow);
          }
          if (elements.messagesContainer && elements.messagesContainer.children.length === 0) {
            if (elements.welcomeState) elements.welcomeState.style.display = 'flex';
          }
        }, 250);

        state.messages = state.messages.filter(m => m.id !== messageId);
      } else {
        alert(data.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Network error while deleting message');
    }
  }

  async function clearCurrentConversationMessages() {
    if (!state.currentConversationId || !state.authToken) {
      startNewChat();
      return;
    }

    if (!confirm('Are you sure you want to clear all messages in this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${state.currentConversationId}/messages`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        state.messages = [];
        if (elements.messagesContainer) {
          elements.messagesContainer.innerHTML = '';
        }
        if (elements.welcomeState) {
          elements.welcomeState.style.display = 'flex';
        }
        loadConversations(state.currentConversationId);
      } else {
        alert(data.error || 'Failed to clear messages');
      }
    } catch (err) {
      console.error('Error clearing messages:', err);
      alert('Network error while clearing messages');
    }
  }

  async function handleRetryResponse(messageRow) {
    if (state.isGenerating || !state.currentConversationId || !state.authToken) return;

    state.isGenerating = true;
    elements.chatTextarea.disabled = true;
    elements.btnSend.disabled = true;

    const textDiv = messageRow.querySelector('.message-text');
    const retryBtn = messageRow.querySelector('.btn-retry');

    if (retryBtn) {
      retryBtn.disabled = true;
      retryBtn.textContent = '⏳ Retrying...';
      retryBtn.classList.add('spinning');
    }

    showTypingIndicator(true);
    scrollToBottom();

    try {
      const retryPayload = {
        persona: state.activePersona
      };
      if (state.customInstructions && state.customInstructions.trim()) {
        retryPayload.systemInstruction = state.customInstructions.trim();
      }

      const response = await fetch(`/api/conversations/${state.currentConversationId}/retry`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(retryPayload)
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      showTypingIndicator(false);

      if (response.ok && data.success && data.message) {
        const newReply = data.message.content;
        const newMsgId = data.message.id;
        if (textDiv) {
          textDiv.innerHTML = formatResponseText(newReply);
          textDiv.setAttribute('data-raw', newReply);
        }

        if (newMsgId) {
          attachDeleteActionToRow(messageRow, newMsgId);
        }

        // Update state.messages
        if (state.messages.length > 0) {
          for (let i = state.messages.length - 1; i >= 0; i--) {
            if (state.messages[i].role === 'assistant') {
              state.messages[i].content = newReply;
              if (newMsgId) state.messages[i].id = newMsgId;
              break;
            }
          }
        }

        // Refresh sidebar conversation list to reflect updated timestamp order
        if (state.authToken) {
          loadConversations(state.currentConversationId);
        }
      } else {
        alert(data.error || 'Failed to regenerate response');
      }
    } catch (err) {
      console.error('Error regenerating response:', err);
      showTypingIndicator(false);
      alert('Network error while retrying response');
    } finally {
      state.isGenerating = false;
      elements.chatTextarea.disabled = false;
      elements.chatTextarea.focus();
      if (retryBtn) {
        retryBtn.disabled = false;
        retryBtn.textContent = '🔄 Retry';
        retryBtn.classList.remove('spinning');
      }
    }
  }

  function showTypingIndicator(show) {
    if (!elements.typingIndicator) return;
    if (show) {
      elements.typingIndicator.classList.add('active');
    } else {
      elements.typingIndicator.classList.remove('active');
    }
  }

  function scrollToBottom() {
    if (elements.chatStream) {
      elements.chatStream.scrollTop = elements.chatStream.scrollHeight;
    }
  }

  // ==========================================================================
  // 12. Suggestion Cards
  // ==========================================================================
  function setupSuggestions() {
    elements.suggestionCards.forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt && !state.isGenerating) {
          elements.chatTextarea.value = prompt;
          elements.chatTextarea.dispatchEvent(new Event('input'));
          sendMessage();
        }
      });
    });
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatResponseText(str) {
    let formatted = escapeHtml(str);
    formatted = formatted.replace(/```javascript([\s\S]*?)```/g, '<pre style="background:#090d16; padding:1rem; border-radius:8px; margin:0.75rem 0; overflow-x:auto; font-family:monospace; color:#38bdf8;"><code>$1</code></pre>');
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre style="background:#090d16; padding:1rem; border-radius:8px; margin:0.75rem 0; overflow-x:auto; font-family:monospace; color:#38bdf8;"><code>$1</code></pre>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
});
