import { CourseOutline, TerminalObjectiveGroup, ExamConfig, ExamQuestion } from "../types/course";
import { coerceCarouselColor } from "../lib/colorContrast";
import { ensureEnablingSlideCoverage, preserveEnablingIndex, normalizeTerminalGroups, slideSkipsNarration, stripSlideNarration, isKnowledgeCheckSlide } from "../lib/enablingCoverage";
import { allocateKnowledgeCheckSlots, alignHydratedSlidesToOutline, ensureKnowledgeCheckBudget } from "../lib/knowledgeCheckBudget";
import { finalizeHydratedSlide, teachingSlideNeedsRetry, normalizeKeyTakeaways } from "../lib/hydrateGuards";
import { shortenCourseTitle, shortenModuleTitle } from "../lib/splitCourseTitle";
import {
  STORYBOARD_SOURCE_CHARS,
  storyboardAnalyzeInstructions,
  storyboardHydrateInstructions,
  storyboardOutlineInstructions,
  storyboardSourceWindow,
  STORYBOARD_CONTENT_TYPES,
  remapStoryboardScenarioModules,
  remapStoryboardScenarioSlide,
  expandStoryboardMultiQuestionSlides,
  expandOneMultiQuestionSlide,
  expandStoryboardQuizOutlineFromSource,
  dedupeStoryboardModuleSlides,
  type SourceMode,
} from "../lib/storyboardSource";
import { applyAlignedQuizPrompt, quizQuestionList } from "../lib/knowledgeCheckOst";

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
      /** 0-based enabling objective this teaching slide covers within the module */
      enablingIndex?: number;
    }[];
  }[];
}

/** Content interaction types that may appear as slide.type (not quiz/KC). */
const CONTENT_INTERACTION_TYPES = new Set([
  'content', 'diagram', 'key-takeaways', 'summary', 'title',
  'flashcards', 'timeline', 'hotspot', 'scenario',
  'tabbed-horizontal', 'tabbed-vertical', 'folder-explorer',
  'carousel-panel', 'click-reveal', 'accordion', 'choice-cards',
]);

const QUIZ_SLIDE_TYPES = new Set([
  'quiz', 'sorting', 'matching', 'drop-targets',
  'multiple-choice', 'multiple-answers', 'true-false', 'knowledge-check',
]);

/**
 * Hard-enforce Course Settings interaction whitelist on outline/hydrated slides.
 * Disallowed content interactions become plain "content" (quiz/KC types left alone).
 */
export function coerceInteractionTypes(
  modules: Array<{ slides?: Array<{ type?: string; [k: string]: any }> }>,
  allowed: string[],
): typeof modules {
  const allow = new Set(
    (allowed || [])
      .filter(t => !QUIZ_SLIDE_TYPES.has(t))
      .map(t => (t === 'accordion' ? 'click-reveal' : t))
  );
  // Always allow structural content types
  allow.add('content');
  allow.add('diagram');
  allow.add('key-takeaways');
  allow.add('summary');
  allow.add('title');

  const fallback =
    [...allow].find(t => t === 'click-reveal' || t.startsWith('tabbed')) || 'content';

  return (modules || []).map(mod => ({
    ...mod,
    slides: (mod.slides || []).map(s => {
      const raw = s.type === 'accordion' ? 'click-reveal' : (s.type || 'content');
      if (QUIZ_SLIDE_TYPES.has(raw)) return s.type === 'accordion' ? { ...s, type: 'click-reveal' } : s;
      if (!CONTENT_INTERACTION_TYPES.has(raw) || allow.has(raw)) {
        return raw === s.type ? s : { ...s, type: raw };
      }
      return { ...s, type: fallback };
    }),
  }));
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
    const raw = String(err?.message || err || '');
    // Browser TypeError when the server never answers (deploy restart, cold start, timeout).
    if (/failed to fetch|networkerror|load failed|aborted/i.test(raw)) {
      throw new Error(
        'AI Proxy request failed to fetch (server unreachable or timed out — often right after a Render deploy). Wait ~30s and try again.'
      );
    }
    throw new Error(`AI Proxy request failed: ${raw}`);
  }
}

