/**
 * Detect ID storyboards vs raw SME lecture decks, and the prompt rules
 * for following specified screens (OST + narration) instead of redesigning.
 */

import { emptyScenarioQuizKind, quizQuestionList } from './knowledgeCheckOst';

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
- Copy listed learner objectives VERBATIM. Do not Bloom-rewrite, paraphrase, add "Given …", change verbs, or invent a parallel set. Approved storyboard wording is the source of truth.
- If the storyboard is one module, return ONE terminal objective (copy the listed module goal if present; otherwise the module title) with the listed learner objectives as enablingObjectives — each enabling string must match the spec exactly.
- Skip cover, conventions, developer handoff, asset manifest, and QA checklist slides as learner modules.
- detectedStructure should describe the specified learner screens (e.g. "8 learner screens: guided reveal, click-to-explore, tabbed process, exit check").
- recommendedInteractions should prefer types named in the spec, mapped to NexCourse types:
  1–4 tappable tiles / click-to-explore / [DEV] reveal callouts / visit-all / decision-sort → choice-cards
  5 or more clickable items / long glossary of terms → click-reveal
  guided reveal / progressive reveal of 5+ terms → click-reveal
  tabbed process / tabs → tabbed-horizontal
  hotspot explore → hotspot
  exit check / knowledge check / Keys: / pass score → quiz or multiple-answers
- A screen titled "Scenario:" with one question is a knowledge check with a situation box, NOT a branching scenario engine.
- Do NOT treat every screen that asks the learner to tap something as a knowledge check. Teaching explorations with narration stay content (choice-cards / click-reveal).
- objectivesInferred MUST be false when the storyboard already lists learner objectives.`;
}

/** Types a storyboard may name; Course Settings whitelist does not strip these in storyboard mode. */
export const STORYBOARD_CONTENT_TYPES = [
  'content', 'diagram', 'key-takeaways',
  'flashcards', 'timeline', 'hotspot', 'scenario',
  'tabbed-horizontal', 'tabbed-vertical', 'folder-explorer',
  'carousel-panel', 'click-reveal', 'choice-cards',
];

export function storyboardOutlineInstructions(allowedContentTypes: string[]): string {
  const allowed = allowedContentTypes.join(', ') || 'content, click-reveal, tabbed-horizontal, hotspot';
  return `STORYBOARD MODE — follow the specified LEARNER SCREENS. Do not redesign this into a new course.
HARD RULES:
- Build the course the storyboard describes. Do NOT write a course about storyboarding, authoring, SCORM, or QA.
- Ignore cover, "course blueprint / conventions", developer handoff, asset manifest, and QA checklist screens. Those are not learner slides.
- One NexCourse teaching/interaction slide per remaining learner screen (Screen 01, Screen 02, …). Keep that screen's title.
  EXCEPTION: a screen that lists 2+ numbered knowledge-check questions (1. / 2. / 3., "QUESTION 1 OF 3", "one per screen state", or "separate slide for each question") MUST become N Knowledge Check slides — one quiz/multiple-answers slide per numbered question. Copy each stem, options, and Keys onto its own slide. Do NOT keep them on one slide. Do NOT emit "Question 1 of 3". Do NOT collapse three single-selects into one multiple-answers item.
- Do NOT add extra teaching slides to fill enabling coverage. Do NOT add extra Knowledge Checks beyond screens the storyboard already marks as a check / exit check / scenario quiz — splitting a multi-question check into N slides is required, not "extra".
- Do NOT generate module title, overview, or objectives slides (the player still injects chrome from Course Settings).
- Honor the interaction named on each learner screen when NexCourse has that type (${allowed}). Do not remap hotspot → click-reveal if hotspot is available.
  1–4 tappable tiles / click-to-explore / [DEV] Reveal brief callouts / "select each" / "continue after all visited" / decision-sort on a TEACHING screen → choice-cards (NOT click-reveal, NOT quiz)
  5 or more clickable items / a glossary of terms → click-reveal
  guided reveal, progressive reveal of 5+ terms → click-reveal
  tabbed process, tabs → tabbed-horizontal (or tabbed-vertical if the spec is a side tab list)
  hotspot explore → hotspot
  single-select / "which of the following" / one correct option → quiz
  select two / select all that apply on an EXIT CHECK or "Knowledge Check" / Keys: / pass score → multiple-answers
  exit check / knowledge check / "Scenario:" situation + scored question → quiz or multiple-answers using the select-one vs select-two rule above
