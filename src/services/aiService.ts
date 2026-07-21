import { CourseOutline, TerminalObjectiveGroup, ExamConfig, ExamQuestion } from "../types/course";

// ── Secure AI Proxy Client ───────────────────────────────────────────────────
// API keys live ONLY in server.js — never in the browser bundle.
// All AI calls are routed through /api/ai which is served by the Express proxy.
const AI_PROXY_URL = '/api/ai';

export interface CourseOutlineDraft {
  title: string;
  description: string;
  learningObjectives: (string | TerminalObjectiveGroup)[];
  visualTheme: string;
  modules: {
    id: string;
    title: string;
    slides: {
      id: string;
      type: string;
      title: string;
      gameType?: string;
    }[];
  }[];
}

function extractJsonFromText(rawText: string): string {
  let text = rawText.trim();

  // 1. Prefer content inside a code fence first (most reliable)
  const codeBlockMatch = text.match(/```(?:json)?[\r\n]+([\s\S]*?)[\r\n]+```/i) ||
                          text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch?.[1]) {
    text = codeBlockMatch[1].trim();
  } else {
    // 2. Find the outermost JSON boundary
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let s = -1;
    if (firstBrace !== -1 && firstBracket !== -1) s = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) s = firstBrace;
    else if (firstBracket !== -1) s = firstBracket;

    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    let e = -1;
    if (lastBrace !== -1 && lastBracket !== -1) e = Math.max(lastBrace, lastBracket);
    else if (lastBrace !== -1) e = lastBrace;
    else if (lastBracket !== -1) e = lastBracket;

    if (s !== -1 && e !== -1 && e > s) {
      text = text.substring(s, e + 1);
    }
  }
  return text;
}

/**
 * Repair truncated JSON by closing unclosed brackets/braces.
 * Handles the most common Claude token-limit truncation pattern.
 */
function repairTruncatedJson(text: string): string {
  // Remove trailing commas before closing brackets
  let repaired = text.replace(/,\s*([}\]])/g, '$1');

  // Balance brackets
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
    }
  }

  // Close any unclosed string then close all open structures
  if (inString) repaired += '"';
  repaired += stack.reverse().join('');
  return repaired;
}

function parseJsonSafely(rawText: string): any {
  const extracted = extractJsonFromText(rawText);
  if (!extracted) throw new Error('No JSON structure found in AI response.');

  // Pass 1: Direct parse
  try { return JSON.parse(extracted); } catch (_) {}

  // Pass 2: Fix trailing commas only
  try { return JSON.parse(extracted.replace(/,\s*([}\]])/g, '$1')); } catch (_) {}

  // Pass 3: Full truncation repair + parse
  try { return JSON.parse(repairTruncatedJson(extracted)); } catch (_) {}

  // Pass 4: Eval (handles unquoted keys, JS-style objects)
  try { return new Function('return ' + extracted)(); } catch (_) {}

  // Pass 5: Truncation repair + eval
  try { return new Function('return ' + repairTruncatedJson(extracted))(); } catch (e) {
    throw new Error(`All JSON parse attempts failed. Tail: "${extracted.slice(-200)}"`);
  }
}


/**
 * Universal Anthropic execution — proxied securely through server.js.
 * The API key never leaves the server; the browser sends only prompt data.
 */
async function executeAnthropicAI(modelTier: 'complex' | 'bulk', systemPrompt: string, userPrompt: string, maxTokens: number = 8192): Promise<string> {
  const executeCall = async () => {
    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Send the Supabase JWT so the server can enforce trial rate limits.
        // Reads from localStorage where Supabase stores the session client-side.
        ...(() => {
          try {
            // Supabase key format: sb-<project-ref>-auth-token
            const key = Object.keys(localStorage).find(k =>
              (k.startsWith('sb-') && k.includes('auth-token')) ||
              (k.includes('supabase') && k.includes('auth'))
            );
            let token = key ? JSON.parse(localStorage.getItem(key) ?? '')?.access_token : null;
            if (!token) {
              // Fallback: scan all keys
              for (const k of Object.keys(localStorage)) {
                try { const v = JSON.parse(localStorage.getItem(k) ?? ''); if (v?.access_token) { token = v.access_token; break; } } catch { /**/ }
              }
            }
            return token ? { 'Authorization': `Bearer ${token}` } : {};
          } catch { return {}; }
        })(),
      },
      body: JSON.stringify({
        model:     modelTier,
        system:    systemPrompt,
        user:      userPrompt,
        maxTokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`AI proxy error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.text ?? '{}';
  };

  try {
    return await executeCall();
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.message?.includes('rate_limit') || err?.message?.includes('quota')) {
      const retryMatch = err.message.match(/retry after (\d+)/i) || err.message.match(/reset in (\d+)/i) || err.message.match(/(\d+)s/i);
      let waitTime = 15000;
      if (retryMatch) waitTime = (parseInt(retryMatch[1], 10) + 2) * 1000;
      console.warn(`[AI Proxy] Rate limited — pausing ${waitTime / 1000}s then retrying...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return await executeCall();
    }
    throw new Error(`AI Proxy request failed: ${err.message}`);
  }
}

export interface FileAnalysisResult {
  title: string;
  summary: string;
  topic: string;
  audience: string;
  complexityLevel: 'simple' | 'moderate' | 'complex';
  recommendedPreset: 'quick' | 'standard' | 'comprehensive';
  recommendedObjectiveFormat: 'AB' | 'ABC' | 'ABCD';
  recommendedInteractions: string[];
  objectives: TerminalObjectiveGroup[];
  objectivesInferred: boolean;
  detectedStructure: string;
  possibleModules: string[];
  slideCount?: number;
}

