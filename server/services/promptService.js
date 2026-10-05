/**
 * Service managing curated AI prompt templates and engineering presets
 */
class PromptService {
  constructor() {
    this.categories = [
      { id: 'all', label: 'All Prompts', icon: '⚡' },
      { id: 'coding', label: 'Code & Architecture', icon: '💻' },
      { id: 'security', label: 'Security & Performance', icon: '🛡️' },
      { id: 'writing', label: 'Documentation & Writing', icon: '📝' },
      { id: 'executive', label: 'Executive & Business', icon: '💼' },
      { id: 'creative', label: 'Brainstorm & Creative', icon: '🎨' }
    ];

    this.prompts = [
      // 1. Coding & Architecture
      {
        id: 'code-review',
        title: 'Production Code Review & Best Practices',
        category: 'coding',
        categoryLabel: '💻 Code & Architecture',
        recommendedPersona: 'code_architect',
        description: 'Performs a rigorous architectural and stylistic review of a code snippet.',
        template: 'Please perform a production-grade code review of the following code snippet. Analyze it for:\n1. Architectural integrity and modular separation\n2. Algorithmic efficiency and potential bottlenecks\n3. Edge case robustness and defensive error handling\n4. Readability and idiomatic patterns\n\nCode snippet:\n```\n{{code}}\n```\n\nProvide actionable recommendations with refactored code blocks.'
      },
      {
        id: 'refactor-clean',
        title: 'Clean Code Refactoring & SOLID Principles',
        category: 'coding',
        categoryLabel: '💻 Code & Architecture',
        recommendedPersona: 'code_architect',
        description: 'Refactors complex, tightly coupled code into modular, testable patterns.',
        template: 'Refactor the following code to adhere strictly to Clean Code and SOLID principles:\n\nTarget Code:\n```\n{{code}}\n```\n\nRequirements:\n- Eliminate code smells and deep nesting\n- Extract single-responsibility functions or classes\n- Add TypeScript type annotations or clear JSDoc\n- Explain the primary design improvements made'
      },
      {
        id: 'error-handler',
        title: 'Defensive Error Handling & Resilient Middleware',
        category: 'coding',
        categoryLabel: '💻 Code & Architecture',
        recommendedPersona: 'code_architect',
        description: 'Designs comprehensive error handling strategies and graceful fallbacks.',
        template: 'Design a robust error handling architecture for the following feature/module:\n\nFeature Context:\n{{feature_context}}\n\nInclude:\n1. Custom Error class hierarchy with HTTP status mappings\n2. Centralized catch middleware or wrapper functions\n3. Structured JSON error response format\n4. Safe logging without exposing secrets or sensitive stack traces in production'
      },
      {
        id: 'ts-migration',
        title: 'TypeScript Type & Interface Designer',
        category: 'coding',
        categoryLabel: '💻 Code & Architecture',
        recommendedPersona: 'code_architect',
        description: 'Generates comprehensive TypeScript interfaces, generics, and strict types.',
        template: 'Convert the following JavaScript data structure/module into strict, production-ready TypeScript definitions:\n\nData / Module:\n```\n{{js_code}}\n```\n\nEnsure:\n- Full typing for function signatures, inputs, and returns\n- Discriminated union types for state transitions\n- Zero use of `any`\n- Readonly properties where immutability is preferred'
      },
      {
        id: 'sql-optimizer',
        title: 'SQL Query Performance & Indexing Strategy',
        category: 'coding',
        categoryLabel: '💻 Code & Architecture',
        recommendedPersona: 'code_architect',
        description: 'Optimizes slow PostgreSQL queries, analyzes joins, and recommends indexes.',
        template: 'Analyze and optimize the following PostgreSQL query for high-throughput production workloads:\n\nSQL Query:\n```sql\n{{sql_query}}\n```\n\nTable Schema / Volume Context:\n{{schema_context}}\n\nProvide:\n1. Query rewrite for maximum efficiency (avoiding seq scans & Cartesian joins)\n2. Recommended index definitions (B-Tree, GIN, partial indexes)\n3. Anticipated EXPLAIN ANALYZE impact'
      },

      // 2. Security & Performance
      {
        id: 'security-audit',
        title: 'OWASP Security & Vulnerability Audit',
        category: 'security',
        categoryLabel: '🛡️ Security & Performance',
        recommendedPersona: 'code_architect',
        description: 'Examines code for OWASP Top 10 vulnerabilities and data leaks.',
        template: 'Conduct a thorough security review of the following system component for OWASP Top 10 risks:\n\nTarget Code / Architecture:\n```\n{{target_code}}\n```\n\nEvaluate for:\n- Injection flaws (SQL, Command, NoSQL)\n- Authentication and session mismanagement\n- Broken access control / tenant isolation leaks\n- Insecure deserialization and sensitive data exposure\n\nProvide remediation code for each vulnerability identified.'
      },
      {
        id: 'jwt-security',
        title: 'JWT & Session Hardening Checklist',
        category: 'security',
        categoryLabel: '🛡️ Security & Performance',
        recommendedPersona: 'code_architect',
        description: 'Designs hardened token lifecycle management with refresh rotations.',
        template: 'Design a hardened authentication and token lifecycle flow for a web application utilizing:\nTech Stack: {{tech_stack}}\n\nDetail:\n1. Short-lived access token + rotating refresh token mechanism\n2. Secure cookie storage flags (HttpOnly, Secure, SameSite=Strict)\n3. Instant token revocation / blacklisting approach\n4. Prevention against CSRF and token replay attacks'
      },
      {
        id: 'input-sanitization',
        title: 'Input Validation & Anti-XSS Sanitizer',
        category: 'security',
        categoryLabel: '🛡️ Security & Performance',
        recommendedPersona: 'code_architect',
        description: 'Implements defensive schema validation and HTML escaping.',
        template: 'Write a comprehensive input validation and sanitization handler for the following user input payload:\n\nPayload Description:\n{{payload_description}}\n\nRequirements:\n- Type and bounds checking\n- Strict schema validation (e.g. Zod or Joi pattern)\n- Context-aware HTML sanitization to prevent stored & reflected XSS\n- Clear, user-friendly validation error messages'
      },
      {
        id: 'rate-limiting',
        title: 'API Rate Limiting & DoS Protection Strategy',
        category: 'security',
        categoryLabel: '🛡️ Security & Performance',
        recommendedPersona: 'code_architect',
        description: 'Configures sliding window rate limiting and brute-force defenses.',
        template: 'Design an API rate limiting and brute-force protection system for the following endpoint:\n\nEndpoint: {{endpoint_name}} (e.g. /api/auth/login or /api/chat)\nTarget RPS / Thresholds: {{traffic_estimates}}\n\nProvide:\n1. Sliding window log or token bucket algorithm design\n2. Redis/in-memory store configuration\n3. Client response headers (`RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After`)\n4. IP + User identity hybrid throttling logic'
      },

      // 3. Documentation & Writing
      {
        id: 'api-docs',
        title: 'REST API Documentation & Spec Generator',
        category: 'writing',
        categoryLabel: '📝 Documentation & Writing',
        recommendedPersona: 'technical_writer',
        description: 'Produces clear, structured API documentation with request/response examples.',
        template: 'Generate complete, production-grade developer documentation for the following API endpoint:\n\nEndpoint Spec:\n{{endpoint_spec}}\n\nFormat:\n- Overview and purpose\n- HTTP Method and URL\n- Headers & Authentication requirements\n- Request parameters / body schema with type definitions\n- Success response (JSON sample with comments)\n- Error responses (400, 401, 403, 404, 500 scenarios)\n- cURL example'
      },
      {
        id: 'tech-spec',
        title: 'RFC / Technical Design Specification',
        category: 'writing',
        categoryLabel: '📝 Documentation & Writing',
        recommendedPersona: 'technical_writer',
        description: 'Drafts an engineering RFC covering requirements, architecture, and tradeoffs.',
        template: 'Draft an engineering Technical Design Specification (RFC) for the following proposal:\n\nProposed Feature: {{feature_name}}\nContext & Problem Statement: {{problem_statement}}\n\nInclude:\n1. Goals and Non-Goals\n2. Proposed Architecture & Component Diagram\n3. Data Models & API Contracts\n4. Security, Scalability & Performance Considerations\n5. Alternative Solutions Considered & Trade-offs\n6. Rollout & Migration Plan'
      },
      {
        id: 'post-mortem',
        title: 'Incident Post-Mortem & Blameless RCA',
        category: 'writing',
        categoryLabel: '📝 Documentation & Writing',
        recommendedPersona: 'technical_writer',
        description: 'Constructs a structured root cause analysis and action item tracker.',
        template: 'Draft a blameless post-mortem document for the following production incident:\n\nIncident Summary:\n{{incident_summary}}\nImpact & Downtime: {{downtime_details}}\n\nStructure:\n- Executive Summary & Severity\n- Timeline of Events (Detection, Escalation, Mitigation, Resolution)\n- Root Cause Analysis (5 Whys methodology)\n- What Went Well vs Where We Got Lucky\n- Action Items & Preventive Countermeasures (Owner, Priority)'
      },
      {
        id: 'readme-generator',
        title: 'Production Repository README & Architecture Guide',
        category: 'writing',
        categoryLabel: '📝 Documentation & Writing',
        recommendedPersona: 'technical_writer',
        description: 'Creates a comprehensive GitHub README with setup guides and badges.',
        template: 'Write a comprehensive, professional README.md for the following project:\n\nProject Name: {{project_name}}\nDescription & Core Tech: {{tech_stack_description}}\n\nInclude:\n- Hero banner with badges\n- Features overview\n- Architecture breakdown\n- Quick start & prerequisite setup steps\n- Environment variable documentation\n- Testing & verification guide'
      },

      // 4. Executive & Business
      {
        id: 'exec-summary',
        title: 'Executive Briefing & Strategic Decision Memo',
        category: 'executive',
        categoryLabel: '💼 Executive & Business',
        recommendedPersona: 'executive_summarizer',
        description: 'Condenses complex technical topics into high-level business takeaways.',
        template: 'Synthesize the following technical report/proposal into an Executive Decision Memo for C-suite leadership:\n\nSource Content:\n{{source_content}}\n\nFormat:\n1. Core Takeaway (TL;DR in 2 sentences)\n2. Strategic Business Impact & ROI\n3. Key Risks & Mitigation Costs\n4. Recommended Next Step / Decision Matrix'
      },
      {
        id: 'release-notes',
        title: 'Stakeholder Release Notes & Changelog',
        category: 'executive',
        categoryLabel: '💼 Executive & Business',
        recommendedPersona: 'executive_summarizer',
        description: 'Formats engineering updates into polished customer-facing release notes.',
        template: 'Transform the following git commit logs and engineering tickets into polished, customer-facing release notes:\n\nChangelog Data:\n{{changelog_data}}\n\nFormat:\n- Highlight of the Release\n- 🚀 New Features & Enhancements\n- 🛠️ Bug Fixes & Reliability Improvements\n- ⚠️ Breaking Changes or Action Required (if any)'
      },
      {
        id: 'tradeoff-analysis',
        title: 'Architectural Trade-off & Decision Matrix',
        category: 'executive',
        categoryLabel: '💼 Executive & Business',
        recommendedPersona: 'executive_summarizer',
        description: 'Constructs an objective comparison matrix evaluating engineering options.',
        template: 'Evaluate the tradeoffs between the following technical options for our stack:\n\nDecision Context: {{decision_context}}\nOptions: {{options_to_compare}}\n\nEvaluate each option across:\n- Development Velocity & Time to Market\n- Long-Term Maintenance & Complexity\n- Financial Cost (Cloud/Licensing)\n- Scalability Ceiling\n\nProvide an objective Recommendation with rationale.'
      },

      // 5. Brainstorm & Creative
      {
        id: 'feature-brainstorm',
        title: 'Product Feature Innovation & Ideation',
        category: 'creative',
        categoryLabel: '🎨 Brainstorm & Creative',
        recommendedPersona: 'creative_brainstormer',
        description: 'Generates creative, high-impact feature concepts and differentiators.',
        template: 'Brainstorm 5 innovative, high-impact features for the following product:\n\nProduct Category: {{product_category}}\nTarget Audience: {{target_audience}}\nPrimary Pain Point: {{primary_pain_point}}\n\nFor each idea provide:\n1. Concept Name & One-Line Hook\n2. User Benefit & WOW factor\n3. Technical feasibility snapshot (Low, Medium, High effort)'
      },
      {
        id: 'architecture-metaphor',
        title: 'System Architecture Intuitive Metaphor',
        category: 'creative',
        categoryLabel: '🎨 Brainstorm & Creative',
        recommendedPersona: 'creative_brainstormer',
        description: 'Explains complex technical distributed systems using real-world analogies.',
        template: 'Explain the following complex technical concept using an imaginative real-world metaphor (e.g. airport logistics, postal system, city infrastructure):\n\nConcept to Explain:\n{{technical_concept}}\n\nAudience Level: {{audience_level}} (e.g. non-technical stakeholder or junior engineer)\n\nBreak down:\n- The analogy setup\n- How each component maps to the real system\n- Why failures or bottlenecks happen in this analogy'
      },
      {
        id: 'user-journey',
        title: 'User Experience Journey & Edge Case Discovery',
        category: 'creative',
        categoryLabel: '🎨 Brainstorm & Creative',
        recommendedPersona: 'creative_brainstormer',
        description: 'Maps the end-to-end user emotional and functional journey.',
        template: 'Map out the complete end-to-end user journey for the following user workflow:\n\nWorkflow: {{workflow_description}}\n\nIdentify:\n1. Step-by-step user actions and expectations\n2. Potential friction points or cognitive overload zones\n3. Unexpected edge cases (e.g. network disconnect, concurrent edits, session expiration)\n4. Delightful UX opportunities to exceed expectations'
      }
    ];
  }

  /**
   * Retrieves all available category descriptors
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Retrieves prompts filtered by category and/or text search query
   * @param {string} [category] - Optional category filter
   * @param {string} [searchQuery] - Optional search query string
   * @returns {Array<object>} Filtered prompts
   */
  getAllPrompts(category = null, searchQuery = null) {
    let result = [...this.prompts];

    if (category && typeof category === 'string' && category.trim() !== '' && category.toLowerCase() !== 'all') {
      const cat = category.trim().toLowerCase();
      result = result.filter(p => p.category.toLowerCase() === cat);
    }

    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.template.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q)
      );
    }

    return result;
  }

  /**
   * Retrieves a prompt template by its unique ID
   * @param {string} id - Prompt template identifier
   * @returns {object|null} Found prompt template or null
   */
  getPromptById(id) {
    if (!id || typeof id !== 'string') return null;
    return this.prompts.find(p => p.id.toLowerCase() === id.trim().toLowerCase()) || null;
  }
}

module.exports = new PromptService();