/**
 * Run async work over `items` with at most `concurrency` in flight.
 * Results stay in input order. Used to parallelize hydrate chunks without
 * flooding the Anthropic proxy (rate limits still handled in executeAnthropicAI).
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/** Bounded parallel hydrate calls — enough for wall-clock win, low rate-limit risk. */
const HYDRATE_CHUNK_CONCURRENCY = 3;

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
  fileName: string,
  opts?: { sourceMode?: SourceMode },
): Promise<FileAnalysisResult> {
  const sourceMode: SourceMode = opts?.sourceMode === 'storyboard' ? 'storyboard' : 'raw';
  const storyboardBlock = sourceMode === 'storyboard' ? `\n\n${storyboardAnalyzeInstructions()}\n` : '';
  const systemInstruction = `You are an expert Instructional Designer and File Analysis Engine.
  Your job is to read uploaded document structures and extract a full eLearning course blueprint.
  ${storyboardBlock}
  TASKS:
  1. Extract title(s), section headers, key topics, and definitions.
     NOTE: The source text may be pre-parsed structured Markdown from a PPTX or PDF:
     - "## Slide N: Title" lines = individual slide titles → use these as module/topic boundaries
     - "## Page N" lines = PDF page breaks
     - "### HEADING" lines = section headings detected in PDF
     - "> Speaker Notes:" = presenter notes for context
     Use this structure to identify modules and map content accurately.
  2. Generate a clean, professional course Title of AT MOST 8 words. Prefer the subject ("Polymers: PE and PP"), not "Introduction to …" lead-ins and not colon laundry lists ("Chemistry, Properties, and Processes").
     Never use "Storyboard", "Build Specification", or "Developer Handoff" as the course title when the file is a spec for a subject-matter course.
  3. Write a 2-4 sentence Description (what learners will learn, context, why it matters).
  4. Classify the complexity (simple vs moderate vs complex).
  5. Suggest a recommended Preset based on CONTENT DEPTH AND COMPLEXITY, not raw slide count:
     - "quick": Surface-level awareness only. Single concept, minimal depth, 1-2 modules, simple/introductory content. Equivalent to a 5-10 minute primer. Use SPARINGLY.
     - "standard": Multi-concept content with application. 2-5 modules, moderate depth, most real corporate training falls here. DEFAULT when in doubt.
     - "comprehensive": Deep technical or procedural content, 5+ modules, advanced or nuanced subject matter requiring extensive coverage.
     IMPORTANT: If the content covers multiple distinct topics, has procedures, real-world applications, or requires behavioral change, choose "standard" or "comprehensive". Do NOT downgrade to "quick" just because the source document is short.
  6. Recommend an objectiveFormat: "AB" (quick courses), "ABC" (standard), or "ABCD" (comprehensive).
  7. Classify Content Types and Map Interactions. E.g. Concepts -> "flashcards", Processes -> "timeline", Comparisons -> "click-reveal", Matching -> "drag-drop-activity". Return an array of these recommended interaction strings.
  8. GENERATE OBJECTIVES using Bloom's Taxonomy — UNLESS STORYBOARD MODE:
     - STORYBOARD MODE: COPY listed learner objectives EXACTLY as written. Do not Bloom-rewrite, paraphrase, add Given/condition clauses, or change verbs. objectivesInferred must be false. Ignore the Bloom rules below for this file.
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
    "objectivesInferred": "boolean — false when the file already lists learner objectives (always false in STORYBOARD MODE)",
    "detectedStructure": "string",
    "possibleModules": ["string"]
  }`;
  
  const windowChars = sourceMode === 'storyboard' ? STORYBOARD_SOURCE_CHARS : 12000;
  const userPrompt = `Analyze the following source material from a file named "${fileName}":\n\n${fileText.slice(0, windowChars)}`;
  
  const text = await executeAnthropicAI('complex', systemInstruction, userPrompt, 4096);
  const cleanedText = extractJsonFromText(text);
  const parsed = parseJsonSafely(text) as FileAnalysisResult;
  if (parsed?.title) parsed.title = shortenCourseTitle(parsed.title);
  return parsed;
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
    /** @deprecated Unused. Slide count is derived from enabling objectives. */
    slideCount?: number;
    /** @deprecated use gameTemplateIds */ gameTemplateId?: string | null;
    /** Array of game template IDs selected by the user */
    gameTemplateIds?: string[];
    /** When true, the player injects a Module Overview slide after each Module Title. */
    includeModuleOverviewSlides?: boolean;
    includeSummarySlides?: boolean;
    includeModuleTitleSlides?: boolean;
    includeKnowledgeChecks?: boolean;
    knowledgeCheckMode?: 'total' | 'per-module';
    knowledgeCheckCount?: number;
    /** Assessment activity types allowed ONLY on Knowledge Check slides */
    quizActivityTypes?: string[];
    pathway?: 'corporate';
    // Source conversion mode (file upload)
    isSourceConversion?: boolean;
    sourceContent?: string;
    conversionPreferences?: string[];
    /** AB | ABC | ABCD — used when drafting objectives-aligned module titles */
    objectiveFormat?: string;
    /** Storyboard specs follow listed screens; raw lecture uploads stay on the default path. */
    sourceMode?: SourceMode;
  }
): Promise<CourseOutlineDraft> {
  // Games temporarily disabled at product level — ignore any passed IDs
  const gameIds: string[] = [];
  const QUIZ_ONLY = new Set(['sorting', 'matching', 'drop-targets', 'multiple-choice', 'multiple-answers', 'quiz', 'mc', 'ma', 'tf']);
  // Scenario parked like Game Modes — never whitelist a branching sim this version
  const contentInteractions = (configParams.interactionTypes || []).filter(t => !QUIZ_ONLY.has(t) && t !== 'scenario');
  const quizActivities = (Array.isArray(configParams.quizActivityTypes)
    ? configParams.quizActivityTypes
    : ['sorting', 'matching', 'drop-targets']
  ).map(t => {
    if (t === 'mc') return 'quiz';
    if (t === 'ma') return 'multiple-answers';
    if (t === 'tf') return 'true-false';
    return t;
  });
  // Honor explicit arrays including [] — never re-expand to sorting/matching when the user cleared types.
  const uniqueQuizActivities = [...new Set(quizActivities)];
  const kcMode = configParams.knowledgeCheckMode || 'per-module';
  const kcCount = Math.max(0, Math.floor(configParams.knowledgeCheckCount ?? 2));
  const includeKCs = configParams.includeKnowledgeChecks !== false && uniqueQuizActivities.length > 0 && kcCount > 0;
  const moduleHint = Math.max(1, normalizeTerminalGroups(objectives).length);
  const totalSlots = includeKCs && kcMode === 'total'
    ? allocateKnowledgeCheckSlots(moduleHint, 'total', kcCount, Array.from({ length: moduleHint }, () => 1))
    : [];
  const sourceMode: SourceMode = configParams.sourceMode === 'storyboard' ? 'storyboard' : 'raw';
  const outlineInteractions = sourceMode === 'storyboard'
    ? [...new Set([...contentInteractions, ...STORYBOARD_CONTENT_TYPES])]
    : contentInteractions;
  const schemaQuizActivities = sourceMode === 'storyboard'
    ? [...new Set([...uniqueQuizActivities, 'quiz', 'multiple-answers'])]
    : uniqueQuizActivities;
  const kcDirective = sourceMode === 'storyboard'
    ? 'Only include a Knowledge Check slide if the storyboard already specifies an exit check, knowledge check, Keys/pass score, or a scored decision quiz. Teaching screens with tappable tiles and narration are choice-cards, not knowledge checks. Use quiz for one correct option; use multiple-answers when the spec says select two / select all that apply on a scored check. A screen with 2+ numbered questions MUST become N Knowledge Check slides (one question each) — not one slide with Question 1 of 3. Once those N slides are in the outline, do not duplicate them. If the spec already has Key Takeaways, do not add a second summary. Do NOT use type scenario for a one-question situation box. Do NOT add extra checks to meet a Course Settings count. Title MUST start with "Knowledge Check:" only for scored checks.'
    : !includeKCs
    ? 'NO knowledge check slides'
    : kcMode === 'per-module'
    ? `Exactly ${kcCount} Knowledge Check slide(s) per module (type must be one of: ${uniqueQuizActivities.join(', ')}). Title MUST start with "Knowledge Check:". This cap is independent of enabling count — a module with 6 enablings and a cap of ${kcCount} still gets ${kcCount} checks, not 6.`
    : `Exactly ${kcCount} Knowledge Check slides for the WHOLE course (not per module; type must be one of: ${uniqueQuizActivities.join(', ')}). Title MUST start with "Knowledge Check:". Spread them across ${moduleHint} module(s): typical split is ${totalSlots.join(' / ')} (leftover checks go to denser modules). Never exceed ${kcCount} total.`;

  const allowedTypesForSchema = [
    'content', 'diagram', 'key-takeaways',
    ...outlineInteractions.filter(t => !['content', 'diagram', 'key-takeaways'].includes(t)),
    ...schemaQuizActivities,
  ];
  const schemaTypeEnum = [...new Set(allowedTypesForSchema)].join('|') || 'content|quiz';

  const storyboardBlock = sourceMode === 'storyboard'
    ? `\n\n${storyboardOutlineInstructions(outlineInteractions)}\nThese STORYBOARD MODE rules OVERRIDE enabling-coverage slide counts, extra knowledge-check budgets, and "one module per terminal" expansion below.\n`
    : '';

  const systemInstruction = `You are an Expert Senior Corporate Instructional Designer.
  Your ONLY job right now is to draft the TABLE OF CONTENTS (Outline) for a course. Do NOT write the actual content yet.
  ${storyboardBlock}
  COURSE STRUCTURE REQUIREMENTS:
  You must create EXACTLY ONE module per provided Terminal Objective (Learning Objective group).
  Every module MUST follow this exact sequence of slides:
  1. NO title / overview / objectives slides — The course player auto-injects structural slides based on Course Settings:
     ${configParams.includeModuleTitleSlides !== false ? '- Module Title slide (full-bleed "Module N: Title") before each module\'s content' : '- Module Title slides are OFF — do NOT create module title/cover slides'}
     ${configParams.includeModuleOverviewSlides !== false ? '- Module Overview slide (objectives accordion) immediately after each Module Title' : '- Module Overview slides are OFF — do NOT create overview or objectives slides'}
     Do NOT generate title, intro, overview, or objectives slides for any module. Each module must start directly with its first content or interaction slide.
  2. NO objectives slide — FORBIDDEN. Do NOT create any slide titled "Learning Objectives", "Module Objectives", "Objectives", or similar. Do NOT use click-reveal (or any other type) to restate objectives.${configParams.includeModuleOverviewSlides !== false ? ' The auto-injected Module Overview already shows this module\'s objective and sub-objectives from the canonical Learning Objectives list.' : ''}
  3. Content & Interaction Slides — ONLY use these content interaction types as slide 'type': ${outlineInteractions.join(', ') || 'content'}.
     HARD RULE — ENABLING COVERAGE (this drives length; there is NO global target slide count):
     - Each enabling objective in that module's terminal MUST have its own teaching slide(s). Do not skip an enabling. Do not put two enablings on one slide.
     - At least 1 and at most 2 teaching/interaction slides per enabling. Use a second slide only when the enabling needs to be chunked.
     - Tag every teaching slide with enablingIndex (0-based index into that terminal's enablingObjectives array).
     - Knowledge checks and module summaries do NOT count as teaching slides and must NOT use enablingIndex.
     HARD RULE: Do NOT use hotspot, carousel-panel, flashcards, timeline, scenario, or folder-explorer unless that exact type is listed above.
     Map them like this:
     - flashcards, timeline, hotspot, scenario, tabbed-horizontal, tabbed-vertical, folder-explorer, carousel-panel, click-reveal -> use the exact string as the slide 'type'
     - Do NOT use type "accordion" — use "click-reveal" instead (same progressive-disclosure pattern)
     - tabbed-horizontal is the Process interaction (numbered stepper). Use it for ordered procedures the learner walks through step by step.
     - For BRANCHING process flows, decision trees, or Mermaid diagrams: use type: "diagram"
     - Plain teaching slides: type: "content"
     CRITICAL — QUIZ-ONLY TYPES: Never use sorting, matching, drop-targets, multiple-choice, or multiple-answers as regular content slides. Those belong ONLY under Knowledge Checks (see #4).
  4. ${kcDirective}
     HARD RULE — KNOWLEDGE CHECK COUNT IS INDEPENDENT OF ENABLING COVERAGE:
     Enabling coverage (1–2 teaching slides per enabling) does NOT add knowledge checks. Do NOT emit one Knowledge Check per enabling.
     Prefer each check to assess a different enabling in that module; only assess the same enabling twice after every enabling already has a check. Still never exceed the Course Settings cap.
     Knowledge Check slides teach nothing new — they assess. Allowed Knowledge Check types: ${schemaQuizActivities.join(', ') || 'none'}.
     Prefer spreading different quiz activity types (quiz MC, sorting, matching, drop-targets) across checks when multiple are allowed.
     Interaction pick rules: sorting = arrange steps/phases/order; drop-targets = categorize into bins (multi-bin or one bin + distractors); matching = pair terms; quiz = MC. Never use drop-targets for sequencing.
  5. ${configParams.includeSummarySlides !== false ? 'Module Summary / Key Takeaways slide (type: "key-takeaways") — REQUIRED at end of each module. Use type key-takeaways with data.objectives array of {id,label,content}. Do NOT use plain content/summary markdown bullets for module summaries.' : 'NO summary slide'}
  
  CRITICAL: The course player automatically injects a Cover/Introduction slide before all modules${configParams.includeModuleTitleSlides !== false || configParams.includeModuleOverviewSlides !== false ? `, plus per-module structural slides (${[configParams.includeModuleTitleSlides !== false ? 'Module Title' : null, configParams.includeModuleOverviewSlides !== false ? 'Module Overview' : null].filter(Boolean).join(' + ')})` : ''}. Do NOT create any intro, overview, title, welcome, OR objectives/learning-objectives slide for ANY module. All modules must start directly with their first content or interaction slide.
  
  GAME TEMPLATE INTEGRATION:
  Do not include any game templates.
  
  OUTPUT FORMAT: You must return ONLY raw JSON matching this EXACT schema:
  {
    "title": "Course Title",
    "description": "Short summary",
    "visualTheme": "Neutral",
    "modules": [
      {
        "id": "uuid",
        "title": "Short 3-4 word module title",
        "slides": [
          { "id": "uuid", "type": "${schemaTypeEnum}", "title": "Slide Title", "enablingIndex": 0 }
        ]
      }
    ]
  }`;

  const { getAvailableThemes } = await import('../lib/backgrounds');
  const availableThemes = getAvailableThemes();

  const conversionNote = sourceMode === 'storyboard' && configParams.sourceContent
    ? `\n\n${storyboardOutlineInstructions(outlineInteractions)}\n\nSOURCE MATERIAL (storyboard):\n${storyboardSourceWindow(configParams.sourceContent)}`
    : configParams.isSourceConversion && configParams.sourceContent
    ? `\n\nIMPORTANT: This course is being CONVERTED from an uploaded source document. Use the source material below as the primary content reference. Apply instructional design best practices: chunk dense content, convert lecture-style material into interactive learning segments, and apply progressive disclosure.\nConversion Preferences: ${(configParams.conversionPreferences || []).join(', ') || 'Default conversion'}\n\nSOURCE MATERIAL (first 4000 chars):\n${configParams.sourceContent.slice(0, 4000)}`
    : '';

    const userPrompt = `Draft the outline for a Corporate Training Course. Topic: "${prompt}".
    Learning Objectives: ${JSON.stringify(objectives)}
    Objective format for this course: ${configParams.objectiveFormat || 'AB'} (respect this structure when aligning modules to objectives).
    SLIDE COUNT: ${sourceMode === 'storyboard' ? 'Follow the storyboard learner screens (one teaching slide per screen). Do not add extra slides for enabling coverage.' : 'Do NOT aim for a global target number of slides. Length comes from the objectives: one module per terminal, 1–2 teaching slides per enabling (plus knowledge checks / summaries when required below).'} AVAILABLE VISUAL THEMES: ${availableThemes.length > 0 ? availableThemes.join(", ") : "Neutral"}
    IMPORTANT AI DIRECTIVE: You must ONLY select a visualTheme if the course topic has a STRONG, LITERAL semantic match to that specific theme (e.g. use "Rigs" only for oil/gas/industrial topics, use "Forest" only for nature topics). If there is NO strong semantic match, you MUST default to "Neutral". Do not guess or select unrelated themes!

    MODULE TITLE QUALITY RULES:
    - Module titles must be SHORT topic labels: 3 to 4 words, Title Case. They are TOC headings, not learning-objective sentences.
    - Do NOT start with Bloom/gerund verbs (Identifying, Tracing, Distinguishing, Recognizing, Mapping, Understanding, Positioning, Selecting, Protecting).
    - Do NOT write a full statement or explanation. Narration already says what the module covers.
    - WRONG: "Tracing the Sequential Stages of the Steam Cracking Process" | RIGHT: "Steam Cracking Process Stages" or "The Steam Cracking Process"
    - WRONG: "Identifying Core Compliance Requirements" | RIGHT: "Compliance Requirements"
    - WRONG: "Module 3" or "Chapter 3" | RIGHT: a short unique topic name
    - Each module still maps to one learning objective, but the title is a concise label — not a restatement of the objective.${conversionNote}`;

  const rawText = await executeAnthropicAI('complex', systemInstruction, userPrompt, 8192);
  const cleanedText = extractJsonFromText(rawText);
  
  const parsedOutline = parseJsonSafely(rawText) as CourseOutlineDraft;
  if (!parsedOutline) throw new Error("Critical Data Failure: Outline could not be parsed.");

  // Always strip AI-authored objectives / learning-objectives slides.
  // Module Overview (when enabled) surfaces objectives from the canonical list;
  // a separate AI objectives slide is redundant and often invents disconnected wording.
  if (Array.isArray(parsedOutline.modules)) {
    const OBJECTIVES_TITLE = /^(learning\s+)?objectives?$|module\s+objectives?/i;
    const QUIZ_TYPES = new Set(['quiz', 'sorting', 'matching', 'drop-targets', 'multiple-choice', 'multiple-answers']);
    parsedOutline.modules = parsedOutline.modules.map(mod => ({
      ...mod,
      slides: (mod.slides || [])
        .filter(s => !OBJECTIVES_TITLE.test((s.title || '').trim()))
        // Games temporarily disabled — strip any game-template slides from the outline
        .filter(s => s.type !== 'game-template')
        .map(s => {
          if (!QUIZ_TYPES.has(s.type as string)) return s;
          const title = (s.title || '').trim();
          if (/^knowledge\s*check/i.test(title)) return s;
          return { ...s, title: `Knowledge Check: ${title || 'Practice'}` };
        }),
    }));
  }

  // Hard whitelist — never trust the model to stay inside Course Settings interactions
  if (Array.isArray(parsedOutline.modules)) {
    if (sourceMode === 'storyboard') {
      parsedOutline.modules = expandStoryboardQuizOutlineFromSource(
        expandStoryboardMultiQuestionSlides(
          remapStoryboardScenarioModules(parsedOutline.modules as any) as any
        ) as any,
        configParams.sourceContent || '',
      ) as any;
    }
    parsedOutline.modules = coerceInteractionTypes(parsedOutline.modules, outlineInteractions) as any;
  }

  parsedOutline.learningObjectives = objectives;
  if (parsedOutline.title) parsedOutline.title = shortenCourseTitle(parsedOutline.title);
  if (sourceMode === 'storyboard') {
    return parsedOutline;
  }
  const withCoverage = ensureEnablingSlideCoverage(parsedOutline, objectives);
  if (Array.isArray(withCoverage.modules)) {
    withCoverage.modules = withCoverage.modules.map(mod => ({
      ...mod,
      title: shortenModuleTitle(mod.title || ''),
    }));
  }
  return ensureKnowledgeCheckBudget(withCoverage, {
    includeKnowledgeChecks: includeKCs,
    knowledgeCheckMode: kcMode,
    knowledgeCheckCount: kcCount,
    quizActivityTypes: uniqueQuizActivities,
    objectives,
  });
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
    /** Whitelist from Course Settings — coerced after hydrate */
    interactionTypes?: string[];
    includeKnowledgeChecks?: boolean;
    knowledgeCheckMode?: 'total' | 'per-module';
    knowledgeCheckCount?: number;
    quizActivityTypes?: string[];
    sourceMode?: SourceMode;
  },
  onProgress?: (pct: number) => void
): Promise<CourseOutline> {
  const quizActivities = [...new Set(
    (Array.isArray(configParams.quizActivityTypes)
      ? configParams.quizActivityTypes
      : ['sorting', 'matching', 'drop-targets']
    ).map(t => (t === 'mc' ? 'quiz' : t === 'ma' ? 'multiple-answers' : t === 'tf' ? 'true-false' : t))
  )];
  const sourceMode: SourceMode = configParams.sourceMode === 'storyboard' ? 'storyboard' : 'raw';
  const hydrateKcCount = Math.max(0, Math.floor(configParams.knowledgeCheckCount ?? 2));
  const hydrateInteractions = (configParams.interactionTypes || []).filter(t => t !== 'scenario');
  const skeleton = sourceMode === 'storyboard'
    ? outlineDraft
    : ensureKnowledgeCheckBudget(outlineDraft, {
        includeKnowledgeChecks: configParams.includeKnowledgeChecks !== false && quizActivities.length > 0 && hydrateKcCount > 0,
        knowledgeCheckMode: configParams.knowledgeCheckMode === 'total' ? 'total' : 'per-module',
        knowledgeCheckCount: hydrateKcCount,
        quizActivityTypes: quizActivities,
        objectives: outlineDraft.learningObjectives,
      });

  const fullCourse: CourseOutline = {
    title: shortenCourseTitle(skeleton.title || originalPrompt || ''),
    description: skeleton.description,
    visualTheme: skeleton.visualTheme,
    learningObjectives: skeleton.learningObjectives,
    modules: []
  };

  const storyboardHydrateBlock = sourceMode === 'storyboard'
    ? `\n\n${storyboardHydrateInstructions()}\n`
    : '';

  const systemInstruction = `You are an Expert eLearning Content Architect and Certified Instructional Designer.
  Your ONLY job: hydrate the provided module JSON skeleton with rich, ISD-compliant content. Do NOT change the slide structure.
  Keep module.title exactly as provided — do not lengthen it into a sentence or objective-style phrase.
  Keep each slide's enablingIndex exactly as provided. A teaching slide with enablingIndex N must teach that module's enabling objective N (0-based). Do not drop, merge, or skip enablings. Knowledge checks and summaries have no enablingIndex.
  ${storyboardHydrateBlock}

  ========================================
  GLOBAL PRINCIPLE — ON-SCREEN TEXT vs NARRATION (APPLIES TO EVERY SLIDE)
  ========================================
  On-screen text (content field) and spoken narration (voiceOverText) serve DIFFERENT jobs. Never make them the same text.
  - ON-SCREEN TEXT = a short visual anchor the learner can scan in 2-3 seconds. Default to SHORT PHRASES of 5-8 words per
    bullet, MAXIMUM 5-6 bullets per slide. Bullets are memory hooks, not complete explanations.
  - NARRATION (voiceOverText) = where the real teaching happens. It expands on each bullet in natural spoken language,
    gives context/examples/application — but it must NEVER just re-read the bullets verbatim or restate them one by one.
    It should feel like a person explaining the big picture, not narrating a list.
  - EXCEPTION (full sentences/paragraphs ARE appropriate): key-takeaways / module summaries (see below), scenario/branching
    narrative text the learner must read closely, direct quotes or excerpts from a source document, or a screenshot/image
    caption that needs a complete sentence for context. Do NOT apply the 5–8 word bullet rule to key-takeaways.
  - MODULE SUMMARY / KEY TAKEAWAYS: 2–4 major points for the WHOLE module (not one row per slide). Each point is a 1–3
    sentence summary the learner can read on screen — a complete thought, not a 5–8 word phrase or Bloom gerund.
    Narration synthesizes why those points matter together. NEVER recap every slide title as a takeaway.
  - PROCESS / VERTICAL TABS (tabbed-horizontal / tabbed-vertical) — STRICT: each step or tab's on-screen content must be SHORT BULLETS
    (3–5 bullets, 5–8 words each). Put explanations in voiceOverText and (when present) each tab's voiceOverText field.
    Never put a thick paragraph inside a tab panel.

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
  7. CONCISENESS: Teaching slides (content, tabs, click-reveal, choice-cards) use <= 5-6 short bullets (5-8 words each)
     OR <= 2 short sentences when prose is required. KEY-TAKEAWAYS are the exception: 2–4 points, each 1–3 full sentences.
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
  IMAGE PROMPTS (mediaPrompt) — TECHNICAL MEANING, NO TEXT
  ========================================
  mediaPrompt describes a photograph with NO text, letters, numbers, captions, or labels in the picture.
  Interpret short labels using THIS COURSE'S DOMAIN, never the everyday English or pop-culture meaning.
  Wrong: "Termination" as a job firing; "EVA" as an astronaut; "Initiation" as a handshake.
  Right: polymer-chain termination; ethylene-vinyl acetate plastic; free-radical initiation.
  Prefer materials, equipment, or a lab/plant setting. Do not describe office drama or staged people unless the lesson is about people skills.

  ========================================
  SLIDE TYPE RULES (STRICT -- NO EXCEPTIONS)
  ========================================
  DO NOT add, remove, or reorder ANY slides from the provided structure.
  NEVER convert a teaching/content/interaction slide into a Knowledge Check. Knowledge checks are only the slides already typed as quiz/matching/sorting/drop-targets/true-false in this JSON.
  NEVER insert extra Knowledge Check slides to "practice" an enabling. Course Settings already capped how many checks this module gets.

  QUIZ:
  - questionText MUST be a complete question sentence ending with "?"
  - Optional scenarioText: a short situation paragraph the learner reads BEFORE the question (carrier alert, workplace vignette, yellow-box story). Not the question itself. Omit when there is no situation.
  - Must have EXACTLY 4 options: 1 correct (isCorrect: true) + 3 plausible distractors. STORYBOARD EXCEPTION: copy the spec's option count (3 is valid). Do not invent extra distractors to reach 4.
  - When THIS slide is already a Knowledge Check and the storyboard lists 2+ numbered questions on one screen, emit data.questions: [{ questionText, options, feedback }] — one object per numbered question, exact stems and Keys. Do not invent a different wrapping question. Do not collapse them into one multiple-answers item.
  - RAW / lecture conversion: exactly ONE question per Knowledge Check slide. Do not emit data.questions. Do not write "Question 1 of 2".
  - options[].text must be meaningful (10+ chars). NEVER: "A", "B", "True", "False" unless it's genuinely a T/F slide
  - feedback: string explaining why the correct answer is right (this is where teaching detail goes AFTER submit)
  - Slide-level content: 1 framing bullet about what is being tested. voiceOverText MUST be "" (empty). Knowledge checks have no spoken narration — same as Mastery Quiz questions. Do not give away the answer on screen.
  - mediaPrompt describes a photograph with NO text, letters, or labels in the image. Use the technical meaning of any short label (polymer termination, not a job firing).

  MULTIPLE-ANSWERS:
  - Same schema as QUIZ plus scenarioText when a situation exists.
  - Use when the learner must select TWO or more options on a SCORED check ("select two", "select all that apply", Keys/pass score).
  - Mark isCorrect true on every correct option (2+). Do not collapse those into a single multiple-choice pair.
  - If the stem says "select N" but a different number of options are marked correct (including all of them), rewrite the stem to "Select the … that …". Never leave a false count in the prompt.
  - FAIL CONDITION: missing questionText or fewer than 2 options -> regenerate

  CHOICE-CARDS (type: "choice-cards"):
  - Teaching exploration, NOT a knowledge check. Narration plays. Do NOT title the slide "Knowledge Check:".
  - Use for 1–4 tappable tiles/cards on a content screen. 5+ clickable items → click-reveal instead.
  - Two modes:
    • "explore" (click-to-reveal): click-to-explore, [DEV] reveal callouts, "select each", visit-all. data.mode = "explore". cards: [{ id, label, body, reveal }] with a UNIQUE reveal per card. Do NOT set isCorrect. No Check.
    • "select" (pick then Check): decision-sort / which measures apply / accepted tiles. data.mode = "select". cards: [{ id, label, body, isCorrect }]. data.feedback after Check. data.selectMode multi|single.
    • data.prompt for select mode MUST say the learner is choosing the CORRECT card(s) and then clicks Check. Example: "Select the correct process conditions, then click Check." NEVER "Select the process conditions…" (that reads as exploratory). Explore mode may use "Select each…".
  - data.prompt: the on-screen prompt (one sentence).
  - Card FACE: label (short title) plus at most ONE short teaser line in body (≤12 words). Spec facts (Reaction conditions:, Catalyst:, Key product:, Density:) go in reveal as bullets, then any paragraph. Do NOT stack four labeled rows on the tile.
  - voiceOverText: the storyboard narration. Never empty.
  - FAIL CONDITION: fewer than 2 cards -> regenerate

  ACCORDION (DEPRECATED — use click-reveal instead):
  - If you would have used accordion, emit type "click-reveal" with items: [{ id, term, definition }]
  - term = section header; definition = bullet content (<= 4 bullets)

  SORTING (sequence / order — prefer this for phases, steps, cycles):
  - Use when the learner must arrange items in a correct operational or chronological order
  - Schema: { items: [{ id, content }], correctOrder: [id, ...] } — correctOrder lists item ids from first to last
  - NEVER use drop-targets for "arrange in order / sequence / phases" questions
  - Slide-level content: frame the sorting task only; do not list the correct order. voiceOverText MUST be "".

  DROP-TARGETS (categorization bins):
  - Use ONLY when the learner must choose which bin each item belongs to
  - Valid patterns: (a) 2+ labeled categories, OR (b) 1 category with distractors that must stay in the bank
  - Schema: { items: [{ id, content, category }], categories: string[] }
  - category = exact category label for correct items; use "" (empty) for distractors that do NOT belong in any bin
  - FORBIDDEN: one category with every item assigned to it and no distractors (that is sorting — use sorting instead)
  - Min 3, max 8 items
  - Slide-level content: same knowledge-check rule as matching — frame the task, do not list which item belongs in which bin. voiceOverText MUST be "".

  MATCHING:
  - Items and targets must be parallel in structure. Max 5 pairs.
  - Slide-level content: 1–2 framing bullets about the TASK ("Match each sign to its function"). NEVER a cheat sheet of correct matches, color meanings, or definitions the learner is supposed to recall.
  - voiceOverText MUST be "" (empty). Knowledge checks have no spoken narration. Teaching detail belongs after the learner submits.

  FLASHCARDS:
  - front = a direct question or key term (not a sentence fragment)
  - back = concise definition or full answer (1-2 sentences)
  - Max 6 cards

  TIMELINE:
  - Chronological entries only. 4-6 events max. year field required.

  HOTSPOT:
  - MUST include a mediaPrompt string (describe the unlabeled image to show — no letters or captions in the picture)
  - MUST include 2-5 hotspots, each with x (0-100), y (0-100), label, content
  - FAIL CONDITION: no hotspots -> change type to "content" instead

  GAME TEMPLATES (knowledge-board, millionaire, escape-room):
  - ALL fields must be populated. NO empty strings, NO empty arrays.
  - jeopardy: must have 3-5 categories, each with 3-5 questions with prompt AND correctAnswer
  - millionaire: must have 10-15 questions with prompt, 4 options[], correctAnswer
  - FAIL CONDITION: empty categories or missing questions -> regenerate entire game block
  - templateType field MUST match the game type string exactly

  PROCESS (type: "tabbed-horizontal"):
  - This is a numbered process stepper, NOT a row of topic tabs. Learners click step circles in order.
  - data.tabs: array of 3-6 sequential STEP objects (ordered left to right)
  - Each step: { "id": "t1", "label": "Short step name (2-5 words)", "color": "#4f46e5", "content": "- Short bullet\\n- Another point", "voiceOverText": "2-4 spoken sentences elaborating this step" }
  - Labels are STEP NAMES (Identify the hazard, Isolate energy), never generic "Tab 1" / "Overview" / "Topic 2".
  - On-screen step content MUST be SHORT BULLETS only (3–5 bullets, 5–8 words each). Put explanations in voiceOverText. NEVER empty or symbol-only bullets (e.g. "-" alone).
  - Slide-level "content" is the OVERVIEW on-screen text shown before any step is selected. Format like steps: 3–5 SHORT BULLETS (5–10 words each) capturing the main points of the slide-level voiceOverText. Do NOT use only a click instruction as the entire intro. Do NOT add a "Select a step…" bullet — the player UI already shows that CTA. NEVER emit an empty bullet or a bullet whose only content is punctuation/symbols.
  - Slide-level voiceOverText narrates that overview (2–5 spoken sentences).
  - Color must be a valid hex color. Steps may share one color (teal/process accent) or vary slightly.
  - FAIL CONDITION: fewer than 3 steps, or missing content -> regenerate

  TABBED-VERTICAL (type: "tabbed-vertical"):
  - data.tabs: array of 2-6 tab objects
  - Each tab: { "id": "t1", "label": "Topic Name", "content": "- Bullet one\\n- Bullet two", "voiceOverText": "2-4 spoken sentences for this tab" }
  - On-screen tab content: SHORT BULLETS (3–5, 5–8 words). Narration goes in voiceOverText per tab. NEVER empty or symbol-only bullets.
  - Slide-level "content" is the INTRODUCTION OST (same rules as tabbed-horizontal): 3–5 short topic bullets aligned with slide voiceOverText — never CTA-only, and do not include a "Select a tab…" bullet (player UI adds it).
  - FAIL CONDITION: fewer than 2 tabs, or missing content -> regenerate

  FOLDER-EXPLORER (type: "folder-explorer"):
  - data.folderLabel: optional folder name string (e.g. "Reference Materials")
  - data.items: array of 2-5 document/paper items
  - Each item: { "id": "p1", "title": "Document Title", "previewText": "One-line teaser", "content": "Full text shown when opened. 3-6 sentences." }
  - FAIL CONDITION: fewer than 2 items, or any item missing content -> regenerate

  CAROUSEL-PANEL (type: "carousel-panel"):
  - data.cards: array of 3-5 card objects
  - Each card: { "id": "c1", "label": "Card Title", "color": "#4f46e5", "description": "Short 1-2 sentence preview", "expandedContent": "Full detail shown after MORE is clicked. 3-5 sentences." }
  - Color MUST be one of these dark fills so white text stays readable: #4f46e5, #0f766e, #9f1239, #1d4ed8, #b45309, #6d28d9, #166534, #0f172a. NEVER white, yellow, pink, light gray, or pastels — do not pick a fill to "match" the topic (e.g. do not use white for "White Signs").
  - description <= 30 words. expandedContent must exist.
  - FAIL CONDITION: fewer than 2 cards, or missing expandedContent -> regenerate

  CLICK-REVEAL (type: "click-reveal"):
  - Use this for grouped topics (### headings with bullets), key terms, or comparison lists the learner should open one at a time.
  - data.items: array of 3-6 reveal items (not 8 — too long vertically)
  - Each item: { "id": "r1", "term": "Section heading (2-6 words)", "definition": "- short bullet\\n- short bullet\\n- short bullet" }
  - term: the clickable label only (NO markdown asterisks)
  - definition: the REVEALED on-screen text — SHORT BULLETS only (3–5 bullets, 5–8 words each). These ARE the scannable points. NEVER put 1–3 explanatory sentences in definition — that belongs in voiceOverText.
  - Slide-level "content" is the LEFT-COLUMN INTRODUCTION (same job as a process-step intro): 3–5 SHORT overview bullets (5–8 words) that frame the set of terms. Do NOT repeat each item's reveal bullets. Do NOT use a "Select each…" instruction as the entire intro — the player already shows that CTA.
  - voiceOverText: spoken teaching that expands the bullets (2–5 sentences). Do not re-read every bullet.
  - FAIL CONDITION: fewer than 3 items, paragraph-only definitions, or slide content that duplicates every item -> regenerate

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
  - LABEL SAFETY (STRICT -- prevents render failures): if a label contains ANY of these characters —
    parentheses (), quotes ", colons :, semicolons ;, or curly braces {} — you MUST wrap the whole label in
    double quotes inside its brackets: A["Check Availability (fast path)"] NOT A[Check Availability (fast path)].
    Plain labels with only letters/numbers/spaces/hyphens do NOT need quotes.
  - Decision branches: always label arrows with -->|Yes| and -->|No| or -->|Approve| and -->|Reject|
  - Max 10 nodes for clarity on a slide
  - Prefer colorful classDef fills for contrast (e.g. fill:#dbeafe,stroke:#2563eb; fill:#fce7f3,stroke:#db2777; fill:#d1fae5,stroke:#059669; fill:#fef3c7,stroke:#d97706) — NEVER dark slate fills. The player renders diagrams on a white slide canvas.
  - Use at least 2–3 distinct node fill colors in flowcharts so steps are visually distinct.
  - Example mermaidCode: "flowchart TD\\n  A([Start]) --> B[Identify Risk]\\n  B --> C{Severity?}\\n  C -->|High| D[Escalate to Manager]\\n  C -->|Low| E[Log & Monitor]\\n  D --> F([End])\\n  E --> F\\n  classDef blue fill:#dbeafe,stroke:#2563eb,color:#0f172a\\n  classDef pink fill:#fce7f3,stroke:#db2777,color:#0f172a\\n  classDef green fill:#d1fae5,stroke:#059669,color:#0f172a\\n  class B,D blue\\n  class E green\\n  class C pink"
  - content: 1-2 sentence description of what the diagram illustrates (shown as a caption)
  - data.caption: optional short caption string (alternative to content for the label below diagram)
  - FAIL CONDITION: empty or syntactically invalid mermaidCode → change type to "content" instead

  CONTENT / KEY-TAKEAWAYS / SUMMARY:
  - Do NOT embed full-slide images. Use mediaPrompt to describe what image should appear (no text in the image).
  - Teaching CONTENT slides must use ### headers, bullet lists, or callout blocks -- NOT bare paragraphs.
  - BULLET BREVITY applies to CONTENT / tabs / click-reveal / choice-card faces ONLY: each bullet is a SHORT PHRASE, 5-8 words.
    NOT a complete explanatory sentence — the narration explains, the bullet just labels. MAXIMUM 5-6 bullets per teaching slide.
    WRONG (too long/explanatory): "- Phishing attacks use deceptive emails to trick employees into revealing login credentials"
    RIGHT (short phrase): "- **Phishing**: deceptive emails targeting login credentials"
    This 5–8 word rule does NOT apply to key-takeaways.
  - KEY-TAKEAWAY SLIDES (type: "key-takeaways"): REQUIRED fields — content (markdown) AND data.objectives
    array with 2–4 items [{ id, label, content }]. NEVER leave data.objectives empty or omit it.
    Each item is a KEY POINT from the module: put a 1–3 sentence summary in label (or label + content).
    Do NOT write 5–8 word fragments, ALL-CAPS topic titles, or Bloom gerunds ("Distinguish how…", "Select polyethylene grades…").
    WRONG: "CATALYST ROLE" / "Three Steps of Radical Polymerization"
    RIGHT: "Free-radical polymerization builds PE chains in three steps — initiation, propagation, and termination — and the way those steps are controlled decides branching and grade."
    Pick 2–4 highest-value points for the WHOLE module, not one row per teaching slide.
  - BOLD USAGE: Do NOT bold words inside bullet lists on content slides.
    The slide title already carries visual hierarchy; partial bold mid-bullet looks noisy and
    competes with the header. Write plain bullets with no ** markers. Reserve bold for rare
    inline terms in paragraph prose only (never in list items).
  - SECTION HEADERS: When a content slide has two themes, emit markdown ### headings (not a bold bullet).
    Parent heading is NOT a list item. Child insight bullets sit under that heading.
    WRONG: "- **WHAT ARE COMONOMERS?**" then more bullets in one flat list.
    RIGHT:
      ### What are comonomers?
      - Unsaturated molecules co-fed with monomer
      ### How comonomers control density
      - More comonomer → more branches → lower density
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
  - choice-cards: { prompt: string, mode?: 'explore'|'select', selectMode?: 'multi'|'single', feedback?: string, cards: [{ id, label, body, reveal?: string, isCorrect?: boolean }] }
  - timeline: { events: [{ id: string, year: string, title: string, content: string }] }
  - sorting: { items: [{ id: string, content: string }], correctOrder: string[] } — use for sequence/order/phases; correctOrder is item ids first→last
  - matching: { items: [{ id: string, content: string }], targets: [{ id: string, content: string }], correctAnswers: { [itemId]: targetId } } — NEVER use 'pairs'. Always include correctAnswers mapping every item id to its target id.
  - drop-targets: { items: [{ id: string, content: string, category: string }], categories: string[] } — category must match a categories[] entry, OR be "" for distractors. Require 2+ categories OR 1 category with at least one distractor. Never use for pure sequencing.
  - quiz interactions: [{ type: 'multiple-choice', questionText: string, scenarioText?: string, options: [{ id, text, isCorrect: boolean }], feedback: string }]
  - jeopardy: { templateType: 'jeopardy', instructions: string, categories: [{ id, name, questions: [{ id, value: number, prompt: string, correctAnswer: string, isDailyDouble: boolean }] }] }
  - millionaire: { templateType: 'millionaire', instructions: string, questions: [{ id, difficulty: number, prompt: string, options: string[], correctAnswer: string, isSafeHaven: boolean }] }
  - diagram: { mermaidCode: string, caption?: string }  — mermaidCode must be raw Mermaid syntax, no markdown fences

  ========================================
  OUTPUT FORMAT
  ========================================
  Schema: { "id": "...", "title": "...", "slides": [ { ...all original fields + content + voiceOverText + mediaPrompt + data + interactions } ] }
  EVERY slide must have: id, type, title, content (string), voiceOverText (string), mediaPrompt (string).
  Knowledge checks (quiz, multiple-choice, multiple-answers, true-false, sorting, matching, drop-targets, knowledge-check) MUST use voiceOverText "". Learners read the on-screen task; do not generate spoken narration for them.
  Interactive slides must ALSO have: data (object) or interactions (array) as specified above.`;

  const sourceNote = sourceMode === 'storyboard' && configParams.sourceContent
    ? `\n\nFollow the STORYBOARD MODE rules in the system instruction. Source (OST + narration):\n${storyboardSourceWindow(configParams.sourceContent)}`
    : configParams.sourceContent
    ? `\n\nIMPORTANT: This course was converted from an uploaded source document. Base the content on the source material below. Transform lecture-style slides into interactive, learner-centric content. Preferences: ${(configParams.conversionPreferences || []).join(', ') || 'Default'}\n\nSOURCE MATERIAL (first 4000 chars):\n${configParams.sourceContent.slice(0, 4000)}`
    : '';

  // --- Helper: drop extra slides a chunk model re-emitted (keep outline count) ---
  function constrainChunkSlides(parsedSlides: any[], outlineChunk: any[]): any[] {
    return alignHydratedSlidesToOutline(parsedSlides, outlineChunk);
  }

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
    const enablingHint = Number.isInteger(slide?.enablingIndex)
      ? ` This slide teaches enabling objective ${slide.enablingIndex} (0-based) for this module. Keep enablingIndex ${slide.enablingIndex}.`
      : '';
    const singlePrompt = `Hydrate exactly ONE slide for the module titled "${moduleTitle}". Course topic: ${originalPrompt}.${enablingHint}
Slide JSON: ${JSON.stringify(slide, null, 2)}
Return ONLY a JSON object for this single slide with all fields: id, type, title, content, voiceOverText, mediaPrompt, enablingIndex (if present on the input), and data/interactions if applicable.`;
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
    const voOk = slideSkipsNarration(parsed) || !!parsed.voiceOverText?.trim();
    if (teachingSlideNeedsRetry(parsed) || !voOk) {
      throw new Error(`Single slide response for "${slide.title}" has empty content or voiceOverText.`);
    }
    return preserveEnablingIndex(slideSkipsNarration(parsed) ? stripSlideNarration(parsed) : parsed, [slide], 0);
  }

  /**
   * Last-mile safety net for Bug #7 (slides that "successfully" parse but come back
   * blank). Retries each empty slide individually up to `attempts` times before
   * falling back to real, title-derived text (never a "content unavailable" placeholder).
   */
  async function ensureSlideHasContent(slide: any, moduleTitle: string, attempts = 2): Promise<any> {
    if (!teachingSlideNeedsRetry(slide) && (slideSkipsNarration(slide) || !!slide.voiceOverText?.trim())) {
      return slideSkipsNarration(slide) ? stripSlideNarration(slide) : slide;
    }
    for (let i = 0; i < attempts; i++) {
      try {
        const retried = await hydrateSingleSlide(slide, moduleTitle);
        return finalizeHydratedSlide({ ...slide, ...retried }, moduleTitle);
      } catch (err: any) {
        console.warn(`[Bug#7 safety net] Retry ${i + 1}/${attempts} failed for slide "${slide.title}": ${err.message}`);
      }
    }
    console.error(`[Bug#7 safety net] All retries exhausted for slide "${slide.title}" -- using derived fallback text.`);
    return finalizeHydratedSlide(slideSkipsNarration(slide) ? stripSlideNarration(slide) : slide, moduleTitle);
  }

  // --- Helper: validate and normalize a parsed slide ---
  function processSlide(slide: any): any[] {
    if (sourceMode === 'storyboard') {
      slide = remapStoryboardScenarioSlide(slide);
    }

    if (slide.type === 'carousel-panel') {
      const cards = slide.data?.cards || slide.data?.items;
      if (Array.isArray(cards)) {
        slide.data = {
          ...(slide.data || {}),
          cards: cards.map((c: any, i: number) => ({ ...c, color: coerceCarouselColor(c?.color, i) })),
        };
      }
    }

    const isMissingData = (type: string, field: string) =>
      slide.type === type && (!slide.data || !slide.data[field] || slide.data[field].length === 0);

    if (slide.type === 'hotspot' && !slide.data?.hotspots?.length) slide.type = 'content';
    else if (isMissingData('accordion', 'items')) slide.type = 'content';
    else if (isMissingData('flashcards', 'cards')) slide.type = 'content';
    // Incomplete click-reveal / choice-cards stay typed until Bug #7 retry, then finalizeHydratedSlide degrades.
    else if (slide.type === 'choice-cards' && slide.data) {
      const cards = slide.data.cards || [];
      const mode = slide.data.mode === 'explore' || slide.data.mode === 'select'
        ? slide.data.mode
        : (cards.some((c: any) => c?.isCorrect === true || c?.accepted === true) ? 'select' : 'explore');
      slide.data = { ...slide.data, mode };
    }
    else if (slide.type === 'quiz' || slide.type === 'multiple-choice' || slide.type === 'multiple-answers' || slide.type === 'true-false') {
      const list = quizQuestionList(slide.interactions?.[0] || slide.data || slide);
      if (sourceMode === 'storyboard' && list.length >= 2) {
        return expandOneMultiQuestionSlide(slide);
      }
      if (list.length >= 2) {
        const first = list[0];
        slide.data = {
          ...(slide.data || {}),
          questionText: first.questionText,
          options: first.options,
          feedback: first.feedback,
          scenarioText: first.scenarioText,
        };
        if (slide.data) delete slide.data.questions;
      } else if (list.length === 1) {
        if (slide.data) slide.data = applyAlignedQuizPrompt({ ...slide.data, options: list[0].options, questionText: list[0].questionText });
        if (Array.isArray(slide.interactions) && slide.interactions[0]) {
          slide.interactions[0] = applyAlignedQuizPrompt({ ...slide.interactions[0], options: list[0].options });
        }
      } else if (!isKnowledgeCheckSlide(slide)) {
        slide.type = 'content';
        slide.content = slide.content || `**${slide.title || 'Knowledge Check'}**\n\nReview this topic, then continue. (Interactive question options were incomplete and were converted to content.)`;
      }
    }
    else if (slide.type === 'sorting' && (!slide.data?.items?.length && !slide.interactions?.[0]?.items?.length)) {
      slide.type = 'content';
    }
    else if (slide.type === 'matching' && (!slide.data?.items?.length && !slide.interactions?.[0]?.items?.length)) {
      slide.type = 'content';
    }
    else if ((slide.type === 'drop-targets' || slide.type === 'memory-match') && (!slide.data?.items?.length && !slide.interactions?.[0]?.items?.length)) {
      slide.type = 'content';
    }
    else if (slide.type === 'game-template' && !slide.data?.templateType) {
      slide.type = 'content';
      slide.content = slide.content || 'Game template encountered a structural error.';
    }
    else if (slide.type === 'diagram' && !slide.data?.mermaidCode?.trim()) {
      // Diagram slide with no mermaid code — degrade gracefully to content
      slide.type = 'content';
      slide.content = slide.content || `Process diagram for: ${slide.title}`;
    }

    // Sequence questions mis-typed as drop-targets → coerce to sorting
    if (slide.type === 'drop-targets' || slide.type === 'memory-match') {
      const raw = slide.data || slide.interactions?.[0] || {};
      const items = Array.isArray(raw.items) ? raw.items : [];
      const cats = Array.isArray(raw.categories) ? raw.categories.map((c: any) => String(c)) : [];
      const uniqueCats = [...new Set(items.map((i: any) => String(i.category || i.correctCategory || '').trim()).filter(Boolean))];
      const hasDistractors = items.some((i: any) => !String(i.category || i.correctCategory || '').trim());
      const text = `${slide.title || ''} ${slide.content || ''}`;
      const sequenceCue = /order|sequence|arrange|phases?|steps?|chronolog|operational order|correct order/i.test(text);
      const singleBinNoChoice = uniqueCats.length <= 1 && cats.length <= 1 && !hasDistractors;
      if (items.length >= 2 && (sequenceCue || singleBinNoChoice)) {
        const sortedItems = items.map((it: any, i: number) => ({
          id: String(it.id || `s-${i}`),
          content: String(it.content || it.text || it.label || ''),
        })).filter((it: any) => it.content);
        slide.type = 'sorting';
        slide.data = {
          items: sortedItems,
          correctOrder: Array.isArray(raw.correctOrder) && raw.correctOrder.length
            ? raw.correctOrder.map(String)
            : sortedItems.map((it: any) => it.id),
        };
        if (Array.isArray(slide.interactions)) {
          slide.interactions = [{ type: 'sorting', ...slide.data }];
        }
      }
    }
    // Scenario slides — data will be populated async; skip sync validation here

    // Key-takeaways / module summaries: always use the numbered-card LearningObjectivesSlide format
    if (slide.type === 'summary' || /module\s+summary|key\s*takeaways?/i.test(slide.title || '')) {
      slide.type = 'key-takeaways';
    }

    // Key-takeaways: normalize markdown bullets into data.objectives so the
    // LearningObjectivesSlide renderer never receives an empty list.
    if (slide.type === 'key-takeaways') {
      Object.assign(slide, normalizeKeyTakeaways(slide));
    }

    // Density auto-splitter — skip Summary/Key-Takeaway slides entirely. Those are
    // 2–4 sentence summaries, not dense teaching lists, so they should never
    // need splitting.
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
  type HydrateChunkJob = {
    moduleIndex: number;
    chunkIndex: number;
    chunkCount: number;
    emptyModule: (typeof skeleton.modules)[number];
    chunk: any[];
  };
  const chunkJobs: HydrateChunkJob[] = [];
  for (let moduleIndex = 0; moduleIndex < skeleton.modules.length; moduleIndex++) {
    const emptyModule = skeleton.modules[moduleIndex];
    const slideChunks: any[][] = [];
    for (let i = 0; i < emptyModule.slides.length; i += CHUNK_SIZE) {
      slideChunks.push(emptyModule.slides.slice(i, i + CHUNK_SIZE));
    }
    for (let chunkIndex = 0; chunkIndex < slideChunks.length; chunkIndex++) {
      chunkJobs.push({
        moduleIndex,
        chunkIndex,
        chunkCount: slideChunks.length,
        emptyModule,
        chunk: slideChunks[chunkIndex],
      });
    }
  }
  const totalChunks = Math.max(chunkJobs.length, 1);
  let completedChunks = 0;
  const bumpProgress = () => {
    completedChunks++;
    if (onProgress) onProgress(Math.round(10 + (completedChunks / totalChunks) * 88));
  };

  /** Hydrate one chunk with the same Tier 1 → 2 → 3 ladder as before (unchanged prompts/retries). */
  async function hydrateOneChunk(job: HydrateChunkJob): Promise<{ moduleIndex: number; chunkIndex: number; slides: any[] }> {
    const { emptyModule, chunk, chunkIndex, chunkCount, moduleIndex } = job;
    const chunkModule = { ...emptyModule, slides: chunk };
    const label = `Module "${emptyModule.title}" Chunk ${chunkIndex + 1}`;

    const groups = normalizeTerminalGroups(skeleton.learningObjectives);
    const enablingList = groups[moduleIndex]?.enablingObjectives || [];
    const enablingNote = enablingList.length
      ? `\nThis module's enabling objectives (keep enablingIndex on each teaching slide; teach that enabling):\n${enablingList.map((e, i) => `${i}: ${e}`).join('\n')}\n`
      : '';
    const fullPrompt = `Hydrate Module Chunk ${chunkIndex + 1} of ${chunkCount}.\nCourse Topic: ${originalPrompt}${sourceNote}${enablingNote}\n\nModule Draft JSON:\n${JSON.stringify(chunkModule, null, 2)}\n\nReturn ONLY a single JSON object: { "id": "...", "title": "...", "slides": [ ... ] }`;
    const simplePrompt = `Hydrate this module chunk. Be concise -- max 2 sentences per content field, max 4 items per array.\nModule: ${JSON.stringify(chunkModule)}\nReturn ONLY: { "id": "...", "title": "...", "slides": [ ... ] }`;

    let parsedChunk: any = null;

    // Tier 1: Full prompt
    try {
      const raw = await executeAnthropicAI('bulk', systemInstruction, fullPrompt, 8192);
      parsedChunk = parseModuleChunk(raw);
    } catch (e1: any) {
      console.warn(`[${label}] Tier 1 failed: ${e1.message}`);

      // Tier 2: Simplified prompt
      try {
        const raw2 = await executeAnthropicAI('bulk', systemInstruction, simplePrompt, 8192);
        parsedChunk = parseModuleChunk(raw2);
      } catch (e2: any) {
        console.warn(`[${label}] Tier 2 failed: ${e2.message}. Falling back to per-slide generation.`);

        // Tier 3: per-slide sequentially (avoid exploding concurrency when several chunks fail)
        const individualResults: any[] = [];
        for (const slide of chunk) {
          try {
            const hydratedSlide = await hydrateSingleSlide(slide, emptyModule.title);
            individualResults.push(hydratedSlide);
          } catch (e3: any) {
            console.error(`[Single slide "${slide.title}" in "${emptyModule.title}"] All tiers failed: ${e3.message}`);
            individualResults.push({
              ...slide,
              content: `**${slide.title}**\n\nThis slide covers key content for module: ${emptyModule.title}. Please review and edit as needed.`,
              voiceOverText: slideSkipsNarration(slide) ? '' : `In this slide we cover ${slide.title}, which is an important aspect of ${emptyModule.title}.`,
              mediaPrompt: `Professional illustration related to ${slide.title}`,
            });
          }
        }
        bumpProgress();
        const aligned = constrainChunkSlides(individualResults, chunk);
        return {
          moduleIndex,
          chunkIndex,
          slides: aligned.flatMap((s, i) => processSlide(preserveEnablingIndex(s, chunk, i))),
        };
      }
    }

    bumpProgress();
    const rawSlides = constrainChunkSlides(parsedChunk.slides as any[], chunk);
    return {
      moduleIndex,
      chunkIndex,
      slides: rawSlides.flatMap((s, i) => processSlide(preserveEnablingIndex(s, chunk, i))),
    };
  }

  // Parallelize chunks across the whole outline (order preserved when assembling)
  const chunkResults = await mapWithConcurrency(
    chunkJobs,
    HYDRATE_CHUNK_CONCURRENCY,
    hydrateOneChunk,
  );

  // --- Assemble modules in outline order ---
  for (let moduleIndex = 0; moduleIndex < skeleton.modules.length; moduleIndex++) {
    const emptyModule = skeleton.modules[moduleIndex];
    const moduleChunks = chunkResults
      .filter(r => r.moduleIndex === moduleIndex)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
    const hydratedSlides: any[] = moduleChunks.flatMap(r => r.slides);

    // ── Post-pass: safety net for slides that parsed successfully but came back
    // blank (Bug #7) — retries empty slides with the same concurrency bound. ──
    const needsContent = hydratedSlides
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => teachingSlideNeedsRetry(s) || (!slideSkipsNarration(s) && !s.voiceOverText?.trim()));
    if (needsContent.length) {
      const fixed = await mapWithConcurrency(
        needsContent,
        HYDRATE_CHUNK_CONCURRENCY,
        async ({ s }) => ensureSlideHasContent(s, emptyModule.title),
      );
      fixed.forEach((slide, j) => {
        hydratedSlides[needsContent[j].i] = slide;
      });
    }

    // ── Post-pass: generate scenario data for scenario-type slides ─────────────
    // Scenario parked like Game Modes — keep the generator, do not call it this version
    if (false && configParams.scenarioConfig) {
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

    // Knowledge checks have no spoken narration (same as Mastery Quiz questions).
    for (let i = 0; i < hydratedSlides.length; i++) {
      if (slideSkipsNarration(hydratedSlides[i])) {
        hydratedSlides[i] = stripSlideNarration(hydratedSlides[i]);
      }
    }

    // Strip any leftover "Learning Objectives" / "Module Objectives" slides the
    // AI may have authored despite the outline rules — the Module Overview
    // already shows the canonical objective for this module.
    const OBJECTIVES_TITLE = /^(learning\s+)?objectives?$|module\s+objectives?/i;
    const cleanedSlides = hydratedSlides.filter(s => !OBJECTIVES_TITLE.test((s.title || '').trim()));

    fullCourse.modules.push({ ...emptyModule, slides: cleanedSlides } as any);
  }

  if (sourceMode !== 'storyboard') {
    fullCourse.modules = ensureKnowledgeCheckBudget(fullCourse, {
      includeKnowledgeChecks: configParams.includeKnowledgeChecks !== false && quizActivities.length > 0 && hydrateKcCount > 0,
      knowledgeCheckMode: configParams.knowledgeCheckMode === 'total' ? 'total' : 'per-module',
      knowledgeCheckCount: hydrateKcCount,
      quizActivityTypes: quizActivities,
      objectives: fullCourse.learningObjectives,
    }).modules as any;
  }

  if (sourceMode === 'storyboard') {
    fullCourse.modules = dedupeStoryboardModuleSlides(
      expandStoryboardMultiQuestionSlides(
        remapStoryboardScenarioModules(fullCourse.modules as any) as any
      ) as any
    ) as any;
  }
  if (hydrateInteractions.length) {
    const allow = sourceMode === 'storyboard'
      ? [...new Set([...hydrateInteractions, ...STORYBOARD_CONTENT_TYPES])]
      : hydrateInteractions;
    fullCourse.modules = coerceInteractionTypes(fullCourse.modules as any, allow) as any;
  }

  for (const mod of fullCourse.modules) {
    const slides = [...(mod.slides || [])];
    for (let i = 0; i < slides.length; i++) {
      if (teachingSlideNeedsRetry(slides[i]) || (!slideSkipsNarration(slides[i]) && !String(slides[i].voiceOverText || '').trim())) {
        slides[i] = await ensureSlideHasContent(slides[i], mod.title);
      }
      slides[i] = finalizeHydratedSlide(slides[i], mod.title);
    }
    mod.slides = slides;
  }

  return fullCourse;
}

