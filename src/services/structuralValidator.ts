/**
 * Structural Validator — client-side, synchronous, no AI.
 * Scans a CourseOutline for empty fields, text overflow, quiz integrity issues,
 * narration gaps, interaction completeness, and theme consistency problems.
 */

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueType =
  | 'empty_field'
  | 'text_overflow'
  | 'quiz_integrity'
  | 'narration_gap'
  | 'interaction_incomplete'
  | 'interaction_empty'
  | 'color_contrast'
  | 'theme_inconsistency'
  | 'spelling'
  | 'grammar'
  | 'clarity'
  | 'consistency';

export type FixAction = 'simplify' | 'regenerate' | 'fix_color';

export interface QCIssue {
  id: string;
  slideId: string;
  slideTitle: string;
  moduleTitle: string;
  moduleIndex: number;
  slideIndex: number;
  field: string;       // e.g. 'content', 'title', 'data.items.2.content'
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  originalText: string;
  suggestion: string;
  autoFixable: boolean;
  /** Special actions available beyond confirm/decline */
  fixActions?: FixAction[];
}

export interface QCReport {
  courseTitle: string;
  runAt: string;
  score: number;       // 0–100
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: QCIssue[];
}

// ── Text length limits per slide / field type ────────────────────────────────
const LIMITS = {
  title: 120,
  content_slide: 1400,
  key_takeaways: 1200,
  summary: 1400,
  accordion_item: 500,
  flashcard_front: 100,
  flashcard_back: 350,
  timeline_event: 450,
  quiz_question: 280,
  quiz_option: 140,
};

// Patterns that hint at hardcoded light colours inside text/HTML strings
const LIGHT_COLOUR_PATTERNS = [
  /#ffffff/i, /#fff\b/i, /color:\s*white/i, /background:\s*white/i,
  /background-color:\s*white/i, /background-color:\s*#fff/i,
  /color:\s*black/i, /color:\s*#000/i,
];

// ── WCAG Colour Contrast Utilities ───────────────────────────────────────────

function parseColor(str: string): [number, number, number] | null {
  const s = str.trim();
  // Hex
  const hexM = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexM) {
    let h = hexM[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4),16)];
  }
  // rgb / rgba
  const rgbM = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbM) return [+rgbM[1], +rgbM[2], +rgbM[3]];
  // Common named light colours that fail contrast on white
  const named: Record<string,[number,number,number]> = {
    gray:[128,128,128], grey:[128,128,128], silver:[192,192,192],
    lightgray:[211,211,211], lightgrey:[211,211,211],
    gainsboro:[220,220,220], whitesmoke:[245,245,245],
    white:[255,255,255],
  };
  return named[s.toLowerCase()] ?? null;
}

function relativeLuminance([r,g,b]: [number,number,number]): number {
  return [r,g,b].reduce((sum, v, i) => {
    const c = v / 255;
    const l = c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return sum + l * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function wcagRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const WHITE_LUM = 1; // luminance of white background
const DARK_TEXT_SAFE = '#1e293b'; // slate-900, readable on white

let _issueCounter = 0;
const makeId = () => `qc-${Date.now()}-${_issueCounter++}`;

function baseIssue(
  slide: any,
  modIdx: number,
  slideIdx: number,
  modTitle: string,
  overrides: Partial<QCIssue>
): QCIssue {
  return {
    id: makeId(),
    slideId: slide.id,
    slideTitle: slide.title || '(untitled)',
    moduleTitle: modTitle,
    moduleIndex: modIdx,
    slideIndex: slideIdx,
    field: '',
    type: 'empty_field',
    severity: 'warning',
    message: '',
    originalText: '',
    suggestion: '',
    autoFixable: false,
    ...overrides,
  };
}

// ── Individual checks ────────────────────────────────────────────────────────

function checkEmptyTitle(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (!slide.title || slide.title.trim() === '') {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'title',
      type: 'empty_field',
      severity: 'error',
      message: 'Slide has no title.',
      originalText: slide.title ?? '',
      suggestion: 'Add a descriptive title for this slide.',
      autoFixable: false,
    })];
  }
  return [];
}

function checkTitleLength(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (slide.title && slide.title.length > LIMITS.title) {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'title',
      type: 'text_overflow',
      severity: 'warning',
      message: `Title is ${slide.title.length} chars (recommended ≤ ${LIMITS.title}).`,
      originalText: slide.title,
      suggestion: slide.title.slice(0, LIMITS.title - 3) + '...',
      autoFixable: true,
    })];
  }
  return [];
}

