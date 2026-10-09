/**
 * PixelCraft AI - AI Website & UI/UX Studio Engine (builder.js)
 * Production-ready visual creation workspace:
 * - Sandboxed Iframe Rendering with Live PostMessage Bridge
 * - Visual Properties Inspector (Text, Color, Typography, Spacing, Assets)
 * - Multilingual & Tanglish Natural-Language Refinement
 * - Responsive Viewport Switcher (Desktop 1440px, Tablet 768px, Mobile 375px)
 * - Source Code Inspector (HTML, CSS, JS live two-way sync)
 * - Standalone HTML & Full ZIP Project Exporter
 * - Undo / Redo History Architecture
 */

(function() {
  'use strict';

  // Builder State
  const state = {
    currentProject: null,
    historyStack: [],
    historyIndex: -1,
    activeViewport: 'desktop', // 'desktop' | 'tablet' | 'mobile'
    editorMode: 'edit',        // 'edit' | 'preview'
    selectedElementData: null,
    isGenerating: false,
    activeCodeTab: 'html',     // 'html' | 'css' | 'js'
    exportFormat: 'zip'        // 'zip' | 'single'
  };

  // DOM Elements cache
  let el = {};

  function initElements() {
    el = {
      // Main containers & switchers
      chatStream: document.getElementById('chat-stream'),
      inputContainer: document.querySelector('.input-container'),
      builderWorkspace: document.getElementById('builder-workspace'),
      btnModeChat: document.getElementById('btn-mode-chat'),
      btnModeStudio: document.getElementById('btn-mode-studio'),
      btnSidebarStudio: document.getElementById('btn-sidebar-studio'),
      btnBuilderBackChat: document.getElementById('btn-builder-back-chat'),

      // Top Toolbar
      projectTitleInput: document.getElementById('builder-project-title-input'),
      statusPill: document.getElementById('builder-status-pill'),
      btnVpDesktop: document.getElementById('btn-vp-desktop'),
      btnVpTablet: document.getElementById('btn-vp-tablet'),
      btnVpMobile: document.getElementById('btn-vp-mobile'),
      btnInteractiveMode: document.getElementById('btn-builder-interactive-mode'),
      modeIcon: document.getElementById('builder-mode-icon'),
      modeLabel: document.getElementById('builder-mode-label'),
      btnUndo: document.getElementById('btn-builder-undo'),
      btnRedo: document.getElementById('btn-builder-redo'),
      btnCodeModal: document.getElementById('btn-builder-code'),
      btnExportModal: document.getElementById('btn-builder-export'),

      // Canvas & Device Frame
      deviceFrame: document.getElementById('builder-device-frame'),
      viewportDimensionBadge: document.getElementById('viewport-dimension-badge'),
      iframe: document.getElementById('builder-iframe'),
      loadingOverlay: document.getElementById('canvas-loading-overlay'),
      loadingTitle: document.getElementById('canvas-loading-title'),
      loadingSub: document.getElementById('canvas-loading-sub'),

      // Sections Panel
      sectionsList: document.getElementById('builder-sections-list'),
      btnRefreshTree: document.getElementById('btn-builder-refresh-tree'),

      // Refinement Bar
      refineInput: document.getElementById('builder-refine-input'),
      btnRefineSubmit: document.getElementById('btn-refine-submit'),
      btnRefineRegen: document.getElementById('btn-refine-regen'),
      refineChips: document.querySelectorAll('.refine-chip'),

      // Mobile Tabs
      mobTabButtons: document.querySelectorAll('.mob-tab-btn'),
      leftPanel: document.getElementById('builder-left-panel'),
      canvasWrapper: document.getElementById('builder-canvas-wrapper'),
      rightPanel: document.getElementById('builder-right-panel'),
      refineBar: document.getElementById('builder-refine-bar'),

      // Properties Inspector
      inspectorElemBadge: document.getElementById('inspector-elem-badge'),
      inspectorEmpty: document.getElementById('inspector-empty'),
      inspectorForm: document.getElementById('inspector-form'),
      propTextContent: document.getElementById('prop-text-content'),
      propTextColor: document.getElementById('prop-text-color'),
      labelTextColor: document.getElementById('label-text-color'),
      propBgColor: document.getElementById('prop-bg-color'),
      labelBgColor: document.getElementById('label-bg-color'),
      propFontSize: document.getElementById('prop-font-size'),
      propFontWeight: document.getElementById('prop-font-weight'),
      propPadding: document.getElementById('prop-padding'),
      propBorderRadius: document.getElementById('prop-border-radius'),
      groupImageSrc: document.getElementById('group-image-src'),
      propImgSrc: document.getElementById('prop-img-src'),
      groupLinkHref: document.getElementById('group-link-href'),
      propLinkHref: document.getElementById('prop-link-href'),
      propAiInstruction: document.getElementById('prop-ai-instruction'),
      btnPropAi: document.getElementById('btn-prop-ai'),

      // Code Inspector Modal
      modalCode: document.getElementById('modal-builder-code'),
      btnCloseCodeModal: document.getElementById('btn-close-code-modal'),
      codeEditorTextarea: document.getElementById('code-editor-textarea'),
      codeFileTabs: document.querySelectorAll('.code-tab'),
      codeSyncStatus: document.getElementById('code-sync-status'),
      btnCopyCode: document.getElementById('btn-copy-code'),
      btnApplyCodeToPreview: document.getElementById('btn-apply-code-to-preview'),

      // Export Modal
      modalExport: document.getElementById('modal-builder-export'),
      btnCloseExportModal: document.getElementById('btn-close-export-modal'),
      btnDismissExport: document.getElementById('btn-dismiss-export'),
      optExportZip: document.getElementById('opt-export-zip'),
      optExportSingle: document.getElementById('opt-export-single'),
      btnTriggerDownload: document.getElementById('btn-trigger-download')
    };
  }

  // ==========================================================================
  // Workspace Mode Switching (Chat vs Studio)
  // ==========================================================================
  function setWorkspaceMode(mode) {
    if (mode === 'studio') {
      if (el.chatStream) el.chatStream.style.display = 'none';
      if (el.inputContainer) el.inputContainer.style.display = 'none';
      if (el.builderWorkspace) el.builderWorkspace.style.display = 'flex';

      if (el.btnModeChat) el.btnModeChat.classList.remove('active');
      if (el.btnModeStudio) el.btnModeStudio.classList.add('active');

      // If no project loaded, load cached or default
      if (!state.currentProject) {
        const cached = loadCachedProject();
        if (cached) {
          loadProject(cached, false);
        } else {
          // Create initial starter project
          createStarterProject();
        }
      }
    } else {
      if (el.chatStream) el.chatStream.style.display = 'block';
      if (el.inputContainer) el.inputContainer.style.display = 'block';
      if (el.builderWorkspace) el.builderWorkspace.style.display = 'none';

      if (el.btnModeChat) el.btnModeChat.classList.add('active');
      if (el.btnModeStudio) el.btnModeStudio.classList.remove('active');
    }
  }

  // ==========================================================================
  // Viewport Switcher (Desktop, Tablet, Mobile)
  // ==========================================================================
  function setViewport(vp) {
    state.activeViewport = vp;
    [el.btnVpDesktop, el.btnVpTablet, el.btnVpMobile].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.getAttribute('data-vp') === vp);
    });

    if (!el.deviceFrame) return;

    el.deviceFrame.classList.remove('desktop', 'tablet', 'mobile');
    el.deviceFrame.classList.add(vp);

    if (vp === 'desktop') {
      if (el.viewportDimensionBadge) el.viewportDimensionBadge.textContent = '100% Fluid';
    } else if (vp === 'tablet') {
      if (el.viewportDimensionBadge) el.viewportDimensionBadge.textContent = '768px • Tablet';
    } else if (vp === 'mobile') {
      if (el.viewportDimensionBadge) el.viewportDimensionBadge.textContent = '375px • Mobile';
    }
  }

  // ==========================================================================
  // Interactive Mode Toggle (Edit vs Preview)
  // ==========================================================================
  function setEditorMode(mode) {
    state.editorMode = mode;
    const isEdit = mode === 'edit';

    if (el.btnInteractiveMode) {
      el.btnInteractiveMode.classList.toggle('active-preview', !isEdit);
    }
    if (el.modeIcon) el.modeIcon.textContent = isEdit ? '✏️' : '👁️';
    if (el.modeLabel) el.modeLabel.textContent = isEdit ? 'Edit Mode' : 'Preview Mode';

    // Broadcast mode to sandboxed iframe
    if (el.iframe && el.iframe.contentWindow) {
      el.iframe.contentWindow.postMessage({
        type: 'PIXELCRAFT_SET_MODE',
        mode: mode
      }, '*');
    }

    if (!isEdit) {
      hideInspector();
    }
  }

  // ==========================================================================
  // History Stack (Undo / Redo Architecture)
  // ==========================================================================
  function pushHistorySnapshot(project) {
    if (!project) return;
    const snapshot = JSON.parse(JSON.stringify(project));

    // Truncate any redo entries ahead of current index
    state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
    state.historyStack.push(snapshot);

    // Keep max 25 revisions in memory
    if (state.historyStack.length > 25) {
      state.historyStack.shift();
    }
    state.historyIndex = state.historyStack.length - 1;
    updateUndoRedoButtons();
  }

  function undo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      const snapshot = state.historyStack[state.historyIndex];
      loadProject(snapshot, false);
      updateUndoRedoButtons();
      showToastNotification('↩ Undone last change');
    }
  }

  function redo() {
    if (state.historyIndex < state.historyStack.length - 1) {
      state.historyIndex++;
      const snapshot = state.historyStack[state.historyIndex];
      loadProject(snapshot, false);
      updateUndoRedoButtons();
      showToastNotification('↪ Redone change');
    }
  }

  function updateUndoRedoButtons() {
    if (el.btnUndo) el.btnUndo.disabled = state.historyIndex <= 0;
    if (el.btnRedo) el.btnRedo.disabled = state.historyIndex >= state.historyStack.length - 1;
  }

  // ==========================================================================
  // Project Loading & Sandbox Iframe Rendering
  // ==========================================================================
  function loadProject(project, pushHistory = true) {
    if (!project) return;
    state.currentProject = project;

    // Cache to localStorage
    try {
      localStorage.setItem('pixelcraft_current_project', JSON.stringify(project));
    } catch (_) {}

    // Update UI headers
    if (el.projectTitleInput) {
      el.projectTitleInput.value = project.title || 'Untitled Project';
    }
    if (el.statusPill) {
      el.statusPill.textContent = 'v' + (project.version || 1);
    }

    // Populate Layers tree
    renderSectionsTree(project.sections || []);

    // Bundle HTML document & set iframe srcdoc
    const docHtml = bundleDocumentHtml(project);
    if (el.iframe) {
      el.iframe.srcdoc = docHtml;
    }

    if (pushHistory) {
      pushHistorySnapshot(project);
    }
  }

  function bundleDocumentHtml(project) {
    const headingFont = project.designSpec?.typography?.headingFont || 'Plus Jakarta Sans';
    const bodyFont = project.designSpec?.typography?.bodyFont || 'Inter';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title || 'PixelCraft Preview')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800&family=${encodeURIComponent(bodyFont)}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html {
      scroll-behavior: smooth;
      font-size: 16px;
    }
    body {
      font-family: '${bodyFont}', sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
      min-height: 100vh;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    button, input, textarea, select {
      font-family: inherit;
    }

    /* Editor Highlighting */
    [data-pixelcraft-selected="true"] {
      outline: 2px solid #6366f1 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.45) !important;
    }

    /* Generated Stylesheet */
    ${project.css || ''}
  </style>
</head>
<body>
  ${project.html || ''}

  <!-- Sandbox Bridge -->
  <script>
    (function() {
      let isEditorMode = true;
      let selectedElement = null;

      document.body.addEventListener('click', function(e) {
        if (!isEditorMode) return;
        const target = e.target.closest('h1, h2, h3, h4, p, a, button, img, section, div.card, div.pricing-card, [data-section]');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        if (selectedElement) {
          selectedElement.removeAttribute('data-pixelcraft-selected');
        }

        selectedElement = target;
        selectedElement.setAttribute('data-pixelcraft-selected', 'true');

        const computed = window.getComputedStyle(target);
        window.parent.postMessage({
          type: 'PIXELCRAFT_ELEMENT_SELECTED',
          payload: {
            tagName: target.tagName.toLowerCase(),
            id: target.id || '',
            className: target.className || '',
            textContent: (target.children.length === 0 || ['BUTTON', 'A', 'P', 'H1', 'H2', 'H3', 'H4'].includes(target.tagName)) ? target.innerText.trim() : '',
            src: target.getAttribute('src') || '',
            href: target.getAttribute('href') || '',
            styles: {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              borderRadius: computed.borderRadius,
              padding: computed.padding
            }
          }
        }, '*');
      }, true);

      window.addEventListener('message', function(event) {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'PIXELCRAFT_SET_MODE') {
          isEditorMode = data.mode === 'edit';
          if (!isEditorMode && selectedElement) {
            selectedElement.removeAttribute('data-pixelcraft-selected');
            selectedElement = null;
          }
        }

        if (data.type === 'PIXELCRAFT_UPDATE_SELECTED_ELEMENT' && selectedElement) {
          const updates = data.payload;
          if (updates.textContent !== undefined) {
            selectedElement.textContent = updates.textContent;
          }
          if (updates.src !== undefined && selectedElement.tagName === 'IMG') {
            selectedElement.src = updates.src;
          }
          if (updates.href !== undefined && selectedElement.tagName === 'A') {
            selectedElement.href = updates.href;
          }
          if (updates.styles) {
            for (const [prop, val] of Object.entries(updates.styles)) {
              selectedElement.style[prop] = val;
            }
          }
          window.parent.postMessage({
            type: 'PIXELCRAFT_HTML_UPDATED',
            html: document.body.innerHTML
          }, '*');
        }

        if (data.type === 'PIXELCRAFT_SCROLL_TO_SECTION' && data.sectionId) {
          const el = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (selectedElement) selectedElement.removeAttribute('data-pixelcraft-selected');
            selectedElement = el;
            selectedElement.setAttribute('data-pixelcraft-selected', 'true');
          }
        }
      });
    })();
  </script>

  <script>
    ${project.js || ''}
  </script>
