/**
 * Detect ID storyboards vs raw SME lecture decks, and the prompt rules
 * for following specified screens (OST + narration) instead of redesigning.
 */

export type SourceMode = 'raw' | 'storyboard';

/** Enough of a typical storyboard to include screens + scripts; raw path stays smaller. */
export const STORYBOARD_SOURCE_CHARS = 24000;

const STRONG_SIGNALS: RegExp[] = [
  /e-?learning\s+storyboard/i,
  /developer-ready\s+storyboard/i,
  /this document is a build specification/i,
  /learner\s+screen\s*\/\s*on-screen\s+text/i,
  /on-screen\s+text[\s\S]{0,80}narration\s*\/\s*script/i,
];

const SUPPORTING_SIGNALS: RegExp[] = [
  /narration\s*\/\s*script/i,
  /\[DEV[:\]]/i,
  /screen\s+0?\d+\s*[—–-]/i,
  /final ost/i,
  /build\s+\+\s+(visual|interaction|feedback)/i,
  /exact visual instruction/i,
  /do not substitute/i,
  /asset manifest/i,
];

export function looksLikeStoryboard(text: string, fileName?: string): boolean {
  const src = String(text || '');
  if (src.length < 200) return false;
  const strongHits = STRONG_SIGNALS.filter(re => re.test(src)).length;
  const supportHits = SUPPORTING_SIGNALS.filter(re => re.test(src)).length;
  const nameHint = /storyboard/i.test(String(fileName || ''));
  if (strongHits >= 2) return true;
  if (strongHits >= 1 && supportHits >= 2) return true;
  if (nameHint && strongHits >= 1 && supportHits >= 1) return true;
  return false;
}

export function storyboardSourceWindow(text: string): string {
  return String(text || '').slice(0, STORYBOARD_SOURCE_CHARS);
}

/** Prompt block: how to read a storyboard as a build spec, not as a lecture. */
export function storyboardAnalyzeInstructions(): string {
  return `STORYBOARD MODE — this file is an instructional DESIGN SPECIFICATION, not source content about storyboarding.
- The COURSE TOPIC is the subject learners will study (e.g. supply chain), NEVER "storyboarding", "eLearning development", or "how to write a storyboard".
- Use the module/course title and listed learner objectives from the spec. Do not invent a parallel objective set.
- If the storyboard is one module, return ONE terminal objective (the module goal) with the listed learner objectives as enablingObjectives.
- Skip cover, conventions, developer handoff, asset manifest, and QA checklist slides as learner modules.
- detectedStructure should describe the specified learner screens (e.g. "8 learner screens: guided reveal, click-to-explore, tabbed process, exit check").
- recommendedInteractions should prefer types named in the spec, mapped to NexCourse types:
  guided reveal / click-to-explore / progressive reveal → click-reveal
  tabbed process / tabs → tabbed-horizontal
  hotspot explore → hotspot
  decision / branching / single-select / multi-select / exit check / knowledge check / situation + question → quiz or multiple-answers
- A screen titled "Scenario:" with one question is a knowledge check with a situation box, NOT a branching scenario engine.
- objectivesInferred should be false when the storyboard already lists learner objectives.`;
}

/** Types a storyboard may name; Course Settings whitelist does not strip these in storyboard mode. */
export const STORYBOARD_CONTENT_TYPES = [
  'content', 'diagram', 'key-takeaways',
  'flashcards', 'timeline', 'hotspot', 'scenario',
  'tabbed-horizontal', 'tabbed-vertical', 'folder-explorer',
  'carousel-panel', 'click-reveal',
];

export function storyboardOutlineInstructions(allowedContentTypes: string[]): string {
  const allowed = allowedContentTypes.join(', ') || 'content, click-reveal, tabbed-horizontal, hotspot';
  return `STORYBOARD MODE — follow the specified LEARNER SCREENS. Do not redesign this into a new course.
HARD RULES:
- Build the course the storyboard describes. Do NOT write a course about storyboarding, authoring, SCORM, or QA.
- Ignore cover, "course blueprint / conventions", developer handoff, asset manifest, and QA checklist screens. Those are not learner slides.
- One NexCourse teaching/interaction slide per remaining learner screen (Screen 01, Screen 02, …). Keep that screen's title.
- Do NOT add extra teaching slides to fill enabling coverage. Do NOT add extra Knowledge Checks beyond screens the storyboard already marks as a check / exit check / scenario quiz.
- Do NOT generate module title, overview, or objectives slides (the player still injects chrome from Course Settings).
- Honor the interaction named on each learner screen when NexCourse has that type (${allowed}). Do not remap hotspot → click-reveal if hotspot is available.
  guided reveal, click-to-explore, progressive reveal → click-reveal
  tabbed process, tabs → tabbed-horizontal (or tabbed-vertical if the spec is a side tab list)
  hotspot explore → hotspot
  single-select / "which of the following" / one correct option → quiz
  select two / select all that apply / more than one correct → multiple-answers (NOT quiz)
  exit check / knowledge check / decision / "Scenario:" situation + question → quiz or multiple-answers using the select-one vs select-two rule above
- NEVER use type "scenario" (branching ScenarioEngine) for a screen that is a yellow situation box plus ONE question. That is a knowledge check: situation → data.scenarioText, question → questionText, choices → options.
- Type "scenario" is ONLY for a multi-node branching spec (decision tree with several nodes / "if the learner chooses A then…"). A title that starts with "Scenario:" is not enough.
- A content screen that asks the learner to pick answers is a Knowledge Check, even if the storyboard did not title it "Knowledge Check".
- Tag teaching slides with enablingIndex when an enabling is obvious; it is OK if several screens share one enabling.
- Module count: one module unless the storyboard clearly labels multiple modules.`;
}

