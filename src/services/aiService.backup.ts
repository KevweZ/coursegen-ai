import Anthropic from "@anthropic-ai/sdk";
import { CourseOutline } from "../types/course";

// @ts-ignore
const rawKey = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "";
const anthropic = new Anthropic({ apiKey: rawKey.replace(/['"]/g, '').trim(), dangerouslyAllowBrowser: true });

export interface CourseOutlineDraft {
  title: string;
  description: string;
  learningObjectives: string[];
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
  objectives: string[];
  objectivesInferred: boolean;
  detectedStructure: string;
  possibleModules: string[];
  slideCount?: number;
}

export async function analyzeUploadedFile(
  fileText: string,
  fileName: string
): Promise<FileAnalysisResult> {
  const systemInstruction = `You are an expert Instructional Designer analyzing uploaded source material.
  Your job is to extract structured information from the provided raw text so an eLearning course can be built from it.
  
  TASKS:
  1. Infer a professional course title from the document (use cover slide, headings, or recurring themes).
  2. Write a concise 2-3 sentence course description/summary based on the core subject matter.
  3. Identify the main topic, likely intended audience, and complexity level.
  4. Look for explicit learning objectives (e.g. "By the end...", "Objectives:", "Learning Outcomes:", "Students will..."). Extract them verbatim if found.
  5. If NO explicit objectives exist, DERIVE 3–5 likely objectives from the content structure.
  6. Detect the document's structure (e.g., lecture-based, procedural, chapter-based).
  7. List 2–5 likely module or topic groupings based on the content.
  8. Recommend a course preset: "quick" (short deck, < 10 slides), "standard" (medium, 10–25), or "comprehensive" (dense/long, 25+).
  
  OUTPUT FORMAT: Return ONLY raw JSON:
  {
    "title": "string",
    "summary": "string",
    "topic": "string",
    "audience": "string",
    "complexityLevel": "simple|moderate|complex",
    "recommendedPreset": "quick|standard|comprehensive",
    "objectives": ["string"],
    "objectivesInferred": boolean,
    "detectedStructure": "string",
    "possibleModules": ["string"]
  }`;
  
  const userPrompt = `Analyze the following source material from a file named "${fileName}":\n\n${fileText.slice(0, 8000)}`;
  
  const text = await executeAnthropicAI('complex', systemInstruction, userPrompt, 4096);
  const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleanedText || '{}') as FileAnalysisResult;
}

export async function suggestLearningObjectives(
  title: string, description: string, pathway: 'corporate' | 'k12', courseType: 'quick' | 'standard' | 'comprehensive', manualFormat: 'AB' | 'ABC' | 'ABCD' | 'k12_ican', existingObjectives?: string[]
): Promise<string[]> {
  const { getPresetConfig } = await import('../lib/presetEngine');
  const preset = getPresetConfig(pathway, courseType);
  const isK12 = pathway === 'k12';
  
  const systemInstruction = isK12 
    ? `You are an expert K-12 Curriculum Designer. 
  Your task is to generate or optimize learning targets based on Pedagogy and developmental appropriateness.
  CRITICAL CONSTRAINTS:
  1. FORMAT: Each objective MUST be formatted as a single string containing the Teacher Objective, a pipe "|", and then the Student Target.
  2. PRESET TARGET: ${preset.objectiveGenStrategy}
  3. AGE APPROPRIATENESS: Ensure the verbs and content are suitable for children/young adults.
  
  OUTPUT FORMAT: You must return ONLY raw JSON matching this schema: { "objectives": ["string1", "string2"] }` 
    : `You are an expert Instructional Designer. 
  Your task is to generate or optimize learning objectives based on Bloom's Taxonomy.
  CRITICAL CONSTRAINTS:
  1. PRESET TARGET: ${preset.objectiveGenStrategy} 
  2. FORMAT: You MUST strictly format the objectives as ${manualFormat}.
  3. BLOOM'S TAXONOMY: Use precise action verbs from Bloom's Taxonomy.
  
  OUTPUT FORMAT: You must return ONLY raw JSON matching this schema: { "objectives": ["string1", "string2"] }`;

  const userPrompt = existingObjectives && existingObjectives.length > 0
    ? `Optimize these existing objectives to strictly match the PRESET TARGET for the course titled "${title}" with context: "${description}". Existing: ${existingObjectives.join("; ")}`
    : `Suggest new learning objectives strictly adhering to the PRESET TARGET for the course titled "${title}" with context: "${description}".`;

  const text = await executeAnthropicAI('complex', systemInstruction, userPrompt);
  const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  const parsedData = JSON.parse(cleanedText || '{"objectives": []}');
  
  if (parsedData.objectives && Array.isArray(parsedData.objectives)) {
    return parsedData.objectives;
  }
  return [];
}

export async function generateCourseOutline(
  prompt: string, 
  objectives: string[],
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
     - accordion, flashcards, timeline, sorting, matching, drag-drop-activity, branching → use the exact string as the slide 'type'
     - choice or drag-drop → use type: "quiz" with interactions array
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
          { "id": "uuid", "type": "content|quiz|accordion|flashcards|timeline|sorting|matching|drag-drop-activity|branching|game-template", "title": "Slide Title", "gameType": "optional_string" }
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
    Learning Objectives: ${objectives.join(" ; ")}
    Total Target Slide Count: ~${configParams.slideCount || 10}
    AVAILABLE VISUAL THEMES: ${availableThemes.length > 0 ? availableThemes.join(", ") : "Neutral"}
    IMPORTANT AI DIRECTIVE: You must ONLY select a visualTheme if the course topic has a STRONG, LITERAL semantic match to that specific theme (e.g. use "Rigs" only for oil/gas/industrial topics, use "Forest" only for nature topics). If there is NO strong semantic match, you MUST default to "Neutral". Do not guess or select unrelated themes!${conversionNote}`;

  const rawText = await executeAnthropicAI('complex', systemInstruction, userPrompt, 8192);
  const cleanedText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  
  const parsedOutline = JSON.parse(cleanedText) as CourseOutlineDraft;
  if (!parsedOutline) throw new Error("Critical Data Failure: Outline could not be parsed.");
  
  return parsedOutline;
}

export async function hydrateCourseContent(
  outlineDraft: CourseOutlineDraft,
  originalPrompt: string,
  configParams: { pathway?: 'corporate' | 'k12'; courseType: 'quick' | 'standard' | 'comprehensive'; k12config?: any; sourceContent?: string; conversionPreferences?: string[]; }
): Promise<CourseOutline> {
  const fullCourse: CourseOutline = {
    title: outlineDraft.title,
    description: outlineDraft.description,
    visualTheme: outlineDraft.visualTheme,
    learningObjectives: outlineDraft.learningObjectives,
    modules: []
  };

  const systemInstruction = `You are a master content generator. 
  You are given a STRICT single module outline from a larger course.
  YOUR JOB IS TO HYDRATE THIS EXACT MODULE STRUCTURE with detailed text, quiz questions, interactive component data, and game payloads where requested.
  
  RULES:
  1. DO NOT add, remove, or reorder ANY slides. Return the exact same IDs, types, and sequence of slides that are provided.
  2. For 'content' slides, provide rich, engaging Markdown content and spoken voiceOverText.
     - Break long paragraphs into digestible blocks of text.
     - Use subheadings (###) to create hierarchy.
     - Use markdown blockquotes (\`>\`) for callout boxes or important notes.
     - Use bulleted lists heavily for readability.
     - Do NOT output a single wall of text!
  3. If 'imagePlaceholder: true', provide a descriptive 'mediaPrompt'.
  4. QUIZ & KNOWLEDGE CHECKS:
     - Questions MUST strictly test factual material, definitions, and specific concepts taught in the EXACT preceding slides.
     - NEVER write "meta" questions about the course design (e.g., NEVER write "True or False: A knowledge check is critical...").
     - NEVER reference the fact that the learner is taking a quiz.
     - Ensure answers are unambiguous and distractors are plausible but clearly incorrect.
  5. INTERACTION PAYLOADS (Formulate 'data' exactly as needed):
     - ACCORDIONS: NEVER output large paragraph dumps! You MUST chunk dense content into short bullet points, bolded labels, and grouped ideas. If a topic is large, split it into multiple accordion items (e.g., "How it Works", "Characteristics", "Applications").
     - OTHER SCENARIOS: (flashcards, timeline, sorting, matching, drag-drop, branching) formulate exactly.
  6. For 'game-template' slides, supply the native gamePayload schema inside 'data' tailored to the course topic!
  
  DATA FIELD STRUCTURES FOR INTERACTION 'data':
  - accordion: { items: [{ id, title, content }] }
  - flashcards: { cards: [{ front, back }] }
  - timeline: { events: [{ id, year, title, content }] }
  - sorting: { items: [{ id, content }], correctOrder: [id1, id2, ...] }
  - matching: { items: [{ id, content, matchId }], targets: [{ id, content }] }
  - drag-drop-activity: { items: [{ id, content }], targets: [{ id, label, accepts: [id1, ...] }] }
  - branching: { nodes: { nodeId: { id, type: 'scenario'|'ending', title, content, isDeadEnd: boolean, feedback: string, choices: [{ id, text, nextNodeId, isCorrectPath: boolean }] } }, startNodeId }
  
  DATA FIELD STRUCTURE FOR GAMES:
  - jeopardy: { templateType: 'jeopardy', instructions: string, categories: [{ id, name, questions: [{ id, value: number, prompt, correctAnswer, isDailyDouble: boolean }]}] }
  - millionaire: { templateType: 'millionaire', instructions: string, questions: [{ id, difficulty: number, prompt, options: string[], correctAnswer: string, isSafeHaven: boolean }] }

  CRITICAL CONCISENESS LIMITS (PREVENT JSON TRUNCATION):
  1. Keep ALL 'content' text under 3 sentences per slide to prevent output buffer limits.
  2. For Games: Jeopardy STRICT MAXIMUM of 3 categories with ONLY 3 questions each. Millionaire STRICT MAXIMUM of 5 questions total.
  
  OUTPUT FORMAT: You must return ONLY raw JSON representing the EXACT schema of the provided module but with the 'content', 'voiceOverText', 'mediaPrompt', 'data', and 'interactions' fields populated fully!`;

  const sourceNote = configParams.sourceContent
    ? `\n\nIMPORTANT: This course was converted from an uploaded source document. Base the content on the source material below. Transform lecture-style slides into interactive, learner-centric content. Preferences: ${(configParams.conversionPreferences || []).join(', ') || 'Default'}\n\nSOURCE MATERIAL (first 4000 chars):\n${configParams.sourceContent.slice(0, 4000)}`
    : '';

  for (const emptyModule of outlineDraft.modules) {
    // CRITICAL: Chunk slides to prevent 8192 Max_Token JSON truncation
    const slideChunks = [];
    const CHUNK_SIZE = 5;
    for (let i = 0; i < emptyModule.slides.length; i += CHUNK_SIZE) {
      slideChunks.push(emptyModule.slides.slice(i, i + CHUNK_SIZE));
    }

    const hydratedSlides: any[] = [];
    
    for (let i = 0; i < slideChunks.length; i++) {
      const chunk = slideChunks[i];
      const chunkModule = { ...emptyModule, slides: chunk };
      
      const userPrompt = `Hydrate this specific Module Chunk (${i+1} of ${slideChunks.length}).\nCourse Topic: ${originalPrompt}${sourceNote}\n\nModule Draft JSON:\n${JSON.stringify(chunkModule, null, 2)}\n\nReturn ONLY a single hydrated module JSON object (with id, title, and slides fields populated) for exactly this module chunk. Do NOT wrap it in an array.`;

      const rawText = await executeAnthropicAI('bulk', systemInstruction, userPrompt, 8192);
      const cleanedText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      
      let parsedChunk;
      try {
        parsedChunk = JSON.parse(cleanedText);
        // Defensive unwrap: if AI returned an array, take the first element
        if (Array.isArray(parsedChunk)) parsedChunk = parsedChunk[0];
        if (!parsedChunk || !parsedChunk.slides) throw new Error("Missing 'slides' root array.");
        
        // Auto-split dense content slides (e.g., Key Takeaways)
        const finalSlides: any[] = [];
        for (const slide of parsedChunk.slides) {
            if (slide.type === 'content' && slide.content && slide.content.length > 800) {
                const paragraphs = slide.content.split('\n\n');
                if (paragraphs.length > 1) {
                    const mid = Math.ceil(paragraphs.length / 2);
                    const part1 = paragraphs.slice(0, mid).join('\n\n');
                    const part2 = paragraphs.slice(mid).join('\n\n');
                    
                    finalSlides.push({ ...slide, content: part1, title: slide.title + ' (Part 1)' });
                    finalSlides.push({ ...slide, id: slide.id + '-pt2', content: part2, title: slide.title + ' (Part 2)' });
                    continue;
                }
            }
            finalSlides.push(slide);
        }
        hydratedSlides.push(...finalSlides);
      } catch (e: any) {
        console.error(`Chunk parsing error: ${e.message}\nRaw Text Sample: ${cleanedText.substring(0, 100)}...${cleanedText.slice(-100)}`);
        throw new Error(`Failed to safely parse AI generated content structure for ${emptyModule.title}. Please try regenerating.`);
      }
    }
    
    fullCourse.modules.push({ ...emptyModule, slides: hydratedSlides } as any);
  }

  return fullCourse;
}
