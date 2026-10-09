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
    saveStatus: 'saved',       // 'saved' | 'unsaved' | 'saving'
    zoomScale: 1,
    refinementScope: 'project',// 'project' | 'section' | 'element'
    selectedElementData: null,
    selectedSectionId: null,
    inViewSectionId: null,
    isFullPageMode: false,
    activeInspectorTab: 'section', // 'section' | 'element'
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
      saveStatusEl: document.getElementById('builder-save-status'),
      saveStatusText: document.getElementById('save-status-text'),
      btnTogglePromptPanel: document.getElementById('btn-toggle-prompt-panel'),
      btnVpDesktop: document.getElementById('btn-vp-desktop'),
      btnVpTablet: document.getElementById('btn-vp-tablet'),
      btnVpMobile: document.getElementById('btn-vp-mobile'),
      zoomSelect: document.getElementById('builder-zoom-select'),
      btnInteractiveMode: document.getElementById('btn-builder-interactive-mode'),
      modeIcon: document.getElementById('builder-mode-icon'),
      modeLabel: document.getElementById('builder-mode-label'),
      btnUndo: document.getElementById('btn-builder-undo'),
      btnRedo: document.getElementById('btn-builder-redo'),
      btnFullpage: document.getElementById('btn-builder-fullpage'),
      btnCodeModal: document.getElementById('btn-builder-code'),
      btnExportModal: document.getElementById('btn-builder-export'),

      // Canvas, Device Frame & Prompt Direction Card
      promptCard: document.getElementById('builder-prompt-card'),
      btnPromptToggle: document.getElementById('btn-prompt-toggle'),
      originalPromptInput: document.getElementById('builder-original-prompt-input'),
      btnPromptOptimize: document.getElementById('btn-prompt-optimize'),
      btnPromptUpdate: document.getElementById('btn-prompt-update'),
      deviceFrame: document.getElementById('builder-device-frame'),
      viewportDimensionBadge: document.getElementById('viewport-dimension-badge'),
      iframe: document.getElementById('builder-iframe'),
      loadingOverlay: document.getElementById('canvas-loading-overlay'),
      loadingTitle: document.getElementById('canvas-loading-title'),
      loadingSub: document.getElementById('canvas-loading-sub'),

      // Sections Panel
      sectionsList: document.getElementById('builder-sections-list'),
      sectionsCountBadge: document.getElementById('sections-count-badge'),
      btnRefreshTree: document.getElementById('btn-builder-refresh-tree'),
      btnAddSectionOpen: document.getElementById('btn-add-section-open'),

      // Multi-Scope Refinement Bar
      scopeBtnProject: document.getElementById('scope-btn-project'),
      scopeBtnSection: document.getElementById('scope-btn-section'),
      scopeBtnElement: document.getElementById('scope-btn-element'),
      scopeSectionPill: document.getElementById('scope-section-pill'),
      scopeElementPill: document.getElementById('scope-element-pill'),
      refineChipsContainer: document.getElementById('refine-chips-container'),
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

      // Inspector Tabs & Views
      tabBtnSection: document.getElementById('tab-btn-section'),
      tabBtnElement: document.getElementById('tab-btn-element'),
      inspectorSectionContent: document.getElementById('inspector-section-content'),
      inspectorElementContent: document.getElementById('inspector-element-content'),
      inspectorSectionEmpty: document.getElementById('inspector-section-empty'),
      inspectorSectionForm: document.getElementById('inspector-section-form'),

      // Section Inspector Controls
      secPropIdBadge: document.getElementById('sec-prop-id-badge'),
      secPropName: document.getElementById('sec-prop-name'),
      btnSecMoveUp: document.getElementById('btn-sec-move-up'),
      btnSecMoveDown: document.getElementById('btn-sec-move-down'),
      btnSecDelete: document.getElementById('btn-sec-delete'),
      sectionAiPrompt: document.getElementById('section-ai-prompt'),
      btnSectionAiApply: document.getElementById('btn-section-ai-apply'),
      secAiChips: document.querySelectorAll('.sec-ai-chip'),
      secPropHeading: document.getElementById('sec-prop-heading'),
      secPropParagraph: document.getElementById('sec-prop-paragraph'),
      secPropBgColor: document.getElementById('sec-prop-bg-color'),
      labelSecBgColor: document.getElementById('label-sec-bg-color'),
      secPropTextColor: document.getElementById('sec-prop-text-color'),
      labelSecTextColor: document.getElementById('label-sec-text-color'),
      secPropFontSize: document.getElementById('sec-prop-font-size'),
      secAlignButtons: document.querySelectorAll('#sec-prop-align-group .align-btn'),
      secPropPadding: document.getElementById('sec-prop-padding'),
      secPropImgUrl: document.getElementById('sec-prop-img-url'),
      secPropBtnText: document.getElementById('sec-prop-btn-text'),
      secPropBtnLink: document.getElementById('sec-prop-btn-link'),

      // Add Section Modal
      modalAddSection: document.getElementById('modal-add-section'),
      btnCloseAddSectionModal: document.getElementById('btn-close-add-section-modal'),
      btnCancelAddSection: document.getElementById('btn-cancel-add-section'),
      presetCards: document.querySelectorAll('.preset-card'),

      // Element Properties Inspector
      inspectorElemBadge: document.getElementById('inspector-elem-badge'),
      btnElemParentSec: document.getElementById('btn-elem-parent-sec'),
      inspectorEmpty: document.getElementById('inspector-empty'),
      inspectorForm: document.getElementById('inspector-form'),
      propTextContent: document.getElementById('prop-text-content'),
      propTextColor: document.getElementById('prop-text-color'),
      labelTextColor: document.getElementById('label-text-color'),
      propBgColor: document.getElementById('prop-bg-color'),
      labelBgColor: document.getElementById('label-bg-color'),
      propFontFamily: document.getElementById('prop-font-family'),
      propFontSize: document.getElementById('prop-font-size'),
      propFontWeight: document.getElementById('prop-font-weight'),
      elemAlignButtons: document.querySelectorAll('#elem-prop-align-group .align-btn'),
      propPadding: document.getElementById('prop-padding'),
      propMargin: document.getElementById('prop-margin'),
      propBorderRadius: document.getElementById('prop-border-radius'),
      propWidth: document.getElementById('prop-width'),
      propBorderWidth: document.getElementById('prop-border-width'),
      propBorderColor: document.getElementById('prop-border-color'),
      labelBorderColor: document.getElementById('label-border-color'),
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

  function setZoom(zoomVal) {
    state.zoomScale = zoomVal;
    if (!el.deviceFrame) return;

    if (zoomVal === 'fit') {
      const container = el.canvasWrapper;
      if (container) {
        const cWidth = container.clientWidth - 40;
        const targetWidth = state.activeViewport === 'desktop' ? 1200 : (state.activeViewport === 'tablet' ? 768 : 375);
        const fitScale = Math.min(1, Math.max(0.4, cWidth / targetWidth));
        el.deviceFrame.style.transform = `scale(${fitScale.toFixed(2)})`;
        el.deviceFrame.style.transformOrigin = 'top center';
      }
    } else {
      const scaleNum = parseFloat(zoomVal) || 1;
      el.deviceFrame.style.transform = scaleNum === 1 ? 'none' : `scale(${scaleNum})`;
      el.deviceFrame.style.transformOrigin = 'top center';
    }
  }

  function setSaveStatus(status) {
    state.saveStatus = status;
    if (!el.saveStatusEl || !el.saveStatusText) return;

    el.saveStatusEl.classList.remove('saved', 'unsaved', 'saving');
    el.saveStatusEl.classList.add(status);

    if (status === 'saved') {
      el.saveStatusText.textContent = 'Saved';
    } else if (status === 'unsaved') {
      el.saveStatusText.textContent = 'Unsaved';
    } else if (status === 'saving') {
      el.saveStatusText.textContent = 'Saving...';
    }
  }

  function setRefinementScope(scope) {
    state.refinementScope = scope;
    if (el.scopeBtnProject) el.scopeBtnProject.classList.toggle('active', scope === 'project');
    if (el.scopeBtnSection) el.scopeBtnSection.classList.toggle('active', scope === 'section');
    if (el.scopeBtnElement) el.scopeBtnElement.classList.toggle('active', scope === 'element');

    // Update chips based on scope
    updateRefinementChips(scope);
  }

  function updateRefinementChips(scope) {
    if (!el.refineChipsContainer) return;

    let chipsHtml = '';
    if (scope === 'section') {
      const secName = state.currentProject?.sections?.find(s => s.id === state.selectedSectionId)?.name || 'this section';
      chipsHtml = `
        <button type="button" class="refine-chip" data-prompt="Make this section more premium and modern">✨ Make Premium</button>
        <button type="button" class="refine-chip" data-prompt="Change the background of this section to black">🎨 Dark Background</button>
        <button type="button" class="refine-chip" data-prompt="Add three modern cards to this section">🍱 Add 3 Cards</button>
        <button type="button" class="refine-chip" data-prompt="Make this section responsive and polished on mobile">📱 Mobile Polish</button>
      `;
    } else if (scope === 'element') {
      const tag = state.selectedElementData?.tagName?.toUpperCase() || 'ELEMENT';
      chipsHtml = `
        <button type="button" class="refine-chip" data-prompt="Make this ${tag.toLowerCase()} bolder with glowing orange highlight">✨ Glow & Pop</button>
        <button type="button" class="refine-chip" data-prompt="Make this ${tag.toLowerCase()} uppercase with tracking">🔤 Bold Uppercase</button>
        <button type="button" class="refine-chip" data-prompt="Add subtle smooth hover elevation animation">⚡ Hover Elevation</button>
      `;
    } else {
      chipsHtml = `
        <button type="button" class="refine-chip" data-prompt="Change the color palette to black and orange with athletic vibes">🎨 Black & Orange Theme</button>
        <button type="button" class="refine-chip" data-prompt="Make the whole design modern dark luxury with glassmorphism cards">✨ Dark Luxury Glass</button>
        <button type="button" class="refine-chip" data-prompt="Add an interactive FAQ section with accordion after pricing">❓ Add FAQ Accordion</button>
        <button type="button" class="refine-chip" data-prompt="Make the mobile layout and navigation super smooth and responsive">📱 Polish Mobile Layout</button>
        <button type="button" class="refine-chip" data-prompt="Add subtle hover animations and card lift effects">⚡ Micro-Animations</button>
      `;
    }

    el.refineChipsContainer.innerHTML = chipsHtml;
    // Rebind chips
    el.refineChipsContainer.querySelectorAll('.refine-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) refineDesign(prompt);
      });
    });
  }

  function toggleFullPageMode() {
    state.isFullPageMode = !state.isFullPageMode;
    if (el.btnFullpage) {
      el.btnFullpage.classList.toggle('active', state.isFullPageMode);
    }
    if (el.builderWorkspace) {
      el.builderWorkspace.classList.toggle('fullpage-inspection-mode', state.isFullPageMode);
    }
    if (state.isFullPageMode) {
      showToastNotification('🔍 Full-page inspection mode enabled');
    } else {
      showToastNotification('Normal studio mode restored');
    }
  }

  // ==========================================================================
  // Interactive Mode Toggle (Design vs Preview)
  // ==========================================================================
  function setEditorMode(mode) {
    state.editorMode = mode;
    const isEdit = mode === 'edit';

    if (el.btnInteractiveMode) {
      el.btnInteractiveMode.classList.toggle('active-design', isEdit);
      el.btnInteractiveMode.classList.toggle('active-preview', !isEdit);
    }
    if (el.modeIcon) el.modeIcon.textContent = isEdit ? '✏️' : '👁️';
    if (el.modeLabel) el.modeLabel.textContent = isEdit ? 'Design Mode' : 'Preview Mode';

    // Broadcast mode to sandboxed iframe
    if (el.iframe && el.iframe.contentWindow) {
      el.iframe.contentWindow.postMessage({
        type: 'PIXELCRAFT_SET_MODE',
        mode: mode
      }, '*');
    }

    if (!isEdit) {
      hideInspector();
      showToastNotification('👁️ Preview Mode: Direct interactions & links enabled');
    } else {
      showToastNotification('✏️ Design Mode: Click any element or section to inspect');
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

    // DYNAMIC SECTION PARSER: Extract actual sections from HTML DOM
    const detected = detectProjectSections(project.html);
    state.currentProject.sections = detected;

    // Populate Sections tree
    renderSectionsTree(detected);

    // Synchronize selected section
    if (state.selectedSectionId && detected.some(s => s.id === state.selectedSectionId)) {
      populateSectionInspector(state.selectedSectionId);
    } else if (detected.length > 0) {
      selectSection(detected[0].id);
    } else {
      populateSectionInspector(null);
    }

    // Synchronize Original Prompt field
    if (el.originalPromptInput && project.originalPrompt) {
      el.originalPromptInput.value = project.originalPrompt;
    }

    // Bundle HTML document & set iframe srcdoc
    const docHtml = bundleDocumentHtml(project);
    if (el.iframe) {
      el.iframe.srcdoc = docHtml;
    }

    if (pushHistory) {
      pushHistorySnapshot(project);
    }
  }

  function syncAndReloadProject(selectSectionId = null) {
    if (!state.currentProject) return;

    // Re-detect sections from updated project HTML
    const detected = detectProjectSections(state.currentProject.html);
    state.currentProject.sections = detected;

    // Cache
    try {
      localStorage.setItem('pixelcraft_current_project', JSON.stringify(state.currentProject));
    } catch (_) {}

    renderSectionsTree(detected);

    // Update iframe preview
    const docHtml = bundleDocumentHtml(state.currentProject);
    if (el.iframe) {
      el.iframe.srcdoc = docHtml;
    }

    const targetSecId = selectSectionId || state.selectedSectionId || (detected.length > 0 ? detected[0].id : null);
    if (targetSecId) {
      selectSection(targetSecId);
    } else {
      populateSectionInspector(null);
    }

    pushHistorySnapshot(state.currentProject);
  }

  function bundleDocumentHtml(project) {
    if (!project) return '';
    const headingFont = project.designSpec?.typography?.headingFont || 'Plus Jakarta Sans';
    const bodyFont = project.designSpec?.typography?.bodyFont || 'Inter';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title || 'PixelCraft Generated Design')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800&family=${encodeURIComponent(bodyFont)}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Reset & Base Standards */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html {
      scroll-behavior: smooth;
      font-size: 16px;
      height: 100%;
    }
    body {
      font-family: '${bodyFont}', sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
      min-height: 100%;
      overflow-y: auto !important;
      scrollbar-width: thin;
      scrollbar-color: rgba(99, 102, 241, 0.4) transparent;
    }
    body::-webkit-scrollbar {
      width: 8px;
    }
    body::-webkit-scrollbar-track {
      background: transparent;
    }
    body::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.35);
      border-radius: 4px;
    }
    body::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.65);
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    button, input, textarea, select {
      font-family: inherit;
    }

    /* Section Selection Highlighting */
    [data-pixelcraft-section-selected="true"] {
      outline: 3px solid #6366f1 !important;
      outline-offset: -3px !important;
      box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.6), 0 0 25px rgba(99, 102, 241, 0.35) !important;
      position: relative;
    }

    /* Selection Highlighting for Visual Editor */
    [data-pixelcraft-selected="true"] {
      outline: 2px solid #6366f1 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.45) !important;
    }
    [data-pixelcraft-hover="true"] {
      outline: 1px dashed #38bdf8 !important;
      outline-offset: 2px !important;
    }
    .pixelcraft-section-hidden {
      display: none !important;
    }

    /* Generated Stylesheet */
    ${project.css || ''}
  </style>