- NEVER use type "scenario" (branching ScenarioEngine) for a screen that is a yellow situation box plus ONE question. That is a knowledge check: situation → data.scenarioText, question → questionText, choices → options.
- Type "scenario" is ONLY for a multi-node branching spec (decision tree with several nodes / "if the learner chooses A then…"). A title that starts with "Scenario:" is not enough.
- Do NOT convert a teaching screen into a Knowledge Check just because the learner taps cards. Exit check / Keys / pass score = scored quiz. Narration + tiles = choice-cards.
- Tag teaching slides with enablingIndex when an enabling is obvious; it is OK if several screens share one enabling.
- Module count: one module unless the storyboard clearly labels multiple modules.
- If the spec already has a Key Takeaways / summary screen, that is the ONE module summary. Do not add a second takeaways slide.`;
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
- A screen titled "Scenario:" (or a workplace vignette + one scored question) is quiz / multiple-answers with scenarioText. Do NOT emit type "scenario" unless the spec is a multi-node branching tree.
- EXIT CHECK / Knowledge Check / Keys: / pass score → scored quiz. If the SCREEN lists 2+ numbered questions AND this chunk already contains N Knowledge Check slides, hydrate EACH existing slide with exactly ONE question (in order). Do NOT add extra quiz slides beyond the slides in this chunk. Do NOT repeat a stem that belongs to another slide. Only split into additional slides if this chunk still has a single packed Knowledge Check that contains all of the numbered questions. Honor listed option counts (3 is fine — do not pad to 4). Mark isCorrect from Keys (1=A, 2=B, 3=B). voiceOverText MUST be "".
- Do not add a second Key Takeaways / summary slide if one is already in this chunk or earlier in the module.
- A TEACHING screen with 1–4 selectable tiles/cards and a narration script → type choice-cards. 5+ clickable items → click-reveal instead.
  • Click-to-explore / [DEV] Reveal brief callouts / "select each" / "continue after all are visited" / no Keys/pass score → data.mode = "explore". data.cards = [{ id, label, body, reveal }] with a UNIQUE reveal callout per card (from the DEV note or OST, e.g. Supplier = available material). No Check button. Do NOT mark isCorrect. Do NOT reuse one shared feedback sentence as the only reveal.
  • Decision-sort / "which outcomes could improve" / accepted tiles / Check → data.mode = "select". data.cards = [{ id, label, body, isCorrect }]. data.feedback = the explanatory paragraph after Check. data.selectMode = "multi" unless the spec is tap-one.
  data.prompt = the on-screen prompt. voiceOverText = the storyboard narration (do NOT put narration in scenarioText). Do NOT title it Knowledge Check.
- "Select two" / "select all that apply" on a scored check → type multiple-answers with one option per listed choice. Mark every option the spec treats as correct; if the spec is inconsistent, prefer the listed choices over inventing pair-combo options.
- If the stem says "select two" / "select N" but the answer key marks a different number of options correct — including ALL options correct — rewrite the stem to "Select the … that …" so the count in the prompt matches the key. Do not keep a false "select two" when four answers are right.
- Do not invent extra flashcards, tabs, hotspot pins, or quiz questions beyond what the screen lists.`;
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

const QUIZ_SLIDE_TYPES = new Set(['quiz', 'multiple-choice', 'multiple-answers', 'true-false']);