export async function analyzeUploadedFile(
  fileText: string,
  fileName: string
): Promise<FileAnalysisResult> {
  const systemInstruction = `You are an expert Instructional Designer and File Analysis Engine.
  Your job is to read uploaded document structures and extract a full eLearning course blueprint.
  
  TASKS:
  1. Extract title(s), section headers, key topics, and definitions.
     NOTE: The source text may be pre-parsed structured Markdown from a PPTX or PDF:
     - "## Slide N: Title" lines = individual slide titles → use these as module/topic boundaries
     - "## Page N" lines = PDF page breaks
     - "### HEADING" lines = section headings detected in PDF
     - "> Speaker Notes:" = presenter notes for context
     Use this structure to identify modules and map content accurately.
  2. Generate a clean, professional course Title (concise, no raw artifact file names).
  3. Write a 2-4 sentence Description (what learners will learn, context, why it matters).
  4. Classify the complexity (simple vs moderate vs complex).
  5. Suggest a recommended Preset based on CONTENT DEPTH AND COMPLEXITY, not raw slide count:
     - "quick": Surface-level awareness only. Single concept, minimal depth, 1-2 modules, simple/introductory content. Equivalent to a 5-10 minute primer. Use SPARINGLY.
     - "standard": Multi-concept content with application. 2-5 modules, moderate depth, most real corporate training falls here. DEFAULT when in doubt.
     - "comprehensive": Deep technical or procedural content, 5+ modules, advanced or nuanced subject matter requiring extensive coverage.
     IMPORTANT: If the content covers multiple distinct topics, has procedures, real-world applications, or requires behavioral change, choose "standard" or "comprehensive". Do NOT downgrade to "quick" just because the source document is short.
  6. Recommend an objectiveFormat: "AB" (quick courses), "ABC" (standard), or "ABCD" (comprehensive).
  7. Classify Content Types and Map Interactions. E.g. Concepts -> "flashcards", Processes -> "timeline", Comparisons -> "accordion", Matching -> "drag-drop-activity". Return an array of these recommended interaction strings.
  8. GENERATE OBJECTIVES using Bloom's Taxonomy:
     - For standard eLearning (assessments via MCQ), focus almost exclusively on the REMEMBERING and UNDERSTANDING domains.
       * Remembering verbs: recall, identify, define, list, name, recognize, state, label, match, outline, retrieve
       * Understanding verbs: describe, explain, summarize, classify, compare, interpret, paraphrase, categorize
     - Only use APPLYING / ANALYZING / EVALUATING / CREATING verbs if the course is a software simulation or the learner will actually perform a procedure within the course environment.
     - ONE VERB PER OBJECTIVE. Never write "define and apply" — that is two objectives. Each objective must describe exactly one measurable, observable behavior.
     - Generate 2-4 Terminal Objectives (the high-level outcome the course achieves). For each, generate 2-4 Enabling Objectives (the individual knowledge/skill steps needed to reach it).
     - Terminal Objective example format: "Given [a scenario/condition], the learner will [single Bloom's verb] [specific knowledge/skill] [to a measurable standard]."
     - Enabling Objective example format: "The learner will [single Bloom's verb] [specific sub-skill or concept]."
  
  OUTPUT FORMAT: Return ONLY raw JSON:
  {
    "title": "string",
    "summary": "string",
    "topic": "string",
    "audience": "string",
    "complexityLevel": "simple|moderate|complex",
    "recommendedPreset": "quick|standard|comprehensive",
    "recommendedObjectiveFormat": "AB|ABC|ABCD",
    "recommendedInteractions": ["string"],
    "objectives": [{"terminalObjective": "string", "enablingObjectives": ["string"]}],
    "objectivesInferred": true,
    "detectedStructure": "string",
    "possibleModules": ["string"]
  }`;
  
  const userPrompt = `Analyze the following source material from a file named "${fileName}":\n\n${fileText.slice(0, 12000)}`;
  
  const text = await executeAnthropicAI('complex', systemInstruction, userPrompt, 4096);
  const cleanedText = extractJsonFromText(text);
  return parseJsonSafely(text) as FileAnalysisResult;
}

export async function suggestLearningObjectives(
  title: string, description: string, pathway: 'corporate', courseType: 'quick' | 'standard' | 'comprehensive', manualFormat: 'AB' | 'ABC' | 'ABCD', existingObjectives?: (string | TerminalObjectiveGroup)[]
): Promise<TerminalObjectiveGroup[]> {
  const { getPresetConfig } = await import('../lib/presetEngine');
  const preset = getPresetConfig(pathway, courseType);
  const countMin = preset.objectiveCountMin;
  const countMax = preset.objectiveCountMax;
  const countRange = countMin === countMax ? `exactly ${countMin}` : `${countMin} to ${countMax}`;

  const systemInstruction = `You are an expert Instructional Designer with a PhD in Learning Science and certified expertise in Bloom's Taxonomy.
  Your task is to generate or optimize learning objectives that follow evidence-based instructional design principles.

  ======================================
  BLOOM'S TAXONOMY VERB GUIDANCE
  ======================================
  Standard eLearning assessments (multiple-choice, matching, identification) can only validate REMEMBERING and UNDERSTANDING.
  Use APPLYING, ANALYZING, EVALUATING, or CREATING ONLY when the course includes a simulated environment where learners actually perform the task and the eLearning itself evaluates the performance.

  DOMAIN -> PRIMARY VERBS (use these, not generic filler):
  - Remembering: recall, identify, define, list, name, recognize, state, label, match, outline, retrieve, locate
  - Understanding: describe, explain, summarize, classify, compare, contrast, interpret, paraphrase, categorize, distinguish, illustrate
  - Applying (simulations only): apply, calculate, construct, demonstrate, execute, solve, use, produce, implement
  - Analyzing (simulations only): analyze, differentiate, examine, break down, classify, compare, inspect, deconstruct
  - Evaluating (simulations only): evaluate, judge, justify, critique, defend, prioritize, assess
  - Creating (simulations only): design, formulate, develop, compose, construct, devise, generate

  FORBIDDEN VERBS — NEVER USE THESE (unmeasurable, not observable):
  understand, know, learn, be aware of, appreciate, familiarize, grasp, comprehend, have knowledge of, be familiar with
  Instead use: "understand" → describe/explain | "know" → identify/define | "be aware" → recognize/distinguish | "appreciate" → compare/evaluate

  CRITICAL CONSTRAINTS:
  1. COUNT: Generate ${countRange} objective(s). NEVER generate fewer than ${countMin} or more than ${countMax}.
  2. STRATEGY: ${preset.objectiveGenStrategy}
  3. FORMAT REQUIRED: ${manualFormat}
     - ABCD: "Given [condition], the learner will [single verb] [behavior/outcome] to [degree standard]."
     - ABC: "Given [condition], the learner will [single verb] [behavior/outcome]."
     - AB: "The learner will [single verb] [specific outcome]."
  4. ONE VERB PER OBJECTIVE. NEVER combine verbs (e.g., NEVER "define and apply" -- that is two objectives). Each objective must describe exactly ONE measurable, observable behavior.
  5. TERMINAL vs ENABLING: A Terminal Objective is the high-level course outcome. Enabling Objectives are the individual knowledge/skill building blocks needed to achieve it. Ensure each Terminal Objective has 2-4 Enabling Objectives that logically scaffold toward it.
  6. BLOOM'S LEVEL: ${courseType === 'quick' ? 'Use ONLY Remembering and Understanding verbs.' : courseType === 'standard' ? 'Use primarily Remembering and Understanding verbs. Apply only if content is procedural and the eLearning simulates the task.' : 'Use Remembering and Understanding as the base. Apply higher-order verbs only for simulation-based or hands-on procedural content.'}
  7. VALIDATION: Before returning, apply this QUALITY CHECKLIST to every objective:
     a) Can it be assessed with a single multiple-choice question? If no, rewrite.
     b) Does the verb describe an OBSERVABLE LEARNER BEHAVIOR (not a state of mind)?
     c) Does the objective contain the word "and"? If yes, split it into two objectives.
     d) Is the outcome specific enough that two IDs would write the same assessment for it?
  8. VALIDATION: Count your Terminal Objectives before returning. If the count is outside [${countMin}, ${countMax}], fix it.

  OUTPUT FORMAT: Return ONLY raw JSON: { "objectives": [{ "terminalObjective": "string", "enablingObjectives": ["string1", "string2"] }] }`;

  const existingStringified = JSON.stringify(existingObjectives || []);
  const userPrompt = existingObjectives && existingObjectives.length > 0
    ? `REFORMAT and REFINE the following existing learning objectives into the "${manualFormat}" format for the course titled "${title}".

Context: "${description}"

Format rules to apply:
- AB format: "The learner will [single Bloom's verb] [specific outcome]."
- ABC format: "Given [condition], the learner will [single Bloom's verb] [outcome]."
- ABCD format: "Given [condition], the learner will [single Bloom's verb] [outcome] to [measurable degree/standard]."

Apply the '${manualFormat}' format to EVERY terminal objective AND every enabling objective string. Keep the same number of terminal objectives and the same content areas -- only change the format and wording to match ${manualFormat}.

Existing objectives (to reformat):
${existingStringified}`
    : `Generate ${countRange} new Terminal Objective(s) containing Enabling Objectives for the course titled "${title}" with context: "${description}". Use the '${manualFormat}' format for every objective string.`;

  const text = await executeAnthropicAI('complex', systemInstruction, userPrompt);
  const parsedData = parseJsonSafely(text) || { objectives: [] };

  if (parsedData.objectives && Array.isArray(parsedData.objectives) && parsedData.objectives.length > 0) {
    // Enforce count trim if AI generated too many
    return parsedData.objectives.slice(0, countMax);
  }
  // Fallback: return original objectives unchanged so we don't silently clear the list
  return existingObjectives ? (existingObjectives as TerminalObjectiveGroup[]) : [];
}

