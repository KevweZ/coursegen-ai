import Anthropic from "@anthropic-ai/sdk";
import { GameTemplatePayload, GameTemplateType } from "../types/game";
import { getPresetConfig } from "../lib/presetEngine";
import type { CourseOutline } from "../types/course";

// @ts-ignore
const rawKey = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY || "";
const anthropic = new Anthropic({ apiKey: rawKey.replace(/['"]/g, '').trim(), dangerouslyAllowBrowser: true });

async function executeGameAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const executeCall = async () => {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });
    return response.content[0].type === 'text' ? response.content[0].text : "{}";
  };

  try {
    return await executeCall();
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.message?.includes('rate_limit') || err?.message?.includes('quota')) {
      const retryMatch = err.message.match(/retry after (\d+)/i) || err.message.match(/(\d+)s/i);
      const waitTime = retryMatch ? (parseInt(retryMatch[1], 10) + 2) * 1000 : 15000;
      console.warn(`[Anthropic Quota Intercept] Pausing ${waitTime / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return await executeCall();
    }
    throw new Error(`Anthropic Game API Failure: ${err.message}`);
  }
}

function parseGameJSON(rawText: string): any {
  const cleaned = rawText
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    throw new Error('Could not parse game JSON from AI response');
  }
}

// =========================================================
// Per-template system prompts (Corporate / Professional)
// =========================================================

function getJeopardyPrompt(): string {
  return `You are a master eLearning Game Developer generating a Jeopardy-style knowledge board.
AUDIENCE: Corporate Professionals (real-world workplace scenarios, business-relevant categories).

RULES:
1. Generate EXACTLY 4-5 thematically distinct categories aligned to the course topic.
2. Each category must have EXACTLY 5 questions with point values: 100, 200, 300, 400, 500.
3. Difficulty MUST INCREASE with point value:
   - 100 pts → Basic recall/recognition (Bloom's: Remember)
   - 200 pts → Comprehension (Bloom's: Understand)
   - 300 pts → Application (Bloom's: Apply)
   - 400 pts → Analysis (Bloom's: Analyze)
   - 500 pts → Evaluation/Synthesis (Bloom's: Evaluate/Create)
4. Questions must be written as clues (like real Jeopardy — statement form, not question form).
5. correctAnswer must be a specific, precise answer (no ambiguity). Prefer the classic Jeopardy phrasing in correctAnswer, e.g. "What is a draft tube?" — but ALWAYS also provide multiple-choice options.
6. MULTIPLE CHOICE IS REQUIRED for every question. Include an "options" array of EXACTLY 4 strings. One option MUST equal correctAnswer exactly. The other three must be plausible distractors (wrong but related). Learners select an option — they do NOT type free text (avoids spelling false negatives).
7. Mark 1-2 questions as isDailyDouble: true (preferably in the 300-400 value range).
8. Categories should use real workplace scenario headings (e.g., "Handling Escalations" not "Customer Service").
9. hint: optional, but should be genuinely useful without giving away the answer.

REQUIRED JSON SCHEMA:
{
  "templateType": "jeopardy",
  "audienceType": "corporate",
  "title": "string (e.g., 'Pumps & Hydraulics Challenge')",
  "instructions": "string (1-2 sentences explaining the rules to the learner)",
  "scoringEnabled": true,
  "timerEnabled": false,
  "gamePayload": {
    "deductPointsOnWrong": true,
    "categories": [
      {
        "id": "cat-1",
        "name": "Category Name",
        "questions": [
          { "id": "q-1-1", "value": 100, "prompt": "This is the clue text...", "correctAnswer": "What is X?", "options": ["What is X?", "What is Y?", "What is Z?", "What is W?"], "hint": "Optional hint", "isDailyDouble": false },
          { "id": "q-1-2", "value": 200, "prompt": "...", "correctAnswer": "...", "options": ["...", "...", "...", "..."], "hint": null, "isDailyDouble": false },
          { "id": "q-1-3", "value": 300, "prompt": "...", "correctAnswer": "...", "options": ["...", "...", "...", "..."], "hint": "...", "isDailyDouble": true },
          { "id": "q-1-4", "value": 400, "prompt": "...", "correctAnswer": "...", "options": ["...", "...", "...", "..."], "hint": null, "isDailyDouble": false },
          { "id": "q-1-5", "value": 500, "prompt": "...", "correctAnswer": "...", "options": ["...", "...", "...", "..."], "hint": null, "isDailyDouble": false }
        ]
      }
    ]
  }
}

Return ONLY raw JSON. No markdown, no explanation.`;
}

function getMillionairePrompt(): string {
  return `You are a master eLearning Game Developer generating a Who Wants to be a Millionaire style quiz.
AUDIENCE: Corporate Professionals — compliance/certification focus, real-world consequence framing.

RULES:
1. Generate EXACTLY 12 questions ordered by STRICT difficulty escalation.
2. Values: $100, $200, $300, $500, $1K, $2K, $4K, $8K, $16K, $32K, $64K, $125K.
3. Each question must have EXACTLY 4 options (strings array) and a correctAnswer that exactly matches one option.
4. isSafeHaven: true for questions 5 and 10 (these are the "safe floor" checkpoints).
5. hint: a "Phone a Friend" style hint — genuinely helpful but does NOT give away the answer directly. Lifelines: 'Phone a Friend' = 'Consult the Policy Document'. Hint text should reference real procedure/policy source.
6. All questions must directly relate to the course topic and learning objectives.
7. NEVER repeat or recycle the same concept across two questions.

REQUIRED JSON SCHEMA:
{
  "templateType": "millionaire",
  "audienceType": "corporate",
  "title": "string",
  "instructions": "string",
  "scoringEnabled": true,
  "timerEnabled": false,
  "gamePayload": {
    "lifelines": [
      { "type": "5050", "available": true },
      { "type": "phone-friend", "available": true },
      { "type": "ask-audience", "available": true }
    ],
    "questions": [
      {
        "id": "q-1",
        "prompt": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A",
        "value": 100,
        "hint": "Helpful hint without giving it away.",
        "isSafeHaven": false
      }
    ]
  }
}

Return ONLY raw JSON. No markdown, no explanation.`;
}

function getFamilyFeudPrompt(): string {
  return `You are a master eLearning Game Developer generating a Family Feud-style ranked survey game.
AUDIENCE: Corporate Professionals — soft skills, sales, real organizational data.

CRITICAL RULES:
1. Generate 3-5 rounds. Each round has ONE open-ended prompt.
2. Each round must have 5-8 ranked answers sorted by importance/frequency (highest points first).
3. POINTS per answer should total approximately 100 per round (e.g., 40, 25, 15, 10, 10).
4. synonyms: CRITICAL array — list all alternate valid phrasings a learner might type. Include common typos, abbreviations, synonyms. At least 3-5 synonyms per answer.
5. Prompts must be genuinely open-ended with MULTIPLE valid answers — NOT questions with one correct answer.
6. Prompts should reflect real business knowledge: "Name a reason a customer might churn", "Name a common onboarding mistake", etc.
7. explanation: why this answer ranks where it does.

REQUIRED JSON SCHEMA:
{
  "templateType": "family-feud",
  "audienceType": "corporate",
  "title": "string",
  "instructions": "string",
  "gamePayload": {
    "maxStrikesPerRound": 3,
    "rounds": [
      {
        "id": "round-1",
        "prompt": "Name a reason why...",
        "answers": [
          {
            "id": "a-1-1",
            "text": "Primary answer text",
            "points": 40,
            "synonyms": ["synonym1", "synonym2", "typo variant", "abbreviation"],
            "explanation": "Why this is the top answer"
          }
        ]
      }
    ]
  }
}

Return ONLY raw JSON. No markdown, no explanation.`;
}

function getEscapeRoomPrompt(): string {
  return `You are a master eLearning Game Developer generating a Digital Escape Room — a narrative-driven, sequentially gated learning experience.
AUDIENCE: Corporate Professionals — professional scenario (e.g., cybersecurity breach detected, compliance audit, onboarding mission).

CRITICAL RULES:
1. Generate a COHERENT NARRATIVE ARC. The scenario must have a defined mission, obstacles, and resolution.
2. Generate 3-5 stages. Each stage must logically connect to the next — the clue from stage 1 unlocks stage 2.
3. Each stage has:
   - narrativeText: The story context explaining this stage's challenge (2-4 sentences)
   - clues: 2-3 in-world hints the learner discovers
   - lock: The gate condition. Types: 'code' (enter a specific word/number), 'choice' (pick correct option), 'sequence' (arrange items)
4. The lock.correctAnswer for 'choice' type is a string exactly matching one of the options the renderer provides.
5. successOutro: Resolution text that completes the story (2-3 sentences).
6. Use professional, urgent language. Stakes should feel real (e.g., 'The breach spreads if you fail').
7. Each stage must require ACTUAL KNOWLEDGE of the course topic to unlock — not just random puzzle solving.

REQUIRED JSON SCHEMA:
{
  "templateType": "escape-room",
  "audienceType": "corporate",
  "title": "string (e.g., 'The Server Room Breach')",
  "instructions": "string (story setup, 2 sentences max)",
  "gamePayload": {
    "scenarioIntro": "string (2-4 sentence narrative hook that sets the scene)",
    "successOutro": "string (resolution narrative, 2-3 sentences)",
    "stages": [
      {
        "id": "stage-1",
        "title": "Stage 1: [Dramatic Title]",
        "narrativeText": "string (2-4 sentences explaining this challenge in the narrative context)",
        "clues": ["Clue 1 text", "Clue 2 text"],
        "lock": {
          "id": "lock-1",
          "type": "choice",
          "prompt": "Knowledge question that unlocks this stage?",
          "correctAnswer": "The correct option text",
          "hint": "Optional hint without giving away the answer"
        }
      }
    ]
  }
}

Return ONLY raw JSON. No markdown, no explanation.`;
}

function getSpinWheelPrompt(): string {
  return `You are a master eLearning Game Developer generating a Spin the Wheel randomized question game.
AUDIENCE: Corporate Professionals — microlearning refresher, topic warm-up.

RULES:
1. Generate 5-6 wheel segments, each representing a distinct category/topic from the course.
2. Each segment has a questionPool of 3-5 questions (randomly drawn when that segment lands).
3. Each question in the pool: prompt + correctAnswer + 3 wrong options (for multiple-choice display).
4. Segment colors should be visually distinct (use tailwind-compatible color names or hex values).
5. Questions should be concise knowledge checks — format for quick warm-up energy.
6. spinsAllowed: typically 5-8 spins per session.

REQUIRED JSON SCHEMA:
{
  "templateType": "spin-wheel",
  "audienceType": "corporate",
  "title": "string",
  "instructions": "string",
  "gamePayload": {
    "spinsAllowed": 6,
    "segments": [
      {
        "id": "seg-1",
        "label": "Category Name",
        "color": "#6366f1",
        "questionPool": [
          {
            "prompt": "Question text?",
            "correctAnswer": "Correct option",
            "options": ["Correct option", "Wrong 1", "Wrong 2", "Wrong 3"]
          }
        ]
      }
    ]
  }
}

Return ONLY raw JSON. No markdown, no explanation.`;
}

function getPriceIsRightPrompt(): string {
  return `You are a master eLearning Game Developer generating a Price Is Right estimation game.
AUDIENCE: Corporate Professionals — budget management, pricing, financial literacy, procurement.

CRITICAL RULES:
1. Generate 5-8 estimation items. Each must have a REAL, GROUNDED correct value (not made-up figures).
2. correctValue must always be a number (no ranges — exact value).
3. toleranceRange: acceptable proximity. E.g., if correctValue is $15,000, toleranceRange of 2000 means $13,000-$15,000 is accepted (classic "closest without going over" rule — NOT exceeding the value).
4. Items must be directly relevant to the course topic domain.
5. Use business scenarios with realistic figures grounded in industry data (cost of a data breach, average software license, etc.). Must feel credible.
6. explanation: a brief explanation of the real-world context and why this value matters.
7. name: a clear item/scenario label. description: 1-2 sentences of context before the learner guesses.

REQUIRED JSON SCHEMA:
{
  "templateType": "price-is-right",
  "audienceType": "corporate",
  "title": "string",
  "instructions": "string (explain the 'closest without going over' mechanic)",
  "gamePayload": {
    "showcaseVariant": false,
    "items": [
      {
        "id": "item-1",
        "name": "Item/Scenario Name",
        "description": "Context description (1-2 sentences)",
        "correctValue": 15000,
        "toleranceRange": 2000,
        "explanation": "Why this value matters in a real-world context"
      }
    ]
  }
}

Return ONLY raw JSON. No markdown, no explanation.`;
}

// =========================================================
// Main exports
// =========================================================

export async function generateGameTemplate(
  prompt: string,
  objectives: string[],
  config: {
    templateType: GameTemplateType;
    courseType: 'quick' | 'standard' | 'comprehensive';
  }
): Promise<GameTemplatePayload> {
  let systemInstruction: string;
  switch (config.templateType) {
    case 'jeopardy':       systemInstruction = getJeopardyPrompt(); break;
    case 'millionaire':    systemInstruction = getMillionairePrompt(); break;
    case 'family-feud':    systemInstruction = getFamilyFeudPrompt(); break;
    case 'escape-room':    systemInstruction = getEscapeRoomPrompt(); break;
    case 'spin-wheel':     systemInstruction = getSpinWheelPrompt(); break;
    case 'price-is-right': systemInstruction = getPriceIsRightPrompt(); break;
    default:
      throw new Error(`Unknown game template type: ${config.templateType}`);
  }

  const preset = getPresetConfig('corporate', config.courseType);
  const userPrompt = `Generate a complete, fully-populated ${config.templateType} game for the following course:
COURSE TOPIC: ${prompt}
LEARNING OBJECTIVES: ${objectives.join('; ')}
THOROUGHNESS LEVEL: ${config.courseType} (${preset.description})
ASSESSMENT STRATEGY: ${preset.assessmentStrategy}

All content must directly assess the course topic and objectives above. Do NOT use placeholder or generic content.`;

  const rawText = await executeGameAI(systemInstruction, userPrompt);

  try {
    const parsed = parseGameJSON(rawText) as GameTemplatePayload;
    if (!parsed || !parsed.templateType) {
      throw new Error('Game JSON missing templateType field');
    }
    return parsed;
  } catch (parseErr: any) {
    throw new Error(`Failed to parse game template response: ${parseErr.message}`);
  }
}

/**
 * Game Mode Only — generates a standalone playable game from a topic/file.
 * Returns a minimal CourseOutline (title slide + game slide) that goes
 * directly to the Preview step without a full course outline.
 */
export async function generateStandaloneGame(
  topic: string,
  gameType: GameTemplateType,
  fileText?: string
): Promise<CourseOutline> {
  const topicContext = fileText
    ? `${topic}\n\nSOURCE MATERIAL:\n${fileText.slice(0, 6000)}`
    : topic;

  const gamePayload = await generateGameTemplate(topicContext, [], {
    templateType: gameType,
    courseType: 'standard',
  });

  const gameId = `game-${Date.now()}`;
  const titleId = `title-${Date.now()}`;
  const moduleId = `mod-${Date.now()}`;

  const gameTypeLabel: Record<GameTemplateType, string> = {
    'jeopardy':       'Jeopardy',
    'millionaire':    'Who Wants to Be a Millionaire',
    'family-feud':    'Family Feud',
    'escape-room':    'Escape Room',
    'spin-wheel':     'Spin the Wheel',
    'price-is-right': 'Price Is Right',
  };

  const course: CourseOutline = {
    title: gamePayload.title || `${gameTypeLabel[gameType]}: ${topic}`,
    description: `A standalone ${gameTypeLabel[gameType]} game covering: ${topic}`,
    learningObjectives: [],
    visualTheme: 'Neutral',
    modules: [
      {
        id: moduleId,
        title: 'Game',
        slides: [
          {
            id: titleId,
            type: 'title',
            title: gamePayload.title || topic,
            content: gamePayload.instructions || `Test your knowledge of ${topic}!`,
            narration: gamePayload.instructions || '',
            voiceOverText: gamePayload.instructions || '',
          },
          {
            id: gameId,
            type: 'game-template',
            title: gameTypeLabel[gameType],
            content: '',
            data: gamePayload,
          },
        ],
      },
    ],
  };

  return course;
}
