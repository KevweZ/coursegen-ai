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
import { quizQuestionList } from './knowledgeCheckOst';

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

export function fallbackKnowledgeCheckData(title: string, moduleTitle = ''): Record<string, unknown> {
  const topic = String(title || 'this topic').replace(/^knowledge\s*check:\s*/i, '').trim() || 'this topic';
  const context = moduleTitle || topic;
  return {
    questionText: `Which statement best matches ${topic}?`,
    options: [
      { id: 'a', text: `A key idea covered in ${topic}`, isCorrect: true },
      { id: 'b', text: `An unrelated fact from outside ${context}`, isCorrect: false },
      { id: 'c', text: 'A step that is not part of this module', isCorrect: false },
      { id: 'd', text: 'None of these ideas appear in the course', isCorrect: false },
    ],
    feedback: `Review ${topic} in this module, then continue.`,
  };
}

export function ensureKnowledgeCheckPayload(slide: any, moduleTitle = ''): any {
  if (!isKnowledgeCheckSlide(slide)) return slide;
  if (quizHasLearnerPayload(slide)) return slide;

  const topic = String(slide.title || 'this topic').replace(/^knowledge\s*check:\s*/i, '').trim() || 'this topic';
  const type = String(slide.type || 'quiz');
  const framing = String(slide.content || '').trim() || `Check your understanding of ${topic}.`;

  if (type === 'true-false') {
    return {
      ...slide,
      type: 'true-false',
      content: framing,
      data: {
        questionText: `${topic} is a core idea in this module.`,
        options: [
          { id: 't', text: 'True', isCorrect: true },
          { id: 'f', text: 'False', isCorrect: false },
        ],
        feedback: `Review ${topic} in this module, then continue.`,
      },
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
    data: {
      ...(slide.data && typeof slide.data === 'object' ? slide.data : {}),
      ...fallbackKnowledgeCheckData(slide.title || topic, moduleTitle),
    },
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
  if (isKnowledgeCheckSlide(slide)) return !quizHasLearnerPayload(slide);
  const type = String(slide.type || 'content');
  if (type === 'choice-cards') return !interactionHasItems(slide, 'cards', 2);
  if (type === 'click-reveal') return !interactionHasItems(slide, 'items', 2);
  if (type === 'tabbed-horizontal' || type === 'tabbed-vertical') {
    return !interactionHasItems(slide, 'tabs', 2);
  }
  if (type === 'key-takeaways' || type === 'summary') {
    const objs = slide.data?.objectives || slide.interactions;
    const fromContent = takeawayLinesFromContent(slide.content);
    return !((Array.isArray(objs) && objs.filter(isUsableTakeaway).length >= 2) || fromContent.length >= 2);
  }
  if (type === 'content' || type === 'diagram') {
    const mermaid = String(slide.data?.mermaidCode || '').trim();
    if (type === 'diagram' && mermaid) return false;
    return isThinTeachingContent(slide.content);
  }
  return false;
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

export function normalizeKeyTakeaways(slide: any): any {
  if (!slide || (slide.type !== 'key-takeaways' && slide.type !== 'summary' && !/key\s*takeaways?/i.test(slide.title || ''))) {
    return slide;
  }

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

  next.data = {
    ...(next.data || {}),
    objectives: objectives.slice(0, 6).map((o, i) => ({
      id: o.id || String(i + 1),
      label: o.label,
      content: o.content || '',
    })),
  };
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
  let next = { ...slide };

  if (next.type === 'choice-cards') {
    const collapsed = collapseChoiceCardsOst(next.content, next.data?.prompt);
    next = {
      ...next,
      content: collapsed.content,
      data: { ...(next.data || {}), prompt: collapsed.prompt },
    };
  }

  if (next.type === 'click-reveal' && isInstructionOnlyOst(next.content)) {
    next = { ...next, content: '' };
  }

  next = degradeIncompleteInteraction(next, moduleTitle);
  next = normalizeKeyTakeaways(next);
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