export async function generateCourseOutline(
  prompt: string, 
  objectives: (string | TerminalObjectiveGroup)[],
  configParams: {
    courseType: 'quick' | 'standard' | 'comprehensive';
    interactionTypes: string[];
    slideCount: number;
    /** @deprecated use gameTemplateIds */ gameTemplateId?: string | null;
    /** Array of game template IDs selected by the user */
    gameTemplateIds?: string[];
    includeObjectiveSlides?: boolean;
    includeSummarySlides?: boolean;
    includeModuleTitleSlides?: boolean;
    includeKnowledgeChecks?: boolean;
    pathway?: 'corporate';
    // Source conversion mode (file upload)
    isSourceConversion?: boolean;
    sourceContent?: string;
    conversionPreferences?: string[];
  }
): Promise<CourseOutlineDraft> {
  // Normalise: support both legacy single ID and new array
  const gameIds: string[] = configParams.gameTemplateIds?.length
    ? configParams.gameTemplateIds
    : configParams.gameTemplateId
    ? [configParams.gameTemplateId]
    : [];
  const systemInstruction = `You are an Expert Senior Corporate Instructional Designer.
  Your ONLY job right now is to draft the TABLE OF CONTENTS (Outline) for a course. Do NOT write the actual content yet.
  
  COURSE STRUCTURE REQUIREMENTS:
  You must create EXACTLY ONE module per provided Learning Objective/Target.
  Every module MUST follow this exact sequence of slides:
  1. NO title slide — The course player now automatically injects a styled "Module X — Overview" slide as the FIRST slide of EVERY module. This slide displays the module description and its learning objectives. Do NOT generate a title, intro, or overview slide for any module. Each module must start directly with its first content or interaction slide.
  2. ${configParams.includeObjectiveSlides !== false ? "Objectives Slide (type: content)" : "NO objectives slide"}
  3. Content & Interaction Slides -- use the SPECIFIC allowed interaction type as the slide type. Allowed interaction types: ${configParams.interactionTypes.join(", ")}. Map them to slide types like this:
     - accordion, flashcards, timeline, sorting, matching -> use the exact string as the slide 'type'
     - tabbed-horizontal, tabbed-vertical, folder-explorer, carousel-panel, click-reveal -> use the exact string as the slide 'type'
     - choice -> use type: "quiz" with interactions array
     - For PROCESS FLOWS, DECISION TREES, WORKFLOWS, or MULTI-STEP PROCEDURES: use type: "diagram" (generates a Mermaid.js flowchart)
  4. ${configParams.includeKnowledgeChecks !== false ? 'Knowledge Check Slides (type: quiz)' : 'NO knowledge check slides'}
  5. ${configParams.includeSummarySlides !== false ? "Summary Slide (type: content)" : "NO summary slide"}
  
  CRITICAL: The course player automatically injects (1) a Cover/Introduction slide before all modules, and (2) a "Module X — Overview" slide as the FIRST slide of EVERY module. Do NOT create any intro, overview, title, or welcome slide for ANY module. All modules must start directly with their first content or interaction slide.
  
  GAME TEMPLATE INTEGRATION:
  ${gameIds.length === 0
    ? 'Do not include any game templates.'
    : gameIds.length === 1
    ? `The user has selected the "${gameIds[0]}" game mode. YOU MUST APPEND exactly one slide with type: "game-template" and gameType: "${gameIds[0]}" as the VERY LAST slide in the VERY LAST module. This slide represents a full interactive game covering the entire course content.`
    : `The user has selected ${gameIds.length} game modes: ${gameIds.map(id => `"${id}"`).join(', ')}.
Distribute one game slide per game type across the LAST ${gameIds.length} modules. Specifically:
${gameIds.map((id, i) => `  - Append a slide with type: "game-template" and gameType: "${id}" as the LAST slide of module ${i + 1} (counting from the end — i.e. the ${gameIds.length - i} last module).`).join('\n')}
Each game slide must have a unique title like "[Game Name] Knowledge Challenge".`
  }
  
  OUTPUT FORMAT: You must return ONLY raw JSON matching this EXACT schema:
  {
    "title": "Course Title",
    "description": "Short summary",
    "visualTheme": "Neutral",
    "modules": [
      {
        "id": "uuid",
        "title": "Module Title",
        "slides": [
          { "id": "uuid", "type": "content|quiz|accordion|flashcards|timeline|sorting|matching|diagram|game-template", "title": "Slide Title", "gameType": "optional_string" }
        ]
      }
    ]
  }`;

  const { getAvailableThemes } = await import('../lib/backgrounds');
  const availableThemes = getAvailableThemes();

  const conversionNote = configParams.isSourceConversion && configParams.sourceContent
    ? `\n\nIMPORTANT: This course is being CONVERTED from an uploaded source document. Use the source material below as the primary content reference. Apply instructional design best practices: chunk dense content, convert lecture-style material into interactive learning segments, and apply progressive disclosure.\nConversion Preferences: ${(configParams.conversionPreferences || []).join(', ') || 'Default conversion'}\n\nSOURCE MATERIAL (first 4000 chars):\n${configParams.sourceContent.slice(0, 4000)}`
    : '';

    const userPrompt = `Draft the outline for a Corporate Training Course. Topic: "${prompt}".
    Learning Objectives: ${JSON.stringify(objectives)}
    Total Target Slide Count: ~${configParams.slideCount || 10}
    AVAILABLE VISUAL THEMES: ${availableThemes.length > 0 ? availableThemes.join(", ") : "Neutral"}
    IMPORTANT AI DIRECTIVE: You must ONLY select a visualTheme if the course topic has a STRONG, LITERAL semantic match to that specific theme (e.g. use "Rigs" only for oil/gas/industrial topics, use "Forest" only for nature topics). If there is NO strong semantic match, you MUST default to "Neutral". Do not guess or select unrelated themes!

    MODULE TITLE QUALITY RULES:
    - Module titles must be ACTIVE NOUN PHRASES that describe what the learner gains, NOT passive topic labels.
    - WRONG: "Introduction to Compliance" | RIGHT: "Identifying Core Compliance Requirements"
    - WRONG: "Data Security Overview" | RIGHT: "Protecting Sensitive Data in Your Workplace"
    - WRONG: "Module 3" or "Chapter 3" | RIGHT: A meaningful phrase with an implied Bloom's verb
    - Derive module titles from the Learning Objectives provided above — each module should clearly advance one enabling or terminal objective.${conversionNote}`;

  const rawText = await executeAnthropicAI('complex', systemInstruction, userPrompt, 8192);
  const cleanedText = extractJsonFromText(rawText);
  
  const parsedOutline = parseJsonSafely(rawText) as CourseOutlineDraft;
  if (!parsedOutline) throw new Error("Critical Data Failure: Outline could not be parsed.");
  
  return parsedOutline;
}

