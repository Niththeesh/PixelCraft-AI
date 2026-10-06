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
    promptSearchQuery: ''
  };

  // Try to parse saved user object
  try {
    const savedUser = localStorage.getItem('supabase_user');
    if (savedUser) {
      state.authUser = JSON.parse(savedUser);
    }
  } catch (e) {
    state.authUser = null;
  }

  // DOM Selectors
  const elements = {
    // Auth elements
    authView: document.getElementById('auth-view'),
    appContainer: document.getElementById('app-container'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    tabLogin: document.getElementById('tab-login'),
    tabSignup: document.getElementById('tab-signup'),
    authAlert: document.getElementById('auth-alert'),
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

    // User profile elements
    userAvatar: document.getElementById('user-avatar'),
    userDisplayEmail: document.getElementById('user-display-email'),
    userStatusText: document.getElementById('user-status-text'),
    btnLogout: document.getElementById('btn-logout'),

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
    chatTextarea: document.getElementById('chat-textarea'),
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

    // Check session on startup
    await checkInitialSession();
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
  // 1. Session Detection and Verification
  // ==========================================================================
  async function checkInitialSession() {
    if (!state.authToken) {
      showAuthView();
      return;
    }

    try {
      const response = await fetch('/api/auth/session', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          state.authUser = data.user;
          localStorage.setItem('supabase_user', JSON.stringify(data.user));
          showChatWorkspace();
          loadConversations();
          return;
        }
      }

      // Token invalid or expired
      handleLogout('Your session has expired. Please sign in again.');
    } catch (err) {
      console.error('Session check error:', err);
      // Fallback: If network issue but token exists, attempt to show workspace or auth view
      showAuthView('Could not verify existing session. Please sign in.');
    }
  }

  function showAuthView(alertMessage = null) {
    if (elements.authView) elements.authView.classList.add('active');
    if (elements.appContainer) elements.appContainer.classList.add('hidden');

    if (alertMessage) {
      showAuthAlert(alertMessage, 'error');
    } else {
      hideAuthAlert();
    }
  }

  function showChatWorkspace() {
    if (elements.authView) elements.authView.classList.remove('active');
    if (elements.appContainer) elements.appContainer.classList.remove('hidden');

    renderUserProfile();
  }

  function renderUserProfile() {
    if (!state.authUser) return;

    const email = state.authUser.email || 'User';
    if (elements.userDisplayEmail) {
      elements.userDisplayEmail.textContent = email;
      elements.userDisplayEmail.title = email;
    }

    if (elements.userAvatar) {
      // Derive initials from email
      const initial = email.substring(0, 2).toUpperCase();
      elements.userAvatar.textContent = initial;
    }

    if (elements.userStatusText) {
      elements.userStatusText.textContent = '● Authenticated';
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

    // Frontend Validations
    if (!email) {
      showAuthAlert('Please enter your email address.', 'error');
      elements.authEmail.focus();
      return;
    }

    if (!password) {
      showAuthAlert('Please enter your password.', 'error');
      elements.authPassword.focus();
      return;
    }

    if (password.length < 6) {
      showAuthAlert('Password must be at least 6 characters.', 'error');
      elements.authPassword.focus();
      return;
    }

    if (state.authMode === 'signup' && password !== confirmPassword) {
      showAuthAlert('Passwords do not match. Please verify.', 'error');
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
        if (data.session && data.session.access_token) {
          // Successful login or direct auto-login signup
          state.authToken = data.session.access_token;
          state.authUser = data.session.user;

          localStorage.setItem('supabase_access_token', state.authToken);
          localStorage.setItem('supabase_user', JSON.stringify(state.authUser));

          // Clear auth inputs
          elements.authPassword.value = '';
          if (elements.authConfirmPassword) elements.authConfirmPassword.value = '';

          // Transition to Chat Workspace
          showChatWorkspace();
          loadConversations();
        } else if (data.user) {
          // Registered but needs login
          showAuthAlert(data.message || 'Registration successful! Please sign in.', 'success');
          switchAuthMode('login');
        }
      } else {
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
        handleLogout();
      });
    }
  }

  async function handleLogout(message = null) {
    const token = state.authToken;

    // Reset local state
    state.authToken = null;
    state.authUser = null;
    state.conversations = [];
    state.currentConversationId = null;
    state.messages = [];

    localStorage.removeItem('supabase_access_token');
    localStorage.removeItem('supabase_user');

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

    // Show Auth Screen
    showAuthView(message);
  }

  function handleUnauthorized() {
    handleLogout('Session expired. Please sign in again.');
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
      elements.btnSend.disabled = !hasContent || state.isGenerating;
    });

    elements.chatTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    elements.btnSend.disabled = true;
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
        if (state.currentConversationId && state.messages.length > 0) {
          clearCurrentConversationMessages();
        } else {
          startNewChat();
        }
      });
    }

    if (elements.btnForkChat) {
      elements.btnForkChat.addEventListener('click', () => {
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
    if (!state.authToken) {
      alert('Please sign in to export conversations.');
      return;
    }

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
    if (!state.authToken) {
      alert('Please sign in to view conversation analytics.');
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
      elements.btnNewChat.addEventListener('click', startNewChat);
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

    // Reset textarea input
    elements.chatTextarea.value = '';
    elements.chatTextarea.style.height = 'auto';

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
      if (!state.currentConversationId && state.authToken) {
        const titleSnippet = text.length > 32 ? text.substring(0, 32).trim() + '...' : text;
        try {
          const convRes = await fetch('/api/conversations', {
            method: 'POST',
            headers: getAuthHeaders(),
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

      // 2. Dispatch to backend POST /api/chat with conversationId, persona, and Bearer Token
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
        headers: getAuthHeaders(),
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