</head>
<body>
  ${project.html || ''}

  <!-- Sandbox Message Bridge & Visual Selection Listener -->
  <script>
    (function() {
      let isEditorMode = true;
      let selectedElement = null;
      let selectedSectionEl = null;

      // Hover listener for preview outline
      document.body.addEventListener('mouseover', function(e) {
        if (!isEditorMode) return;
        const target = e.target.closest('h1, h2, h3, h4, p, a, button, img, section, div.card, div.pricing-card, [data-section]');
        if (target && target !== selectedElement) {
          target.setAttribute('data-pixelcraft-hover', 'true');
        }
      }, true);

      document.body.addEventListener('mouseout', function(e) {
        const target = e.target.closest('[data-pixelcraft-hover="true"]');
        if (target) {
          target.removeAttribute('data-pixelcraft-hover');
        }
      }, true);

      // Handle element and section selection
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
        const parentSec = target.closest('section, header, footer, nav, [data-section]');
        const parentSectionId = parentSec ? (parentSec.id || parentSec.getAttribute('data-section') || '') : '';

        // Notify parent workspace
        window.parent.postMessage({
          type: 'PIXELCRAFT_ELEMENT_SELECTED',
          payload: {
            tagName: target.tagName.toLowerCase(),
            id: target.id || '',
            className: target.className || '',
            textContent: (target.children.length === 0 || ['BUTTON', 'A', 'P', 'H1', 'H2', 'H3', 'H4'].includes(target.tagName)) ? target.innerText.trim() : '',
            src: target.getAttribute('src') || '',
            href: target.getAttribute('href') || '',
            parentSectionId: parentSectionId,
            styles: {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontFamily: computed.fontFamily,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              borderRadius: computed.borderRadius,
              padding: computed.padding,
              margin: computed.margin,
              width: computed.width,
              borderWidth: computed.borderWidth,
              borderColor: computed.borderColor,
              textAlign: computed.textAlign
            }
          }
        }, '*');
      }, true);

      // Track sections entering visible viewport
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
              const secId = entry.target.id || entry.target.getAttribute('data-section') || '';
              if (secId) {
                window.parent.postMessage({
                  type: 'PIXELCRAFT_SECTION_IN_VIEW',
                  sectionId: secId
                }, '*');
              }
            }
          });
        }, { threshold: [0.2, 0.5] });

        document.querySelectorAll('header, nav, section, footer, [data-section]').forEach(el => observer.observe(el));
      }

      // Listen for updates from parent properties inspector
      window.addEventListener('message', function(event) {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'PIXELCRAFT_SET_MODE') {
          isEditorMode = data.mode === 'edit';
          if (!isEditorMode) {
            if (selectedElement) {
              selectedElement.removeAttribute('data-pixelcraft-selected');
              selectedElement = null;
            }
            if (selectedSectionEl) {
              selectedSectionEl.removeAttribute('data-pixelcraft-section-selected');
              selectedSectionEl = null;
            }
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

          // Report updated full HTML back to parent for syncing
          window.parent.postMessage({
            type: 'PIXELCRAFT_HTML_UPDATED',
            html: document.body.innerHTML
          }, '*');
        }

        if (data.type === 'PIXELCRAFT_TOGGLE_SECTION_VISIBILITY' && data.sectionId) {
          const sec = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (sec) {
            if (data.visible === false || (data.visible === undefined && !sec.classList.contains('pixelcraft-section-hidden'))) {
              sec.classList.add('pixelcraft-section-hidden');
            } else {
              sec.classList.remove('pixelcraft-section-hidden');
            }
            window.parent.postMessage({
              type: 'PIXELCRAFT_HTML_UPDATED',
              html: document.body.innerHTML
            }, '*');
          }
        }

        if (data.type === 'PIXELCRAFT_SELECT_SECTION' && data.sectionId) {
          if (selectedSectionEl) {
            selectedSectionEl.removeAttribute('data-pixelcraft-section-selected');
          }
          const sec = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (sec) {
            selectedSectionEl = sec;
            sec.setAttribute('data-pixelcraft-section-selected', 'true');
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }

        if (data.type === 'PIXELCRAFT_SCROLL_TO_SECTION' && data.sectionId) {
          const el = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (selectedSectionEl) selectedSectionEl.removeAttribute('data-pixelcraft-section-selected');
            selectedSectionEl = el;
            selectedSectionEl.setAttribute('data-pixelcraft-section-selected', 'true');
          }
        }

        if (data.type === 'PIXELCRAFT_UPDATE_SECTION_PROPERTIES' && data.sectionId) {
          const sec = document.getElementById(data.sectionId) || document.querySelector('[data-section="' + data.sectionId + '"]');
          if (sec) {
            const p = data.payload || {};
            if (p.headingText !== undefined) {
              const h = sec.querySelector('h1, h2, h3, h4');
              if (h) h.textContent = p.headingText;
            }
            if (p.paragraphText !== undefined) {
              const desc = sec.querySelector('p');
              if (desc) desc.textContent = p.paragraphText;
            }
            if (p.backgroundColor !== undefined) {
              sec.style.backgroundColor = p.backgroundColor;
            }
            if (p.textColor !== undefined) {
              sec.style.color = p.textColor;
            }
            if (p.fontSize !== undefined) {
              const h = sec.querySelector('h1, h2, h3, h4');
              if (h) h.style.fontSize = p.fontSize;
            }
            if (p.padding !== undefined) {
              sec.style.padding = p.padding;
            }
            if (p.textAlign !== undefined) {
              sec.style.textAlign = p.textAlign;
            }
            if (p.imageUrl !== undefined) {
              const img = sec.querySelector('img');
              if (img) img.src = p.imageUrl;
            }
            if (p.buttonText !== undefined) {
              const btn = sec.querySelector('button, a.btn, a.btn-primary, a.btn-secondary, a[href]');
              if (btn) btn.textContent = p.buttonText;
            }
            if (p.buttonLink !== undefined) {
              const btn = sec.querySelector('a');
              if (btn) btn.href = p.buttonLink;
            }

            window.parent.postMessage({
              type: 'PIXELCRAFT_HTML_UPDATED',
              html: document.body.innerHTML
            }, '*');
          }
        }
      });
    })();
  </script>

  <!-- Project Interactive Script -->
  <script>
    ${project.js || ''}
  </script>