export async function hydrateCourseContent(
  outlineDraft: CourseOutlineDraft,
  originalPrompt: string,
  configParams: {
    pathway?: 'corporate';
    courseType: 'quick' | 'standard' | 'comprehensive';
    sourceContent?: string;
    conversionPreferences?: string[];
    scenarioConfig?: ScenarioConfigForGeneration;
  },
  onProgress?: (pct: number) => void
): Promise<CourseOutline> {
  const fullCourse: CourseOutline = {
    title: outlineDraft.title,
    description: outlineDraft.description,
    visualTheme: outlineDraft.visualTheme,
    learningObjectives: outlineDraft.learningObjectives,
    modules: []
  };

  const systemInstruction = `You are an Expert eLearning Content Architect and Certified Instructional Designer.
  Your ONLY job: hydrate the provided module JSON skeleton with rich, ISD-compliant content. Do NOT change the slide structure.

  ========================================
  GLOBAL PRINCIPLE — ON-SCREEN TEXT vs NARRATION (APPLIES TO EVERY SLIDE)
  ========================================
  On-screen text (content field) and spoken narration (voiceOverText) serve DIFFERENT jobs. Never make them the same text.
  - ON-SCREEN TEXT = a short visual anchor the learner can scan in 2-3 seconds. Default to SHORT PHRASES of 5-8 words per
    bullet, MAXIMUM 5-6 bullets per slide. Bullets are memory hooks, not complete explanations.
  - NARRATION (voiceOverText) = where the real teaching happens. It expands on each bullet in natural spoken language,
    gives context/examples/application — but it must NEVER just re-read the bullets verbatim or restate them one by one.
    It should feel like a person explaining the big picture, not narrating a list.
  - EXCEPTION (full sentences/paragraphs ARE appropriate): scenario/branching narrative text the learner must read closely,
    direct quotes or excerpts from a source document, or a screenshot/image caption that needs a complete sentence for
    context. Outside those cases, default to short bullets everywhere — content slides, summaries, key takeaways,
    accordion items, tabs, flashcards, click-reveal definitions, etc.
  - MODULE SUMMARY / KEY TAKEAWAYS SPECIFICALLY: never write one bullet per topic taught in the module. Instead select
    ONLY the 4-6 most important, highest-value takeaways across the WHOLE module. The narration should give a big-picture
    synthesis of why these matter together — ideally ending on a short, memorable line — NOT a recap of every slide.

  ========================================
  ISD BEST PRACTICES (MANDATORY)
  ========================================
  1. 5-6 BULLET RULE: Maximum 5-6 short bullet points per slide (see Global Principle above for bullet length). Never paste a wall of text.
  2. ONE CONCEPT PER SCREEN: Do not combine multiple major ideas on one slide.
  3. ACTIVE VOICE ONLY: "The pump delivers..." not "Delivery is achieved by..."
  4. CHUNKING: Use ### subheadings to group 2-4 related bullets under a theme.
  5. BLOOM'S ALIGNMENT — QUIZ QUESTION DESIGN (STRICT):
     - REMEMBERING-level objectives (identify, define, recall, name, list, recognize):
       → Questions MUST use recognition formats: "Which of the following CORRECTLY DEFINES [term]?" or "Which term BEST DESCRIBES [concept]?"
       → All 4 options must be plausible definitions/descriptions — never obviously absurd distractors.
     - UNDERSTANDING-level objectives (describe, explain, summarize, classify, compare):
       → Questions MUST present a brief scenario then ask for the best explanation: "A team leader notices [situation]. Which statement BEST explains why [outcome]?"
       → Distractors must be partially correct but miss a key nuance.
     - NEVER write a Higher-Order question (apply/analyze/evaluate) for a Remembering objective — it's a level mismatch.
     - Each question must have EXACTLY 4 options: 1 correct + 3 meaningfully wrong distractors (min 12 words each).
  6. VOICE-OVER FORMULA (CEAP): voiceOverText MUST follow this 4-part spoken formula:
     C — CONTEXT (1 sentence): "In [workplace scenario], [topic] matters because [reason]."
     E — EXAMPLE (1 sentence): "For example, [concrete real-world situation a learner would face]."
     A — APPLICATION (1 sentence): "In practice, this means [specific action or behavior the learner should adopt]."
     P — PREVIEW/CONNECT (1 sentence): "As we explore this further, [bridge to next concept or upcoming interaction]."
     Total: 3–4 natural spoken sentences. NEVER re-read slide bullets verbatim.
  7. CONCISENESS: Each content field <= 5-6 short bullets (5-8 words each) OR <= 2 short sentences for the rare cases that
     call for prose (see Global Principle exceptions). Use markdown (**, ###, >) for visual hierarchy.
  8. NO WALLS OF TEXT: If content exceeds 6 lines, break it with ### headers and subgroups.
  9. NO COLON-PIPE DIVIDERS: Never write "IDENTIFY: |" or any "KEYWORD: |" pattern. Use "**Identify:**" or a heading instead.
  10. NO EMPTY BOLD: Never write "** **" or "**  **". Only bold meaningful text.
  11. CONCRETE-BEFORE-ABSTRACT (NARRATION, not on-screen text): the voiceOverText should lead with a relatable real-world
      anchor BEFORE the formal definition. On-screen bullets stay short phrases per the Global Principle above.
      WRONG on-screen bullet: "- Risk is the probability of an adverse event occurring."
      RIGHT on-screen bullet: "- **Risk**: probability of an adverse event"
      RIGHT narration: "Before signing a new vendor agreement, ask: what could go wrong? That question is the starting
      point of risk management."
  12. TERMINOLOGY ANCHOR (NARRATION): the FIRST time a key technical term appears, the narration should define it in
      spoken language, e.g. "Social engineering means using psychological manipulation rather than technical exploits to
      access sensitive information." The on-screen bullet just needs the bolded term as a short label, e.g.
      "- **Social engineering**: manipulation, not technical exploits".
  13. APPLICATION BRIDGE (NARRATION, not on-screen bullets): every content slide's voiceOverText should connect theory to
      practice using a phrase like "In your role, this means..." | "A practical example is..." | "Apply this by...".
      Do NOT paste these as extra on-screen bullets — keep the content field to short phrase bullets only.
  14. ADVANCE ORGANIZER: The FIRST content slide of each module must open its voiceOverText with a 1-sentence orientation:
      "In this module, you will [Bloom's verb from module objective] [specific outcome]." Keep this in the narration —
      the on-screen content field still starts directly with its short bullet list, not a full orientation sentence.

  ========================================
  SLIDE TYPE RULES (STRICT -- NO EXCEPTIONS)
  ========================================
  DO NOT add, remove, or reorder ANY slides from the provided structure.

  QUIZ:
  - questionText MUST be a complete question sentence ending with "?"
  - Must have EXACTLY 4 options: 1 correct (isCorrect: true) + 3 plausible distractors
  - options[].text must be meaningful (10+ chars). NEVER: "A", "B", "True", "False" unless it's genuinely a T/F slide
  - feedback: string explaining why the correct answer is right
  - FAIL CONDITION: missing questionText or fewer than 2 options -> regenerate

  ACCORDION:
  - Must have 4-6 items with parallel header formats (all questions OR all noun phrases)
  - Each item.content: <= 4 bullet points, NOT a paragraph. Use "- bullet" format.
  - Example item: { "id": "a1", "title": "How It Works", "content": "- Step 1\n- Step 2\n- Step 3" }
  - NEVER put a long paragraph as accordion content. Split long content into multiple items.

  DRAG & DROP:
  - All drop targets MUST use accepts: ["*"] -- NEVER restrict by ID
  - Every item must have a corresponding correct target via id matching
  - Min 3, max 6 items

  MATCHING:
  - Items and targets must be parallel in structure. Max 5 pairs.

  FLASHCARDS:
  - front = a direct question or key term (not a sentence fragment)
  - back = concise definition or full answer (1-2 sentences)
  - Max 6 cards

  TIMELINE:
  - Chronological entries only. 4-6 events max. year field required.

  HOTSPOT:
  - MUST include a mediaPrompt string (describe the image to show)
  - MUST include 2-5 hotspots, each with x (0-100), y (0-100), label, content
  - FAIL CONDITION: no hotspots -> change type to "content" instead

  GAME TEMPLATES (knowledge-board, millionaire, escape-room):
  - ALL fields must be populated. NO empty strings, NO empty arrays.
  - jeopardy: must have 3-5 categories, each with 3-5 questions with prompt AND correctAnswer
  - millionaire: must have 10-15 questions with prompt, 4 options[], correctAnswer
  - FAIL CONDITION: empty categories or missing questions -> regenerate entire game block
  - templateType field MUST match the game type string exactly

  TABBED-HORIZONTAL (type: "tabbed-horizontal"):
  - data.tabs: array of 2-5 tab objects
  - Each tab: { "id": "t1", "label": "Tab Label", "color": "#6366f1", "content": "Main content text", "expandedContent": "Additional detail shown when MORE is clicked" }
  - Color must be a valid hex color. Use different colors per tab.
  - content: 2-4 sentences summarizing the topic. expandedContent: 3-6 sentences with more detail.
  - FAIL CONDITION: fewer than 2 tabs, or missing content -> regenerate

  TABBED-VERTICAL (type: "tabbed-vertical"):
  - data.tabs: array of 2-6 tab objects
  - Each tab: { "id": "t1", "label": "Topic Name", "content": "Rich text for this topic. Use \\n\\n for paragraphs." }
  - content should be 3-5 sentences per tab. Use varied informative labels.
  - FAIL CONDITION: fewer than 2 tabs, or missing content -> regenerate

  FOLDER-EXPLORER (type: "folder-explorer"):
  - data.folderLabel: optional folder name string (e.g. "Reference Materials")
  - data.items: array of 2-5 document/paper items
  - Each item: { "id": "p1", "title": "Document Title", "previewText": "One-line teaser", "content": "Full text shown when opened. 3-6 sentences." }
  - FAIL CONDITION: fewer than 2 items, or any item missing content -> regenerate

  CAROUSEL-PANEL (type: "carousel-panel"):
  - data.cards: array of 3-5 card objects
  - Each card: { "id": "c1", "label": "Card Title", "color": "#6366f1", "description": "Short 1-2 sentence preview", "expandedContent": "Full detail shown after MORE is clicked. 3-5 sentences." }
  - Use distinct colors per card. description <= 30 words. expandedContent must exist.
  - FAIL CONDITION: fewer than 2 cards, or missing expandedContent -> regenerate

  CLICK-REVEAL (type: "click-reveal"):
  - Use this for key term/definition slides, glossary slides, learning objectives with explanations, or key takeaway lists.
  - data.items: array of 4-8 reveal items
  - Each item: { "id": "r1", "term": "Key Term or Concept", "definition": "Full explanation, 1-3 sentences." }
  - term: the bold clickable label (2-6 words, bold key concept — NO markdown asterisks in the term field itself)
  - definition: the revealed content (1-3 sentences explaining the term, with context and examples)
  - FAIL CONDITION: fewer than 3 items, or any item missing definition -> regenerate

  DIAGRAM (type: "diagram"):
  - USE FOR: process flows, decision trees, multi-step workflows, system hierarchies, onboarding journeys, approval chains, troubleshooting trees
  - data.mermaidCode: valid Mermaid.js markup — ONLY the raw code, NO markdown fences (no backticks)
  - Supported diagram types (choose the most appropriate):
    * flowchart TD  → top-down process or decision tree (most common)
    * flowchart LR  → left-right sequential workflow
    * sequenceDiagram → interaction between roles/systems
    * stateDiagram-v2 → status changes or lifecycle stages
    * mindmap → concept hierarchy or brainstorm map
  - Node labels: max 4 words. Use [Step Label] for process steps, {Decision?} for yes/no branches, (Start/End) for terminals, ((Circle)) for events
  - Decision branches: always label arrows with -->|Yes| and -->|No| or -->|Approve| and -->|Reject|
  - Max 10 nodes for clarity on a slide
  - Style key nodes with classDef: classDef highlight fill:#6366f1,stroke:#4f46e5,color:#fff
  - Example mermaidCode: "flowchart TD\n  A(Start) --> B[Identify Risk]\n  B --> C{Severity?}\n  C -->|High| D[Escalate to Manager]\n  C -->|Low| E[Log & Monitor]\n  D --> F(End)\n  E --> F"
  - content: 1-2 sentence description of what the diagram illustrates (shown as a caption)
  - data.caption: optional short caption string (alternative to content for the label below diagram)
  - FAIL CONDITION: empty or syntactically invalid mermaidCode → change type to "content" instead

  CONTENT / KEY-TAKEAWAYS / SUMMARY:
  - Do NOT embed full-slide images. Use mediaPrompt to describe what image should appear.
  - content must use ### headers, bullet lists, or callout blocks -- NOT bare paragraphs.
  - BULLET BREVITY (see Global Principle above): each bullet is a SHORT PHRASE, 5-8 words. NOT a complete explanatory
    sentence — the narration explains, the bullet just labels. MAXIMUM 5-6 bullets per slide.
    WRONG (too long/explanatory): "- Phishing attacks use deceptive emails to trick employees into revealing login credentials"
    RIGHT (short phrase): "- **Phishing**: deceptive emails targeting login credentials"
    WRONG: "- Effective risk management requires identifying, assessing, and mitigating potential threats before they occur"
    RIGHT: "- **Risk management**: identify, assess, mitigate threats early"
  - SUMMARY SLIDES: pick ONLY the 4-6 most important takeaways from the WHOLE module — never one bullet per topic/slide
    covered. MAXIMUM 6 short bullets (5-8 words), PAST TENSE: "- Explored the three phishing types", "- Defined escalation steps"
  - KEY-TAKEAWAY SLIDES: MAXIMUM 5-6 short bullets (5-8 words each), each an ACTION-VERB phrase, not a full sentence:
    "- Spot suspicious email patterns early"
    "- Report incidents to IT within 24 hours"
  - BOLD USAGE: Only bold specific key terms (nouns, verbs, named concepts). NEVER bold entire sentences, random adjectives, or more than 2-3 words per bullet.
  - Example correct: "- **Phishing**: the most common attack vector" — Example incorrect: "- **This module covered several important security practices**"
  - The APPLICATION BRIDGE ("In practice...", "This means that...", "Apply this by...") belongs in voiceOverText (narration),
    NOT copy-pasted as an on-screen bullet — keep bullets short and let narration carry the explanation and application.

  ========================================
  CRITICAL VALIDATION RULES
  ========================================
  BEFORE returning your response, mentally validate EVERY slide:
  - content is not empty or a single character
  - voiceOverText is at least 2 sentences
  - interactive slides have their data/interactions populated
  - No slide is blank, partial, or broken
  - ZERO colon-pipe patterns (IDENTIFY: |)
  - ZERO orphan commas or semicolons on their own line

  ========================================
  REQUIRED DATA SCHEMAS
  ========================================
  - accordion: { items: [{ id: string, title: string, content: string }] }
  - flashcards: { cards: [{ front: string, back: string }] }
  - carousel-panel: { cards: [{ id: string, label: string, color: string, description: string, expandedContent: string }] }
  - click-reveal: { items: [{ id: string, term: string, definition: string }] }
  - timeline: { events: [{ id: string, year: string, title: string, content: string }] }
  - sorting: { items: [{ id: string, content: string }], correctOrder: string[] }
  - matching: { items: [{ id: string, content: string }], targets: [{ id: string, content: string }] } — NEVER use 'pairs', NEVER use 'term'/'definition'. Always use 'items' and 'targets' arrays. Each item must have a matching target with a unique id.
  - quiz interactions: [{ type: 'multiple-choice', questionText: string, options: [{ id, text, isCorrect: boolean }], feedback: string }]
  - jeopardy: { templateType: 'jeopardy', instructions: string, categories: [{ id, name, questions: [{ id, value: number, prompt: string, correctAnswer: string, isDailyDouble: boolean }] }] }
  - millionaire: { templateType: 'millionaire', instructions: string, questions: [{ id, difficulty: number, prompt: string, options: string[], correctAnswer: string, isSafeHaven: boolean }] }
  - diagram: { mermaidCode: string, caption?: string }  — mermaidCode must be raw Mermaid syntax, no markdown fences

  ========================================
  OUTPUT FORMAT
  ========================================
  Schema: { "id": "...", "title": "...", "slides": [ { ...all original fields + content + voiceOverText + mediaPrompt + data + interactions } ] }
  EVERY slide must have: id, type, title, content (string), voiceOverText (string), mediaPrompt (string).
  Interactive slides must ALSO have: data (object) or interactions (array) as specified above.`;

  const sourceNote = configParams.sourceContent
    ? `\n\nIMPORTANT: This course was converted from an uploaded source document. Base the content on the source material below. Transform lecture-style slides into interactive, learner-centric content. Preferences: ${(configParams.conversionPreferences || []).join(', ') || 'Default'}\n\nSOURCE MATERIAL (first 4000 chars):\n${configParams.sourceContent.slice(0, 4000)}`
    : '';

  // --- Helper: parse and unwrap a raw API response ---
  function parseModuleChunk(rawText: string): any {
    let parsed = parseJsonSafely(rawText);
    if (parsed.module) parsed = parsed.module;
    if (parsed.modules && Array.isArray(parsed.modules)) parsed = parsed.modules[0];
    if (parsed.data && !parsed.slides) parsed = parsed.data;
    if (Array.isArray(parsed)) {
      parsed = (parsed.length > 0 && parsed[0]?.type) ? { slides: parsed } : parsed[0];
    }
    if (!parsed?.slides?.length) throw new Error("Missing or empty 'slides' array in response.");
    return parsed;
  }

  // --- Helper: hydrate a single slide ---
  async function hydrateSingleSlide(slide: any, moduleTitle: string): Promise<any> {
    const singlePrompt = `Hydrate exactly ONE slide for the module titled "${moduleTitle}". Course topic: ${originalPrompt}.
Slide JSON: ${JSON.stringify(slide, null, 2)}
Return ONLY a JSON object for this single slide with all fields: id, type, title, content, voiceOverText, mediaPrompt, and data/interactions if applicable.`;
    const raw = await executeAnthropicAI('bulk', systemInstruction, singlePrompt, 8192);
    let parsed = parseJsonSafely(raw);
    // If the AI returned a module wrapper, unwrap it
    if (parsed.slides?.length) parsed = parsed.slides[0];
    else if (parsed.module?.slides?.length) parsed = parsed.module.slides[0];
    // Validate it has the minimum fields
    if (!parsed.id || !parsed.type) throw new Error('Single slide response missing id/type fields.');
    // Validate actual content is present -- a "successfully parsed but empty" response
    // must NOT be treated as success, otherwise it skips every retry tier and the
    // learner sees a blank slide (Bug #7). Throwing here routes back through the
    // caller's catch block so the next fallback tier gets a chance.
    if (!parsed.content?.trim() || !parsed.voiceOverText?.trim()) {
      throw new Error(`Single slide response for "${slide.title}" has empty content or voiceOverText.`);
    }
    return parsed;
  }

  /**
   * Last-mile safety net for Bug #7 (slides that "successfully" parse but come back
   * blank). Retries each empty slide individually up to `attempts` times before
   * falling back to real, title-derived text (never a "content unavailable" placeholder).
   */
  async function ensureSlideHasContent(slide: any, moduleTitle: string, attempts = 2): Promise<any> {
    if (slide.content?.trim() && slide.voiceOverText?.trim()) return slide;
    for (let i = 0; i < attempts; i++) {
      try {
        const retried = await hydrateSingleSlide(slide, moduleTitle);
        return { ...slide, ...retried };
      } catch (err: any) {
        console.warn(`[Bug#7 safety net] Retry ${i + 1}/${attempts} failed for slide "${slide.title}": ${err.message}`);
      }
    }
    console.error(`[Bug#7 safety net] All retries exhausted for slide "${slide.title}" -- using derived fallback text.`);
    return {
      ...slide,
      content: slide.content?.trim() || `**${slide.title}**\n\nThis slide covers key content for module: ${moduleTitle}. Please review and edit as needed.`,
      voiceOverText: slide.voiceOverText?.trim() || `In this slide we cover ${slide.title}, which is an important aspect of ${moduleTitle}.`,
      mediaPrompt: slide.mediaPrompt || `Professional illustration related to ${slide.title}`,
    };
  }

  // --- Helper: validate and normalize a parsed slide ---
  function processSlide(slide: any): any[] {
    const isMissingData = (type: string, field: string) =>
      slide.type === type && (!slide.data || !slide.data[field] || slide.data[field].length === 0);

    if (slide.type === 'hotspot' && !slide.data?.hotspots?.length) slide.type = 'content';
    else if (isMissingData('accordion', 'items')) slide.type = 'content';
    else if (isMissingData('flashcards', 'cards')) slide.type = 'content';
    else if (isMissingData('click-reveal', 'items')) slide.type = 'content';
    else if (slide.type === 'quiz' && !slide.interactions?.length) slide.type = 'content';
    else if (slide.type === 'game-template' && !slide.data?.templateType) {
      slide.type = 'content';
      slide.content = slide.content || 'Game template encountered a structural error.';
    }
    else if (slide.type === 'diagram' && !slide.data?.mermaidCode?.trim()) {
      // Diagram slide with no mermaid code — degrade gracefully to content
      slide.type = 'content';
      slide.content = slide.content || `Process diagram for: ${slide.title}`;
    }
    // Scenario slides — data will be populated async; skip sync validation here

    // Density auto-splitter — skip Summary/Key-Takeaway slides entirely. Those are
    // now capped to 5-6 short bullets by the system prompt, so they should never
    // need splitting; splitting a short bullet list produced uneven, near-empty
    // "Part 2" slides in practice.
    const isSummaryOrTakeaway = /summary|key\s*takeaway/i.test(slide.title || '');
    if (slide.type === 'content' && !isSummaryOrTakeaway && slide.content?.length > 800) {
      const paragraphs = slide.content.split('\n\n');
      if (paragraphs.length > 1) {
        const mid = Math.ceil(paragraphs.length / 2);

        // Split the voiceOverText at sentence boundaries so each part gets
        // its own narration instead of both repeating the full original.
        const origVO = (slide.voiceOverText || slide.narration || '').trim();
        const sentences = origVO
          ? origVO.split(/(?<=[.!?])\s+/).filter(Boolean)
          : [];
        const midSentence = Math.ceil(sentences.length / 2);
        const pt1VO = sentences.length > 1
          ? sentences.slice(0, midSentence).join(' ')
          : origVO;
        const pt2VO = sentences.length > 1
          ? `Continuing from the previous section. ${sentences.slice(midSentence).join(' ')}`.trim()
          : `Continuing from the previous section. ${origVO}`.trim();

        return [
          { ...slide, content: paragraphs.slice(0, mid).join('\n\n'), title: slide.title + ' (Part 1)', voiceOverText: pt1VO },
          { ...slide, id: slide.id + '-pt2', content: paragraphs.slice(mid).join('\n\n'), title: slide.title + ' (Part 2)', voiceOverText: pt2VO },
        ];
      }
    }
    return [slide];
  }

  // --- Pre-calculate total chunks for accurate progress ---
  const CHUNK_SIZE = 3;
  let totalChunks = 0;
  for (const mod of outlineDraft.modules) {
    totalChunks += Math.ceil(mod.slides.length / CHUNK_SIZE);
  }
  let completedChunks = 0;

  // --- Main hydration loop ---
  for (const emptyModule of outlineDraft.modules) {
    const slideChunks: any[][] = [];
    for (let i = 0; i < emptyModule.slides.length; i += CHUNK_SIZE) {
      slideChunks.push(emptyModule.slides.slice(i, i + CHUNK_SIZE));
    }

    const hydratedSlides: any[] = [];

    for (let i = 0; i < slideChunks.length; i++) {
      const chunk = slideChunks[i];
      const chunkModule = { ...emptyModule, slides: chunk };

      const fullPrompt = `Hydrate Module Chunk ${i+1} of ${slideChunks.length}.\nCourse Topic: ${originalPrompt}${sourceNote}\n\nModule Draft JSON:\n${JSON.stringify(chunkModule, null, 2)}\n\nReturn ONLY a single JSON object: { "id": "...", "title": "...", "slides": [ ... ] }`;
      const simplePrompt = `Hydrate this module chunk. Be concise -- max 2 sentences per content field, max 4 items per array.\nModule: ${JSON.stringify(chunkModule)}\nReturn ONLY: { "id": "...", "title": "...", "slides": [ ... ] }`;

      let parsedChunk: any = null;

      // Tier 1: Full prompt
      try {
        const raw = await executeAnthropicAI('bulk', systemInstruction, fullPrompt, 8192);
        parsedChunk = parseModuleChunk(raw);
      } catch (e1: any) {
        console.warn(`[Module "${emptyModule.title}" Chunk ${i+1}] Tier 1 failed: ${e1.message}`);

        // Tier 2: Simplified prompt
        try {
          const raw2 = await executeAnthropicAI('bulk', systemInstruction, simplePrompt, 8192);
          parsedChunk = parseModuleChunk(raw2);
        } catch (e2: any) {
          console.warn(`[Module "${emptyModule.title}" Chunk ${i+1}] Tier 2 failed: ${e2.message}. Falling back to per-slide generation.`);

          // Tier 3: Generate each slide individually -- REAL CONTENT, no placeholders
          const individualResults: any[] = [];
          for (const slide of chunk) {
            try {
              const hydratedSlide = await hydrateSingleSlide(slide, emptyModule.title);
              individualResults.push(hydratedSlide);
            } catch (e3: any) {
              console.error(`[Single slide "${slide.title}" in "${emptyModule.title}"] All tiers failed: ${e3.message}`);
              // Absolute last resort: preserve original slide structure with minimal content
              // This is not a placeholder -- it's the outline data itself, which always has a title
              individualResults.push({
                ...slide,
                content: `**${slide.title}**\n\nThis slide covers key content for module: ${emptyModule.title}. Please review and edit as needed.`,
                voiceOverText: `In this slide we cover ${slide.title}, which is an important aspect of ${emptyModule.title}.`,
                mediaPrompt: `Professional illustration related to ${slide.title}`,
              });
            }
          }
          hydratedSlides.push(...individualResults.flatMap(s => processSlide(s)));
          completedChunks++;
          if (onProgress) onProgress(Math.round(10 + (completedChunks / totalChunks) * 88));
          continue;
        }
      }

      // Process successfully parsed chunk
      completedChunks++;
      if (onProgress) onProgress(Math.round(10 + (completedChunks / totalChunks) * 88));
      for (const slide of parsedChunk.slides) {
        hydratedSlides.push(...processSlide(slide));
      }
    }

    // ── Post-pass: safety net for slides that parsed successfully but came back
    // blank (Bug #7) — retries each empty slide individually before falling back
    // to derived text, so the learner never sees a truly empty slide. ─────────────
    for (let i = 0; i < hydratedSlides.length; i++) {
      const s = hydratedSlides[i];
      if (!s.content?.trim() || !s.voiceOverText?.trim()) {
        hydratedSlides[i] = await ensureSlideHasContent(s, emptyModule.title);
      }
    }

    // ── Post-pass: generate scenario data for scenario-type slides ─────────────
    if (configParams.scenarioConfig) {
      for (const slide of hydratedSlides) {
        if (slide.type === 'scenario' && !slide.data?.nodes) {
          try {
            slide.data = await generateScenarioData(
              originalPrompt,
              configParams.scenarioConfig,
              configParams.sourceContent,
            );
          } catch (err: any) {
            console.error(`[Scenario] Failed to generate data for slide "${slide.title}": ${err.message}`);
            // Leave slide.data undefined — the existing empty-state UI handles this gracefully
          }
        }
      }
    }

    fullCourse.modules.push({ ...emptyModule, slides: hydratedSlides } as any);
  }

  return fullCourse;
}