function quizTypeFromQuestion(q: { options?: any[] }, fallback: string): string {
  const correct = (q.options || []).filter((o: any) => o?.isCorrect === true || o?.correct === true).length;
  if (correct >= 2) return 'multiple-answers';
  if (fallback === 'multiple-answers' && correct < 2) return 'quiz';
  return QUIZ_SLIDE_TYPES.has(fallback) ? fallback : 'quiz';
}

/**
 * A storyboard screen with 2+ numbered questions becomes N Knowledge Check slides.
 * Also used as a safety net when hydrate still packed them onto one slide.
 */
export function expandOneMultiQuestionSlide<T extends {
  type?: string;
  id?: string;
  title?: string;
  data?: any;
  interactions?: any[];
}>(slide: T): T[] {
  if (!slide) return [];
  const kind = emptyScenarioQuizKind(slide);
  if (!QUIZ_SLIDE_TYPES.has(String(slide.type || '')) && !kind) return [slide];
  const list = quizQuestionList(slide.interactions?.[0] || slide.data || slide);
  if (list.length < 2) {
    if (slide.data && Array.isArray(slide.data.questions)) {
      const data = { ...slide.data };
      delete data.questions;
      return [{ ...slide, data }];
    }
    return [slide];
  }
  const baseTitle = String(slide.title || 'Knowledge Check').replace(/\s*\(\d+\)\s*$/, '').trim();
  return list.map((q, i) => {
    const nextType = quizTypeFromQuestion(q, String(slide.type || 'quiz'));
    const data = {
      ...(slide.data || {}),
      questionText: q.questionText,
      options: q.options,
      feedback: q.feedback,
      scenarioText: q.scenarioText,
    };
    delete data.questions;
    return {
      ...slide,
      id: i === 0 ? slide.id : `${slide.id || 'kc'}-q${i + 1}`,
      type: nextType,
      title: baseTitle,
      data,
      interactions: [{ type: nextType, ...data }],
    };
  });
}

export function expandStoryboardMultiQuestionSlides<T extends { slides?: any[] }>(modules: T[]): T[] {
  return (modules || []).map(mod => ({
    ...mod,
    slides: (mod.slides || []).flatMap((s: any) => expandOneMultiQuestionSlide(s)),
  }));
}