function checkContentEmpty(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  const types = ['content', 'key-takeaways', 'summary', 'title'];
  if (!types.includes(slide.type)) return [];
  if (!slide.content || slide.content.trim() === '') {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'content',
      type: 'empty_field',
      severity: 'error',
      message: 'Slide content is empty.',
      originalText: '',
      suggestion: 'Add body content to this slide.',
      autoFixable: false,
    })];
  }
  return [];
}

function checkContentLength(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  const limits: Record<string, number> = {
    content: LIMITS.content_slide,
    'key-takeaways': LIMITS.key_takeaways,
    summary: LIMITS.summary,
  };
  const limit = limits[slide.type];
  if (!limit || !slide.content) return [];
  const stripped = slide.content.replace(/[#*_>\-`]/g, ' ').trim();
  if (stripped.length > limit) {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'content',
      type: 'text_overflow',
      severity: 'info',
      message: `Content is ${stripped.length} chars (recommended ≤ ${limit}). Learners may find it hard to read.`,
      originalText: slide.content,
      suggestion: slide.content,
      autoFixable: false,
    })];
  }
  return [];
}

function checkNarration(slide: any, modIdx: number, slideIdx: number, modTitle: string, narrationEnabled: boolean): QCIssue[] {
  if (!narrationEnabled) return [];
  if (!slide.voiceOverText || slide.voiceOverText.trim() === '') {
    const fallback = slide.narration?.trim() ?? '';
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'voiceOverText',
      type: 'narration_gap',
      severity: 'warning',
      message: 'Narration is enabled but this slide has no voiceover text.',
      originalText: '',
      suggestion: fallback || 'Add voiceover text for this slide.',
      autoFixable: !!fallback,
    })];
  }
  return [];
}

function checkQuiz(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (slide.type !== 'quiz' && slide.type !== 'multiple-answer') return [];
  const issues: QCIssue[] = [];
  const data = slide.data || {};
  const options: any[] = data.options ?? [];

  if (!data.questionText || data.questionText.trim() === '') {
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.questionText',
      type: 'empty_field',
      severity: 'error',
      message: 'Quiz question text is missing.',
      originalText: '',
      suggestion: 'Add a question for this quiz slide.',
      autoFixable: false,
    }));
  }
  if (options.length < 2) {
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.options',
      type: 'quiz_integrity',
      severity: 'error',
      message: `Quiz has only ${options.length} option(s). At least 2 are required.`,
      originalText: JSON.stringify(options),
      suggestion: 'Add more answer options.',
      autoFixable: false,
    }));
  }
  const correctCount = options.filter((o: any) => o.isCorrect).length;
  if (correctCount === 0 && options.length > 0) {
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.options',
      type: 'quiz_integrity',
      severity: 'error',
      message: 'No correct answer is marked for this quiz.',
      originalText: JSON.stringify(options.map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))),
      suggestion: 'Mark at least one option as correct.',
      autoFixable: false,
    }));
  }
  return issues;
}

function checkAccordion(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (slide.type !== 'accordion') return [];
  const issues: QCIssue[] = [];
  const items: any[] = slide.data?.items ?? [];

  if (items.length < 2) {
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.items',
      type: 'interaction_incomplete',
      severity: 'warning',
      message: `Accordion has only ${items.length} item(s). At least 2 are recommended.`,
      originalText: '',
      suggestion: 'Add more accordion sections.',
      autoFixable: false,
    }));
  }

  items.forEach((item: any, i: number) => {
    if (!item.content || item.content.trim() === '') {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field: `data.items.${i}.content`,
        type: 'empty_field',
        severity: 'error',
        message: `Accordion item "${item.title}" has empty content.`,
        originalText: '',
        suggestion: 'Add content to this accordion section.',
        autoFixable: false,
      }));
    } else if (item.content.length > LIMITS.accordion_item) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field: `data.items.${i}.content`,
        type: 'text_overflow',
        severity: 'info',
        message: `Accordion item "${item.title}" content is ${item.content.length} chars (recommended ≤ ${LIMITS.accordion_item}).`,
        originalText: item.content,
        suggestion: item.content.slice(0, LIMITS.accordion_item - 3) + '...',
        autoFixable: false,
      }));
    }
  });
  return issues;
}