// --- Mastery Quiz Generator ---

function generateFallbackQuestions(course, config) {
  var questions = [];
  var qIdx = 0;
  var totalNeeded = config.questionMode === 'total' ? config.questionCount : config.questionCount * course.modules.length;
  var questionsPerModule = Math.ceil(totalNeeded / Math.max(course.modules.length, 1));

  for (var mIdx = 0; mIdx < course.modules.length; mIdx++) {
    var mod = course.modules[mIdx];
    var moduleQ = config.questionMode === 'total' ? (mIdx === course.modules.length - 1 ? totalNeeded - questions.length : questionsPerModule) : config.questionCount;
    for (var i = 0; i < moduleQ && questions.length < totalNeeded; i++) {
      var slide = mod.slides[i % mod.slides.length];
      var type = config.questionTypes[qIdx % config.questionTypes.length];
      qIdx++;
      if (type === 'tf') {
        questions.push({ id: 'q-' + (questions.length + 1), type: 'tf', question: '[Draft] "' + slide.title + '" is a key topic in this course.', options: ['True', 'False'], correctAnswer: 0, explanation: '"' + slide.title + '" is covered in Module ' + (mIdx + 1) + '.', moduleIndex: mIdx });
      } else if (type === 'ma') {
        questions.push({ id: 'q-' + (questions.length + 1), type: 'ma', question: '[Draft] Which are discussed in "' + mod.title + '"? (Select all that apply)', options: [mod.slides[0]?.title || 'Topic A', mod.slides[1]?.title || 'Topic B', 'An unrelated concept', mod.slides[2]?.title || 'Topic C'], correctAnswer: [0, 1, 3], explanation: 'Draft question — replace with AI content when API key is renewed.', moduleIndex: mIdx });
      } else {
        questions.push({ id: 'q-' + (questions.length + 1), type: 'mc', question: '[Draft] What is the primary focus of "' + slide.title + '"?', options: [slide.title, 'An unrelated topic', 'A concept from another module', 'None of the above'], correctAnswer: 0, explanation: 'Draft placeholder. Real questions are AI-generated from course content.', moduleIndex: mIdx });
      }
    }
  }
  return questions;
}