// --- Mastery Quiz Generator ---

function generateFallbackQuestions(course, config) {
  var questions = [];
  var qIdx = 0;
  var modules = (course && course.modules) ? course.modules : [];
  var types = (config && config.questionTypes && config.questionTypes.length)
    ? config.questionTypes.filter(function (t) { return t === 'mc' || t === 'ma' || t === 'tf'; })
    : ['mc', 'ma', 'tf'];
  if (!types.length) types = ['mc', 'ma', 'tf'];
  var totalNeeded = config.questionMode === 'total'
    ? (config.questionCount || 5)
    : (config.questionCount || 2) * Math.max(modules.length, 1);
  var questionsPerModule = Math.ceil(totalNeeded / Math.max(modules.length, 1));

  if (!modules.length) {
    for (var n = 0; n < totalNeeded; n++) {
      questions.push({
        id: 'q-' + (n + 1),
        type: 'mc',
        question: '[Draft] What is a key learning point from this course?',
        options: ['A core concept from the course', 'An unrelated topic', 'A concept from another domain', 'None of the above'],
        correctAnswer: 0,
        explanation: 'Draft placeholder generated when course content was unavailable.',
        moduleIndex: 0,
      });
    }
    return questions;
  }

  for (var mIdx = 0; mIdx < modules.length; mIdx++) {
    var mod = modules[mIdx];
    var slides = (mod && mod.slides && mod.slides.length) ? mod.slides : [{ title: mod.title || ('Module ' + (mIdx + 1)) }];
    var moduleQ = config.questionMode === 'total'
      ? (mIdx === modules.length - 1 ? totalNeeded - questions.length : questionsPerModule)
      : (config.questionCount || 2);
    for (var i = 0; i < moduleQ && questions.length < totalNeeded; i++) {
      var slide = slides[i % slides.length] || { title: 'Topic ' + (i + 1) };
      var type = types[qIdx % types.length];
      qIdx++;
      if (type === 'tf') {
        questions.push({ id: 'q-' + (questions.length + 1), type: 'tf', question: '[Draft] "' + (slide.title || 'This topic') + '" is a key topic in this course.', options: ['True', 'False'], correctAnswer: 0, explanation: '"' + (slide.title || 'This topic') + '" is covered in Module ' + (mIdx + 1) + '.', moduleIndex: mIdx });
      } else if (type === 'ma') {
        questions.push({ id: 'q-' + (questions.length + 1), type: 'ma', question: '[Draft] Which are discussed in "' + (mod.title || 'this module') + '"? (Select all that apply)', options: [slides[0]?.title || 'Topic A', slides[1]?.title || 'Topic B', 'An unrelated concept', slides[2]?.title || 'Topic C'], correctAnswer: [0, 1, 3], explanation: 'Draft question — replace with AI content when available.', moduleIndex: mIdx });
      } else {
        questions.push({ id: 'q-' + (questions.length + 1), type: 'mc', question: '[Draft] What is the primary focus of "' + (slide.title || 'this topic') + '"?', options: [slide.title || 'Core topic', 'An unrelated topic', 'A concept from another module', 'None of the above'], correctAnswer: 0, explanation: 'Draft placeholder. Real questions are AI-generated from course content.', moduleIndex: mIdx });
      }
    }
  }
  return questions;
}

