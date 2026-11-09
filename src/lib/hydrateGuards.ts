/**
 * Post-hydrate quality lock.
 *
 * Prompts alone drift. These helpers run on every generated slide so cover
 * titles, markdown glyphs, takeaway sentences, knowledge-check payloads,
 * thin content, and duplicate interaction instructions cannot leak back in
 * after unrelated hydrate/QC/review changes.
 */

import { isKnowledgeCheckSlide, stripSlideNarration } from './enablingCoverage';
import { coerceOstText, isSymbolOnlyOstLine, sanitizeOstText } from './formatTabIntroOst';
import { compactChoiceCardsList } from './choiceCardCopy';
import { quizQuestionList } from './knowledgeCheckOst';
import { formatOstSectionGroups } from './ostSectionGroups';
import { sanitizeMermaidCode } from './mermaidNodes';

export function wordCount(text: string): number {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

/** Strip leftover markdown so plain-text surfaces never show ** or ###. */
export function stripMarkdownArtifacts(text: unknown): string {
  let s = coerceOstText(text);
  if (!s) return '';
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/__(.+?)__/g, '$1');
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\*{1,3}/g, '');
  s = s.replace(/_{2,}/g, '');
  return s.replace(/[ \t]+\n/g, '\n').trim();
}

function ostFingerprint(text: string): string {
  return stripMarkdownArtifacts(text)
    .toLowerCase()
    .replace(/^[-*•]\s+/gm, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ostSimilar(a: string, b: string): boolean {
  const fa = ostFingerprint(a);
  const fb = ostFingerprint(b);
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  if (fa.includes(fb) || fb.includes(fa)) {
    const shorter = fa.length < fb.length ? fa : fb;
    const longer = fa.length < fb.length ? fb : fa;
    return shorter.length >= 18 && shorter.length / longer.length >= 0.5;
  }
  const wa = new Set(fa.split(' ').filter(Boolean));
  const wb = new Set(fb.split(' ').filter(Boolean));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 && inter / union >= 0.68;
}

function isInstructionLine(line: string): boolean {
  const body = stripMarkdownArtifacts(line)
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
  return /^(select|choose|click|tap|explore|visit each|classify)\b/i.test(body);
}

export function isInstructionOnlyOst(content: unknown): boolean {
  const raw = sanitizeOstText(content);
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(isInstructionLine);
}

/**
 * Choice-cards (and similar) show one learner instruction — never both
 * slide.content and data.prompt, and never three stacked CTAs.
 */
export function collapseChoiceCardsOst(
  content: unknown,
  prompt: unknown,
): { content: string; prompt: string } {
  const rawPrompt = stripMarkdownArtifacts(prompt).replace(/\s+/g, ' ').trim();
  const rawContent = sanitizeOstText(content);
  if (!rawContent && !rawPrompt) return { content: '', prompt: '' };
  if (rawPrompt) return { content: '', prompt: rawPrompt };
  const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
  const instruction = lines.find(isInstructionLine) || lines[0] || '';
  return {
    content: '',
    prompt: stripMarkdownArtifacts(instruction).replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim(),
  };
}

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six'];

/**
 * Scored (Check) choice-cards must not read like exploratory "select each".
 * "Select the process conditions…" → "Select the correct process conditions…, then click Check."
 */
export function ensureSelectChoicePrompt(prompt: unknown, correctCount = 0): string {
  let p = stripMarkdownArtifacts(prompt).replace(/\s+/g, ' ').trim();
  const n = Math.max(0, Number(correctCount) || 0);
  if (!p) {
    if (n <= 1) return 'Select the correct option, then click Check.';
    const word = NUMBER_WORDS[n] || String(n);
    return `Select the ${word} correct options, then click Check.`;
  }
  if (!/\bcorrect\b/i.test(p)) {
    p = p.replace(
      /^(select|choose|pick)\s+(the\s+)?/i,
      (_m, verb: string, the?: string) => `${String(verb)[0].toUpperCase()}${String(verb).slice(1).toLowerCase()} ${the || ''}correct `,
    );
    p = p.replace(/\s+/g, ' ').trim();
    if (!/\bcorrect\b/i.test(p)) p = `Select the correct answers. ${p}`;
  }
  if (!/\bcheck\b/i.test(p)) {
    p = p.replace(/[.?!]?\s*$/, ', then click Check.');
  }
  return p;
}

export function quizHasLearnerPayload(slide: any): boolean {
  if (!slide) return false;
  const type = String(slide.type || '');
  if (type === 'sorting' || type === 'matching' || type === 'drop-targets') {
    const raw = slide.data || slide.interactions?.[0] || {};
    const items = Array.isArray(raw.items) ? raw.items : [];
    if (type === 'matching') {
      const targets = Array.isArray(raw.targets) ? raw.targets : [];
      return items.length >= 2 && targets.length >= 2;
    }
    return items.length >= 2;
  }
  return quizQuestionList(slide.interactions?.[0] || slide.data || slide).length > 0;
}

const META_KC_RE =
  /\[draft\]|\b(?:is|as)\s+a\s+(?:core|key)\s+(?:idea|topic|concept)\s+in\s+this\s+(?:module|course)\b|\bcore\s+idea\s+in\s+this\s+module\b|\bkey\s+(?:idea|topic)\s+in\s+this\s+(?:module|course)\b|\bkey\s+idea\s+covered\s+in\b|\bcovered\s+in\s+(?:this|the)\s+(?:module|course)\b|\bnot\s+part\s+of\s+this\s+module\b|\bnone\s+of\s+these\s+ideas\s+appear\b|\bappears?\s+in\s+(?:this|the)\s+(?:module|course)\b|\bunrelated\s+fact\s+from\s+outside\b|\ban unrelated topic\b|\ba concept from another (?:module|domain)\b|\bprimary focus of\s*["“']|\bwhich are discussed in\b|\bkey learning point from this course\b/i;

const SKELETON_KC_OPTION_RE =
  /\bprimary role or definition of\b|\ba common mix-up with a different process than\b|\ba condition that does not apply to\b|\ba result that .+ never produces\b/i;

const SKELETON_KC_STEM_RE = /which statement about .+ is most accurate/i;

/** Ban course-structure KCs ("is this a core idea in this module"). */
export function isMetaKnowledgeCheckText(text: unknown): boolean {
  return META_KC_RE.test(String(text || ''));
}

/** Ban "Which statement about X is most accurate?" with incomplete role/mix-up options. */
export function isSkeletonKnowledgeCheckText(text: unknown): boolean {
  const s = String(text || '');
  if (!s.trim()) return false;
  if (SKELETON_KC_OPTION_RE.test(s)) return true;
  if (SKELETON_KC_STEM_RE.test(s) && SKELETON_KC_OPTION_RE.test(s)) return true;
  return false;
}

/**
 * Learning-objective / "you will learn" copy is not a quiz claim.
 * "In this module, you will list…" and "helps you troubleshoot…" belong on overviews, not options.
 */
export function isInstructionalObjectiveText(text: unknown): boolean {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return false;
  if (/\bin this (module|slide|course|lesson|unit),?\s+you will\b/i.test(s)) return true;
  if (/\byou will (be able to )?(list|describe|explain|identify|apply|recognize|understand|learn|state|outline)\b/i.test(s)) return true;
  if (/\b(this slide covers|in this slide we cover)\b/i.test(s)) return true;
  if (/\bhelps you (troubleshoot|learn|understand|recognize|optimize|connect)\b/i.test(s)) return true;
  if (/\bby the end of (this|the) (module|slide|course)\b/i.test(s)) return true;
  if (/\blearning objective\b/i.test(s)) return true;
  if (/\bwhat you will (be able to|learn|be able)\b/i.test(s)) return true;
  if (/\b(you should|learners? (will|should)|the learner will)\b/i.test(s) && /\b(learn|understand|be able to)\b/i.test(s)) return true;
  return false;
}

/** Too long, glued bullet lists, or objective framing — not a T/F-worthy claim. */
export function isNonAssessableFactText(text: unknown): boolean {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return false;
  if (isInstructionalObjectiveText(s)) return true;
  if (isMetaKnowledgeCheckText(s) || isSkeletonKnowledgeCheckText(s)) return true;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 40) return true;
  const sentences = s.split(/(?<=[.!?])\s+/).filter(x => x.trim().length > 0);
  if (sentences.length > 2) return true;
  if ((s.match(/\s+-\s+/g) || []).length >= 2 && !/[.!?]$/.test(s)) return true;
  return false;
}

function quizOptionTexts(q: { questionText?: string; options?: any[] }): string[] {
  return (q.options || []).map((o: any) => (typeof o === 'string' ? o : o?.text || o?.label || ''));
}

export function knowledgeCheckHasMetaStem(slide: any): boolean {
  if (!isKnowledgeCheckSlide(slide)) return false;
  const questions = quizQuestionList(slide.interactions?.[0] || slide.data || slide);
  return questions.some((q) => {
    const stem = String(q.questionText || '');
    return isMetaKnowledgeCheckText([stem, ...quizOptionTexts(q)].join('\n'));
  });
}

export function knowledgeCheckHasInstructionalOption(slide: any): boolean {
  if (!isKnowledgeCheckSlide(slide)) return false;
  const questions = quizQuestionList(slide.interactions?.[0] || slide.data || slide);
  const texts = questions.length
    ? questions.flatMap((q) => [String(q.questionText || ''), ...quizOptionTexts(q)])
    : [
        String(slide?.data?.questionText || slide?.data?.question || ''),
        ...((Array.isArray(slide?.data?.options) ? slide.data.options : []).map((o: any) =>
          typeof o === 'string' ? o : o?.text || o?.label || '')),
      ];
  return texts.some((t) => isNonAssessableFactText(t));
}

export function knowledgeCheckIsSkeleton(slide: any): boolean {
  if (!isKnowledgeCheckSlide(slide)) return false;
  const questions = quizQuestionList(slide.interactions?.[0] || slide.data || slide);
  if (!questions.length) {
    const data = slide?.data || {};
    const stem = String(data.questionText || data.question || '');
    const opts = Array.isArray(data.options) ? data.options : [];
    const texts = opts.map((o: any) => (typeof o === 'string' ? o : o?.text || o?.label || ''));
    return isSkeletonKnowledgeCheckText([stem, ...texts].join('\n'));
  }
  return questions.some((q) => {
    const stem = String(q.questionText || '');
    const texts = quizOptionTexts(q);
    if (texts.some((t) => SKELETON_KC_OPTION_RE.test(t))) return true;
    if (SKELETON_KC_STEM_RE.test(stem) && texts.some((t) => SKELETON_KC_OPTION_RE.test(t))) return true;
    return isSkeletonKnowledgeCheckText([stem, ...texts].join('\n'));
  });
}

/** Process (tabbed-horizontal) is 3–4 steps; 5+ remap to vertical tabs. */
export const PROCESS_STEP_MAX = 4;
/** Scored choice-cards stay 2–4 tiles; 5+ become click-reveal teaching rows. */
export const CHOICE_CARD_SELECT_MAX = 4;

export function remapOversizedProcessToTabs(slide: any): any {
  if (!slide || slide.type !== 'tabbed-horizontal') return slide;
  const tabs = slide.data?.tabs || slide.data?.items;
  if (!Array.isArray(tabs) || tabs.length < PROCESS_STEP_MAX + 1) return slide;
  return { ...slide, type: 'tabbed-vertical' };
}

export function remapOversizedChoiceCards(slide: any): any {
  if (!slide || slide.type !== 'choice-cards') return slide;
  const cards = Array.isArray(slide.data?.cards) ? slide.data.cards : (slide.data?.items || []);
  if (!Array.isArray(cards) || cards.length < CHOICE_CARD_SELECT_MAX + 1) return slide;
  return {
    ...slide,
    type: 'click-reveal',
    data: {
      ...(slide.data || {}),
      items: cards.map((c: any, i: number) => ({
        id: String(c?.id || `r${i + 1}`),
        term: String(c?.label || c?.term || `Item ${i + 1}`),
        definition: String(c?.reveal || c?.body || c?.definition || '').trim(),
      })),
    },
  };
}

function stripQuizPlaceholderFields(data: any): any {
  if (!data || typeof data !== 'object') return {};
  const next = { ...data };
  delete next.questionText;
  delete next.question;
  delete next.options;
  delete next.feedback;
  delete next.questions;
  delete next.correctAnswer;
  return next;
}

/** Last-mile MC from teaching facts — never the "most accurate" role/mix-up template. */
export function fallbackKnowledgeCheckData(
  title: string,
  moduleTitle = '',
  factStatements: string[] = [],
): Record<string, unknown> | null {
  const topic = String(title || 'this topic').replace(/^knowledge\s*check:\s*/i, '').trim() || 'this topic';
  const usable = factStatements
    .map((s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((s) => wordCount(s) >= 5 && !isNonAssessableFactText(s));
  if (usable.length < 2) return null;
  const options = usable.slice(0, 4).map((text, i) => ({
    id: String.fromCharCode(97 + i),
    text,
    isCorrect: i === 0,
  }));
  return {
    questionText: `Which of the following is true of ${topic}?`,
    options,
    feedback: `Review ${topic} in ${moduleTitle || 'this module'}, then continue.`,
  };
}

export function ensureKnowledgeCheckPayload(
  slide: any,
  moduleTitle = '',
  factStatements: string[] = [],
): any {
  if (!isKnowledgeCheckSlide(slide)) return slide;
  const skeleton = knowledgeCheckIsSkeleton(slide);
  const meta = knowledgeCheckHasMetaStem(slide);
  if (quizHasLearnerPayload(slide) && !meta && !skeleton) return slide;

  const topic = String(slide.title || 'this topic').replace(/^knowledge\s*check:\s*/i, '').trim() || 'this topic';
  const type = String(slide.type || 'quiz');
  const framing = String(slide.content || '').trim() || `Check your understanding of ${topic}.`;
  const grounded = fallbackKnowledgeCheckData(slide.title || topic, moduleTitle, factStatements);

  if (grounded && (type === 'true-false' || type === 'quiz' || type === 'multiple-choice' || type === 'knowledge-check' || type === 'multiple-answers')) {
    return {
      ...slide,
      type: type === 'true-false' ? 'quiz' : type,
      content: framing,
      data: {
        ...(slide.data && typeof slide.data === 'object' ? stripQuizPlaceholderFields(slide.data) : {}),
        ...grounded,
      },
    };
  }

  if (type === 'true-false' || type === 'quiz' || type === 'multiple-choice' || type === 'knowledge-check' || type === 'multiple-answers') {
    return {
      ...slide,
      type: type === 'true-false' ? 'quiz' : type,
      content: framing,
      data: stripQuizPlaceholderFields(slide.data),
    };
  }

  if (type === 'sorting') {
    return {
      ...slide,
      content: framing,
      data: {
        items: [
          { id: 's1', content: `First point about ${topic}` },
          { id: 's2', content: `Next point about ${topic}` },
          { id: 's3', content: `Final point about ${topic}` },
        ],
        correctOrder: ['s1', 's2', 's3'],
      },
    };
  }

  if (type === 'matching') {
    return {
      ...slide,
      content: framing,
      data: {
        items: [
          { id: 'i1', content: `${topic} term A` },
          { id: 'i2', content: `${topic} term B` },
        ],
        targets: [
          { id: 't1', content: 'Matching description A' },
          { id: 't2', content: 'Matching description B' },
        ],
        correctAnswers: { i1: 't1', i2: 't2' },
      },
    };
  }

  if (type === 'drop-targets') {
    return {
      ...slide,
      content: framing,
      data: {
        categories: ['Applies', 'Does not apply'],
        items: [
          { id: 'd1', content: `Fact about ${topic}`, category: 'Applies' },
          { id: 'd2', content: `Related idea from ${moduleTitle || 'this module'}`, category: 'Applies' },
          { id: 'd3', content: 'Unrelated distractor', category: '' },
        ],
      },
    };
  }

  return {
    ...slide,
    type: type === 'multiple-answers' ? 'multiple-answers' : 'quiz',
    content: framing,
    data: stripQuizPlaceholderFields(slide.data),
  };
}

export function isThinTeachingContent(content: unknown): boolean {
  const raw = coerceOstText(content).trim();
  if (!raw) return true;
  const plain = stripMarkdownArtifacts(raw);
  if (!plain || isSymbolOnlyOstLine(plain)) return true;
  const words = wordCount(plain);
  const bullets = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*•]\s+\S|^\d+[.)]\s+\S/.test(l) && !isSymbolOnlyOstLine(l));
  if (bullets.length >= 2) return false;
  return words < 18;
}

function interactionHasItems(slide: any, key: 'cards' | 'items' | 'tabs', min: number): boolean {
  const data = slide?.data || {};
  const list = data[key]
    || (key === 'cards' ? data.items : null)
    || (key === 'tabs' ? data.items : null)
    || (key === 'items' ? data.cards || data.tabs : null);
  return Array.isArray(list) && list.length >= min;
}

export function teachingSlideNeedsRetry(slide: any): boolean {
  if (!slide) return true;
  if (isKnowledgeCheckSlide(slide)) {
    return !quizHasLearnerPayload(slide)
      || knowledgeCheckHasMetaStem(slide)
      || knowledgeCheckIsSkeleton(slide)
      || knowledgeCheckHasInstructionalOption(slide);
  }
  const type = String(slide.type || 'content');
  if (type === 'choice-cards') return !interactionHasItems(slide, 'cards', 2);
  if (type === 'click-reveal') return !interactionHasItems(slide, 'items', 2);
  if (type === 'tabbed-horizontal' || type === 'tabbed-vertical') {
    return !interactionHasItems(slide, 'tabs', 2);
  }
  if (type === 'key-takeaways' || type === 'summary') {
    const objs = slide.data?.objectives || slide.interactions;
    const fromContent = takeawayLinesFromContent(slide.content);
    const richFromObjs = Array.isArray(objs)
      ? objs.map(takeawayStatementText).filter(isRichTakeaway)
      : [];
    const richFromContent = fromContent.filter(isRichTakeaway);
    return richFromObjs.length < 2 && richFromContent.length < 2;
  }
  if (type === 'content' || type === 'diagram') {
    const mermaid = String(slide.data?.mermaidCode || '').trim();
    if (type === 'diagram' && mermaid) return false;
    return isThinTeachingContent(slide.content);
  }
  return false;
}

function takeawayStatementText(obj: any): string {
  const label = stripMarkdownArtifacts(obj?.label || obj?.title || '').trim();
  const body = stripMarkdownArtifacts(obj?.content || obj?.description || '').trim();
  if (body && label && body !== label) return `${label}. ${body}`.replace(/\.\s+\./g, '.');
  return (body || label).trim();
}

export function isRichTakeaway(text: unknown): boolean {
  const t = stripMarkdownArtifacts(text).replace(/^[-*•]\s+/, '').trim();
  if (!t) return false;
  if (/[.!?]/.test(t) && wordCount(t) >= 8) return true;
  return wordCount(t) >= 12;
}

function takeawayLinesFromContent(content: unknown): string[] {
  return String(content || '')
    .split(/\n+/)
    .map(l => stripMarkdownArtifacts(l).replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter(l => l.length > 2 && !/^key\s*takeaways?/i.test(l) && !isSymbolOnlyOstLine(l));
}

function isUsableTakeaway(obj: any): boolean {
  const label = stripMarkdownArtifacts(obj?.label || obj?.title || '');
  const body = stripMarkdownArtifacts(obj?.content || obj?.description || '');
  const text = (label || body).trim();
  if (!text || isSymbolOnlyOstLine(text)) return false;
  return (text.match(/[A-Za-z]/g) || []).length >= 8;
}

function softenCaps(text: string): string {
  const t = text.trim();
  if (t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
    return t.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase());
  }
  return t;
}

/** Spec-table rows ("LDPE: 0.910 g/cm³, melts 105 °C") become a statement. */
export function toTakeawayStatement(raw: string): string {
  let t = stripMarkdownArtifacts(raw).replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
  if (!t) return '';
  const m = t.match(/^([A-Za-z][A-Za-z0-9+\-/]{1,16})\s*:\s*(.+)$/);
  if (m && /[0-9]/.test(m[2])) {
    const rest = m[2].replace(/,/g, ' and').replace(/\s+/g, ' ').trim();
    t = `${m[1]} is ${rest}`;
  }
  t = softenCaps(t);
  if (!/[.!?]$/.test(t) && wordCount(t) >= 8) {
    // leave phrase takeaways without a forced period
  }
  return t;
}

/** Hydrate still aims for 2–4. Authors may add more in Edit (up to 8). */
export const GENERATED_KEY_TAKEAWAY_MAX = 4;
export const AUTHORED_KEY_TAKEAWAY_MAX = 8;

export function normalizeKeyTakeaways(slide: any, opts?: { max?: number }): any {
  if (!slide || (slide.type !== 'key-takeaways' && slide.type !== 'summary' && !/key\s*takeaways?/i.test(slide.title || ''))) {
    return slide;
  }
  const max = Number.isFinite(opts?.max) ? Math.max(2, Number(opts?.max)) : AUTHORED_KEY_TAKEAWAY_MAX;

  const next = { ...slide, type: 'key-takeaways' };
  const existing = Array.isArray(next.data?.objectives)
    ? next.data.objectives
    : (Array.isArray(next.interactions) ? next.interactions : []);

  const fromExisting = existing
    .map((obj: any) => {
      const label = toTakeawayStatement(obj?.label || obj?.title || '');
      const content = toTakeawayStatement(obj?.content || obj?.description || '');
      const statement = content && label && content !== label ? content : (label || content);
      if (!statement || !isUsableTakeaway({ label: statement })) return null;
      return {
        id: String(obj?.id || ''),
        label: statement,
        content: content && content !== statement ? content : '',
      };
    })
    .filter(Boolean) as Array<{ id: string; label: string; content: string }>;

  const fromContent = takeawayLinesFromContent(next.content)
    .map(toTakeawayStatement)
    .filter(s => isUsableTakeaway({ label: s }))
    .map((label, i) => ({ id: String(i + 1), label, content: '' }));

  let objectives = fromExisting.length >= 2 ? fromExisting : (fromContent.length ? fromContent : fromExisting);
  if (objectives.length < 2) {
    const topic = String(next.title || 'this module').replace(/^module\s+\d+\s*[·\-—]?\s*/i, '').trim();
    objectives = [
      { id: '1', label: `Review the core ideas in ${topic}`, content: '' },
      { id: '2', label: 'Apply the key properties on the job', content: '' },
      { id: '3', label: 'Confirm understanding before moving on', content: '' },
    ];
    next.content = objectives.map(o => `- ${o.label}`).join('\n');
  }

  const capped = objectives.slice(0, max).map((o, i) => ({
    id: o.id || String(i + 1),
    label: o.label,
    content: o.content || '',
  }));
  next.data = {
    ...(next.data || {}),
    objectives: capped,
  };
  // Keep leftover short OST from drifting apart from the numbered cards.
  next.content = capped.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
  return next;
}

function fallbackTeachingContent(title: string, moduleTitle: string): string {
  const topic = String(title || 'this topic').trim() || 'this topic';
  return [
    `- ${topic}`,
    `- Core idea from ${moduleTitle || 'this module'}`,
    '- How it shows up in practice',
  ].join('\n');
}

function degradeIncompleteInteraction(slide: any, moduleTitle: string): any {
  const type = String(slide.type || '');
  if (type === 'choice-cards' && !interactionHasItems(slide, 'cards', 2)) {
    const prompt = String(slide.data?.prompt || '').trim();
    return {
      ...slide,
      type: 'content',
      content: isThinTeachingContent(slide.content)
        ? (prompt ? `- ${stripMarkdownArtifacts(prompt)}\n${fallbackTeachingContent(slide.title, moduleTitle)}` : fallbackTeachingContent(slide.title, moduleTitle))
        : slide.content,
    };
  }
  if (type === 'click-reveal' && !interactionHasItems(slide, 'items', 2)) {
    return {
      ...slide,
      type: 'content',
      content: isThinTeachingContent(slide.content)
        ? fallbackTeachingContent(slide.title, moduleTitle)
        : slide.content,
    };
  }
  return slide;
}

/**
 * Last-mile slide lock after hydrate retries. Idempotent.
 */
export function finalizeHydratedSlide(slide: any, moduleTitle = ''): any {
  if (!slide || typeof slide !== 'object') return slide;
  let next = remapOversizedChoiceCards(remapOversizedProcessToTabs({ ...slide }));

  if (next.type === 'choice-cards') {
    const collapsed = collapseChoiceCardsOst(next.content, next.data?.prompt);
    const cards = Array.isArray(next.data?.cards) ? next.data.cards : (next.data?.items || []);
    const list = Array.isArray(cards) ? cards : [];
    const correctCount = list.filter(
      (c: any) => c?.isCorrect === true || c?.accepted === true,
    ).length;
    const allAccepted = list.length >= 2 && correctCount === list.length;
    const scored = !allAccepted && (next.data?.mode === 'select' || correctCount > 0);
    next = {
      ...next,
      content: collapsed.content,
      data: {
        ...(next.data || {}),
        mode: scored ? 'select' : 'explore',
        prompt: scored ? ensureSelectChoicePrompt(collapsed.prompt, correctCount) : collapsed.prompt,
        cards: compactChoiceCardsList(list).map((c: any) => (
          allAccepted ? { ...c, isCorrect: undefined, accepted: undefined } : c
        )),
      },
    };
  }

  if (next.type === 'click-reveal' && isInstructionOnlyOst(next.content)) {
    next = { ...next, content: '' };
  }

  if (next.type === 'diagram') {
    const raw = String(next.data?.mermaidCode || next.data?.code || '').trim();
    if (raw) {
      const healed = sanitizeMermaidCode(raw);
      if (healed && healed !== raw) {
        next = {
          ...next,
          data: { ...(next.data || {}), mermaidCode: healed, code: healed },
        };
      }
    }
  }

  if ((next.type === 'content' || next.type === 'summary') && next.content) {
    next = { ...next, content: formatOstSectionGroups(next.content) };
  }

  next = degradeIncompleteInteraction(next, moduleTitle);
  next = normalizeKeyTakeaways(next, { max: GENERATED_KEY_TAKEAWAY_MAX });
  next = ensureKnowledgeCheckPayload(next, moduleTitle);

  if ((next.type === 'content' || next.type === 'summary') && isThinTeachingContent(next.content)) {
    next = { ...next, content: fallbackTeachingContent(next.title, moduleTitle) };
  }

  if (isKnowledgeCheckSlide(next)) {
    next = stripSlideNarration(next);
  } else if (!String(next.voiceOverText || '').trim()) {
    next.voiceOverText = `In this slide we cover ${next.title || 'this topic'}, which is an important aspect of ${moduleTitle || 'the course'}.`;
  }

  if (typeof next.content === 'string' && next.type !== 'choice-cards') {
    next.content = sanitizeOstText(next.content);
  }

  next = sanitizePlainTextSurfaces(next);
  return next;
}

function mapPlain(value: unknown): unknown {
  if (typeof value === 'string') return stripMarkdownArtifacts(value);
  return value;
}

function sanitizePlainTextSurfaces(slide: any): any {
  const data = slide?.data;
  if (!data || typeof data !== 'object') return slide;
  const nextData = { ...data };

  if (Array.isArray(nextData.options)) {
    nextData.options = nextData.options.map((opt: any) => {
      if (!opt || typeof opt !== 'object') return opt;
      return { ...opt, text: mapPlain(opt.text), label: mapPlain(opt.label) };
    });
  }
  if (typeof nextData.questionText === 'string') {
    nextData.questionText = stripMarkdownArtifacts(nextData.questionText);
  }
  if (Array.isArray(nextData.items)) {
    nextData.items = nextData.items.map((it: any) => {
      if (!it || typeof it !== 'object') return it;
      const keepMarkdown = slide.type === 'click-reveal' || slide.type === 'choice-cards';
      if (keepMarkdown) {
        return { ...it, term: typeof it.term === 'string' ? stripMarkdownArtifacts(it.term) : it.term };
      }
      return {
        ...it,
        content: mapPlain(it.content),
        text: mapPlain(it.text),
        label: mapPlain(it.label),
        term: mapPlain(it.term),
      };
    });
  }
  if (Array.isArray(nextData.targets)) {
    nextData.targets = nextData.targets.map((it: any) => {
      if (!it || typeof it !== 'object') return it;
      return { ...it, content: mapPlain(it.content), text: mapPlain(it.text) };
    });
  }
  return { ...slide, data: nextData };
}