export async function generateMasteryExam(
  course: CourseOutline,
  config: ExamConfig
): Promise<ExamQuestion[]> {
  const totalNeeded = config.questionMode === 'total'
    ? config.questionCount
    : config.questionCount * course.modules.length;

  const courseSummary = course.modules.map((mod, mIdx) => {
    const slideSummaries = mod.slides
      .filter(s => !['title','intro','outro','exam-intro','mastery-exam','exam-results'].includes(s.type))
      .map(s => `  - ${s.title}: ${(s.content || s.narration || '').slice(0, 200)}`)
      .join('\n');
    return `Module ${mIdx + 1}: ${mod.title}\n${slideSummaries}`;
  }).join('\n\n');

  const systemInstruction = `You are an expert eLearning assessment designer.
Generate ${totalNeeded} Mastery Quiz questions based on the course content below.
RULES:
1. Types to use: ${config.questionTypes.join(', ')}. Distribute evenly.
   - mc: 4 options, 1 correct (correctAnswer = integer index 0-3)
   - ma: 4-5 options, 2+ correct (correctAnswer = array of integer indices)
   - tf: options = ["True","False"], correctAnswer = 0 (True) or 1 (False)
2. Use Bloom Remembering/Understanding verbs only.
3. Every question must be directly answerable from the provided content.
4. ${config.questionMode === 'per-module' ? `Generate exactly ${config.questionCount} questions per module.` : `Distribute ${totalNeeded} questions evenly across ${course.modules.length} modules.`}
5. Each question must have a 1-sentence explanation.
OUTPUT: Return ONLY valid JSON: { "questions": [{ "id": "q1", "type": "mc", "question": "...", "options": [...], "correctAnswer": 0, "explanation": "...", "moduleIndex": 0 }] }`;

  const userPrompt = `Course: "${course.title}"
Objectives: ${JSON.stringify(course.learningObjectives).slice(0, 400)}
Content:
${courseSummary.slice(0, 5500)}
Generate ${totalNeeded} questions.`;

  try {
    const text = await executeAnthropicAI('complex', systemInstruction, userPrompt, 4096);
    const parsed = parseJsonSafely(text);
    if (parsed?.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return (parsed.questions as ExamQuestion[]).slice(0, totalNeeded);
    }
    return generateFallbackQuestions(course as any, config);
  } catch {
    return generateFallbackQuestions(course as any, config);
  }
}

