const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const conversationService = require('../services/conversationService');
const intentRouter = require('../services/intentRouter');
const imageService = require('../services/imageService');
const builderService = require('../services/builderService');
const { requireAuth } = require('../middleware/authMiddleware');

// Standard PostgreSQL UUID format (8-4-4-4-12 hex digits)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid) {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid.trim());
}

// In-flight request lock to prevent accidental duplicate requests
const inFlightRequests = new Set();

// Helper to format assistant replies for creative artifacts
function createLogoAssistantReply(logoData, userPrompt) {
  return `### ${logoData.brandName} — Brand Identity Created

I have designed a professional vector brand identity for **${logoData.brandName}** in the **${logoData.industry.toUpperCase()}** space.

**Design Highlights:**
- **Symbol & Geometry:** Precision vector mark crafted for brand legibility and multi-scale recognition.
- **Color Palette:** Primary \`${logoData.brandKit.palette.primary}\`, Secondary \`${logoData.brandKit.palette.secondary}\`, Accent \`${logoData.brandKit.palette.accent || logoData.brandKit.palette.light}\`.
- **Typography Direction:** ${logoData.brandKit.typography.headingFont}.
- **Brand System:** Vector SVG, high-contrast dark/light variants, monogram, and wordmark ready for deployment.

You can preview the variants below, download the vector SVG or PNG, or open it in **PixelCraft Studio** to inspect and customize.`;
}

function createImageAssistantReply(imageData, userPrompt) {
  return `### AI Visual Asset Generated

I have synthesized a high-fidelity visual asset based on your prompt:
> *"${userPrompt}"*

**Asset Details:**
- **Aspect Ratio:** ${imageData.aspectRatio} (${imageData.width}×${imageData.height}px)
- **Engine / Model:** Flux / Pollinations AI High-Fidelity Synthesis
- **Style:** Commercial composition, cinematic lighting, and sharp 8K aesthetic.

The generated asset is displayed below. You can download the image, generate variations, or refine it further in the Studio.`;
}

function createUiUxAssistantReply(uiuxData, userPrompt) {
  const screensSummary = (uiuxData.screens || []).map((s, idx) => `${idx + 1}. **${s.name}**: ${s.description}`).join('\n');
  return `### ${uiuxData.appTitle} — UI/UX Design Prototype

I have crafted an interactive multi-screen application design for **${uiuxData.appTitle}**.

**Included Screens:**
${screensSummary}

**Design System:**
- **Primary Color:** \`${uiuxData.themeColor}\`
- **Device Profile:** ${uiuxData.deviceType === 'mobile' ? 'Mobile App (iOS/Android)' : 'SaaS Management Dashboard'}

You can preview the screens below or launch it inside **PixelCraft Studio** to inspect components and edit layouts.`;
}

function createWebsiteAssistantReply(project, userPrompt) {
  const sectionsList = project.sections?.map(s => s.name).join(', ') || 'Hero, Features, Showcase, Pricing, CTA';
  return `### ${project.title} — Website Generated

I have generated a responsive modern website tailored to your brief:
> *"${userPrompt}"*

**Architecture & Sections:**
- **Theme:** ${project.theme?.name || 'Modern Dark Glassmorphism'}
- **Sections (${project.sections?.length || 0}):** ${sectionsList}
- **Responsive System:** Fluid layout optimized across Desktop, Tablet, and Mobile.

Click **Open in Visual Studio** to inspect sections, edit typography, customize colors, or export the production code!`;
}

function createRefineAssistantReply(mode, userPrompt) {
  return `### Design Refined Successfully

I have updated your **${mode.toUpperCase()}** project with your requested changes:
> *"${userPrompt}"*

The preview below and in your Visual Studio workspace has been updated. You can continue refining or export your finalized assets anytime!`;
}

/**
 * POST /api/chat
 * Strictly protected route: Requires authenticated Supabase session.
 * Intelligently classifies user intent across English and Tanglish:
 * - General conversation / explanation / code -> Responds with Gemini conversational intelligence
 * - Logo / Image / Website / UI/UX / Refinement -> Generates the actual visual artifact + conversational explanation
 */
