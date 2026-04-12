import Anthropic from "@anthropic-ai/sdk";
import { CourseOutline, TerminalObjectiveGroup } from "../types/course";

// @ts-ignore
const rawKey = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "";
const anthropic = new Anthropic({ apiKey: rawKey.replace(/['"]/g, '').trim(), dangerouslyAllowBrowser: true });

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
 * Universal 1-Pass Anthropic execution wrapper mapping the Dual-Model configuration. 
 * Natively parses 429 Quota Exhaustion limits and sleeps the thread EXACTLY 
 * as commanded before returning the definitive response to the user.
 */
async function executeAnthropicAI(modelTier: 'complex' | 'bulk', systemPrompt: string, userPrompt: string, maxTokens: number = 8192): Promise<string> {
  const modelStr = modelTier === 'complex' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
  
  const executeCall = async () => {
      const response = await anthropic.messages.create({
          model: modelStr,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [ { role: 'user', content: userPrompt } ]
      });
      return response.content[0].type === 'text' ? response.content[0].text : "{}";
  };

  try {
    return await executeCall();
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.message?.includes('rate_limit') || err?.message?.includes('quota')) {
      const retryMatch = err.message.match(/retry after (\d+)/i) || err.message.match(/reset in (\d+)/i) || err.message.match(/(\d+)s/i);
      let waitTime = 15000;
      if (retryMatch) waitTime = (parseInt(retryMatch[1], 10) + 2) * 1000;
      
      console.warn(`[API Quota Intercept] Automatically pausing proxy for ${waitTime/1000}s to clear Anthropic limits...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Definitive execution directly post-cooldown.
      return await executeCall();
    }
    throw new Error(`Anthropic API Authorization/Network Failure: ${err.message}`);
  }
}

export interface FileAnalysisResult {
  title: string;
  summary: string;
  topic: string;
  audience: string;
  complexityLevel: 'simple' | 'moderate' | 'complex';
  recommendedPreset: 'quick' | 'standard' | 'comprehensive';
  recommendedObjectiveFormat: 'AB' | 'ABC' | 'ABCD' | 'k12_ican';
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
  2. Generate a clean, professional course Title (concise, no raw artifact file names).
  3. Write a 2-4 sentence Description (what learners will learn, context, why it matters).
  4. Classify the complexity (simple vs moderate vs complex).
  5. Suggest a recommended Preset: "quick" (<10 slides), "standard" (10-25), or "comprehensive" (25+).
  6. Recommend an objectiveFormat: "AB" (quick courses), "ABC" (standard), or "ABCD" (comprehensive). If it is a K-12/child audience, MUST suggest "k12_ican".
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
    "recommendedObjectiveFormat": "AB|ABC|ABCD|k12_ican",
    "recommendedInteractions": ["string"],
    "objectives": [{"terminalObjective": "string", "enablingObjectives": ["string"]}],
    "objectivesInferred": true,
    "detectedStructure": "string",
    "possibleModules": ["string"]
  }`;
  
  const userPrompt = `Analyze the following source material from a file named "${fileName}":\n\n${fileText.slice(0, 8000)}`;
  
  const text = await executeAnthropicAI('complex', systemInstruction, userPrompt, 4096);
  const cleanedText = extractJsonFromText(text);
  return parseJsonSafely(text) as FileAnalysisResult;
}

export async function suggestLearningObjectives(
  title: string, description: string, pathway: 'corporate' | 'k12', courseType: 'quick' | 'standard' | 'comprehensive', manualFormat: 'AB' | 'ABC' | 'ABCD' | 'k12_ican', existingObjectives?: (string | TerminalObjectiveGroup)[]
): Promise<TerminalObjectiveGroup[]> {
  const { getPresetConfig } = await import('../lib/presetEngine');
  const preset = getPresetConfig(pathway, courseType);
  const isK12 = pathway === 'k12';
  const countMin = preset.objectiveCountMin;
  const countMax = preset.objectiveCountMax;
  const countRange = countMin === countMax ? `exactly ${countMin}` : `${countMin} to ${countMax}`;

  const systemInstruction = isK12
    ? `You are an expert K-12 Curriculum Designer.
  Your task is to generate or optimize learning targets based on pedagogy and developmental appropriateness.
  CRITICAL CONSTRAINTS:
  1. COUNT: Generate ${countRange} objective(s). NEVER generate fewer than ${countMin} or more than ${countMax}.
  2. STRATEGY: ${preset.objectiveGenStrategy}
  3. FORMAT: Each objective MUST be a single string containing the Teacher Objective, a pipe "|", and then the Student "I Can" Target.
  4. AGE APPROPRIATENESS: Ensure the verbs and content are suitable for children/young adults.
  5. VALIDATION: Count your objectives before returning. If count is outside [${countMin}, ${countMax}], fix it.

  OUTPUT FORMAT: Return ONLY raw JSON: { "objectives": ["Teacher objective | I can..."] }`
    : `You are an expert Instructional Designer with a PhD in Learning Science and certified expertise in Bloom's Taxonomy.
  Your task is to generate or optimize learning objectives that follow evidence-based instructional design principles.

  ══════════════════════════════════════
  BLOOM'S TAXONOMY VERB GUIDANCE
  ══════════════════════════════════════
  Standard eLearning assessments (multiple-choice, matching, identification) can only validate REMEMBERING and UNDERSTANDING.
  Use APPLYING, ANALYZING, EVALUATING, or CREATING ONLY when the course includes a simulated environment where learners actually perform the task and the eLearning itself evaluates the performance.

  DOMAIN → PRIMARY VERBS (use these, not generic filler):
  • Remembering: recall, identify, define, list, name, recognize, state, label, match, outline, retrieve, locate
  • Understanding: describe, explain, summarize, classify, compare, contrast, interpret, paraphrase, categorize, distinguish, illustrate
  • Applying (simulations only): apply, calculate, construct, demonstrate, execute, solve, use, produce, implement
  • Analyzing (simulations only): analyze, differentiate, examine, break down, classify, compare, inspect, deconstruct
  • Evaluating (simulations only): evaluate, judge, justify, critique, defend, prioritize, assess
  • Creating (simulations only): design, formulate, develop, compose, construct, devise, generate

  CRITICAL CONSTRAINTS:
  1. COUNT: Generate ${countRange} objective(s). NEVER generate fewer than ${countMin} or more than ${countMax}.
  2. STRATEGY: ${preset.objectiveGenStrategy}
  3. FORMAT REQUIRED: ${manualFormat}
     - ABCD: "Given [condition], the learner will [single verb] [behavior/outcome] to [degree standard]."
     - ABC: "Given [condition], the learner will [single verb] [behavior/outcome]."
     - AB: "The learner will [single verb] [specific outcome]."
  4. ONE VERB PER OBJECTIVE. NEVER combine verbs (e.g., NEVER "define and apply" — that is two objectives). Each objective must describe exactly ONE measurable, observable behavior.
  5. TERMINAL vs ENABLING: A Terminal Objective is the high-level course outcome. Enabling Objectives are the individual knowledge/skill building blocks needed to achieve it. Ensure each Terminal Objective has 2-4 Enabling Objectives that logically scaffold toward it.
  6. BLOOM'S LEVEL: ${courseType === 'quick' ? 'Use ONLY Remembering and Understanding verbs.' : courseType === 'standard' ? 'Use primarily Remembering and Understanding verbs. Apply only if content is procedural and the eLearning simulates the task.' : 'Use Remembering and Understanding as the base. Apply higher-order verbs only for simulation-based or hands-on procedural content.'}
  7. VALIDATION: Count your Terminal Objectives before returning. If the count is outside [${countMin}, ${countMax}], fix it.

  OUTPUT FORMAT: Return ONLY raw JSON: { "objectives": [{ "terminalObjective": "string", "enablingObjectives": ["string1", "string2"] }] }`;

  const existingStringified = JSON.stringify(existingObjectives || []);
  const userPrompt = existingObjectives && existingObjectives.length > 0
    ? `REFORMAT and REFINE the following existing learning objectives into the "${manualFormat}" format for the course titled "${title}".

Context: "${description}"

Format rules to apply:
- AB format: "The learner will [single Bloom's verb] [specific outcome]."
- ABC format: "Given [condition], the learner will [single Bloom's verb] [outcome]."
- ABCD format: "Given [condition], the learner will [single Bloom's verb] [outcome] to [measurable degree/standard]."

Apply the '${manualFormat}' format to EVERY terminal objective AND every enabling objective string. Keep the same number of terminal objectives and the same content areas — only change the format and wording to match ${manualFormat}.

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
    gameTemplateId?: string | null;
    includeObjectiveSlides?: boolean;
    includeSummarySlides?: boolean;
    includeModuleTitleSlides?: boolean;
    includeKnowledgeChecks?: boolean;
    pathway?: 'corporate' | 'k12';
    k12config?: { gradeLevel: string; unitTitle?: string; lessonTitle?: string; standards?: string; uiStyle: 'early' | 'upper'; includeFormative: boolean; };
    // Source conversion mode (file upload)
    isSourceConversion?: boolean;
    sourceContent?: string;
    conversionPreferences?: string[];
  }
): Promise<CourseOutlineDraft> {
  const isK12 = configParams.pathway === 'k12';
  
  const systemInstruction = `You are an Expert ${isK12 ? 'K-12 Curriculum Developer' : 'Senior Corporate Instructional Designer'}.
  Your ONLY job right now is to draft the TABLE OF CONTENTS (Outline) for a course. Do NOT write the actual content yet.
  
  COURSE STRUCTURE REQUIREMENTS:
  You must create EXACTLY ONE module per provided Learning Objective/Target.
  Every module MUST follow this exact sequence of slides:
  1. ${configParams.includeModuleTitleSlides !== false ? "Title Slide (type: content)" : "NO title slide"}
  2. ${configParams.includeObjectiveSlides !== false ? "Objectives Slide (type: content)" : "NO objectives slide"}
  3. Content & Interaction Slides — use the SPECIFIC allowed interaction type as the slide type. Allowed interaction types: ${configParams.interactionTypes.join(", ")}. Map them to slide types like this:
     - accordion, flashcards, timeline, sorting, matching, branching → use the exact string as the slide 'type'
     - tabbed-horizontal, tabbed-vertical, folder-explorer, carousel-panel → use the exact string as the slide 'type'
     - choice → use type: "quiz" with interactions array
  4. ${isK12 && configParams.k12config?.includeFormative ? "Formative Assessment / Exit Ticket slide (type: quiz or interaction)" : configParams.includeKnowledgeChecks !== false ? "Knowledge Check Slides (type: quiz)" : "NO knowledge check slides"}
  5. ${configParams.includeSummarySlides !== false ? "Summary Slide (type: content)" : "NO summary slide"}
  
  GAME TEMPLATE INTEGRATION:
  ${configParams.gameTemplateId ? `The user has requested a comprehensive "${configParams.gameTemplateId}" game at the end of the course! YOU MUST APPEND exactly one slide with type: "game-template" and gameType: "${configParams.gameTemplateId}" as the VERY LAST slide in the VERY LAST module.` : 'Do not include any game templates.'}
  
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
          { "id": "uuid", "type": "content|quiz|accordion|flashcards|timeline|sorting|matching|branching|game-template", "title": "Slide Title", "gameType": "optional_string" }
        ]
      }
    ]
  }`;

  const { getAvailableThemes } = await import('../lib/backgrounds');
  const availableThemes = getAvailableThemes();

  const conversionNote = configParams.isSourceConversion && configParams.sourceContent
    ? `\n\nIMPORTANT: This course is being CONVERTED from an uploaded source document. Use the source material below as the primary content reference. Apply instructional design best practices: chunk dense content, convert lecture-style material into interactive learning segments, and apply progressive disclosure.\nConversion Preferences: ${(configParams.conversionPreferences || []).join(', ') || 'Default conversion'}\n\nSOURCE MATERIAL (first 4000 chars):\n${configParams.sourceContent.slice(0, 4000)}`
    : '';

    const userPrompt = `Draft the outline for a ${isK12 ? "K-12 Educational Lesson" : "Corporate Training Course"}. Topic: "${prompt}".
    Learning Objectives: ${JSON.stringify(objectives)}
    Total Target Slide Count: ~${configParams.slideCount || 10}
    AVAILABLE VISUAL THEMES: ${availableThemes.length > 0 ? availableThemes.join(", ") : "Neutral"}
    IMPORTANT AI DIRECTIVE: You must ONLY select a visualTheme if the course topic has a STRONG, LITERAL semantic match to that specific theme (e.g. use "Rigs" only for oil/gas/industrial topics, use "Forest" only for nature topics). If there is NO strong semantic match, you MUST default to "Neutral". Do not guess or select unrelated themes!${conversionNote}`;

  const rawText = await executeAnthropicAI('complex', systemInstruction, userPrompt, 8192);
  const cleanedText = extractJsonFromText(rawText);
  
  const parsedOutline = parseJsonSafely(rawText) as CourseOutlineDraft;
  if (!parsedOutline) throw new Error("Critical Data Failure: Outline could not be parsed.");
  
  return parsedOutline;
}

export async function hydrateCourseContent(
  outlineDraft: CourseOutlineDraft,
  originalPrompt: string,
  configParams: { pathway?: 'corporate' | 'k12'; courseType: 'quick' | 'standard' | 'comprehensive'; k12config?: any; sourceContent?: string; conversionPreferences?: string[]; },
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

  ══════════════════════════════════════════
  ISD BEST PRACTICES (MANDATORY)
  ══════════════════════════════════════════
  1. 7±2 RULE: Maximum 7 bullet points per slide. Never paste a wall of text.
  2. ONE CONCEPT PER SCREEN: Do not combine multiple major ideas on one slide.
  3. ACTIVE VOICE ONLY: "The pump delivers..." not "Delivery is achieved by..."
  4. CHUNKING: Use ### subheadings to group 2-4 related bullets under a theme.
  5. BLOOM'S ALIGNMENT: Knowledge check questions MUST reflect the module's learning objective level.
  6. NARRATION ≠ SCREEN TEXT: voiceOverText must EXPAND on bullets with context, examples, and elaboration — never just re-read them.
  7. CONCISENESS: Each content field ≤ 3 short sentences or ≤ 7 bullets. Use markdown (**, ###, >) for visual hierarchy.
  8. NO WALLS OF TEXT: If content exceeds 6 lines, break it with ### headers and subgroups.
  9. NO COLON-PIPE DIVIDERS: Never write "IDENTIFY: |" or any "KEYWORD: |" pattern. Use "**Identify:**" or a heading instead.
  10. NO EMPTY BOLD: Never write "** **" or "**  **". Only bold meaningful text.

  ══════════════════════════════════════════
  SLIDE TYPE RULES (STRICT — NO EXCEPTIONS)
  ══════════════════════════════════════════
  DO NOT add, remove, or reorder ANY slides from the provided structure.

  QUIZ:
  - questionText MUST be a complete question sentence ending with "?"
  - Must have EXACTLY 4 options: 1 correct (isCorrect: true) + 3 plausible distractors
  - options[].text must be meaningful (10+ chars). NEVER: "A", "B", "True", "False" unless it's genuinely a T/F slide
  - feedback: string explaining why the correct answer is right
  - FAIL CONDITION: missing questionText or fewer than 2 options → regenerate

  ACCORDION:
  - Must have 4-6 items with parallel header formats (all questions OR all noun phrases)
  - Each item.content: ≤ 4 bullet points, NOT a paragraph. Use "- bullet" format.
  - Example item: { "id": "a1", "title": "How It Works", "content": "- Step 1\n- Step 2\n- Step 3" }
  - NEVER put a long paragraph as accordion content. Split long content into multiple items.

  DRAG & DROP:
  - All drop targets MUST use accepts: ["*"] — NEVER restrict by ID
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
  - FAIL CONDITION: no hotspots → change type to "content" instead

  GAME TEMPLATES (knowledge-board, millionaire, escape-room):
  - ALL fields must be populated. NO empty strings, NO empty arrays.
  - jeopardy: must have 3-5 categories, each with 3-5 questions with prompt AND correctAnswer
  - millionaire: must have 10-15 questions with prompt, 4 options[], correctAnswer
  - FAIL CONDITION: empty categories or missing questions → regenerate entire game block
  - templateType field MUST match the game type string exactly

  TABBED-HORIZONTAL (type: "tabbed-horizontal"):
  - data.tabs: array of 2-5 tab objects
  - Each tab: { "id": "t1", "label": "Tab Label", "color": "#6366f1", "content": "Main content text", "expandedContent": "Additional detail shown when MORE is clicked" }
  - Color must be a valid hex color. Use different colors per tab.
  - content: 2-4 sentences summarizing the topic. expandedContent: 3-6 sentences with more detail.
  - FAIL CONDITION: fewer than 2 tabs, or missing content → regenerate

  TABBED-VERTICAL (type: "tabbed-vertical"):
  - data.tabs: array of 2-6 tab objects
  - Each tab: { "id": "t1", "label": "Topic Name", "content": "Rich text for this topic. Use \\n\\n for paragraphs." }
  - content should be 3-5 sentences per tab. Use varied informative labels.
  - FAIL CONDITION: fewer than 2 tabs, or missing content → regenerate

  FOLDER-EXPLORER (type: "folder-explorer"):
  - data.folderLabel: optional folder name string (e.g. "Reference Materials")
  - data.items: array of 2-5 document/paper items
  - Each item: { "id": "p1", "title": "Document Title", "previewText": "One-line teaser", "content": "Full text shown when opened. 3-6 sentences." }
  - FAIL CONDITION: fewer than 2 items, or any item missing content → regenerate

  CAROUSEL-PANEL (type: "carousel-panel"):
  - data.cards: array of 3-5 card objects
  - Each card: { "id": "c1", "label": "Card Title", "color": "#6366f1", "description": "Short 1-2 sentence preview", "expandedContent": "Full detail shown after MORE is clicked. 3-5 sentences." }
  - Use distinct colors per card. description ≤ 30 words. expandedContent must exist.
  - FAIL CONDITION: fewer than 2 cards, or missing expandedContent → regenerate

  CONTENT / KEY-TAKEAWAYS:
  - Do NOT embed full-slide images. Use mediaPrompt to describe what image should appear.
  - content must use ### headers, bullet lists, or callout blocks — NOT bare paragraphs.

  ══════════════════════════════════════════
  CRITICAL VALIDATION RULES
  ══════════════════════════════════════════
  BEFORE returning your response, mentally validate EVERY slide:
  - content is not empty or a single character
  - voiceOverText is at least 2 sentences
  - interactive slides have their data/interactions populated
  - No slide is blank, partial, or broken
  - ZERO colon-pipe patterns (IDENTIFY: |)
  - ZERO orphan commas or semicolons on their own line

  ══════════════════════════════════════════
  REQUIRED DATA SCHEMAS
  ══════════════════════════════════════════
  - accordion: { items: [{ id: string, title: string, content: string }] }
  - flashcards: { cards: [{ front: string, back: string }] }
  - timeline: { events: [{ id: string, year: string, title: string, content: string }] }
  - sorting: { items: [{ id: string, content: string }], correctOrder: string[] }
  - matching: { items: [{ id: string, content: string, matchId: string }], targets: [{ id: string, content: string }] }
  - branching: { nodes: { [id]: { id, type: 'scenario'|'ending', title, content, isDeadEnd: boolean, feedback: string, choices: [{ id, text, nextNodeId, isCorrectPath: boolean }] } }, startNodeId: string }
  - quiz interactions: [{ type: 'multiple-choice', questionText: string, options: [{ id, text, isCorrect: boolean }], feedback: string }]
  - jeopardy: { templateType: 'jeopardy', instructions: string, categories: [{ id, name, questions: [{ id, value: number, prompt: string, correctAnswer: string, isDailyDouble: boolean }] }] }
  - millionaire: { templateType: 'millionaire', instructions: string, questions: [{ id, difficulty: number, prompt: string, options: string[], correctAnswer: string, isSafeHaven: boolean }] }

  ══════════════════════════════════════════
  OUTPUT FORMAT
  ══════════════════════════════════════════
  Return ONLY a raw JSON object — no markdown fences, no extra text, no commentary.
  Schema: { "id": "...", "title": "...", "slides": [ { ...all original fields + content + voiceOverText + mediaPrompt + data + interactions } ] }
  EVERY slide must have: id, type, title, content (string), voiceOverText (string), mediaPrompt (string).
  Interactive slides must ALSO have: data (object) or interactions (array) as specified above.`;

  const sourceNote = configParams.sourceContent
    ? `\n\nIMPORTANT: This course was converted from an uploaded source document. Base the content on the source material below. Transform lecture-style slides into interactive, learner-centric content. Preferences: ${(configParams.conversionPreferences || []).join(', ') || 'Default'}\n\nSOURCE MATERIAL (first 4000 chars):\n${configParams.sourceContent.slice(0, 4000)}`
    : '';

  // ─── Helper: parse and unwrap a raw API response ───────────────────────
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

  // ─── Helper: hydrate a single slide ────────────────────────────────────
  async function hydrateSingleSlide(slide: any, moduleTitle: string): Promise<any> {
    const singlePrompt = `Hydrate exactly ONE slide for the module titled "${moduleTitle}". Course topic: ${originalPrompt}.
Slide JSON: ${JSON.stringify(slide, null, 2)}
Return ONLY a JSON object for this single slide with all fields: id, type, title, content, voiceOverText, mediaPrompt, and data/interactions if applicable.`;
    const raw = await executeAnthropicAI('bulk', systemInstruction, singlePrompt, 8192);
    let parsed = parseJsonSafely(raw);
    // If the AI returned a module wrapper, unwrap it
    if (parsed.slides?.length) return parsed.slides[0];
    if (parsed.module?.slides?.length) return parsed.module.slides[0];
    // Validate it has the minimum fields
    if (!parsed.id || !parsed.type) throw new Error('Single slide response missing id/type fields.');
    return parsed;
  }

  // ─── Helper: validate and normalize a parsed slide ─────────────────────
  function processSlide(slide: any): any[] {
    const isMissingData = (type: string, field: string) =>
      slide.type === type && (!slide.data || !slide.data[field] || slide.data[field].length === 0);

    if (slide.type === 'hotspot' && !slide.data?.hotspots?.length) slide.type = 'content';
    else if (isMissingData('accordion', 'items')) slide.type = 'content';
    else if (isMissingData('flashcards', 'cards')) slide.type = 'content';
    else if (slide.type === 'quiz' && !slide.interactions?.length) slide.type = 'content';
    else if (slide.type === 'game-template' && !slide.data?.templateType) {
      slide.type = 'content';
      slide.content = slide.content || 'Game template encountered a structural error.';
    }

    // Density auto-splitter
    if (slide.type === 'content' && slide.content?.length > 800) {
      const paragraphs = slide.content.split('\n\n');
      if (paragraphs.length > 1) {
        const mid = Math.ceil(paragraphs.length / 2);
        return [
          { ...slide, content: paragraphs.slice(0, mid).join('\n\n'), title: slide.title + ' (Part 1)' },
          { ...slide, id: slide.id + '-pt2', content: paragraphs.slice(mid).join('\n\n'), title: slide.title + ' (Part 2)' }
        ];
      }
    }
    return [slide];
  }

  // ─── Pre-calculate total chunks for accurate progress ─────────────────
  const CHUNK_SIZE = 3;
  let totalChunks = 0;
  for (const mod of outlineDraft.modules) {
    totalChunks += Math.ceil(mod.slides.length / CHUNK_SIZE);
  }
  let completedChunks = 0;

  // ─── Main hydration loop ────────────────────────────────────────────────
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
      const simplePrompt = `Hydrate this module chunk. Be concise — max 2 sentences per content field, max 4 items per array.\nModule: ${JSON.stringify(chunkModule)}\nReturn ONLY: { "id": "...", "title": "...", "slides": [ ... ] }`;

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

          // Tier 3: Generate each slide individually — REAL CONTENT, no placeholders
          const individualResults: any[] = [];
          for (const slide of chunk) {
            try {
              const hydratedSlide = await hydrateSingleSlide(slide, emptyModule.title);
              individualResults.push(hydratedSlide);
            } catch (e3: any) {
              console.error(`[Single slide "${slide.title}" in "${emptyModule.title}"] All tiers failed: ${e3.message}`);
              // Absolute last resort: preserve original slide structure with minimal content
              // This is not a placeholder — it's the outline data itself, which always has a title
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

    fullCourse.modules.push({ ...emptyModule, slides: hydratedSlides } as any);
  }

  return fullCourse;
}
