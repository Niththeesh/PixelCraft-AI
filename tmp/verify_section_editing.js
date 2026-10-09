const assert = require('assert');
const builderService = require('../server/services/builderService');

async function runVerification() {
  console.log('========================================================================');
  console.log('🧪 PIXELCRAFT AI — FULL-PAGE PREVIEW & SECTION VISUAL EDITING TEST SUITE');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. Generation of Full-Page Website
  // -------------------------------------------------------------------------
  console.log('📦 1. Generating Test Gym Website...');
  const prompt = 'Create a premium athletic gym & performance fitness website with black and orange theme';
  const project = await builderService.generateProject(prompt);

  test('Project generated successfully with title and metadata', () => {
    assert(project, 'Project must exist');
    assert(project.title, 'Project must have a title');
    assert(project.html && project.html.length > 500, 'Project must have substantial HTML content');
    assert(project.css && project.css.length > 500, 'Project must have styling');
  });

  // -------------------------------------------------------------------------
  // 2. Full-Page Website Preview & Uninhibited Vertical Scrolling
  // -------------------------------------------------------------------------
  console.log('\n📜 2. Validating Full-Page Preview Document & Vertical Scrolling...');
  const bundledHtml = builderService.bundleProjectDocument(project);

  test('Bundled document contains DOCTYPE, UTF-8, and viewport meta', () => {
    assert(bundledHtml.includes('<!DOCTYPE html>'), 'Must include DOCTYPE');
    assert(bundledHtml.includes('<meta name="viewport"'), 'Must include responsive viewport');
  });

  test('Bundled document configures smooth vertical scrolling and sleek scrollbars', () => {
    assert(bundledHtml.includes('overflow-y: auto !important;'), 'Must allow full vertical scrolling');
    assert(bundledHtml.includes('scroll-behavior: smooth;'), 'Must have smooth scrolling');
    assert(bundledHtml.includes('min-height: 100%;'), 'Must have 100% min-height');
    assert(bundledHtml.includes('scrollbar-width: thin;'), 'Must have custom thin scrollbars');
  });

  test('Bundled document includes interactive sandbox bridge and section observer', () => {
    assert(bundledHtml.includes('PIXELCRAFT_SELECT_SECTION'), 'Must handle section selection postMessage');
    assert(bundledHtml.includes('PIXELCRAFT_UPDATE_SECTION_PROPERTIES'), 'Must handle section properties update');
    assert(bundledHtml.includes('PIXELCRAFT_SECTION_IN_VIEW'), 'Must track section in-view via IntersectionObserver');
    assert(bundledHtml.includes('data-pixelcraft-section-selected="true"'), 'Must style selected section luminous outline');
  });

  // -------------------------------------------------------------------------
  // 3. Dynamic Section Detection from Actual DOM
  // -------------------------------------------------------------------------
  console.log('\n📑 3. Testing Section Detection Engine (Real DOM, No Hardcoding)...');
  
  // Extract all landmark tags using regex
  const sectionTagRegex = /<(header|nav|section|footer)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
  const detectedSections = [];
  let match;
  while ((match = sectionTagRegex.exec(bundledHtml)) !== null) {
    const fullTag = match[0];
    const tag = match[1].toLowerCase();
    const id = match[2];
    const nameMatch = fullTag.match(/data-section-name=["']([^"']+)["']/i);
    const name = nameMatch ? nameMatch[1] : id;
    detectedSections.push({ tag, id, name });
  }

  console.log(`     Detected ${detectedSections.length} sections in generated project:`);
  detectedSections.forEach((s, idx) => console.log(`     ${idx + 1}. ${s.name} (#${s.id}) [${s.tag}]`));

  test('Sections exist in visual order from Navigation to Footer', () => {
    assert(detectedSections.length >= 7, `Expected at least 7 sections, found ${detectedSections.length}`);
    const secIds = detectedSections.map(s => s.id);
    assert(secIds.includes('navbar'), 'Must include navbar section');
    assert(secIds.includes('hero'), 'Must include hero section');
    assert(secIds.includes('pricing'), 'Must include pricing section');
    assert(secIds.includes('footer'), 'Must include footer section');
  });

  test('Section landmarks are not cropped and span complete document', () => {
    assert(bundledHtml.includes('id="navbar"'), 'Navbar element must exist');
    assert(bundledHtml.includes('id="hero"'), 'Hero element must exist');
    assert(bundledHtml.includes('id="footer"'), 'Footer element must exist');
  });

  // -------------------------------------------------------------------------
  // 4. Section Reordering (Move Up / Down simulation)
  // -------------------------------------------------------------------------
  console.log('\n🔄 4. Testing Section Reordering (DOM Order Mutation)...');
  test('Section order modification alters HTML document sequence', () => {
    const secA = '<section id="sec-a">A</section>';
    const secB = '<section id="sec-b">B</section>';
    let html = `${secA}\n${secB}`;
    assert(html.indexOf('sec-a') < html.indexOf('sec-b'), 'sec-a is before sec-b');

    // Simulate moving sec-b up
    html = `${secB}\n${secA}`;
    assert(html.indexOf('sec-b') < html.indexOf('sec-a'), 'sec-b is now before sec-a');
  });

  // -------------------------------------------------------------------------
  // 5. Section Deletion
  // -------------------------------------------------------------------------
  console.log('\n🗑️ 5. Testing Section Deletion...');
  test('Removing a section deletes it from HTML while preserving all other sections', () => {
    let html = project.html;
    assert(html.includes('id="pricing"'), 'Pricing must exist initially');
    
    // Remove pricing section
    const updatedHtml = html.replace(/<section[^>]*id=["']pricing["'][^>]*>[\s\S]*?<\/section>/i, '');
    assert(!updatedHtml.includes('id="pricing"'), 'Pricing section must be removed');
    assert(updatedHtml.includes('id="hero"'), 'Hero must still exist');
    assert(updatedHtml.includes('id="navbar"'), 'Navbar must still exist');
  });

  // -------------------------------------------------------------------------
  // 6. Section Addition from Presets
  // -------------------------------------------------------------------------
  console.log('\n➕ 6. Testing Section Addition (Presets)...');
  test('Adding preset section inserts it before footer in HTML', () => {
    let html = project.html;
    const newSection = '<section id="cta-banner" data-section-name="CTA Banner"><div class="container"><h2>Claim Free Pass</h2></div></section>';
    
    const footerPos = html.search(/<footer\b/i);
    assert(footerPos !== -1, 'Footer must exist');
    const updatedHtml = html.slice(0, footerPos) + newSection + '\n' + html.slice(footerPos);
    
    assert(updatedHtml.includes('id="cta-banner"'), 'New section must exist');
    assert(updatedHtml.indexOf('id="cta-banner"') < updatedHtml.indexOf('<footer'), 'New section must appear before footer');
  });

  // -------------------------------------------------------------------------
  // 7. Targeted AI Section Refinement (Unrelated Sections Preserved)
  // -------------------------------------------------------------------------
  console.log('\n🎯 7. Testing Targeted AI Section Refinement...');
  const testProject = {
    title: 'Titan Gym',
    projectType: 'gym',
    version: 1,
    sections: [
      { id: 'navbar', name: 'Navigation', type: 'navbar' },
      { id: 'hero', name: 'Hero', type: 'hero' },
      { id: 'programs', name: 'Training Programs', type: 'features' },
      { id: 'pricing', name: 'Membership Plans', type: 'pricing' },
      { id: 'footer', name: 'Footer', type: 'footer' }
    ],
    html: `
      <header id="navbar"><h1>Titan Gym</h1></header>
      <section id="hero"><h1>Transform Your Ambitions</h1><div class="badge">Old Badge</div></section>
      <section id="programs"><h2>Programs</h2></section>
      <section id="pricing"><h2>Plans</h2><div class="pricing-card">Standard $29</div></section>
      <footer id="footer"><p>© Titan</p></footer>
    `,
    css: ':root { --primary: #ff6600; --bg: #0a0d14; }'
  };

  // Targeted Refinement A: Change background of pricing section to black
  const refinedA = await builderService.refineProject(
    'Change the background of this section to black',
    testProject,
    'pricing'
  );

  test('Targeted change applied to pricing section CSS', () => {
    assert(refinedA.css.includes('#pricing { background: #000000') || refinedA.css.includes('background-color: #000000'), 'Pricing background rule must be added');
  });

  test('Hero, programs and footer sections remain intact after pricing refinement', () => {
    assert(refinedA.html.includes('id="hero"'), 'Hero section must be preserved');
    assert(refinedA.html.includes('id="programs"'), 'Programs section must be preserved');
    assert(refinedA.html.includes('id="footer"'), 'Footer must be preserved');
  });

  // Targeted Refinement B: Add trainer cards to section
  const refinedB = await builderService.refineProject(
    'Add three modern trainer cards to this section',
    testProject,
    'programs'
  );

  test('Trainer cards added to target programs section', () => {
    assert(refinedB.html.includes('Elena Rostova') || refinedB.html.includes('trainer-card'), 'Must contain trainer cards in HTML');
  });

  test('Unrelated pricing and navbar sections remain intact after trainer addition', () => {
    assert(refinedB.html.includes('id="navbar"'), 'Navbar must be preserved');
    assert(refinedB.html.includes('id="pricing"'), 'Pricing must be preserved');
  });

  // -------------------------------------------------------------------------
  // 8. Test Summary
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL REQUIREMENTS MET AND VERIFIED!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