router.post('/chat', requireAuth, async (req, res) => {
  const { message, conversationId, persona, systemInstruction } = req.body || {};

  // Payload Validation: Message must be a non-empty string
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      error: 'Message is required'
    });
  }

  const userId = req.user?.id || null;
  const userPrompt = message.trim();

  // Prevent accidental duplicate concurrent requests
  const lockKey = `${userId || 'anon'}_${conversationId || 'default'}`;
  if (inFlightRequests.has(lockKey)) {
    return res.status(429).json({
      success: false,
      error: 'A creative or chat request is currently in progress. Please wait a moment.'
    });
  }
  inFlightRequests.add(lockKey);

  // Options for persona and custom instructions
  const options = {};
  if (persona && typeof persona === 'string') {
    options.persona = persona.trim();
  }
  if (systemInstruction && typeof systemInstruction === 'string') {
    options.systemInstruction = systemInstruction.trim().substring(0, 1000);
  }

  // If conversationId is supplied, validate it and verify ownership
  if (conversationId !== undefined && conversationId !== null) {
    if (!isValidUUID(conversationId)) {
      inFlightRequests.delete(lockKey);
      return res.status(400).json({
        success: false,
        error: 'Invalid conversationId. Must be a valid UUID'
      });
    }

    if (!userId) {
      inFlightRequests.delete(lockKey);
      return res.status(401).json({
        success: false,
        error: 'Authentication required to link messages to a conversation'
      });
    }

    try {
      const existingConv = await conversationService.getConversationById(conversationId.trim(), userId);
      if (!existingConv) {
        inFlightRequests.delete(lockKey);
        return res.status(404).json({
          success: false,
          error: 'Conversation not found or unauthorized'
        });
      }
    } catch (dbErr) {
      inFlightRequests.delete(lockKey);
      console.error('Error verifying conversation existence:', dbErr.message);
      return res.status(500).json({
        success: false,
        error: 'Database error verifying conversation'
      });
    }
  }

  try {
    let history = [];
    let savedUserMsg = null;
    let savedAssistantMsg = null;

    // 1. If authenticated and conversationId is present, fetch prior history and persist user message
    if (conversationId && userId) {
      try {
        history = await conversationService.getMessages(conversationId.trim(), userId);
        savedUserMsg = await conversationService.addMessage(conversationId.trim(), 'user', userPrompt, userId);
      } catch (saveErr) {
        console.error('Error retrieving or saving conversation history:', saveErr.message);
      }
    }

    // 2. Classify intent (Conversational / Explanation / Code vs. Creative Artifacts)
    const classification = intentRouter.classifyIntent(userPrompt, history);
    let replyText = '';
    let artifact = null;

    if (classification.isCreative) {
      const mode = classification.mode;

      if (classification.intent === 'design_refinement') {
        // Refinement of existing asset
        if (mode === 'logo') {
          const refinedLogo = await imageService.refineCreativeAsset(userPrompt, null, 'logo');
          artifact = {
            mode: 'logo',
            title: `${refinedLogo.brandName} Brand Identity (Refined)`,
            logoData: refinedLogo,
            svg: refinedLogo.svg,
            variants: refinedLogo.variants,
            brandKit: refinedLogo.brandKit,
            project: {
              id: 'proj_logo_' + Date.now(),
              mode: 'logo',
              title: `${refinedLogo.brandName} Brand Identity`,
              logo: refinedLogo,
              logoData: refinedLogo,
              html: `<div class="logo-preview-wrapper">${refinedLogo.svg}</div>`
            }
          };
          replyText = createRefineAssistantReply('logo', userPrompt);
        } else if (mode === 'image') {
          const refinedImage = await imageService.refineCreativeAsset(userPrompt, null, 'image');
          artifact = {
            mode: 'image',
            title: `Refined Image Asset`,
            imageUrl: refinedImage.imageUrl,
            directUrl: refinedImage.directUrl,
            aspectRatio: refinedImage.aspectRatio,
            provider: refinedImage.provider,
            imageData: refinedImage,
            project: {
              id: 'proj_img_' + Date.now(),
              mode: 'image',
              title: `Refined Image`,
              image: refinedImage,
              imageData: refinedImage,
              html: `<div style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#05070a;"><img src="${refinedImage.imageUrl || refinedImage.url}" style="max-width:90%;border-radius:16px;" alt="${userPrompt}"></div>`
            }
          };
          replyText = createRefineAssistantReply('image', userPrompt);
        } else if (mode === 'uiux') {
          const refinedUiUx = await imageService.refineCreativeAsset(userPrompt, null, 'uiux');
          artifact = {
            mode: 'uiux',
            title: `Refined UI/UX Prototype`,
            uiuxData: refinedUiUx,
            screens: refinedUiUx.screens,
            project: {
              id: 'proj_uiux_' + Date.now(),
              mode: 'uiux',
              title: refinedUiUx.appTitle || 'App UI',
              uiux: refinedUiUx,
              uiuxData: refinedUiUx,
              html: refinedUiUx.screens?.[0]?.html || ''
            }
          };
          replyText = createRefineAssistantReply('ui/ux', userPrompt);
        } else {
          // Website section or global refinement
          const project = await builderService.generateProject(userPrompt, options);
          project.mode = 'website';
          artifact = {
            mode: 'website',
            title: project.title,
            project: project,
            sectionsCount: project.sections?.length || 0
          };
          replyText = createRefineAssistantReply('website', userPrompt);
        }
      } else if (mode === 'logo') {
        // Genuine Vector Logo & Brand Identity Generation
        const logoData = await imageService.generateLogoAndBrandIdentity(userPrompt, options);
        artifact = {
          mode: 'logo',
          title: `${logoData.brandName} Brand Identity`,
          brandName: logoData.brandName,
          industry: logoData.industry,
          svg: logoData.svg,
          variants: logoData.variants,
          brandKit: logoData.brandKit,
          project: {
            id: 'proj_logo_' + Date.now(),
            mode: 'logo',
            title: `${logoData.brandName} Brand Identity`,
            logo: logoData,
            logoData: logoData,
            html: `<div class="logo-preview-wrapper">${logoData.svg}</div>`,
            css: 'body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0b0f19; margin: 0; }',
            sections: [
              { id: 'logo-primary', name: 'Primary Logo', type: 'logo' },
              { id: 'logo-brand-kit', name: 'Brand Identity Kit', type: 'brand_kit' }
            ]
          }
        };
        replyText = createLogoAssistantReply(logoData, userPrompt);
      } else if (mode === 'image') {
        // Genuine Photorealistic AI Image Generation
        const imageData = await imageService.generateImage(userPrompt, options);
        artifact = {
          mode: 'image',
          title: `AI Visual Asset: ${userPrompt.slice(0, 30)}...`,
          imageUrl: imageData.imageUrl,
          directUrl: imageData.directUrl,
          aspectRatio: imageData.aspectRatio,
          provider: imageData.provider,
          imageData: imageData,
          project: {
            id: 'proj_img_' + Date.now(),
            mode: 'image',
            title: `Creative Image: ${userPrompt.slice(0, 30)}...`,
            image: imageData,
            imageData: imageData,
            html: `<div style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#05070a;"><img src="${imageData.imageUrl || imageData.url}" style="max-width:90%;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.8);" alt="${userPrompt}"></div>`,
            css: '',
            sections: [{ id: 'image-canvas', name: 'Generated Visual Asset', type: 'image' }]
          }
        };
        replyText = createImageAssistantReply(imageData, userPrompt);
      } else if (mode === 'uiux') {
        // Interactive UI/UX App Screens
        const uiuxData = await imageService.generateUiUxProject(userPrompt, options);
        artifact = {
          mode: 'uiux',
          title: uiuxData.appTitle || uiuxData.appName,
          uiuxData: uiuxData,
          screens: uiuxData.screens,
          project: {
            id: 'proj_uiux_' + Date.now(),
            mode: 'uiux',
            title: uiuxData.appTitle || uiuxData.appName,
            uiux: uiuxData,
            uiuxData: uiuxData,
            html: uiuxData.screens[0].html,
            css: 'body { background: #0b0f19; color: #ffffff; font-family: -apple-system, sans-serif; margin: 0; }',
            sections: uiuxData.screens.map(s => ({ id: s.id, name: s.name, type: 'screen' }))
          }
        };
        replyText = createUiUxAssistantReply(uiuxData, userPrompt);
      } else {
        // Full Website Builder Mode
        const project = await builderService.generateProject(userPrompt, options || {});
        project.mode = 'website';
        artifact = {
          mode: 'website',
          title: project.title,
          project: project,
          sectionsCount: project.sections?.length || 0
        };
        replyText = createWebsiteAssistantReply(project, userPrompt);
      }
    } else {
      // 3. Conversational / Factual / Code Assistance via Google Gemini
      const result = (conversationId && userId)
        ? await geminiService.generateChatResponse(history, userPrompt, options)
        : await geminiService.generateResponse(userPrompt, options);

      if (!result.success) {
        const statusCode = result.statusCode || 500;
        return res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to generate response from Gemini API'
        });
      }
      replyText = result.reply;
    }

    // 4. If authenticated and conversationId is present, persist assistant reply
    if (conversationId && userId && replyText) {
      try {
        savedAssistantMsg = await conversationService.addMessage(conversationId.trim(), 'assistant', replyText, userId);
      } catch (saveErr) {
        console.error('Error saving assistant message to database:', saveErr.message);
      }
    }

    const responsePayload = {
      success: true,
      reply: replyText,
      artifact: artifact,
      intent: classification.intent,
      mode: classification.mode,
      persona: options.persona || 'general'
    };

    if (conversationId) {
      responsePayload.conversationId = conversationId.trim();
      if (savedUserMsg && savedUserMsg.id) {
        responsePayload.userMessageId = savedUserMsg.id;
      }
      if (savedAssistantMsg && savedAssistantMsg.id) {
        responsePayload.assistantMessageId = savedAssistantMsg.id;
      }
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error('Chat Route Error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing your request: ' + (err.message || 'Unknown error')
    });
  } finally {
    inFlightRequests.delete(lockKey);
  }
});

module.exports = router;