</body>
</html>`;
  }

  // ==========================================================================
  // Dynamic Section Detection Engine (Requirement 2)
  // Reflects real DOM sections, not stale or hardcoded lists!
  // ==========================================================================
  function detectProjectSections(html) {
    if (!html || typeof html !== 'string') return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Select all landmark elements in true visual page order
    const elements = doc.body.querySelectorAll('header, nav, section, footer, [data-section]');
    const detected = [];
    const seenIds = new Set();

    elements.forEach((elem, index) => {
      // Ignore nested helper sections if inside an established section
      if (elem.parentElement && elem.parentElement.closest('section, header, footer') && !elem.hasAttribute('data-section')) {
        return;
      }

      const tag = elem.tagName.toLowerCase();
      let id = elem.id || elem.getAttribute('data-section');

      if (!id) {
        if (tag === 'header' || tag === 'nav') id = 'navbar';
        else if (tag === 'footer') id = 'footer';
        else id = `section-${index + 1}`;
        elem.id = id;
      }

      let uniqueId = id;
      let counter = 1;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${id}-${counter++}`;
      }
      seenIds.add(uniqueId);

      // Extract human-readable name
      let name = elem.getAttribute('data-section-name') || '';
      if (!name) {
        const heading = elem.querySelector('h1, h2, h3, h4');
        if (heading && heading.textContent.trim().length > 0 && heading.textContent.trim().length < 45) {
          name = heading.textContent.trim();
        } else {
          name = formatReadableSectionName(uniqueId, tag);
        }
      }

      const type = inferSectionType(uniqueId, tag, name);

      // Extract section properties for inspector
      const headingEl = elem.querySelector('h1, h2, h3, h4');
      const headingText = headingEl ? headingEl.textContent.trim() : '';
      const pEl = elem.querySelector('p');
      const paragraphText = pEl ? pEl.textContent.trim() : '';
      const imgEl = elem.querySelector('img');
      const imageUrl = imgEl ? (imgEl.getAttribute('src') || '') : '';
      const btnEl = elem.querySelector('button, a.btn, a.btn-primary, a.btn-secondary, a[href]');
      const buttonText = btnEl ? btnEl.textContent.trim() : '';
      const buttonLink = (btnEl && btnEl.tagName === 'A') ? (btnEl.getAttribute('href') || '') : '';

      detected.push({
        id: uniqueId,
        name: name,
        type: type,
        tag: tag,
        headingText: headingText,
        paragraphText: paragraphText,
        imageUrl: imageUrl,
        buttonText: buttonText,
        buttonLink: buttonLink,
        backgroundColor: elem.style.backgroundColor || '',
        textColor: elem.style.color || '',
        padding: elem.style.padding || '',
        fontSize: headingEl ? headingEl.style.fontSize || '' : '',
        textAlign: elem.style.textAlign || ''
      });
    });

    return detected;
  }

  function formatReadableSectionName(id, tag) {
    const clean = id.replace(/^(section-|sec-)/i, '').replace(/[-_]/g, ' ');
    const titleCased = clean.replace(/\b\w/g, c => c.toUpperCase());
    if (/navbar|nav|header/i.test(id) || tag === 'header' || tag === 'nav') return 'Navigation';
    if (/hero/i.test(id)) return 'Hero';
    if (/about/i.test(id)) return 'About';
    if (/trainers?|coach/i.test(id)) return 'Trainers';
    if (/programs?|classes|training/i.test(id)) return 'Training Programs';
    if (/pricing|membership|plans?/i.test(id)) return 'Membership Plans';
    if (/testimonials?|reviews?|feedback/i.test(id)) return 'Testimonials';
    if (/faq|questions?/i.test(id)) return 'FAQ';
    if (/gallery|showcase/i.test(id)) return 'Gallery';
    if (/contact|booking|trial/i.test(id)) return 'Contact';
    if (/cta|banner/i.test(id)) return 'CTA Banner';
    if (/footer/i.test(id) || tag === 'footer') return 'Footer';
    return titleCased || 'Section';
  }

  function inferSectionType(id, tag, name) {
    const combined = `${id} ${tag} ${name}`.toLowerCase();
    if (/navbar|nav|header|menu/i.test(combined)) return 'navbar';
    if (/hero/i.test(combined)) return 'hero';
    if (/about/i.test(combined)) return 'about';
    if (/trainers?|coach|team|staff/i.test(combined)) return 'trainers';
    if (/programs?|features?|services?|capabilities/i.test(combined)) return 'features';
    if (/pricing|memberships?|plans?|tiers?/i.test(combined)) return 'pricing';
    if (/testimonials?|reviews?|feedback/i.test(combined)) return 'testimonials';
    if (/faq|questions?|accordion/i.test(combined)) return 'faq';
    if (/gallery|portfolio|photos?/i.test(combined)) return 'gallery';
    if (/contact|booking|inquiry/i.test(combined)) return 'contact';
    if (/cta|banner/i.test(combined)) return 'cta';
    if (/footer/i.test(combined)) return 'footer';
    return 'default';
  }

  // ==========================================================================
  // Sections Panel Tree View (Requirement 2 & 5)
  // ==========================================================================
  function renderSectionsTree(sections) {
    if (!el.sectionsList) return;
    el.sectionsList.innerHTML = '';

    if (el.sectionsCountBadge) {
      el.sectionsCountBadge.textContent = `${(sections || []).length} ${(sections || []).length === 1 ? 'Section' : 'Sections'}`;
    }

    if (!sections || sections.length === 0) {
      el.sectionsList.innerHTML = '<li class="section-tree-item empty">No sections loaded</li>';
      return;
    }

    const typeIcons = {
      navbar: '🧭',
      hero: '⚡',
      about: '📖',
      features: '🍱',
      trainers: '🏋️',
      pricing: '💳',
      testimonials: '💬',
      faq: '❓',
      gallery: '🖼️',
      cta: '📣',
      contact: '✉️',
      footer: '⚓',
      default: '📄'
    };

    sections.forEach((sec, idx) => {
      const li = document.createElement('li');
      li.className = 'section-tree-item';
      li.setAttribute('data-section-id', sec.id);

      if (state.selectedSectionId === sec.id) {
        li.classList.add('active');
      }

      // Check if section is hidden in project html
      const isHidden = state.currentProject?.html ? (
        new RegExp(`id=["']${sec.id}["'][^>]*class=["'][^"']*pixelcraft-section-hidden`, 'i').test(state.currentProject.html) ||
        new RegExp(`class=["'][^"']*pixelcraft-section-hidden[^"']*["'][^>]*id=["']${sec.id}["']`, 'i').test(state.currentProject.html)
      ) : false;

      if (isHidden) {
        li.classList.add('is-hidden');
      }

      const icon = typeIcons[sec.type] || typeIcons.default;
      const isFirst = idx === 0;
      const isLast = idx === sections.length - 1;
      const isInView = state.inViewSectionId === sec.id;

      li.innerHTML = `
        <span class="sec-tree-num">${idx + 1}</span>
        <span class="sec-tree-icon">${icon}</span>
        <span class="sec-tree-name" title="${escapeHtml(sec.name)}">${escapeHtml(sec.name)}</span>
        ${isInView ? '<span class="sec-in-view-badge" title="Currently visible in preview">👁️ In view</span>' : ''}
        <div class="sec-tree-actions">
          <button type="button" class="sec-action-btn btn-sec-visibility" title="${isHidden ? 'Show Section' : 'Hide Section'}">${isHidden ? '👁️‍🗨️' : '👁️'}</button>
          <button type="button" class="sec-action-btn btn-sec-up" title="Move Section Up" ${isFirst ? 'disabled' : ''}>▲</button>
          <button type="button" class="sec-action-btn btn-sec-down" title="Move Section Down" ${isLast ? 'disabled' : ''}>▼</button>
          <button type="button" class="sec-action-btn btn-sec-rename" title="Rename Section">✏️</button>
          <button type="button" class="sec-action-btn del-btn btn-sec-del" title="Delete Section">🗑️</button>
        </div>
      `;

      // Click row selects section
      li.addEventListener('click', (e) => {
        if (e.target.closest('.sec-action-btn')) return;
        selectSection(sec.id);
      });

      // Visibility Toggle
      const btnVis = li.querySelector('.btn-sec-visibility');
      if (btnVis) {
        btnVis.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSectionVisibility(sec.id, sec.name);
        });
      }

      // Move Up
      const btnUp = li.querySelector('.btn-sec-up');
      if (btnUp && !isFirst) {
        btnUp.addEventListener('click', (e) => {
          e.stopPropagation();
          moveSection(sec.id, 'up');
        });
      }

      // Move Down
      const btnDown = li.querySelector('.btn-sec-down');
      if (btnDown && !isLast) {
        btnDown.addEventListener('click', (e) => {
          e.stopPropagation();
          moveSection(sec.id, 'down');
        });
      }

      // Rename
      const btnRename = li.querySelector('.btn-sec-rename');
      if (btnRename) {
        btnRename.addEventListener('click', (e) => {
          e.stopPropagation();
          promptRenameSection(sec.id, sec.name);
        });
      }

      // Delete
      const btnDel = li.querySelector('.btn-sec-del');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmDeleteSection(sec.id, sec.name);
        });
      }

      el.sectionsList.appendChild(li);
    });
  }

  function toggleSectionVisibility(sectionId, secName) {
    if (!state.currentProject || !state.currentProject.html) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(state.currentProject.html, 'text/html');
    const targetEl = doc.getElementById(sectionId) || doc.querySelector(`[data-section="${sectionId}"]`);
    if (!targetEl) return;

    const isCurrentlyHidden = targetEl.classList.contains('pixelcraft-section-hidden');
    let newlyHidden = false;
    if (isCurrentlyHidden) {
      targetEl.classList.remove('pixelcraft-section-hidden');
      newlyHidden = false;
    } else {
      targetEl.classList.add('pixelcraft-section-hidden');
      newlyHidden = true;
    }

    state.currentProject.html = doc.body.innerHTML;

    // Notify iframe
    if (el.iframe && el.iframe.contentWindow) {
      el.iframe.contentWindow.postMessage({
        type: 'PIXELCRAFT_TOGGLE_SECTION_VISIBILITY',
        sectionId: sectionId,
        visible: !newlyHidden
      }, '*');
    }

    // Update section tree
    renderSectionsTree(state.currentProject.sections || []);

    setSaveStatus('unsaved');
    try {
      localStorage.setItem('pixelcraft_current_project', JSON.stringify(state.currentProject));
      setSaveStatus('saved');
    } catch (_) {}

    showToastNotification(newlyHidden ? `👁️‍🗨️ Hidden "${secName || sectionId}" section` : `👁️ Shown "${secName || sectionId}" section`);
  }

  // ==========================================================================
  // Section Selection & Inspector Synchronization (Requirement 3 & 4)
  // ==========================================================================
  function selectSection(sectionId) {
    if (!sectionId) return;
    state.selectedSectionId = sectionId;

    // Highlight in Left Panel
    document.querySelectorAll('.section-tree-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-section-id') === sectionId);
    });

    // Update scope section pill in Refinement bar
    if (el.scopeSectionPill) {
      el.scopeSectionPill.textContent = `#${sectionId}`;
      el.scopeSectionPill.style.display = 'inline-flex';
    }

    if (state.refinementScope === 'section') {
      updateRefinementChips('section');
    }

    // Switch inspector to Section Tab
    switchInspectorTab('section');

    // Tell iframe to highlight section with luminous outline and scroll smoothly
    if (el.iframe && el.iframe.contentWindow) {
      el.iframe.contentWindow.postMessage({
        type: 'PIXELCRAFT_SELECT_SECTION',
        sectionId: sectionId
      }, '*');
    }

    // Populate Section Inspector in Right Panel
    populateSectionInspector(sectionId);
  }

  function switchInspectorTab(tab) {
    state.activeInspectorTab = tab;
    if (el.tabBtnSection) el.tabBtnSection.classList.toggle('active', tab === 'section');
    if (el.tabBtnElement) el.tabBtnElement.classList.toggle('active', tab === 'element');

    if (el.inspectorSectionContent) {
      el.inspectorSectionContent.style.display = tab === 'section' ? 'block' : 'none';
    }
    if (el.inspectorElementContent) {
      el.inspectorElementContent.style.display = tab === 'element' ? 'block' : 'none';
    }
  }

  function populateSectionInspector(sectionId) {
    const sections = state.currentProject?.sections || [];
    const sec = sections.find(s => s.id === sectionId);

    if (!sec) {
      if (el.inspectorSectionEmpty) el.inspectorSectionEmpty.style.display = 'block';
      if (el.inspectorSectionForm) el.inspectorSectionForm.style.display = 'none';
      return;
    }

    if (el.inspectorSectionEmpty) el.inspectorSectionEmpty.style.display = 'none';
    if (el.inspectorSectionForm) el.inspectorSectionForm.style.display = 'block';

    // Badge & Name
    if (el.secPropIdBadge) el.secPropIdBadge.textContent = `#${sec.id}`;
    if (el.secPropName) el.secPropName.value = sec.name || '';

    // Content
    if (el.secPropHeading) el.secPropHeading.value = sec.headingText || '';
    if (el.secPropParagraph) el.secPropParagraph.value = sec.paragraphText || '';

    // Colors
    if (el.secPropBgColor) {
      const bg = sec.backgroundColor ? rgbToHex(sec.backgroundColor) || sec.backgroundColor : '#0f1117';
      el.secPropBgColor.value = bg.startsWith('#') ? bg : '#0f1117';
      if (el.labelSecBgColor) el.labelSecBgColor.textContent = el.secPropBgColor.value;
    }
    if (el.secPropTextColor) {
      const col = sec.textColor ? rgbToHex(sec.textColor) || sec.textColor : '#ffffff';
      el.secPropTextColor.value = col.startsWith('#') ? col : '#ffffff';
      if (el.labelSecTextColor) el.labelSecTextColor.textContent = el.secPropTextColor.value;
    }

    // Typography & Align
    if (el.secPropFontSize) el.secPropFontSize.value = sec.fontSize || '';
    if (el.secAlignButtons) {
      el.secAlignButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-align') === (sec.textAlign || 'left'));
      });
    }

    // Spacing
    if (el.secPropPadding) el.secPropPadding.value = sec.padding || '';

    // Media
    if (el.secPropImgUrl) el.secPropImgUrl.value = sec.imageUrl || '';

    // CTA
    if (el.secPropBtnText) el.secPropBtnText.value = sec.buttonText || '';
    if (el.secPropBtnLink) el.secPropBtnLink.value = sec.buttonLink || '';

    // AI Refiner prompt placeholder
    if (el.sectionAiPrompt) {
      el.sectionAiPrompt.value = '';
      el.sectionAiPrompt.placeholder = `Describe changes for "${sec.name}" (e.g. 'Make this section more premium', 'Change background to black')...`;
    }
  }

  function dispatchSectionPropertiesUpdate(updates) {
    if (!state.selectedSectionId || !el.iframe || !el.iframe.contentWindow) return;

    // Send to iframe for live instant rendering
    el.iframe.contentWindow.postMessage({
      type: 'PIXELCRAFT_UPDATE_SECTION_PROPERTIES',
      sectionId: state.selectedSectionId,
      payload: updates
    }, '*');

    // Also update in-memory section properties
    const sec = (state.currentProject?.sections || []).find(s => s.id === state.selectedSectionId);
    if (sec) {
      Object.assign(sec, updates);
    }
  }

  // ==========================================================================
  // Section Reordering, Renaming, Deletion & Addition (Requirement 5)
  // ==========================================================================
  function moveSection(sectionId, direction) {
    if (!state.currentProject || !state.currentProject.html) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(state.currentProject.html, 'text/html');
    const targetEl = doc.getElementById(sectionId) || doc.querySelector(`[data-section="${sectionId}"]`);
    if (!targetEl) {
      showToastNotification('Section element not found in DOM');
      return;
    }

    if (direction === 'up') {
      let prev = targetEl.previousElementSibling;
      while (prev && !['SECTION', 'HEADER', 'FOOTER', 'NAV'].includes(prev.tagName) && !prev.hasAttribute('data-section')) {
        prev = prev.previousElementSibling;
      }
      if (prev) {
        prev.parentNode.insertBefore(targetEl, prev);
      } else {
        showToastNotification('Section is already at top');
        return;
      }
    } else if (direction === 'down') {
      let next = targetEl.nextElementSibling;
      while (next && !['SECTION', 'HEADER', 'FOOTER', 'NAV'].includes(next.tagName) && !next.hasAttribute('data-section')) {
        next = next.nextElementSibling;
      }
      if (next) {
        next.parentNode.insertBefore(next, targetEl);
      } else {
        showToastNotification('Section is already at bottom');
        return;
      }
    }

    state.currentProject.html = doc.body.innerHTML;
    syncAndReloadProject(sectionId);
    showToastNotification(`Moved section ${direction === 'up' ? 'up ▲' : 'down ▼'}`);
  }

  function confirmDeleteSection(sectionId, name) {
    const secName = name || 'this';
    if (!confirm(`Are you sure you want to delete the "${secName}" section? This will remove it from your website.`)) {
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(state.currentProject.html, 'text/html');
    const targetEl = doc.getElementById(sectionId) || doc.querySelector(`[data-section="${sectionId}"]`);
    if (!targetEl) {
      showToastNotification('Section not found');
      return;
    }

    targetEl.remove();
    state.currentProject.html = doc.body.innerHTML;
    state.selectedSectionId = null;

    syncAndReloadProject();
    showToastNotification(`🗑️ Deleted "${secName}" section`);
  }

  function promptRenameSection(sectionId, currentName) {
    const newName = prompt(`Rename section:`, currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

    applySectionRename(sectionId, newName.trim());
  }

  function applySectionRename(sectionId, newName) {
    if (!state.currentProject || !state.currentProject.html) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(state.currentProject.html, 'text/html');
    const targetEl = doc.getElementById(sectionId) || doc.querySelector(`[data-section="${sectionId}"]`);
    if (targetEl) {
      targetEl.setAttribute('data-section-name', newName);
      state.currentProject.html = doc.body.innerHTML;
    }

    const sec = (state.currentProject.sections || []).find(s => s.id === sectionId);
    if (sec) sec.name = newName;

    renderSectionsTree(state.currentProject.sections);
    if (el.secPropName && state.selectedSectionId === sectionId) {
      el.secPropName.value = newName;
    }

    pushHistorySnapshot(state.currentProject);
    showToastNotification(`Renamed section to "${newName}"`);
  }

  // ==========================================================================
  // Add Section Presets (Requirement 5)
  // ==========================================================================
  function openAddSectionModal() {
    if (el.modalAddSection) {
      el.modalAddSection.style.display = 'flex';
    }
  }

  function closeAddSectionModal() {
    if (el.modalAddSection) {
      el.modalAddSection.style.display = 'none';
    }
  }

  function addSectionPreset(presetKey) {
    const presets = getSectionPresets();
    const preset = presets[presetKey];
    if (!preset) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(state.currentProject.html, 'text/html');

    const tempDiv = doc.createElement('div');
    tempDiv.innerHTML = preset.html.trim();
    const newEl = tempDiv.firstElementChild;

    // Generate unique ID
    const uniqueId = `${presetKey}-${Date.now().toString(36)}`;
    newEl.id = uniqueId;

    // Insert before footer or at end of main/body
    const footer = doc.querySelector('footer, [id="footer"]');
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(newEl, footer);
    } else {
      doc.body.appendChild(newEl);
    }

    state.currentProject.html = doc.body.innerHTML;

    // Append any custom CSS
    if (preset.css && !state.currentProject.css.includes(preset.cssSignature)) {
      state.currentProject.css += `\n/* ${preset.name} */\n${preset.css}\n`;
    }

    closeAddSectionModal();
    syncAndReloadProject(uniqueId);
    showToastNotification(`➕ Added "${preset.name}" section`);
  }

  function getSectionPresets() {
    return {
      hero: {
        name: 'Hero & Value Proposition',
        cssSignature: '/* hero-custom-preset */',
        html: `
<section class="hero-section" id="hero-sec" data-section-name="Hero & Value Proposition">
  <div class="container hero-grid">
    <div class="hero-content">
      <div class="badge" style="background: rgba(99,102,241,0.15); border: 1px solid var(--primary, #6366f1); color: #fff; padding: 4px 14px; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; display: inline-flex; margin-bottom: 16px;">✨ Next-Generation Performance</div>
      <h1 class="hero-title" style="font-size: 3rem; font-weight: 800; line-height: 1.15; margin-bottom: 16px;">Elevate Your Digital Experience</h1>
      <p class="hero-description" style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.6; margin-bottom: 24px;">Engineered for peak performance, modern aesthetics, and seamless conversion across every device.</p>
      <div class="hero-cta-group" style="display: flex; gap: 12px; flex-wrap: wrap;">
        <a href="#contact" class="btn btn-primary" style="padding: 12px 28px; font-weight: 700; border-radius: 8px;">Claim Free Trial</a>
        <a href="#features" class="btn btn-secondary" style="padding: 12px 28px; font-weight: 700; border-radius: 8px;">Explore Features ➔</a>
      </div>
    </div>
    <div class="hero-visual">
      <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80" alt="Showcase Visual" style="width: 100%; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
    </div>
  </div>
</section>`,
        css: `/* hero-custom-preset */\n.hero-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; align-items: center; padding: 60px 0; }\n@media(max-width: 900px){ .hero-grid { grid-template-columns: 1fr; text-align: center; } .hero-cta-group { justify-content: center; } }`
      },
      features: {
        name: 'Features / Bento Grid',
        cssSignature: '/* features-preset */',
        html: `
<section class="features-section" id="features-sec" data-section-name="Platform Capabilities">
  <div class="container">
    <div class="section-header" style="text-align: center; margin-bottom: 40px;">
      <span class="sub-badge" style="color: var(--primary, #6366f1); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Core Capabilities</span>
      <h2 class="section-title" style="font-size: 2.2rem; font-weight: 800; margin-top: 8px;">Engineered for Distinction</h2>
      <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Cutting-edge methodology designed for high-impact results.</p>
    </div>
    <div class="features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
      <div class="feature-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
        <div style="font-size: 2rem; margin-bottom: 12px;">⚡</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">Ultra-Fast Execution</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Lightning-quick response architecture optimized for instant conversion and zero latency.</p>
      </div>
      <div class="feature-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
        <div style="font-size: 2rem; margin-bottom: 12px;">🛡️</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">Enterprise Reliability</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Bank-grade data isolation protocols and robust uptime ensuring peace of mind.</p>
      </div>
      <div class="feature-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
        <div style="font-size: 2rem; margin-bottom: 12px;">📊</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">Actionable Analytics</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Real-time performance metrics and transparent tracking milestones right at your fingertips.</p>
      </div>
    </div>
  </div>
</section>`,
        css: `/* features-preset */\n.features-section { padding: 60px 0; }`
      },
      trainers: {
        name: 'Team / Trainers / Staff',
        cssSignature: '/* trainers-preset */',
        html: `
<section class="trainers-section" id="trainers-sec" data-section-name="Expert Coaches & Team">
  <div class="container">
    <div class="section-header" style="text-align: center; margin-bottom: 40px;">
      <span class="sub-badge" style="color: var(--primary, #6366f1); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">World-Class Mentors</span>
      <h2 class="section-title" style="font-size: 2.2rem; font-weight: 800; margin-top: 8px;">Meet Your Coaches</h2>
      <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Dedicated specialists committed to guiding every step of your journey.</p>
    </div>
    <div class="trainers-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
      <div class="trainer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; text-align: center;">
        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" alt="Elena Rostova" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Elena Rostova</h3>
        <p style="color: var(--primary, #6366f1); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Head Strength Coach</p>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Certified Olympic biomechanics specialist accelerating peak power and physical agility.</p>
      </div>
      <div class="trainer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; text-align: center;">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" alt="Marcus Sterling" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Marcus Sterling</h3>
        <p style="color: var(--primary, #6366f1); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Conditioning & Stamina</p>
        <p style="color: var(--text-muted); font-size: 0.88rem;">High-intensity metabolic conditioning expert optimizing VO2 max and core velocity.</p>
      </div>
      <div class="trainer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; text-align: center;">
        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80" alt="Derrick Vance" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px; margin-bottom: 14px;">
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Derrick Vance</h3>
        <p style="color: var(--primary, #6366f1); font-size: 0.82rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Mobility & Functional Recovery</p>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Doctor of Physical Therapy guiding injury prevention and regenerative wellness protocols.</p>
      </div>
    </div>
  </div>
</section>`,
        css: `/* trainers-preset */\n.trainers-section { padding: 60px 0; }`
      },
      pricing: {
        name: 'Membership & Pricing Tiers',
        cssSignature: '/* pricing-preset */',
        html: `
<section class="pricing-section" id="pricing-sec" data-section-name="Membership Plans">
  <div class="container">
    <div class="section-header" style="text-align: center; margin-bottom: 40px;">
      <span class="sub-badge" style="color: var(--primary, #6366f1); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Transparent Pricing</span>
      <h2 class="section-title" style="font-size: 2.2rem; font-weight: 800; margin-top: 8px;">Membership Plans</h2>
      <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Choose the tier that matches your commitment level.</p>
    </div>
    <div class="pricing-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
      <div class="pricing-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px;">
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">Starter Access</h3>
        <div style="font-size: 2.4rem; font-weight: 800; margin-bottom: 14px;">$29<span style="font-size: 0.9rem; color: var(--text-muted);">/mo</span></div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Essential access for ambitious starters.</p>
        <ul style="list-style: none; margin-bottom: 24px; line-height: 2;">
          <li>✓ Full Facility Access</li>
          <li>✓ Companion Mobile App</li>
          <li>✓ Digital Progress Log</li>
        </ul>
        <a href="#contact" class="btn btn-secondary" style="display: block; text-align: center; padding: 10px; border-radius: 8px;">Get Started</a>
      </div>
      <div class="pricing-card popular" style="background: rgba(99,102,241,0.08); border: 1px solid var(--primary, #6366f1); border-radius: 16px; padding: 28px; position: relative;">
        <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary, #6366f1); color: #fff; padding: 2px 12px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700;">MOST POPULAR</div>
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">Pro Athlete</h3>
        <div style="font-size: 2.4rem; font-weight: 800; margin-bottom: 14px;">$69<span style="font-size: 0.9rem; color: var(--text-muted);">/mo</span></div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Comprehensive coaching with nutrition plans.</p>
        <ul style="list-style: none; margin-bottom: 24px; line-height: 2;">
          <li>✓ Everything in Starter Access</li>
          <li>✓ Weekly 1-on-1 Master Coaching</li>
          <li>✓ Tailored Nutrition & Meal Blueprint</li>
          <li>✓ Priority Class Reservations</li>
        </ul>
        <a href="#contact" class="btn btn-primary" style="display: block; text-align: center; padding: 10px; border-radius: 8px;">Join Pro Tier</a>
      </div>
      <div class="pricing-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px;">
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">VIP Elite</h3>
        <div style="font-size: 2.4rem; font-weight: 800; margin-bottom: 14px;">$129<span style="font-size: 0.9rem; color: var(--text-muted);">/mo</span></div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">The all-inclusive elite lifestyle experience.</p>
        <ul style="list-style: none; margin-bottom: 24px; line-height: 2;">
          <li>✓ 24/7 Unlimited Master Access</li>
          <li>✓ Daily Dedicated Personal Coach</li>
          <li>✓ Private Spa & Hydro Suite Access</li>
          <li>✓ Custom Supplementation Regimen</li>
        </ul>
        <a href="#contact" class="btn btn-secondary" style="display: block; text-align: center; padding: 10px; border-radius: 8px;">Join VIP</a>
      </div>
    </div>
  </div>
</section>`,
        css: `/* pricing-preset */\n.pricing-section { padding: 60px 0; }`
      },
      testimonials: {
        name: 'Testimonials & Reviews',
        cssSignature: '/* testimonials-preset */',
        html: `
<section class="testimonials-section" id="testimonials-sec" data-section-name="Testimonials">
  <div class="container">
    <div class="section-header" style="text-align: center; margin-bottom: 40px;">
      <span class="sub-badge" style="color: var(--primary, #6366f1); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Member Stories</span>
      <h2 class="section-title" style="font-size: 2.2rem; font-weight: 800; margin-top: 8px;">Real Transformations</h2>
      <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Discover what our members achieved with our guidance.</p>
    </div>
    <div class="testimonials-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
      <div class="review-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
        <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
        <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"The coaches and modern methodologies completely redefined my stamina and mental drive. Best fitness decision of my life."</p>
        <div style="font-weight: 700;">Sarah Jenkins</div>
        <div style="color: var(--text-muted); font-size: 0.8rem;">Triathlon Finisher • Member 2 Years</div>
      </div>
      <div class="review-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
        <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
        <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"Unmatched facilities, knowledgeable trainers, and an inspiring community that pushes you to exceed your limits daily."</p>
        <div style="font-weight: 700;">David Chen</div>
        <div style="color: var(--text-muted); font-size: 0.8rem;">Executive • Member 1 Year</div>
      </div>
      <div class="review-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
        <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
        <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"Within 6 months, my posture, strength, and energy levels spiked. The personalized nutrition plan was a game-changer."</p>
        <div style="font-weight: 700;">Emma Watson</div>
        <div style="color: var(--text-muted); font-size: 0.8rem;">Marathon Runner • Member 8 Months</div>
      </div>
    </div>
  </div>
</section>`,
        css: `/* testimonials-preset */\n.testimonials-section { padding: 60px 0; }`
      },
      faq: {
        name: 'FAQ Accordion',
        cssSignature: '/* faq-preset */',
        html: `
<section class="faq-section" id="faq-sec" data-section-name="Frequently Asked Questions">
  <div class="container" style="max-width: 800px;">
    <div class="section-header" style="text-align: center; margin-bottom: 40px;">
      <span class="sub-badge" style="color: var(--primary, #6366f1); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Got Questions?</span>
      <h2 class="section-title" style="font-size: 2.2rem; font-weight: 800; margin-top: 8px;">Frequently Asked Questions</h2>
      <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Everything you need to know about our memberships and services.</p>
    </div>
    <div class="faq-list" style="display: flex; flex-direction: column; gap: 14px;">
      <details style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; cursor: pointer;">
        <summary style="font-weight: 700; font-size: 1.05rem; outline: none;">How do I claim my 7-day complimentary trial pass?</summary>
        <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Simply fill out the form at the bottom of the page or visit our front desk. No credit card required, instant access granted upon check-in.</p>
      </details>
      <details style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; cursor: pointer;">
        <summary style="font-weight: 700; font-size: 1.05rem; outline: none;">Can I freeze or cancel my membership anytime?</summary>
        <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Yes, we offer complete flexibility without hidden lockdown contracts. You can freeze your account for up to 60 days per calendar year.</p>
      </details>
      <details style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; cursor: pointer;">
        <summary style="font-weight: 700; font-size: 1.05rem; outline: none;">Are personalized nutrition plans included with memberships?</summary>
        <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Our Pro Athlete and VIP Elite tiers come with complete personalized macro and nutrition coaching tailored directly to your fitness goals.</p>
      </details>
    </div>
  </div>
</section>`,
        css: `/* faq-preset */\n.faq-section { padding: 60px 0; }`
      },
      gallery: {
        name: 'Gallery & Media Showcase',
        cssSignature: '/* gallery-preset */',
        html: `
<section class="gallery-section" id="gallery-sec" data-section-name="Gallery">
  <div class="container">
    <div class="section-header" style="text-align: center; margin-bottom: 40px;">
      <span class="sub-badge" style="color: var(--primary, #6366f1); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Visual Tour</span>
      <h2 class="section-title" style="font-size: 2.2rem; font-weight: 800; margin-top: 8px;">State-of-the-Art Facilities</h2>
      <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Experience the atmosphere and equipment designed for high-performance training.</p>
    </div>
    <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
      <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80" alt="Main Floor" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px;">
      <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80" alt="Free Weights" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px;">
      <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80" alt="Cardio Zone" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px;">
      <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80" alt="Recovery Suite" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px;">
    </div>
  </div>
</section>`,
        css: `/* gallery-preset */\n.gallery-section { padding: 60px 0; }`
      },
      cta: {
        name: 'Call To Action Banner',
        cssSignature: '/* cta-preset */',
        html: `
<section class="cta-section" id="cta-sec" data-section-name="Call To Action">
  <div class="container" style="text-align: center; background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1)); border: 1px solid rgba(99,102,241,0.3); border-radius: 20px; padding: 60px 24px;">
    <h2 style="font-size: 2.6rem; font-weight: 800; margin-bottom: 14px;">Ready to Elevate Your Life?</h2>
    <p style="color: var(--text-muted); font-size: 1.15rem; max-width: 600px; margin: 0 auto 28px;">Start your transformation today with our 7-day all-access trial. Zero commitments, cancel anytime.</p>
    <a href="#contact" class="btn btn-primary" style="padding: 14px 36px; font-size: 1.05rem; font-weight: 700; border-radius: 10px; display: inline-block;">Claim Complimentary Pass ➔</a>
  </div>
</section>`,
        css: `/* cta-preset */\n.cta-section { padding: 60px 0; }`
      },
      contact: {
        name: 'Contact & Booking Form',
        cssSignature: '/* contact-preset */',
        html: `
<section class="contact-section" id="contact-sec" data-section-name="Contact">
  <div class="container" style="max-width: 720px;">
    <div class="section-header" style="text-align: center; margin-bottom: 36px;">
      <span class="sub-badge" style="color: var(--primary, #6366f1); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em;">Get in Touch</span>
      <h2 class="section-title" style="font-size: 2.2rem; font-weight: 800; margin-top: 8px;">Claim Your Pass or Message Us</h2>
      <p class="section-sub" style="color: var(--text-muted); font-size: 1rem; margin-top: 6px;">Our team will respond within 2 business hours.</p>
    </div>
    <form class="contact-form" style="display: flex; flex-direction: column; gap: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;" onsubmit="event.preventDefault(); alert('Thank you! Your trial request has been submitted.');">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <input type="text" placeholder="Full Name" required style="padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem;">
        <input type="email" placeholder="Email Address" required style="padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem;">
      </div>
      <input type="tel" placeholder="Phone Number (optional)" style="padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem;">
      <textarea rows="4" placeholder="Any specific goals or questions?" style="padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem; resize: vertical;"></textarea>
      <button type="submit" class="btn btn-primary" style="padding: 14px; font-weight: 700; border-radius: 8px; cursor: pointer; margin-top: 8px;">Send Message & Claim Pass</button>
    </form>
  </div>
</section>`,
        css: `/* contact-preset */\n.contact-section { padding: 60px 0; }`
      }
    };
  }

  // ==========================================================================
  // Visual Properties Inspector
  // ==========================================================================
  function handleElementSelected(elemData) {
    state.selectedElementData = elemData;

    // Switch inspector to Element Tab
    switchInspectorTab('element');

    if (el.inspectorEmpty) el.inspectorEmpty.style.display = 'none';
    if (el.inspectorForm) el.inspectorForm.style.display = 'block';

    if (el.inspectorElemBadge) {
      el.inspectorElemBadge.textContent = elemData.tagName + (elemData.className ? '.' + elemData.className.split(' ')[0] : '');
    }

    // Parent section jump button
    if (el.btnElemParentSec) {
      el.btnElemParentSec.style.display = elemData.parentSectionId ? 'inline-flex' : 'none';
      if (elemData.parentSectionId) {
        el.btnElemParentSec.title = `Jump to parent section (#${elemData.parentSectionId})`;
      }
    }

    // Update element pill in refinement bar
    if (el.scopeElementPill) {
      el.scopeElementPill.textContent = `<${elemData.tagName.toLowerCase()}>`;
      el.scopeElementPill.style.display = 'inline-flex';
    }

    if (state.refinementScope === 'element') {
      updateRefinementChips('element');
    }

    // Text content
    if (el.propTextContent) {
      el.propTextContent.value = elemData.textContent || '';
    }

    // Colors & Typography & Layout
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
      if (el.propFontFamily && elemData.styles.fontFamily) {
        const cleanFont = elemData.styles.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
        let matched = false;
        for (const opt of el.propFontFamily.options) {
          if (opt.value && cleanFont.toLowerCase().includes(opt.value.toLowerCase())) {
            el.propFontFamily.value = opt.value;
            matched = true;
            break;
          }
        }
        if (!matched) el.propFontFamily.value = 'inherit';
      }
      if (el.propFontSize) {
        el.propFontSize.value = elemData.styles.fontSize || '';
      }
      if (el.propFontWeight) {
        el.propFontWeight.value = elemData.styles.fontWeight || '400';
      }
      if (el.elemAlignButtons) {
        const align = elemData.styles.textAlign || 'left';
        el.elemAlignButtons.forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-align') === align);
        });
      }
      if (el.propPadding) {
        el.propPadding.value = elemData.styles.padding || '';
      }
      if (el.propMargin) {
        el.propMargin.value = elemData.styles.margin || '';
      }
      if (el.propBorderRadius) {
        el.propBorderRadius.value = elemData.styles.borderRadius || '';
      }
      if (el.propWidth) {
        el.propWidth.value = elemData.styles.width || '';
      }
      if (el.propBorderWidth) {
        el.propBorderWidth.value = elemData.styles.borderWidth || '';
      }
      if (el.propBorderColor && elemData.styles.borderColor) {
        const hex = rgbToHex(elemData.styles.borderColor);
        if (hex) {
          el.propBorderColor.value = hex;
          if (el.labelBorderColor) el.labelBorderColor.textContent = hex;
        }
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
    setSaveStatus('saving');

    if (el.originalPromptInput) {
      el.originalPromptInput.value = userPrompt;
    }

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
        setSaveStatus('saved');
        showToastNotification('🎉 Design generated successfully!');
      } else {
        setSaveStatus('saved');
        alert(data.error || 'Failed to generate design. Please try again.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setSaveStatus('saved');
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
    setSaveStatus('saving');
    showLoadingOverlay(true, 'Applying modifications...', 'Interpreting instructions and refining components');

    try {
      const token = localStorage.getItem('supabase_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        prompt: deltaPrompt.trim(),
        currentProject: state.currentProject,
        scope: state.refinementScope || 'project'
      };

      if (state.refinementScope === 'section' && state.selectedSectionId) {
        payload.targetSectionId = state.selectedSectionId;
      } else if (state.refinementScope === 'element' && state.selectedElementData) {
        payload.targetElement = state.selectedElementData;
        if (state.selectedElementData.parentSectionId) {
          payload.targetSectionId = state.selectedElementData.parentSectionId;
        }
      }

      const response = await fetch('/api/builder/refine', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success && data.project) {
        loadProject(data.project, true);
        if (el.refineInput) el.refineInput.value = '';
        setSaveStatus('saved');
        showToastNotification(data.project.lastChangeSummary || '✨ Design updated successfully!');
      } else {
        setSaveStatus('saved');
        alert(data.error || 'Failed to apply design modification.');
      }
    } catch (err) {
      console.error('Refinement error:', err);
      setSaveStatus('saved');
      alert('Network error updating design. Please retry.');
    } finally {
      state.isGenerating = false;
      showLoadingOverlay(false);
    }
  }

  async function refineSelectedSection(customPrompt) {
    if (state.isGenerating) return;
    const secPrompt = (customPrompt || (el.sectionAiPrompt ? el.sectionAiPrompt.value : '')).trim();
    if (!secPrompt) {
      showToastNotification('Please enter a modification prompt for this section');
      return;
    }
    if (!state.selectedSectionId) {
      showToastNotification('Please select a section to refine');
      return;
    }

    const sec = (state.currentProject?.sections || []).find(s => s.id === state.selectedSectionId);
    const secName = sec ? sec.name : state.selectedSectionId;

    state.isGenerating = true;
    showLoadingOverlay(true, `Refining "${secName}"...`, 'Applying targeted changes while preserving all other sections');

    try {
      const token = localStorage.getItem('supabase_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/builder/refine', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: `For section "${secName}" (#${state.selectedSectionId}): ${secPrompt}`,
          currentProject: state.currentProject,
          targetSectionId: state.selectedSectionId
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.project) {
        loadProject(data.project, true);
        if (el.sectionAiPrompt) el.sectionAiPrompt.value = '';
        showToastNotification(data.project.lastChangeSummary || `✨ Updated "${secName}" section!`);
      } else {
        alert(data.error || 'Failed to refine section.');
      }
    } catch (err) {
      console.error('Section refinement error:', err);
      alert('Network error refining section. Please retry.');
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
      title: 'Titan Gym & Athletic Performance',
      projectType: 'Fitness & Gym Website',
      version: 1,
      designSpec: {
        typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter' },
        colorPalette: { primary: '#ff6600', background: '#0a0d14' },
        summary: 'Full-featured athletic gym website with 11 complete sections from Navigation to Footer'
      },
      sections: [
        { id: 'navbar', name: 'Navigation', type: 'navbar' },
        { id: 'hero', name: 'Hero', type: 'hero' },
        { id: 'about', name: 'About', type: 'about' },
        { id: 'programs', name: 'Training Programs', type: 'features' },
        { id: 'trainers', name: 'Trainers', type: 'trainers' },
        { id: 'pricing', name: 'Membership Plans', type: 'pricing' },
        { id: 'testimonials', name: 'Testimonials', type: 'testimonials' },
        { id: 'gallery', name: 'Gallery', type: 'gallery' },
        { id: 'faq', name: 'FAQ', type: 'faq' },
        { id: 'contact', name: 'Contact', type: 'contact' },
        { id: 'footer', name: 'Footer', type: 'footer' }
      ],
      html: `
  <header class="site-header" id="navbar" data-section-name="Navigation">
    <div class="nav-container">
      <div class="logo">⚡ TITAN GYM</div>
      <nav class="nav-menu">
        <a href="#hero" class="nav-link">Home</a>
        <a href="#about" class="nav-link">About</a>
        <a href="#programs" class="nav-link">Programs</a>
        <a href="#trainers" class="nav-link">Trainers</a>
        <a href="#pricing" class="nav-link">Pricing</a>
        <a href="#testimonials" class="nav-link">Stories</a>
        <a href="#faq" class="nav-link">FAQ</a>
        <a href="#contact" class="nav-link">Contact</a>
      </nav>
      <a href="#contact" class="btn btn-primary">Free Pass</a>
    </div>
  </header>

  <section class="hero-section" id="hero" data-section-name="Hero">
    <div class="container hero-grid">
      <div class="hero-content">
        <span class="badge">🔥 Premier Performance Architecture</span>
        <h1 class="hero-title">Forge Your Strongest Version</h1>
        <p class="hero-sub">World-class coaching, cutting-edge strength equipment, and a relentless culture designed for peak physical transformation.</p>
        <div class="hero-btns">
          <a href="#pricing" class="btn btn-primary btn-lg">Claim Free Pass</a>
          <a href="#programs" class="btn btn-secondary btn-lg">Explore Programs</a>
        </div>
      </div>
      <div class="hero-media">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80" alt="Titan Gym Equipment" class="hero-img">
      </div>
    </div>
  </section>

  <section class="about-section" id="about" data-section-name="About">
    <div class="container">
      <div class="about-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;">
        <div class="about-media">
          <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80" alt="About Titan Gym" style="width: 100%; border-radius: 16px; border: 1px solid var(--border);">
        </div>
        <div class="about-content">
          <span class="badge">📖 The Titan Standard</span>
          <h2 class="sec-title" style="text-align: left; margin-bottom: 20px;">Built for Those Who Refuse Mediocrity</h2>
          <p style="color: var(--text-muted); line-height: 1.7; margin-bottom: 20px;">Founded on Olympic strength principles and sports science, Titan Gym combines high-precision equipment with elite coaches to guide you through real transformations.</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: var(--surface); padding: 18px; border-radius: 12px; border: 1px solid var(--border);">
              <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">15,000+</div>
              <div style="color: var(--text-muted); font-size: 0.85rem;">Transformations Achieved</div>
            </div>
            <div style="background: var(--surface); padding: 18px; border-radius: 12px; border: 1px solid var(--border);">
              <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">35+</div>
              <div style="color: var(--text-muted); font-size: 0.85rem;">Master Coaches On Floor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="features-section" id="programs" data-section-name="Training Programs">
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

  <section class="trainers-section" id="trainers" data-section-name="Trainers">
    <div class="container">
      <h2 class="sec-title">Elite Coaching Staff</h2>
      <div class="features-grid">
        <div class="card" style="text-align: center; padding: 20px;">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" alt="Elena Rostova" style="width: 100%; height: 260px; object-fit: cover; border-radius: 12px; margin-bottom: 14px;">
          <h3>Elena Rostova</h3>
          <p style="color: var(--primary); font-size: 0.82rem; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Head Strength Coach</p>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Olympic weightlifting champion specializing in biomechanics & velocity power.</p>
        </div>
        <div class="card" style="text-align: center; padding: 20px;">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" alt="Marcus Sterling" style="width: 100%; height: 260px; object-fit: cover; border-radius: 12px; margin-bottom: 14px;">
          <h3>Marcus Sterling</h3>
          <p style="color: var(--primary); font-size: 0.82rem; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Cardio & Conditioning</p>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Ex-collegiate sprint coach optimizing VO2 max, metabolic agility & stamina.</p>
        </div>
        <div class="card" style="text-align: center; padding: 20px;">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80" alt="Derrick Vance" style="width: 100%; height: 260px; object-fit: cover; border-radius: 12px; margin-bottom: 14px;">
          <h3>Derrick Vance</h3>
          <p style="color: var(--primary); font-size: 0.82rem; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Mobility & Functional PT</p>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Doctor of Physical Therapy guiding injury prevention & regenerative protocols.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="pricing-section" id="pricing" data-section-name="Membership Plans">
    <div class="container">
      <h2 class="sec-title">Membership Plans</h2>
      <div class="pricing-grid">
        <div class="pricing-card">
          <h3>Standard Access</h3>
          <div class="price">$29<span>/mo</span></div>
          <p>Essential 24/7 access to all strength zones and locker facilities.</p>
          <ul style="list-style: none; margin-bottom: 24px; line-height: 2; color: var(--text-muted); font-size: 0.9rem;">
            <li>✓ Full Facility Access</li>
            <li>✓ Companion Mobile App</li>
            <li>✓ Digital Progress Log</li>
          </ul>
          <a href="#contact" class="btn btn-secondary w-full">Select Standard</a>
        </div>
        <div class="pricing-card popular">
          <div class="popular-tag">Most Popular</div>
          <h3>Pro Athlete</h3>
          <div class="price">$69<span>/mo</span></div>
          <p>All-access pass with weekly personal coaching and custom nutrition plans.</p>
          <ul style="list-style: none; margin-bottom: 24px; line-height: 2; color: var(--text-muted); font-size: 0.9rem;">
            <li>✓ Everything in Standard</li>
            <li>✓ Weekly 1-on-1 Master Coaching</li>
            <li>✓ Tailored Nutrition & Meal Blueprint</li>
            <li>✓ Priority Class Reservations</li>
          </ul>
          <a href="#contact" class="btn btn-primary w-full">Join Pro Tier</a>
        </div>
        <div class="pricing-card">
          <h3>VIP Elite</h3>
          <div class="price">$129<span>/mo</span></div>
          <p>Unlimited personal training, private spa suite access, and recovery lounges.</p>
          <ul style="list-style: none; margin-bottom: 24px; line-height: 2; color: var(--text-muted); font-size: 0.9rem;">
            <li>✓ 24/7 Unlimited Master Access</li>
            <li>✓ Daily Dedicated Personal Coach</li>
            <li>✓ Private Spa & Hydro Suite Access</li>
            <li>✓ Custom Supplementation Regimen</li>
          </ul>
          <a href="#contact" class="btn btn-secondary w-full">Join VIP</a>
        </div>
      </div>
    </div>
  </section>

  <section class="testimonials-section" id="testimonials" data-section-name="Testimonials">
    <div class="container">
      <h2 class="sec-title">Member Transformations</h2>
      <div class="features-grid">
        <div class="card">
          <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
          <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"The coaches and modern methodologies completely redefined my stamina and mental drive. Best fitness decision of my life."</p>
          <div style="font-weight: 700;">Sarah Jenkins</div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">Triathlon Finisher • Member 2 Years</div>
        </div>
        <div class="card">
          <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
          <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"Unmatched facilities, knowledgeable trainers, and an inspiring community that pushes you to exceed your limits daily."</p>
          <div style="font-weight: 700;">David Chen</div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">Executive • Member 1 Year</div>
        </div>
        <div class="card">
          <div style="color: #f59e0b; margin-bottom: 10px;">★★★★★</div>
          <p style="font-style: italic; color: var(--text); line-height: 1.6; margin-bottom: 16px;">"Within 6 months, my posture, strength, and energy levels spiked. The personalized nutrition plan was a game-changer."</p>
          <div style="font-weight: 700;">Emma Watson</div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">Marathon Runner • Member 8 Months</div>
        </div>
      </div>
    </div>
  </section>

  <section class="gallery-section" id="gallery" data-section-name="Gallery">
    <div class="container">
      <h2 class="sec-title">Facility Showcase</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80" alt="Main Floor" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
        <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80" alt="Free Weights" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
        <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80" alt="Cardio Zone" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
        <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80" alt="Recovery Suite" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border);">
      </div>
    </div>
  </section>

  <section class="faq-section" id="faq" data-section-name="FAQ">
    <div class="container" style="max-width: 800px;">
      <h2 class="sec-title">Frequently Asked Questions</h2>
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <details style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; cursor: pointer;">
          <summary style="font-weight: 700; font-size: 1.05rem;">How do I claim my 7-day trial pass?</summary>
          <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Simply fill out the contact form below or visit our front desk. No credit card required, instant access granted upon check-in.</p>
        </details>
        <details style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; cursor: pointer;">
          <summary style="font-weight: 700; font-size: 1.05rem;">Can I freeze or cancel my membership anytime?</summary>
          <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Yes, we offer complete flexibility without hidden lockdown contracts. You can freeze your account for up to 60 days per calendar year.</p>
        </details>
        <details style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; cursor: pointer;">
          <summary style="font-weight: 700; font-size: 1.05rem;">Are personalized nutrition plans included?</summary>
          <p style="color: var(--text-muted); margin-top: 10px; line-height: 1.6;">Our Pro Athlete and VIP Elite tiers include full personalized macro and nutrition coaching tailored directly to your training goals.</p>
        </details>
      </div>
    </div>
  </section>

  <section class="contact-section" id="contact" data-section-name="Contact">
    <div class="container" style="max-width: 720px;">
      <h2 class="sec-title">Claim Your Free Pass</h2>
      <p style="color: var(--text-muted); text-align: center; margin-top: -30px; margin-bottom: 30px;">Step inside and experience our state-of-the-art facility for 7 days with zero obligations.</p>
      <form class="contact-form" style="display: flex; flex-direction: column; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px;" onsubmit="event.preventDefault(); alert('Thank you! Your trial request has been submitted.');">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <input type="text" placeholder="Full Name" required style="padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem;">
          <input type="email" placeholder="Email Address" required style="padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem;">
        </div>
        <input type="tel" placeholder="Phone Number (optional)" style="padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem;">
        <button type="submit" class="btn btn-primary" style="padding: 14px; font-weight: 700; border-radius: 8px; cursor: pointer; margin-top: 8px;">Claim 7-Day All-Access Pass</button>
      </form>
    </div>
  </section>

  <footer class="site-footer" id="footer" data-section-name="Footer">
    <div class="container">
      <p>© ${new Date().getFullYear()} Titan Gym. Powered by PixelCraft AI Studio.</p>
    </div>
  </footer>
      `,
      css: `
  :root {
    --primary: #ff6600;
    --primary-glow: rgba(255, 102, 0, 0.4);
    --bg: #0a0d14;
    --surface: #141824;
    --border: rgba(255, 255, 255, 0.08);
    --text: #ffffff;
    --text-muted: #94a3b8;
  }
  body { background: var(--bg); color: var(--text); }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .site-header { padding: 18px 0; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(10,13,20,0.92); backdrop-filter: blur(12px); z-index: 10; }
  .nav-container { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .logo { font-weight: 800; font-size: 1.3rem; color: var(--primary); }
  .nav-menu { display: flex; gap: 20px; }
  .nav-link { color: var(--text-muted); text-decoration: none; font-weight: 500; font-size: 0.92rem; transition: color 0.2s; }
  .nav-link:hover { color: var(--primary); }
  .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 22px; border-radius: 9999px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
  .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 16px var(--primary-glow); }
  .btn-primary:hover { transform: translateY(-2px); filter: brightness(1.1); }
  .btn-secondary { background: rgba(255,255,255,0.06); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { background: rgba(255,255,255,0.12); }
  .btn-lg { padding: 14px 28px; font-size: 1.05rem; }
  .w-full { width: 100%; text-align: center; }

  .hero-section { padding: 80px 0; }
  .hero-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 48px; align-items: center; }
  .badge { display: inline-block; padding: 6px 14px; background: rgba(255,102,0,0.15); color: var(--primary); border-radius: 9999px; font-weight: 600; font-size: 0.85rem; margin-bottom: 18px; border: 1px solid rgba(255,102,0,0.3); }
  .hero-title { font-size: 3.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 20px; }
  .hero-sub { color: var(--text-muted); font-size: 1.15rem; margin-bottom: 32px; max-width: 520px; }
  .hero-btns { display: flex; gap: 16px; }
  .hero-img { width: 100%; height: 420px; object-fit: cover; border-radius: 16px; border: 1px solid var(--border); }

  .sec-title { text-align: center; font-size: 2.3rem; font-weight: 800; margin-bottom: 48px; }
  .about-section, .features-section, .trainers-section, .pricing-section, .testimonials-section, .gallery-section, .faq-section, .contact-section { padding: 80px 0; border-top: 1px solid var(--border); }
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
  .pricing-card p { color: var(--text-muted); margin-bottom: 24px; font-size: 0.95rem; }

  .site-footer { padding: 40px 0; text-align: center; color: var(--text-muted); border-top: 1px solid var(--border); font-size: 0.9rem; }

  @media (max-width: 900px) {
    .hero-grid, .about-grid { grid-template-columns: 1fr !important; text-align: center; }
    .hero-sub { margin: 0 auto 32px; }
    .hero-btns { justify-content: center; }
    .features-grid, .pricing-grid { grid-template-columns: 1fr; }
    .nav-menu { display: none; }
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
  // Prompt Optimization Engine
  // ==========================================================================
  function optimizePromptText(rawPrompt) {
    const p = (rawPrompt || '').toLowerCase();
    let optimized = rawPrompt;

    if (/gym|fitness|workout|crossfit|athlet/i.test(p)) {
      optimized = "Create a premium athletic gym & performance fitness website with bold black and vibrant orange theme. Include a sticky navigation bar with trial pass CTA, high-converting hero section with headline 'Transform Your Ambitions Into Reality', interactive training programs bento grid (HIIT, Strength & Conditioning, Hydro-Recovery), elite trainer coach profiles, 3-tier membership pricing cards with monthly/annual billing switch, member transformations testimonials, interactive free trial pass booking form, and comprehensive footer. Mobile-first responsive with smooth micro-animations.";
    } else if (/restaurant|cafe|food|dining|bistro|menu/i.test(p)) {
      optimized = "Design an exquisite culinary restaurant & cocktail lounge website with dark obsidian and warm amber gold palette. Features: elegant sticky navbar, hero section with 'Artisanal Flavors & Culinary Mastery' and table booking CTA, chef's seasonal tasting menu showcase, private dining experience story, interactive table reservation form, guest reviews, and complete contact details. Fluid typography and luxury editorial aesthetic.";
    } else if (/portfolio|developer|designer|resume/i.test(p)) {
      optimized = "Craft a cutting-edge creative developer and designer portfolio with deep graphite background and luminous emerald accents. Features: sleek header with status pill, dynamic hero section with bio and resume download, interactive bento grid of featured production projects, interactive technical skills taxonomy, client testimonials carousel, and direct project inquiry contact form.";
    } else if (/saas|cloud|software|analytics|startup/i.test(p)) {
      optimized = "Build a high-converting, modern SaaS product landing page with deep space indigo surfaces and cyan glow. Features: sticky navbar with demo CTA, luminous hero with bento product mockup, interactive feature tabs, live platform metrics ticker, 3-tier pricing table with monthly/yearly discount switch, enterprise customer social proof, and smooth responsive hamburger navigation.";
    } else if (/ecommerce|store|shop|fashion/i.test(p)) {
      optimized = "Generate a luxury editorial e-commerce storefront with modern typography and clean minimalist layout. Features: category navigation with cart badge, hero promotion banner, curated product collection bento grid, craftsmanship highlights, customer reviews, and newsletter sign-up strip.";
    } else {
      optimized = `Create a state-of-the-art web application for "${rawPrompt}". Modern dark mode with luminous accents, clean bento grid layout, responsive navigation, interactive feature components, value pricing section, authentic testimonials, and accessible mobile-friendly UX.`;
    }

    if (el.originalPromptInput) {
      el.originalPromptInput.value = optimized;
      el.originalPromptInput.focus();
    }
    showToastNotification('✨ Prompt optimized with professional specifications!');
  }

  // ==========================================================================
  // Event Bindings
  // ==========================================================================
  function setupEvents() {
    // Original Prompt Direction Panel Bindings
    if (el.btnTogglePromptPanel) {
      el.btnTogglePromptPanel.addEventListener('click', () => {
        if (el.promptCard) {
          el.promptCard.classList.toggle('collapsed');
          if (!el.promptCard.classList.contains('collapsed')) {
            el.originalPromptInput?.focus();
          }
        }
      });
    }

    if (el.btnPromptToggle) {
      el.btnPromptToggle.addEventListener('click', () => {
        if (el.promptCard) {
          const isCollapsed = el.promptCard.classList.toggle('collapsed');
          el.btnPromptToggle.textContent = isCollapsed ? '▼ Show Prompt' : '▲ Hide';
        }
      });
    }

    if (el.btnPromptOptimize) {
      el.btnPromptOptimize.addEventListener('click', () => {
        const raw = el.originalPromptInput ? el.originalPromptInput.value.trim() : '';
        if (raw) {
          optimizePromptText(raw);
        } else {
          showToastNotification('Please enter a prompt to optimize');
        }
      });
    }

    if (el.btnPromptUpdate) {
      el.btnPromptUpdate.addEventListener('click', () => {
        const prompt = el.originalPromptInput ? el.originalPromptInput.value.trim() : '';
        if (prompt) {
          generateDesign(prompt);
        } else {
          alert('Prompt cannot be empty.');
        }
      });
    }

    if (el.originalPromptInput) {
      el.originalPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const prompt = el.originalPromptInput.value.trim();
          if (prompt) generateDesign(prompt);
        }
      });
    }
    // Mode Switchers
    if (el.btnModeChat) el.btnModeChat.addEventListener('click', () => setWorkspaceMode('chat'));
    if (el.btnModeStudio) el.btnModeStudio.addEventListener('click', () => setWorkspaceMode('studio'));
    if (el.btnSidebarStudio) el.btnSidebarStudio.addEventListener('click', () => setWorkspaceMode('studio'));
    if (el.btnBuilderBackChat) el.btnBuilderBackChat.addEventListener('click', () => setWorkspaceMode('chat'));

    // Viewport Switchers & Full Page Toggle
    if (el.btnVpDesktop) el.btnVpDesktop.addEventListener('click', () => setViewport('desktop'));
    if (el.btnVpTablet) el.btnVpTablet.addEventListener('click', () => setViewport('tablet'));
    if (el.btnVpMobile) el.btnVpMobile.addEventListener('click', () => setViewport('mobile'));
    if (el.btnFullpage) el.btnFullpage.addEventListener('click', toggleFullPageMode);
    if (el.zoomSelect) {
      el.zoomSelect.addEventListener('change', () => {
        setZoom(el.zoomSelect.value);
      });
    }

    // Refinement Scope Selectors
    if (el.scopeBtnProject) el.scopeBtnProject.addEventListener('click', () => setRefinementScope('project'));
    if (el.scopeBtnSection) el.scopeBtnSection.addEventListener('click', () => setRefinementScope('section'));
    if (el.scopeBtnElement) el.scopeBtnElement.addEventListener('click', () => setRefinementScope('element'));

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

    // Add Section Modal Bindings
    if (el.btnAddSectionOpen) {
      el.btnAddSectionOpen.addEventListener('click', openAddSectionModal);
    }
    if (el.btnCloseAddSectionModal) {
      el.btnCloseAddSectionModal.addEventListener('click', closeAddSectionModal);
    }
    if (el.btnCancelAddSection) {
      el.btnCancelAddSection.addEventListener('click', closeAddSectionModal);
    }
    if (el.modalAddSection) {
      el.modalAddSection.addEventListener('click', (e) => {
        if (e.target === el.modalAddSection) closeAddSectionModal();
      });
    }

    // Preset cards insertion
    if (el.presetCards) {
      el.presetCards.forEach(card => {
        card.addEventListener('click', () => {
          const presetKey = card.getAttribute('data-preset');
          if (presetKey) addSectionPreset(presetKey);
        });
      });
    }

    // Inspector Tabs Switcher
    if (el.tabBtnSection) {
      el.tabBtnSection.addEventListener('click', () => switchInspectorTab('section'));
    }
    if (el.tabBtnElement) {
      el.tabBtnElement.addEventListener('click', () => switchInspectorTab('element'));
    }

    // Section Inspector Quick Actions
    if (el.btnSecMoveUp) {
      el.btnSecMoveUp.addEventListener('click', () => {
        if (state.selectedSectionId) moveSection(state.selectedSectionId, 'up');
      });
    }
    if (el.btnSecMoveDown) {
      el.btnSecMoveDown.addEventListener('click', () => {
        if (state.selectedSectionId) moveSection(state.selectedSectionId, 'down');
      });
    }
    if (el.btnSecDelete) {
      el.btnSecDelete.addEventListener('click', () => {
        if (state.selectedSectionId) {
          const sec = (state.currentProject?.sections || []).find(s => s.id === state.selectedSectionId);
          confirmDeleteSection(state.selectedSectionId, sec?.name);
        }
      });
    }
    if (el.secPropName) {
      el.secPropName.addEventListener('change', () => {
        if (state.selectedSectionId && el.secPropName.value.trim()) {
          applySectionRename(state.selectedSectionId, el.secPropName.value.trim());
        }
      });
    }

    // Section AI Refiner Bindings
    if (el.btnSectionAiApply) {
      el.btnSectionAiApply.addEventListener('click', () => {
        refineSelectedSection();
      });
    }
    if (el.sectionAiPrompt) {
      el.sectionAiPrompt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          refineSelectedSection(el.sectionAiPrompt.value);
        }
      });
    }
    if (el.secAiChips) {
      el.secAiChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const prompt = chip.getAttribute('data-prompt');
          if (prompt) {
            if (el.sectionAiPrompt) el.sectionAiPrompt.value = prompt;
            refineSelectedSection(prompt);
          }
        });
      });
    }

    // Section Properties Inspector Inputs
    if (el.secPropHeading) {
      el.secPropHeading.addEventListener('input', () => {
        dispatchSectionPropertiesUpdate({ headingText: el.secPropHeading.value });
      });
    }
    if (el.secPropParagraph) {
      el.secPropParagraph.addEventListener('input', () => {
        dispatchSectionPropertiesUpdate({ paragraphText: el.secPropParagraph.value });
      });
    }
    if (el.secPropBgColor) {
      el.secPropBgColor.addEventListener('input', () => {
        const val = el.secPropBgColor.value;
        if (el.labelSecBgColor) el.labelSecBgColor.textContent = val;
        dispatchSectionPropertiesUpdate({ backgroundColor: val });
      });
    }
    if (el.secPropTextColor) {
      el.secPropTextColor.addEventListener('input', () => {
        const val = el.secPropTextColor.value;
        if (el.labelSecTextColor) el.labelSecTextColor.textContent = val;
        dispatchSectionPropertiesUpdate({ textColor: val });
      });
    }
    if (el.secPropFontSize) {
      el.secPropFontSize.addEventListener('change', () => {
        dispatchSectionPropertiesUpdate({ fontSize: el.secPropFontSize.value });
      });
    }
    if (el.secAlignButtons) {
      el.secAlignButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          el.secAlignButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          dispatchSectionPropertiesUpdate({ textAlign: btn.getAttribute('data-align') || 'left' });
        });
      });
    }
    if (el.secPropPadding) {
      el.secPropPadding.addEventListener('change', () => {
        dispatchSectionPropertiesUpdate({ padding: el.secPropPadding.value });
      });
    }
    if (el.secPropImgUrl) {
      el.secPropImgUrl.addEventListener('change', () => {
        dispatchSectionPropertiesUpdate({ imageUrl: el.secPropImgUrl.value });
      });
    }
    if (el.secPropBtnText) {
      el.secPropBtnText.addEventListener('input', () => {
        dispatchSectionPropertiesUpdate({ buttonText: el.secPropBtnText.value });
      });
    }
    if (el.secPropBtnLink) {
      el.secPropBtnLink.addEventListener('change', () => {
        dispatchSectionPropertiesUpdate({ buttonLink: el.secPropBtnLink.value });
      });
    }

    // Element Visual Inspector Two-Way Bindings
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

    // Parent Section Jump Button
    if (el.btnElemParentSec) {
      el.btnElemParentSec.addEventListener('click', () => {
        if (state.selectedElementData?.parentSectionId) {
          selectSection(state.selectedElementData.parentSectionId);
        }
      });
    }

    // Typography: Font Family
    if (el.propFontFamily) {
      el.propFontFamily.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { fontFamily: el.propFontFamily.value } });
      });
    }

    // Alignment Buttons
    if (el.elemAlignButtons) {
      el.elemAlignButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          el.elemAlignButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          dispatchElementStyleUpdate({ styles: { textAlign: btn.getAttribute('data-align') || 'left' } });
        });
      });
    }

    // Spacing & Dimensions
    if (el.propMargin) {
      el.propMargin.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { margin: el.propMargin.value } });
      });
    }

    if (el.propWidth) {
      el.propWidth.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { width: el.propWidth.value } });
      });
    }

    // Borders & Outlines
    if (el.propBorderWidth) {
      el.propBorderWidth.addEventListener('change', () => {
        dispatchElementStyleUpdate({ styles: { borderWidth: el.propBorderWidth.value, borderStyle: 'solid' } });
      });
    }

    if (el.propBorderColor) {
      el.propBorderColor.addEventListener('input', () => {
        const val = el.propBorderColor.value;
        if (el.labelBorderColor) el.labelBorderColor.textContent = val;
        dispatchElementStyleUpdate({ styles: { borderColor: val } });
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

      if (data.type === 'PIXELCRAFT_SECTION_IN_VIEW' && data.sectionId) {
        state.inViewSectionId = data.sectionId;
        document.querySelectorAll('#builder-sections-list .section-tree-item').forEach(item => {
          const isCurrent = item.getAttribute('data-section-id') === data.sectionId;
          const badge = item.querySelector('.sec-in-view-badge');
          if (isCurrent && !badge) {
            const b = document.createElement('span');
            b.className = 'sec-in-view-badge';
            b.title = 'Currently visible in preview';
            b.textContent = '👁️ In view';
            const nameEl = item.querySelector('.sec-tree-name');
            if (nameEl && nameEl.nextSibling) {
              item.insertBefore(b, nameEl.nextSibling);
            } else {
              item.appendChild(b);
            }
          } else if (!isCurrent && badge) {
            badge.remove();
          }
        });
      } else if (data.type === 'PIXELCRAFT_ELEMENT_SELECTED') {
        handleElementSelected(data.payload);
        if (data.payload && data.payload.parentSectionId) {
          state.selectedSectionId = data.payload.parentSectionId;
          document.querySelectorAll('.section-tree-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-section-id') === data.payload.parentSectionId);
          });
          populateSectionInspector(data.payload.parentSectionId);
        }
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