// ── Scenario Generation ───────────────────────────────────────────────────────

const SCENARIO_SYSTEM_PROMPT = `You are an expert Instructional Designer specializing in workplace decision simulations for SHRM-SCP and ATD CPTD-quality assessments.

CORE RULES — FOLLOW EXACTLY:
1. Build realistic decision pathways, NOT quizzes. Every option must sound professionally plausible.
2. Each option represents a distinct decision style: collaborative, avoidant, overly aggressive, overly accommodating, policy-focused, empathetic, etc.
3. Never write obviously wrong options. The "wrong" answers must reflect real mistakes professionals actually make.
4. Consequence text is NARRATIVE — show what happens in the story, not just a grade.
5. Score deltas range from -3 to +3. Use them to reflect nuance, not binary right/wrong.
6. Routing conditions use: "always", "else", "score >= N", "score < N", "multi_includes:optId", "multi_excludes:optId"
7. Endings: one success (score >= high), one partial (middle), one negative (low).
8. Every node must have a "routing" array. If routing is unconditional use [{"condition":"always","nextNodeId":"..."}].
9. startNodeId must match a key in the "nodes" object.
10. All text fields use plain English. Use **bold** for names/emphasis only.

OUTPUT: Return ONLY valid JSON — no prose, no code fences:
{
  "title": "string",
  "role": "string",
  "introduction": "string (multi-paragraph, use **name** for character names)",
  "startNodeId": "string",
  "nodes": {
    "node-id": {
      "id": "string", "phase": 1, "label": "Phase 1 — Label",
      "type": "single | multi", "multiSelectCount": 2,
      "situation": "string", "question": "string",
      "options": [{ "id": "opt-a", "text": "string", "consequence": "string",
        "scoreDeltas": { "trust": 0, "accountability": 0, "morale": 0, "risk": 0, "stakeholderConfidence": 0 },
        "nextNodeId": "optional" }],
      "routing": [{ "condition": "always", "nextNodeId": "next-id" }]
    }
  },
  "endings": [
    { "id": "e-success", "type": "success", "title": "string", "condition": "score >= N",
      "narrative": "string", "outcomes": ["string"], "competencyFeedback": "string" },
    { "id": "e-partial", "type": "partial", "title": "string", "condition": "score >= M",
      "narrative": "string", "outcomes": ["string"], "competencyFeedback": "string" },
    { "id": "e-negative", "type": "negative", "title": "string", "condition": "else",
      "narrative": "string", "outcomes": ["string"], "competencyFeedback": "string" }
  ],
  "competencies": ["string"],
  "metadata": { "estimatedTime": "string", "difficulty": "string", "audience": ["string"] }
}`;