export function storyboardHydrateInstructions(): string {
  return `STORYBOARD MODE — OST and narration in the spec are the source of truth.
These rules OVERRIDE the short-bullet rewrite and CEAP narration formula for this course.
- LEARNER SCREEN / ON-SCREEN TEXT (or equivalent) → slide content / interaction item text. Keep wording close to the spec; do not expand into a new lecture or invent extra bullets.
- NARRATION / SCRIPT → voiceOverText. Use the spoken script (strip wrapping quotes). Do not rewrite it into a CEAP formula. Knowledge checks / exit checks still use voiceOverText "".
- Never put [DEV] notes, build logic, asset filenames, alt-text production notes, QA checklists, or "STORYBOARD · NN" labels on the learner slide.
- Bracketed developer labels must not appear on-screen.
- Do not write a course about storyboarding. Teach the subject the screens teach.
- Visual direction / "use exactly SC-01-….jpg" is NOT implemented in this cut — do not mention missing assets on the slide.
- Interaction items (tabs, click-reveal terms, hotspots, quiz options) must come from the screen spec, including correct answers when the spec marks them.
- Quiz / knowledge-check screens: put the situation box, carrier alert, yellow callout, or short story in data.scenarioText (plain prose, not the question). Put the actual question in questionText. Do not drop the situation.
- A screen titled "Scenario:" (or a workplace vignette + one question) is quiz / multiple-answers with scenarioText. Do NOT emit type "scenario" unless the spec is a multi-node branching tree.
- "Select two" / "select all that apply" / more than one correct → type multiple-answers with one option per listed choice (e.g. Cost, Service, Inventory, Risk). Mark every option the spec treats as correct; if the spec is inconsistent, prefer the listed choices over inventing pair-combo options.
- If the stem says "select two" / "select N" but the answer key marks a different number of options correct — including ALL options correct — rewrite the stem to "Select the … that …" so the count in the prompt matches the key. Do not keep a false "select two" when four answers are right.
- Do not invent extra flashcards, tabs, or hotspot pins beyond what the screen lists.`;
}

function scenarioHasNodes(data: any): boolean {
  return Array.isArray(data?.nodes) && data.nodes.length > 0 && !!data.startNodeId;
}

function quizTypeFromOptions(options: any[]): 'quiz' | 'multiple-answers' {
  const correct = (options || []).filter((o: any) => o?.isCorrect === true || o?.correct === true).length;
  return correct >= 2 ? 'multiple-answers' : 'quiz';
}

/**
 * Storyboard "Scenario:" screens are knowledge checks with a situation box.
 * Only keep type "scenario" when the payload is already a branching tree.
 */
export function remapStoryboardScenarioSlide<T extends { type?: string; data?: any; interactions?: any[] }>(slide: T): T {
  if (!slide || slide.type !== 'scenario') return slide;
  if (scenarioHasNodes(slide.data)) return slide;
  const src = slide.data || slide.interactions?.[0] || {};
  const options = Array.isArray(src.options) ? src.options : [];
  const nextType = quizTypeFromOptions(options);
  const data = {
    ...(slide.data || {}),
    questionText: src.questionText || src.prompt || src.question || '',
    scenarioText: src.scenarioText || src.stem || src.preamble || src.situation || '',
    options,
    feedback: src.feedback || slide.data?.feedback,
  };
  delete (data as any).nodes;
  delete (data as any).startNodeId;
  delete (data as any).endings;
  return { ...slide, type: nextType, data };
}

export function remapStoryboardScenarioModules<T extends { slides?: any[] }>(modules: T[]): T[] {
  return (modules || []).map(mod => ({
    ...mod,
    slides: (mod.slides || []).map(s => remapStoryboardScenarioSlide(s)),
  }));
}