function checkFlashcards(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (slide.type !== 'flashcards') return [];
  const issues: QCIssue[] = [];
  const cards: any[] = slide.data?.cards ?? [];

  if (cards.length === 0) {
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.cards',
      type: 'interaction_incomplete',
      severity: 'error',
      message: 'Flashcard set has no cards.',
      originalText: '',
      suggestion: 'Add at least one flashcard.',
      autoFixable: false,
    }));
  }
  cards.forEach((card: any, i: number) => {
    if (card.front && card.front.length > LIMITS.flashcard_front) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field: `data.cards.${i}.front`,
        type: 'text_overflow',
        severity: 'warning',
        message: `Flashcard ${i + 1} front is too long (${card.front.length} chars). Keep fronts concise (≤ ${LIMITS.flashcard_front}).`,
        originalText: card.front,
        suggestion: card.front.slice(0, LIMITS.flashcard_front - 3) + '...',
        autoFixable: true,
      }));
    }
  });
  return issues;
}

function checkTimeline(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (slide.type !== 'timeline') return [];
  const events: any[] = slide.data?.events ?? [];
  if (events.length === 0) {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.events',
      type: 'interaction_incomplete',
      severity: 'error',
      message: 'Timeline has no events.',
      originalText: '',
      suggestion: 'Add at least one timeline event.',
      autoFixable: false,
    })];
  }
  return [];
}

function checkThemeConsistency(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  const issues: QCIssue[] = [];
  const toCheck = [
    { field: 'content', value: slide.content },
    ...(slide.data?.items ?? []).map((it: any, i: number) => ({ field: `data.items.${i}.content`, value: it.content })),
    ...(slide.data?.cards ?? []).map((c: any, i: number) => ({ field: `data.cards.${i}.back`, value: c.back })),
    ...(slide.data?.events ?? []).map((e: any, i: number) => ({ field: `data.events.${i}.content`, value: e.content })),
  ];

  toCheck.forEach(({ field, value }) => {
    if (!value) return;
    const matched = LIGHT_COLOUR_PATTERNS.find(rx => rx.test(value));
    if (matched) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field,
        type: 'theme_inconsistency',
        severity: 'warning',
        message: `Hardcoded light colour detected in "${field}". This may appear invisible in dark/unified theme.`,
        originalText: value,
        suggestion: value,
        autoFixable: false,
      }));
    }
  });
  return issues;
}

// ── Colour Contrast Check ────────────────────────────────────────────────────

function checkColorContrast(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  const issues: QCIssue[] = [];

  const flagColor = (colorStr: string, field: string) => {
    const rgb = parseColor(colorStr);
    if (!rgb) return;
    const lum = relativeLuminance(rgb);
    const ratio = wcagRatio(lum, WHITE_LUM);
    // Only flag if it's being used as a text color (light colors on white background)
    if (ratio < 4.5) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field,
        type: 'color_contrast',
        severity: ratio < 3.0 ? 'error' : 'warning',
        message: `Low contrast: "${colorStr}" achieves only ${ratio.toFixed(1)}:1 against white (WCAG AA requires 4.5:1 for text). This text may be unreadable.`,
        originalText: colorStr,
        suggestion: DARK_TEXT_SAFE,
        autoFixable: true,
        fixActions: ['fix_color'],
      }));
    }
  };

  // Recursively scan data object for color-related properties and inline styles
  const scan = (val: any, path: string) => {
    if (!val) return;
    if (typeof val === 'string') {
      const key = path.split('.').pop() ?? '';
      // Direct color property names
      if (/^(text_?color|font_?color|foreground|textColor|fontColor|foregroundColor)$/i.test(key)) {
        flagColor(val, path);
      }
      // Named "color" property — check only if it looks like a hex/rgb color
      if (key === 'color' && (val.startsWith('#') || val.startsWith('rgb'))) {
        flagColor(val, path);
      }
      // Inline style "color: ..." (explicitly not background-color)
      const styleRe = /(?<![a-z-])color\s*:\s*(#[0-9a-f]{3,6}|rgb[a]?\([^)]+\)|(?:gray|grey|silver|white|lightgray|lightgrey|gainsboro|whitesmoke))/gi;
      let m: RegExpExecArray | null;
      while ((m = styleRe.exec(val)) !== null) {
        flagColor(m[1], path);
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => scan(item, `${path}.${i}`));
    } else if (typeof val === 'object') {
      Object.entries(val).forEach(([k, v]) => scan(v, `${path}.${k}`));
    }
  };

  scan(slide.data, 'data');
  if (slide.content) scan(slide.content, 'content');
  return issues;
}