</body>
</html>`;
  }

  // ==========================================================================
  // Layers & Sections Navigator
  // ==========================================================================
  function renderSectionsTree(sections) {
    if (!el.sectionsList) return;
    el.sectionsList.innerHTML = '';

    if (!sections || sections.length === 0) {
      el.sectionsList.innerHTML = '<li class="section-tree-item empty">No sections loaded</li>';
      return;
    }

    const typeIcons = {
      navbar: '🧭',
      hero: '⚡',
      features: '🍱',
      pricing: '💳',
      testimonials: '💬',
      faq: '❓',
      contact: '✉️',
      footer: '⚓',
      default: '📄'
    };

    sections.forEach(sec => {
      const li = document.createElement('li');
      li.className = 'section-tree-item';
      li.setAttribute('data-section-id', sec.id);

      const icon = typeIcons[sec.type] || typeIcons.default;
      li.innerHTML = `
        <span class="sec-tree-icon">${icon}</span>
        <span class="sec-tree-name">${escapeHtml(sec.name || sec.id)}</span>
        <button type="button" class="btn-sec-refine" title="Refine with AI">✨</button>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.closest('.btn-sec-refine')) {
          e.stopPropagation();
          promptRefineSection(sec);
          return;
        }

        // Highlight active item
        document.querySelectorAll('.section-tree-item').forEach(i => i.classList.remove('active'));
        li.classList.add('active');

        // Tell iframe to scroll to section
        if (el.iframe && el.iframe.contentWindow) {
          el.iframe.contentWindow.postMessage({
            type: 'PIXELCRAFT_SCROLL_TO_SECTION',
            sectionId: sec.id
          }, '*');
        }
      });

      el.sectionsList.appendChild(li);
    });
  }

  function promptRefineSection(sec) {
    if (!el.refineInput) return;
    el.refineInput.value = `Update ${sec.name}: `;
    el.refineInput.focus();
    showToastNotification(`Targeting ${sec.name} for AI refinement`);
  }

  // ==========================================================================
  // Visual Properties Inspector
  // ==========================================================================
  function handleElementSelected(elemData) {
    state.selectedElementData = elemData;

    if (el.inspectorEmpty) el.inspectorEmpty.style.display = 'none';
    if (el.inspectorForm) el.inspectorForm.style.display = 'block';

    if (el.inspectorElemBadge) {
      el.inspectorElemBadge.textContent = elemData.tagName + (elemData.className ? '.' + elemData.className.split(' ')[0] : '');
    }

    // Text content
    if (el.propTextContent) {
      el.propTextContent.value = elemData.textContent || '';
    }

    // Colors
    if (elemData.styles) {
      if (el.propTextColor && elemData.styles.color) {
        const hex = rgbToHex(elemData.styles.color);
        if (hex) {
          el.propTextColor.value = hex;
          if (el.labelTextColor) el.labelTextColor.textContent = hex;
        }
      }
      if (el.propBgColor && elemData.styles.backgroundColor) {
        const hex = rgbToHex(elemData.styles.backgroundColor);
        if (hex) {
          el.propBgColor.value = hex;
          if (el.labelBgColor) el.labelBgColor.textContent = hex;
        }
      }
      if (el.propFontSize) {
        el.propFontSize.value = elemData.styles.fontSize || '';
      }
      if (el.propFontWeight) {
        el.propFontWeight.value = elemData.styles.fontWeight || '400';
      }
      if (el.propPadding) {
        el.propPadding.value = elemData.styles.padding || '';
      }
      if (el.propBorderRadius) {
        el.propBorderRadius.value = elemData.styles.borderRadius || '';
      }
    }

    // Contextual: Image Source
    if (el.groupImageSrc) {
      const isImg = elemData.tagName === 'img';
      el.groupImageSrc.style.display = isImg ? 'block' : 'none';
      if (isImg && el.propImgSrc) {
        el.propImgSrc.value = elemData.src || '';
      }
    }

    // Contextual: Link Target
    if (el.groupLinkHref) {
      const isLink = elemData.tagName === 'a';
      el.groupLinkHref.style.display = isLink ? 'block' : 'none';
      if (isLink && el.propLinkHref) {
        el.propLinkHref.value = elemData.href || '';
      }
    }
  }

  function hideInspector() {
    state.selectedElementData = null;
    if (el.inspectorEmpty) el.inspectorEmpty.style.display = 'block';
    if (el.inspectorForm) el.inspectorForm.style.display = 'none';
    if (el.inspectorElemBadge) el.inspectorElemBadge.textContent = 'None';
  }

  function dispatchElementStyleUpdate(updates) {
    if (!el.iframe || !el.iframe.contentWindow) return;
    el.iframe.contentWindow.postMessage({
      type: 'PIXELCRAFT_UPDATE_SELECTED_ELEMENT',
      payload: updates
    }, '*');
  }

  // ==========================================================================
  // Generation & Natural-Language Refinement
  // ==========================================================================
  async function generateDesign(userPrompt) {
    if (state.isGenerating || !userPrompt.trim()) return;
    state.isGenerating = true;
    showLoadingOverlay(true, 'Analysing your prompt...', 'Understanding requirements, style, and structure');

    try {
      const token = localStorage.getItem('supabase_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Progressive progress updates
      const t1 = setTimeout(() => {
        updateLoadingProgress('Planning layout & sections...', 'Structuring semantic HTML, responsive grids, and components');
      }, 5000);
      const t2 = setTimeout(() => {
        updateLoadingProgress('Crafting aesthetics & visuals...', 'Applying typography, colors, animations, and micro-interactions');
      }, 15000);
      const t3 = setTimeout(() => {
        updateLoadingProgress('Rendering live interactive preview...', 'Mounting sandboxed application canvas');
      }, 25000);

      const response = await fetch('/api/builder/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: userPrompt.trim() })
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const data = await response.json();
      if (response.ok && data.success && data.project) {
        loadProject(data.project, true);
        showToastNotification('🎉 Design generated successfully!');
      } else {
        alert(data.error || 'Failed to generate design. Please try again.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      alert('Network error connecting to design generator. Please verify connection.');
    } finally {
      state.isGenerating = false;
      showLoadingOverlay(false);
    }
  }

  async function refineDesign(deltaPrompt) {
    if (state.isGenerating || !deltaPrompt.trim()) return;
    if (!state.currentProject) {
      return generateDesign(deltaPrompt);
    }

    state.isGenerating = true;
    showLoadingOverlay(true, 'Applying modifications...', 'Interpreting instructions and refining components');

    try {
      const token = localStorage.getItem('supabase_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/builder/refine', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: deltaPrompt.trim(),
          currentProject: state.currentProject
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.project) {
        loadProject(data.project, true);
        if (el.refineInput) el.refineInput.value = '';
        showToastNotification(data.project.lastChangeSummary || '✨ Design updated successfully!');
      } else {
        alert(data.error || 'Failed to apply design modification.');
      }
    } catch (err) {
      console.error('Refinement error:', err);
      alert('Network error updating design. Please retry.');
    } finally {
      state.isGenerating = false;
      showLoadingOverlay(false);
    }
  }

  function showLoadingOverlay(show, title, sub) {
    if (!el.loadingOverlay) return;
    el.loadingOverlay.style.display = show ? 'flex' : 'none';
    if (show) {
      if (el.loadingTitle && title) el.loadingTitle.textContent = title;
      if (el.loadingSub && sub) el.loadingSub.textContent = sub;
    }
  }

  function updateLoadingProgress(title, sub) {
    if (el.loadingTitle && title) el.loadingTitle.textContent = title;
    if (el.loadingSub && sub) el.loadingSub.textContent = sub;
  }

  // ==========================================================================
  // Code Inspector & Live Editor
  // ==========================================================================
  function openCodeModal() {
    if (!state.currentProject) return;
    if (el.modalCode) el.modalCode.style.display = 'flex';
    setCodeTab('html');
  }

  function closeCodeModal() {
    if (el.modalCode) el.modalCode.style.display = 'none';
  }

  function setCodeTab(tab) {
    state.activeCodeTab = tab;
    el.codeFileTabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-file') === tab);
    });

    if (!el.codeEditorTextarea || !state.currentProject) return;

    if (tab === 'html') {
      el.codeEditorTextarea.value = state.currentProject.html || '';
    } else if (tab === 'css') {
      el.codeEditorTextarea.value = state.currentProject.css || '';
    } else if (tab === 'js') {
      el.codeEditorTextarea.value = state.currentProject.js || '';
    }
    if (el.codeSyncStatus) el.codeSyncStatus.textContent = 'Viewing ' + tab.toUpperCase();
  }

  function applyCodeChangesToPreview() {
    if (!state.currentProject || !el.codeEditorTextarea) return;
    const content = el.codeEditorTextarea.value;

    if (state.activeCodeTab === 'html') {
      state.currentProject.html = content;
    } else if (state.activeCodeTab === 'css') {
      state.currentProject.css = content;
    } else if (state.activeCodeTab === 'js') {
      state.currentProject.js = content;
    }

    state.currentProject.version = (state.currentProject.version || 1) + 1;
    loadProject(state.currentProject, true);

    if (el.codeSyncStatus) {
      el.codeSyncStatus.textContent = '⚡ Changes synced to preview!';
      setTimeout(() => {
        if (el.codeSyncStatus) el.codeSyncStatus.textContent = 'Ready';
      }, 2500);
    }
    showToastNotification('⚡ Code synced to live preview!');
  }

  function copyCurrentCode() {
    if (!el.codeEditorTextarea) return;
    navigator.clipboard.writeText(el.codeEditorTextarea.value).then(() => {
      showToastNotification('📋 Code copied to clipboard!');
    }).catch(() => {
      el.codeEditorTextarea.select();
      document.execCommand('copy');
      showToastNotification('📋 Code copied to clipboard!');
    });
  }

  // ==========================================================================
  // Project Export (ZIP & Standalone HTML)
  // ==========================================================================
  function openExportModal() {
    if (!state.currentProject) return;
    if (el.modalExport) el.modalExport.style.display = 'flex';
  }

  function closeExportModal() {
    if (el.modalExport) el.modalExport.style.display = 'none';
  }

  async function executeExport() {
    if (!state.currentProject) return;
    const project = state.currentProject;
    const slug = (project.title || 'pixelcraft-project').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (state.exportFormat === 'single') {
      // Standalone single HTML download
      const htmlDoc = bundleDocumentHtml(project);
      downloadBlob(new Blob([htmlDoc], { type: 'text/html' }), `${slug}.html`);
      showToastNotification('📥 Downloaded standalone HTML website!');
      closeExportModal();
    } else {
      // Full ZIP Package with JSZip
      if (typeof window.JSZip === 'undefined') {
        alert('ZIP export engine loading... Please try again in a few moments.');
        return;
      }

      const zip = new window.JSZip();
      
      // index.html
      const standaloneIndex = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title || 'PixelCraft Website')}</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  ${project.html || ''}
  <script src="js/app.js"></script>
</body>
</html>`;

      // README.md
      const readme = `# ${project.title || 'PixelCraft Website'}

Generated with PixelCraft AI Studio.

## Quick Start
1. Double-click \`index.html\` to open the website directly in any browser.
2. Or serve locally with any static web server:
   \`\`\`bash
   npx serve .
   \`\`\`

## Architecture
- \`index.html\` - Semantic HTML5 layout
- \`css/style.css\` - Responsive styling, custom properties & animations
- \`js/app.js\` - Vanilla JavaScript interactions
`;

      zip.file('index.html', standaloneIndex);
      zip.folder('css').file('style.css', project.css || '');
      zip.folder('js').file('app.js', project.js || '');
      zip.file('README.md', readme);

      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, `${slug}-project.zip`);
      showToastNotification('📦 Downloaded complete project ZIP package!');
      closeExportModal();
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // Starter Fallback Project
  // ==========================================================================
  function createStarterProject() {
    const starter = {
      id: 'proj_starter',
      title: 'Titan Gym & Performance',
      projectType: 'Fitness & Gym Website',
      version: 1,
      designSpec: {
        typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter' },
        colorPalette: { primary: '#ff6600', background: '#0f1117' },
        summary: 'High-intensity modern gym website with workout programs and membership plans'
      },
      sections: [
        { id: 'navbar', name: 'Navigation Bar', type: 'navbar' },
        { id: 'hero', name: 'Hero Showcase', type: 'hero' },
        { id: 'features', name: 'Core Programs', type: 'features' },
        { id: 'pricing', name: 'Membership Tiers', type: 'pricing' },
        { id: 'contact', name: 'Free Trial CTA', type: 'contact' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ],
      html: `
  <header class="site-header" id="navbar">
    <div class="nav-container">
      <div class="logo">⚡ TITAN GYM</div>
      <nav class="nav-menu">
        <a href="#hero" class="nav-link">Home</a>
        <a href="#features" class="nav-link">Programs</a>
        <a href="#pricing" class="nav-link">Pricing</a>
      </nav>
      <a href="#pricing" class="btn btn-primary">Join Today</a>
    </div>
  </header>

  <section class="hero-section" id="hero">
    <div class="container hero-grid">
      <div class="hero-content">
        <span class="badge">🔥 Premier Fitness Facility</span>
        <h1 class="hero-title">Forge Your Strongest Version</h1>
        <p class="hero-sub">World-class coaching, cutting-edge strength equipment, and a relentless culture designed for peak physical transformation.</p>
        <div class="hero-btns">
          <a href="#pricing" class="btn btn-primary btn-lg">Claim Free Pass</a>
          <a href="#features" class="btn btn-secondary btn-lg">Explore Programs</a>
        </div>
      </div>
      <div class="hero-media">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80" alt="Titan Gym Equipment" class="hero-img">
      </div>
    </div>
  </section>

  <section class="features-section" id="features">
    <div class="container">
      <h2 class="sec-title">Tailored Performance Disciplines</h2>
      <div class="features-grid">
        <div class="card">
          <span class="card-icon">⚡</span>
          <h3>Hypertrophy & Strength</h3>
          <p>Scientific barbell and resistance training engineered for maximum muscle growth and metabolic power.</p>
        </div>
        <div class="card">
          <span class="card-icon">🥊</span>
          <h3>Combat Conditioning</h3>
          <p>High-tempo striking and cardiovascular circuits to shred body fat while elevating endurance.</p>
        </div>
        <div class="card">
          <span class="card-icon">🧘</span>
          <h3>Mobility & Recovery</h3>
          <p>Active recovery protocols and cold plunging designed to keep your joints bulletproof.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="pricing-section" id="pricing">
    <div class="container">
      <h2 class="sec-title">Membership Investments</h2>
      <div class="pricing-grid">
        <div class="pricing-card">
          <h3>Standard</h3>
          <div class="price">$39<span>/mo</span></div>
          <p>Essential 24/7 access to all strength zones and locker facilities.</p>
          <a href="#contact" class="btn btn-secondary w-full">Select Standard</a>
        </div>
        <div class="pricing-card popular">
          <div class="popular-tag">Most Popular</div>
          <h3>Pro Athlete</h3>
          <div class="price">$79<span>/mo</span></div>
          <p>All-access pass with weekly personal coaching and custom nutrition plans.</p>
          <a href="#contact" class="btn btn-primary w-full">Join Pro</a>
        </div>
        <div class="pricing-card">
          <h3>Elite VIP</h3>
          <div class="price">$139<span>/mo</span></div>
          <p>Unlimited personal training, private spa suite access, and recovery lounges.</p>
          <a href="#contact" class="btn btn-secondary w-full">Join VIP</a>
        </div>
      </div>
    </div>
  </section>

  <footer class="site-footer" id="footer">
    <div class="container">
      <p>© ${new Date().getFullYear()} Titan Gym. Powered by PixelCraft AI Studio.</p>
    </div>
  </footer>
      `,
      css: `
  :root {
    --primary: #ff6600;
    --primary-glow: rgba(255, 102, 0, 0.4);
    --bg: #0f1117;
    --surface: #181c26;
    --border: rgba(255, 255, 255, 0.08);
    --text: #ffffff;
    --text-muted: #94a3b8;
  }
  body { background: var(--bg); color: var(--text); }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .site-header { padding: 18px 0; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(15,17,23,0.9); backdrop-filter: blur(12px); z-index: 10; }
  .nav-container { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .logo { font-weight: 800; font-size: 1.3rem; color: var(--primary); }
  .nav-menu { display: flex; gap: 24px; }
  .nav-link { color: var(--text-muted); text-decoration: none; font-weight: 500; transition: color 0.2s; }
  .nav-link:hover { color: var(--primary); }
  .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 22px; border-radius: 9999px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
  .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 16px var(--primary-glow); }
  .btn-primary:hover { transform: translateY(-2px); filter: brightness(1.1); }
  .btn-secondary { background: rgba(255,255,255,0.06); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { background: rgba(255,255,255,0.12); }
  .btn-lg { padding: 14px 28px; font-size: 1.05rem; }
  .w-full { width: 100%; }

  .hero-section { padding: 80px 0; }
  .hero-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 48px; align-items: center; }
  .badge { display: inline-block; padding: 6px 14px; background: rgba(255,102,0,0.15); color: var(--primary); border-radius: 9999px; font-weight: 600; font-size: 0.85rem; margin-bottom: 18px; }
  .hero-title { font-size: 3.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 20px; }
  .hero-sub { color: var(--text-muted); font-size: 1.15rem; margin-bottom: 32px; max-width: 520px; }
  .hero-btns { display: flex; gap: 16px; }
  .hero-img { width: 100%; height: 420px; object-fit: cover; border-radius: 16px; border: 1px solid var(--border); }

  .sec-title { text-align: center; font-size: 2.3rem; font-weight: 800; margin-bottom: 48px; }
  .features-section, .pricing-section { padding: 90px 0; border-top: 1px solid var(--border); }
  .features-grid, .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .card, .pricing-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 36px 28px; }
  .card-icon { font-size: 2rem; margin-bottom: 16px; display: block; }
  .card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 12px; }
  .card p { color: var(--text-muted); font-size: 0.95rem; }

  .pricing-card.popular { border-color: var(--primary); box-shadow: 0 10px 30px var(--primary-glow); position: relative; }
  .popular-tag { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
  .pricing-card h3 { font-size: 1.3rem; margin-bottom: 12px; }
  .price { font-size: 2.8rem; font-weight: 800; color: var(--text); margin-bottom: 12px; }
  .price span { font-size: 1rem; color: var(--text-muted); }
  .pricing-card p { color: var(--text-muted); margin-bottom: 28px; font-size: 0.95rem; }

  .site-footer { padding: 40px 0; text-align: center; color: var(--text-muted); border-top: 1px solid var(--border); font-size: 0.9rem; }

  @media (max-width: 900px) {
    .hero-grid { grid-template-columns: 1fr; text-align: center; }
    .hero-sub { margin: 0 auto 32px; }
    .hero-btns { justify-content: center; }
    .features-grid, .pricing-grid { grid-template-columns: 1fr; }
  }
      `,
      js: ''
    };
    loadProject(starter, true);
  }

  function loadCachedProject() {
    try {
      const stored = localStorage.getItem('pixelcraft_current_project');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================
  function rgbToHex(rgbStr) {
    if (!rgbStr || rgbStr === 'transparent') return null;
    if (rgbStr.startsWith('#')) return rgbStr;
    const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return null;
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function showToastNotification(text) {
    let toast = document.getElementById('studio-toast-banner');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'studio-toast-banner';
      toast.className = 'studio-toast-banner';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.display = 'block';
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3000);
  }

  // ==========================================================================
  // Event Bindings
  // ==========================================================================
  function setupEvents() {
    // Mode Switchers
    if (el.btnModeChat) el.btnModeChat.addEventListener('click', () => setWorkspaceMode('chat'));
    if (el.btnModeStudio) el.btnModeStudio.addEventListener('click', () => setWorkspaceMode('studio'));
    if (el.btnSidebarStudio) el.btnSidebarStudio.addEventListener('click', () => setWorkspaceMode('studio'));
    if (el.btnBuilderBackChat) el.btnBuilderBackChat.addEventListener('click', () => setWorkspaceMode('chat'));

    // Viewport Switchers
    if (el.btnVpDesktop) el.btnVpDesktop.addEventListener('click', () => setViewport('desktop'));
    if (el.btnVpTablet) el.btnVpTablet.addEventListener('click', () => setViewport('tablet'));
    if (el.btnVpMobile) el.btnVpMobile.addEventListener('click', () => setViewport('mobile'));

    // Mode Toggle
    if (el.btnInteractiveMode) {
      el.btnInteractiveMode.addEventListener('click', () => {
        setEditorMode(state.editorMode === 'edit' ? 'preview' : 'edit');
      });
    }

    // Undo / Redo
    if (el.btnUndo) el.btnUndo.addEventListener('click', undo);
    if (el.btnRedo) el.btnRedo.addEventListener('click', redo);

    // Keyboard shortcuts for Undo/Redo
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    });

    // Project title renaming
    if (el.projectTitleInput) {
      el.projectTitleInput.addEventListener('change', () => {
        if (state.currentProject) {
          state.currentProject.title = el.projectTitleInput.value.trim() || 'Untitled Project';
          pushHistorySnapshot(state.currentProject);
        }
      });
    }

    // Refinement Prompt Submit
    if (el.btnRefineSubmit) {
      el.btnRefineSubmit.addEventListener('click', () => {
        const val = el.refineInput ? el.refineInput.value : '';
        if (val) refineDesign(val);
      });
    }

    if (el.refineInput) {
      el.refineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const val = el.refineInput.value;
          if (val) refineDesign(val);
        }
      });
    }

    // Quick Chips
    el.refineChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) refineDesign(prompt);
      });
    });

    // Full Regenerate
    if (el.btnRefineRegen) {
      el.btnRefineRegen.addEventListener('click', () => {
        if (confirm('Regenerate entire website design based on the original requirements?')) {
          const p = state.currentProject?.originalPrompt || el.refineInput?.value || 'Modern web application';
          generateDesign(p);
        }
      });
    }

    // Tree Refresh
    if (el.btnRefreshTree) {
      el.btnRefreshTree.addEventListener('click', () => {
        if (state.currentProject) renderSectionsTree(state.currentProject.sections || []);
      });
    }

    // Mobile tabs switcher
    el.mobTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        el.mobTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');

        if (el.leftPanel) el.leftPanel.classList.toggle('mob-visible', tab === 'layers');
        if (el.rightPanel) el.rightPanel.classList.toggle('mob-visible', tab === 'props');
        if (el.refineBar) el.refineBar.classList.toggle('mob-visible', tab === 'prompt');
        if (el.canvasWrapper) el.canvasWrapper.classList.toggle('mob-visible', tab === 'canvas');
      });
    });

    // Visual Inspector Two-Way Bindings
    if (el.propTextContent) {
      el.propTextContent.addEventListener('input', () => {
        dispatchElementStyleUpdate({ textContent: el.propTextContent.value });
      });
    }

    if (el.propTextColor) {
      el.propTextColor.addEventListener('input', () => {
        const val = el.propTextColor.value;
        if (el.labelTextColor) el.labelTextColor.textContent = val;
        dispatchElementStyleUpdate({ styles: { color: val } });
      });
    }

    if (el.propBgColor) {
      el.propBgColor.addEventListener('input', () => {
        const val = el.propBgColor.value;
        if (el.labelBgColor) el.labelBgColor.textContent = val;
        dispatchElementStyleUpdate({ styles: { backgroundColor: val } });
      });
    }

    if (el.propFontSize) {
      el.propFontSize.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { fontSize: el.propFontSize.value } });
      });
    }

    if (el.propFontWeight) {
      el.propFontWeight.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { fontWeight: el.propFontWeight.value } });
      });
    }

    if (el.propPadding) {
      el.propPadding.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { padding: el.propPadding.value } });
      });
    }

    if (el.propBorderRadius) {
      el.propBorderRadius.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { borderRadius: el.propBorderRadius.value } });
      });
    }

    if (el.propImgSrc) {
      el.propImgSrc.addEventListener('change', () => {
        dispatchElementStyleUpdate({ src: el.propImgSrc.value });
      });
    }

    if (el.propLinkHref) {
      el.propLinkHref.addEventListener('change', () => {
        dispatchElementStyleUpdate({ href: el.propLinkHref.value });
      });
    }

    // AI Element Modifier
    if (el.btnPropAi && el.propAiInstruction) {
      el.btnPropAi.addEventListener('click', () => {
        const instruction = el.propAiInstruction.value.trim();
        if (instruction) {
          refineDesign(`For the selected ${state.selectedElementData?.tagName || 'element'}: ${instruction}`);
          el.propAiInstruction.value = '';
        }
      });
    }

    // Code Modal
    if (el.btnCodeModal) el.btnCodeModal.addEventListener('click', openCodeModal);
    if (el.btnCloseCodeModal) el.btnCloseCodeModal.addEventListener('click', closeCodeModal);
    el.codeFileTabs.forEach(t => {
      t.addEventListener('click', () => setCodeTab(t.getAttribute('data-file')));
    });
    if (el.btnApplyCodeToPreview) el.btnApplyCodeToPreview.addEventListener('click', applyCodeChangesToPreview);
    if (el.btnCopyCode) el.btnCopyCode.addEventListener('click', copyCurrentCode);

    // Export Modal
    if (el.btnExportModal) el.btnExportModal.addEventListener('click', openExportModal);
    if (el.btnCloseExportModal) el.btnCloseExportModal.addEventListener('click', closeExportModal);
    if (el.btnDismissExport) el.btnDismissExport.addEventListener('click', closeExportModal);
    if (el.optExportZip) {
      el.optExportZip.addEventListener('click', () => {
        state.exportFormat = 'zip';
        el.optExportZip.classList.add('selected');
        if (el.optExportSingle) el.optExportSingle.classList.remove('selected');
      });
    }
    if (el.optExportSingle) {
      el.optExportSingle.addEventListener('click', () => {
        state.exportFormat = 'single';
        el.optExportSingle.classList.add('selected');
        if (el.optExportZip) el.optExportZip.classList.remove('selected');
      });
    }
    if (el.btnTriggerDownload) el.btnTriggerDownload.addEventListener('click', executeExport);

    // Sandbox Iframe Message Bridge
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'PIXELCRAFT_ELEMENT_SELECTED') {
        handleElementSelected(data.payload);
      } else if (data.type === 'PIXELCRAFT_HTML_UPDATED') {
        if (state.currentProject) {
          state.currentProject.html = data.html;
          try {
            localStorage.setItem('pixelcraft_current_project', JSON.stringify(state.currentProject));
          } catch (_) {}
        }
      }
    });
  }

  // ==========================================================================
  // Public API Export (Window attachment)
  // ==========================================================================
  window.PixelCraftBuilder = {
    init: function() {
      initElements();
      setupEvents();
    },
    openStudio: function() {
      setWorkspaceMode('studio');
    },
    openChat: function() {
      setWorkspaceMode('chat');
    },
    generateFromPrompt: function(prompt) {
      setWorkspaceMode('studio');
      generateDesign(prompt);
    },
    loadProject: function(proj) {
      setWorkspaceMode('studio');
      loadProject(proj, true);
    },
    getCurrentProject: function() {
      return state.currentProject;
    }
  };

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    window.PixelCraftBuilder.init();
  });
})();