export async function generateMasteryExam(
  course: CourseOutline,
  config: ExamConfig
): Promise<ExamQuestion[]> {
  const examTypes = (config.questionTypes || []).filter(
    (t): t is 'mc' | 'ma' | 'tf' => t === 'mc' || t === 'ma' || t === 'tf'
  );
  const masteryTypes = examTypes.length ? examTypes : (['mc', 'ma', 'tf'] as const);
  const examConfigForGen = { ...config, questionTypes: [...masteryTypes] };

  const totalNeeded = config.questionMode === 'total'
    ? config.questionCount
    : config.questionCount * course.modules.length;

  const courseSummary = course.modules.map((mod, mIdx) => {
    const slideSummaries = mod.slides
      .filter(s => !['title','intro','outro','exam-intro','mastery-exam','exam-results'].includes(s.type))
      .map(s => {
        // Prefer on-screen content, then narration, then a compact dump of
        // interaction payloads (quiz options, accordion items, etc.) so the
        // quiz generator always has enough substance from source-converted
        // courses where the content field can be very short.
        const body = (s.content || s.voiceOverText || s.narration || '').slice(0, 220);
        const dataHint = s.data
          ? ` | data: ${JSON.stringify(s.data).slice(0, 180)}`
          : s.interactions?.length
          ? ` | interactions: ${JSON.stringify(s.interactions).slice(0, 180)}`
          : '';
        return `  - [${s.type}] ${s.title}: ${body}${dataHint}`;
      })
      .join('\n');
    return `Module ${mIdx + 1}: ${mod.title}\n${slideSummaries}`;
  }).join('\n\n');

  const systemInstruction = `You are an expert eLearning assessment designer.
Generate ${totalNeeded} Mastery Quiz questions based on the course content below.
RULES:
1. Types to use: ${masteryTypes.join(', ')}. Distribute evenly.
   - mc: 4 options, 1 correct (correctAnswer = integer index 0-3)
   - ma: 4-5 options, 2+ correct (correctAnswer = array of integer indices)
   - tf: options = ["True","False"], correctAnswer = 0 (True) or 1 (False)
2. Use Bloom Remembering/Understanding verbs only.
3. Every question must be directly answerable from the provided content.
4. ${config.questionMode === 'per-module' ? `Generate exactly ${config.questionCount} questions per module.` : `Distribute ${totalNeeded} questions evenly across ${course.modules.length} modules.`}
5. Prefer questions that each test a different enabling objective. Only write a second question on the same enabling after every enabling in that module already has one.
6. Each question must have a 1-sentence explanation.
OUTPUT: Return ONLY valid JSON: { "questions": [{ "id": "q1", "type": "mc", "question": "...", "options": [...], "correctAnswer": 0, "explanation": "...", "moduleIndex": 0 }] }`;

  const objectivesJson = JSON.stringify(course.learningObjectives ?? []);
  const userPrompt = `Course: "${course.title ?? 'Untitled Course'}"
Objectives: ${(objectivesJson || '[]').slice(0, 400)}
Content:
${(courseSummary || '').slice(0, 8000)}
Generate ${totalNeeded} questions.`;

  try {
    // Cap wait time so "Begin Mastery Quiz" never appears frozen if the AI
    // proxy hangs — fall through to content-derived fallback questions.
    const text = await Promise.race([
      executeAnthropicAI('complex', systemInstruction, userPrompt, 8192),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Quiz generation timed out after 45s')), 45000)
      ),
    ]);
    const parsed = parseJsonSafely(text);
    if (parsed?.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return (parsed.questions as ExamQuestion[]).slice(0, totalNeeded);
    }
    return generateFallbackQuestions(course as any, examConfigForGen);
  } catch (err) {
    console.warn('[generateMasteryExam] Falling back to draft questions:', err);
    return generateFallbackQuestions(course as any, examConfigForGen);
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

export type InsertedContentScope = 'slide' | 'slides' | 'module';

function freshSlideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function bulletsToMarkdown(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  return raw
    .map((b) => String(typeof b === 'string' ? b : (b as any)?.content || (b as any)?.title || '').trim())
    .filter(Boolean)
    .map((b) => `- ${b.replace(/^[-*•]\s+/, '')}`)
    .join('\n');
}

function normalizeInsertedSlide(slide: any, fallbackTitle: string): any {
  if (!slide || typeof slide !== 'object') {
    return {
      id: freshSlideId(),
      type: 'content',
      title: fallbackTitle,
      content: `- ${fallbackTitle}`,
      voiceOverText: `This slide covers ${fallbackTitle}.`,
    };
  }
  let type = String(slide.type || 'content').toLowerCase();
  if (type === 'accordion') type = 'click-reveal';
  if (type === 'multiple-choice') type = 'quiz';
  if (type === 'multiple-answer') type = 'multiple-answers';
  if (type === 'hotspot' || type === 'game-template' || type === 'scenario') type = 'content';

  let content = String(slide.content || '').trim();
  if (!content) content = bulletsToMarkdown(slide.bullets || slide.data?.bullets);
  const title = String(slide.title || fallbackTitle).trim() || fallbackTitle;
  const dataFirst = ['click-reveal', 'choice-cards', 'tabbed-horizontal', 'tabbed-vertical', 'carousel-panel', 'quiz', 'matching', 'sorting', 'drop-targets', 'multiple-answers', 'true-false'];
  if (!content && !dataFirst.includes(type)) {
    content = `**${title}**\n\n- Key point for this topic`;
  }

  const data = slide.data && typeof slide.data === 'object' ? { ...slide.data } : {};
  if (type === 'carousel-panel') {
    const cards = data.cards || data.items;
    if (Array.isArray(cards)) {
      data.cards = cards.map((c: any, i: number) => ({ ...c, color: coerceCarouselColor(c?.color, i) }));
    }
  }
  if ((type === 'quiz' || type === 'multiple-answers' || type === 'true-false') && !data.questionText && slide.questionText) {
    data.questionText = slide.questionText;
    data.options = slide.options;
    data.feedback = slide.feedback;
    data.scenarioText = slide.scenarioText;
  }
  if (type === 'click-reveal' && !(Array.isArray(data.items) && data.items.length)) {
    type = 'content';
  }
  if ((type === 'quiz' || type === 'multiple-answers' || type === 'true-false') && !(Array.isArray(data.options) && data.options.length)) {
    type = 'content';
  }
  if (type === 'content' && !content) {
    content = `**${title}**\n\n- Key point for this topic`;
  }

  const next: any = {
    id: freshSlideId(),
    type,
    title,
    content,
    mediaPrompt: slide.mediaPrompt || `Professional illustration related to ${title}`,
  };
  if (Object.keys(data).length) next.data = data;
  if (slide.voiceOverText || slide.narration) next.voiceOverText = slide.voiceOverText || slide.narration;
  if (Number.isInteger(slide.enablingIndex)) next.enablingIndex = slide.enablingIndex;

  if (slideSkipsNarration(next)) return stripSlideNarration(next);
  if (!String(next.voiceOverText || '').trim()) {
    next.voiceOverText = `In this slide we cover ${title}.`;
  }
  return next;
}

/**
 * Generate only the new slides an author asked to insert. Does not rehydrate
 * the rest of the course.
 */
export async function generateInsertedContent(opts: {
  courseTitle: string;
  courseDescription?: string;
  moduleTitle?: string;
  existingSlideTitles?: string[];
  brief: string;
  titleHint?: string;
  newObjective?: string;
  scope: InsertedContentScope;
  slideCount?: number;
  autoSlideCount?: boolean;
  allowedInteractionTypes?: string[];
}): Promise<{ moduleTitle?: string; objective?: string; slides: any[] }> {
  const auto = !!opts.autoSlideCount && opts.scope !== 'slide';
  const minSlides = opts.scope === 'slide' ? 1 : opts.scope === 'module' ? 3 : 2;
  const maxSlides = opts.scope === 'slide' ? 1 : 8;
  const count = opts.scope === 'slide'
    ? 1
    : Math.min(maxSlides, Math.max(minSlides, opts.slideCount || (opts.scope === 'module' ? 4 : 3)));
  const allowed = (opts.allowedInteractionTypes || [])
    .filter(t => t && t !== 'hotspot' && t !== 'game-template' && t !== 'accordion');
  const typeList = allowed.length
    ? allowed.join(', ')
    : 'content, click-reveal, tabbed-horizontal, choice-cards, quiz';
  const existing = (opts.existingSlideTitles || []).filter(Boolean).slice(0, 24);
  const source = String(opts.brief || '').slice(0, 12000);
  const scopeLine = opts.scope === 'slide'
    ? 'exactly 1 slide'
    : auto
      ? `as many slides as the SOURCE needs (minimum ${minSlides}, maximum ${maxSlides}). One teaching idea per slide. Use an interaction when the source lists steps, options, comparisons, or checks. Do not drop source facts to hit a round number.`
      : opts.scope === 'slides'
        ? `exactly ${count} slides from this source`
        : `a new module with exactly ${count} teaching slides (optional 1 knowledge check only if the source is a check/quiz)`;
  const system = `You are an expert eLearning author inserting NEW slides into an existing course.
The author pasted SOURCE MATERIAL to teach — facts, procedures, specs, and terms. Transform that source into learner slides. Do not treat it as a topic prompt to invent around.
Return ONLY valid JSON. Do not rebuild or rewrite slides that already exist.`;
  const user = `Course title: ${opts.courseTitle}
${opts.courseDescription ? `Course description: ${opts.courseDescription.slice(0, 600)}\n` : ''}
Current module: ${opts.moduleTitle || 'Unknown'}
${existing.length ? `Existing slide titles in this module (do not duplicate):\n- ${existing.join('\n- ')}\n` : ''}
Scope: ${scopeLine}
${opts.titleHint ? `Preferred title: ${opts.titleHint}\n` : ''}
${opts.newObjective ? `New learning objective to teach: ${opts.newObjective}\n` : ''}

SOURCE TO TEACH (paste — use these facts; do not replace them with a paraphrase of the topic):
${source}

Allowed interaction types: ${typeList}

Return JSON:
{
  "moduleTitle": "short title if this is a new module, else omit",
  "objective": "one enabling-style sentence if a new module, else omit",
  "slides": [
    {
      "type": "one of the allowed types",
      "title": "short slide title, no numbering suffix",
      "content": "markdown short bullets (5-8 words) for on-screen text",
      "voiceOverText": "3-4 spoken sentences expanding the bullets from the source; empty string if this is a knowledge check",
      "mediaPrompt": "short image prompt",
      "data": {}
    }
  ]
}

Rules:
- ${auto ? `Return between ${minSlides} and ${maxSlides} slides in slides[].` : `Return exactly ${count} slides in slides[].`}
- Teaching slides need on-screen bullets AND voiceOverText, both grounded in the SOURCE.
- Knowledge checks have no narration (voiceOverText "").
- Do not include cover, module-overview, key-takeaways, or mastery-exam slides.
- Prefer content / click-reveal / tabbed-horizontal unless the source needs a check.
- For content slides you may use "bullets": ["..."] instead of content.
- Pure JSON only.`;

  const raw = await executeAnthropicAI('bulk', system, user, 8192);
  const parsed = parseJsonSafely(raw);
  const list = Array.isArray(parsed?.slides)
    ? parsed.slides
    : Array.isArray(parsed)
      ? parsed
      : parsed?.module?.slides;
  if (!Array.isArray(list) || !list.length) {
    throw new Error('The generator did not return any slides. Paste more of the source text and try again.');
  }
  const fallbackTitle = opts.titleHint || 'New slide';
  const cap = auto ? maxSlides : count;
  let slides = list.slice(0, cap).map((s: any, i: number) =>
    normalizeInsertedSlide(s, cap === 1 ? fallbackTitle : `${fallbackTitle} ${i + 1}`),
  );
  const wrapped = coerceInteractionTypes(
    [{ slides }],
    allowed.length ? allowed : ['content', 'click-reveal', 'tabbed-horizontal', 'choice-cards', 'quiz'],
  );
  slides = wrapped[0]?.slides || slides;
  slides = slides.map((s: any) => finalizeHydratedSlide(s, opts.moduleTitle || opts.courseTitle));
  return {
    moduleTitle: String(parsed?.moduleTitle || opts.titleHint || '').trim() || undefined,
    objective: String(parsed?.objective || opts.newObjective || '').trim() || undefined,
    slides,
  };
}