// ── Empty Interaction Check ───────────────────────────────────────────────────

const INTERACTION_TYPES: Record<string, (data: any) => boolean> = {
  accordion:        d => !d?.items      || d.items.length      === 0,
  flashcards:       d => !d?.cards      || d.cards.length      === 0,
  timeline:         d => !d?.events     || d.events.length     === 0,
  branching:        d => !d?.nodes      || d.nodes.length      === 0,
  jeopardy:         d => !d?.categories || d.categories.length === 0,
  matching:         d => !d?.pairs      || d.pairs.length      === 0,
  hotspot:          d => !d?.hotspots   || d.hotspots.length   === 0,
  scenario:         d => !d?.scenes     || d.scenes.length     === 0,
  quiz:             d => !d?.questionText && !d?.options?.length,
  'multiple-answer':d => !d?.questionText && !d?.options?.length,
};

function checkEmptyInteraction(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  const isEmpty = INTERACTION_TYPES[slide.type];
  if (!isEmpty) return [];
  const data = slide.data;
  if (!isEmpty(!data ? null : data)) return []; // data present and non-empty, skip
  // data is null or empty for this interaction type
  return [baseIssue(slide, modIdx, slideIdx, modTitle, {
    field: 'data',
    type: 'interaction_empty',
    severity: 'error',
    message: `This ${slide.type} interaction has no content and will appear blank to learners.`,
    originalText: '',
    suggestion: '',
    autoFixable: false,
    fixActions: ['simplify', 'regenerate'],
  })];
}

// ── Score calculation ────────────────────────────────────────────────────────
function calcScore(issues: QCIssue[], totalSlides: number): number {
  if (totalSlides === 0) return 100;
  const penalties = issues.reduce((sum, iss) => {
    if (iss.severity === 'error')   return sum + 10;
    if (iss.severity === 'warning') return sum + 4;
    return sum + 1;
  }, 0);
  return Math.max(0, Math.round(100 - (penalties / totalSlides) * 10));
}

// ── Main entry point ─────────────────────────────────────────────────────────
export function validateCourse(course: any, narrationEnabled = false): QCReport {
  const issues: QCIssue[] = [];
  let totalSlides = 0;

  (course.modules ?? []).forEach((mod: any, modIdx: number) => {
    const modTitle = mod.title ?? `Module ${modIdx + 1}`;
    (mod.slides ?? []).forEach((slide: any, slideIdx: number) => {
      totalSlides++;
      issues.push(...checkEmptyTitle(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkTitleLength(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkContentEmpty(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkContentLength(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkNarration(slide, modIdx, slideIdx, modTitle, narrationEnabled));
      issues.push(...checkQuiz(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkAccordion(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkFlashcards(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkTimeline(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkEmptyInteraction(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkColorContrast(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkThemeConsistency(slide, modIdx, slideIdx, modTitle));
    });
  });

  return {
    courseTitle: course.title ?? 'Untitled Course',
    runAt: new Date().toISOString(),
    score: calcScore(issues, totalSlides),
    totalIssues: issues.length,
    errors:   issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info:     issues.filter(i => i.severity === 'info').length,
    issues,
  };
}

// ── Fix applicator ───────────────────────────────────────────────────────────
/**
 * Applies fixes to a deep-cloned copy of the course. Field paths use dot notation,
 * e.g. "content", "data.items.2.content", "voiceOverText".
 */
export function applyFixes(course: any, confirmedIssues: QCIssue[]): any {
  const cloned = JSON.parse(JSON.stringify(course));

  confirmedIssues.forEach(issue => {
    const mod = cloned.modules?.[issue.moduleIndex];
    if (!mod) return;
    const slide = mod.slides?.[issue.slideIndex];
    if (!slide || slide.id !== issue.slideId) return;

    const parts = issue.field.split('.');
    let obj = slide;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (obj == null) return;
      obj = obj[key];
    }
    const lastKey = parts[parts.length - 1];
    if (obj != null && lastKey) {
      obj[lastKey] = issue.suggestion;
    }
  });

  return cloned;
}