function titlesRoughlyMatch(a: string, b: string): boolean {
  const norm = (s: string) => String(s || '')
    .toLowerCase()
    .replace(/knowledge\s*check:\s*/g, '')
    .replace(/screen\s+0?\d+\s*[—–-]\s*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Detect storyboard screens that list 2+ numbered knowledge-check questions. */
export function findStoryboardMultiQuestionScreens(sourceText: string): { title: string; count: number }[] {
  const text = String(sourceText || '');
  if (text.length < 40) return [];
  const parts = text.split(/(?=Screen\s+0?\d+\b)/i);
  const chunks = parts.length > 1 ? parts : [text];
  const out: { title: string; count: number }[] = [];
  for (const part of chunks) {
    const looksLikeCheck = /knowledge\s*check|exit\s+check|keys\s*:|pass\s+score/i.test(part);
    if (!looksLikeCheck) continue;
    const titleMatch = part.match(/Screen\s+0?\d+\s*[—–-]\s*([^\n]+)/i)
      || part.match(/Knowledge\s*Check:\s*([^\n]+)/i);
    const title = (titleMatch?.[1] || 'Knowledge Check').trim();
    const ofCounts = [...part.matchAll(/question\s+\d+\s+of\s+(\d+)/gi)].map(m => Number(m[1])).filter(n => n >= 2);
    const qHeadings = (part.match(/(?:^|\n)\s*question\s+[1-9]\b/gi) || []).length;
    const wordCount = /\bthree\s+single-select/i.test(part) ? 3
      : /\btwo\s+single-select/i.test(part) ? 2
      : /\bfour\s+single-select/i.test(part) ? 4
      : 0;
    const stated = part.match(/(\d+)\s+(?:single-select\s+)?questions?/i);
    const statedN = stated ? Number(stated[1]) : 0;
    const count = Math.max(
      ofCounts.length ? Math.max(...ofCounts) : 0,
      qHeadings,
      wordCount,
      statedN >= 2 && statedN <= 8 ? statedN : 0,
    );
    if (count >= 2) out.push({ title, count });
  }
  return out;
}

function isQuizishSlide(slide: { type?: string; title?: string } | null | undefined): boolean {
  if (!slide) return false;
  return QUIZ_SLIDE_TYPES.has(String(slide.type || ''))
    || !!emptyScenarioQuizKind(slide)
    || /^knowledge\s*check/i.test(String(slide.title || ''));
}

function isTakeawaySlide(slide: { type?: string; title?: string } | null | undefined): boolean {
  if (!slide) return false;
  return slide.type === 'key-takeaways'
    || slide.type === 'summary'
    || /key\s*takeaways?/i.test(String(slide.title || ''));
}

function questionKey(slide: any): string {
  const list = quizQuestionList(slide?.interactions?.[0] || slide?.data || slide);
  const text = String(list[0]?.questionText || slide?.data?.questionText || '').trim().toLowerCase();
  return text.replace(/\s+/g, ' ');
}

/**
 * Outline safety net: clone a Knowledge Check slide when the storyboard screen
 * lists 2+ numbered questions but the model still emitted one slide.
 * If the outline already has enough KC slides, do not clone (avoids 3+3 duplicates).
 */
export function expandStoryboardQuizOutlineFromSource<T extends { slides?: any[] }>(
  modules: T[],
  sourceText: string,
): T[] {
  const screens = findStoryboardMultiQuestionScreens(sourceText);
  if (!screens.length) return modules;
  const needed = Math.max(...screens.map(s => s.count), 0);
  if (needed < 2) return modules;
  return (modules || []).map(mod => {
    const slides = mod.slides || [];
    const quizCount = slides.filter(isQuizishSlide).length;
    if (quizCount !== 1) return mod;
    const next: any[] = [];
    let cloned = false;
    for (const slide of slides) {
      if (cloned || !isQuizishSlide(slide)) {
        next.push(slide);
        continue;
      }
      const screen = screens.find(s => titlesRoughlyMatch(slide.title || '', s.title)) || screens[0];
      const count = Math.max(screen?.count || needed, needed);
      const baseTitle = String(slide.title || 'Knowledge Check').replace(/\s*\(\d+\)\s*$/, '').trim();
      for (let i = 0; i < count; i++) {
        next.push({
          ...slide,
          id: i === 0 ? slide.id : `${slide.id || 'kc'}-q${i + 1}`,
          title: baseTitle,
        });
      }
      cloned = true;
    }
    return { ...mod, slides: next };
  });
}

/**
 * Drop repeated knowledge-check stems and extra Key Takeaways after hydrate
 * (chunked generation sometimes re-emits the same exit-check / summary).
 */
export function dedupeStoryboardModuleSlides<T extends { slides?: any[] }>(modules: T[]): T[] {
  return (modules || []).map(mod => {
    const seenQuestions = new Set<string>();
    let takeawaysKept = 0;
    const slides: any[] = [];
    for (const slide of mod.slides || []) {
      if (isQuizishSlide(slide)) {
        const key = questionKey(slide);
        if (key && seenQuestions.has(key)) continue;
        if (key) seenQuestions.add(key);
        const cleanedTitle = String(slide.title || '').replace(/\s*\(\d+\)\s*$/, '').trim();
        slides.push(cleanedTitle && cleanedTitle !== slide.title ? { ...slide, title: cleanedTitle } : slide);
        continue;
      }
      if (isTakeawaySlide(slide)) {
        takeawaysKept += 1;
        if (takeawaysKept > 1) continue;
        slides.push(slide);
        continue;
      }
      slides.push(slide);
    }
    return { ...mod, slides };
  });
}