export interface ScenarioConfigForGeneration {
  role: string;
  context: string;
  competencies: string[];
  domain: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  phaseCount: number;
}

export async function generateScenarioData(
  coursePrompt: string,
  config: ScenarioConfigForGeneration,
  sourceContent?: string,
): Promise<any> {
  const sourcePart = sourceContent
    ? `\n\nSource material context (use to ground the workplace setting):\n${sourceContent.slice(0, 2000)}`
    : '';

  const userPrompt = `Generate a workplace decision simulation for the following course.

Course Topic: "${coursePrompt}"
Learner Role: "${config.role || 'A mid-level manager'}"
Scenario Context: "${config.context || 'A team is facing a critical deadline with interpersonal tension and stakeholder pressure.'}"
Industry / Domain: ${config.domain}
Difficulty: ${config.difficulty}
Decision Phases (nodes): ${config.phaseCount}
Competencies to assess: ${config.competencies.join(', ') || 'Leadership Communication, Conflict Resolution'}

REQUIREMENTS:
- Create exactly ${config.phaseCount} primary decision nodes.
- Include at least one multi-select node (type: "multi", multiSelectCount: 2).
- Difficulty "${config.difficulty}" means: ${config.difficulty === 'Beginner' ? 'clear better vs worse options, gentle consequences' : config.difficulty === 'Advanced' ? 'all options are plausible, consequences are subtle and long-term' : 'moderate ambiguity, some options have mixed consequences'}.
- Score thresholds: success >= ${config.phaseCount * 3}, partial >= ${config.phaseCount}, negative = else.${sourcePart}

Return ONLY the JSON object.`;

  const tryParse = async (prompt: string) => {
    const raw = await executeAnthropicAI('complex', SCENARIO_SYSTEM_PROMPT, prompt, 8192);
    return parseJsonSafely(raw);
  };

  let parsed: any;
  try {
    parsed = await tryParse(userPrompt);
  } catch {
    const retryPrompt = `Generate a ${config.phaseCount}-phase workplace decision simulation about "${coursePrompt}" for a ${config.role || 'manager'}. Maximum 3 options per node. Return ONLY JSON.`;
    parsed = await tryParse(retryPrompt);
  }

  if (!parsed?.nodes || !parsed?.startNodeId || !parsed?.endings?.length) {
    throw new Error('Scenario generation failed validation: missing nodes, startNodeId, or endings.');
  }
  return parsed;
}

// ── AI-powered slide data editing ─────────────────────────────────────────────

export async function editSlideDataViaAI(
  slideType: 'scenario' | 'game-template' | 'knowledge-check' | 'mastery-exam',
  currentData: any,
  userRequest: string,
  courseContext: string,
): Promise<any> {
  const systemPrompt = `You are an expert eLearning content editor making a targeted change to an existing ${slideType} data structure.
RULES:
1. Make ONLY the changes the user requests. Preserve all other data exactly.
2. Return the COMPLETE updated data object as valid JSON — no prose, no code fences.
3. Maintain all existing IDs, schema structure, and field names.
4. Never add fields that don't exist in the original schema.`;

  const userPrompt = `Course context: "${courseContext}"

Current ${slideType} data:
${JSON.stringify(currentData, null, 2).slice(0, 6000)}

User's requested change: "${userRequest}"

Return ONLY the complete updated JSON object.`;

  const raw = await executeAnthropicAI('complex', systemPrompt, userPrompt, 8192);
  return parseJsonSafely(raw);
}
