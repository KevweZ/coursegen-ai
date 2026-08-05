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
  /** Learner-facing TOC number e.g. "2.3" when available */
  slideRef?: string;
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
    slideRef: `${modIdx + 1}.${slideIdx + 1}`,
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

function checkNarration(slide: any, modIdx: number, slideIdx: number, modTitle: string, narrationEnabled: boolean, expectAudioUrls = false): QCIssue[] {
  if (!narrationEnabled) return [];
  const issues: QCIssue[] = [];
  if (!slide.voiceOverText || slide.voiceOverText.trim() === '') {
    const fallback = slide.narration?.trim() ?? '';
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'voiceOverText',
      type: 'narration_gap',
      severity: 'warning',
      message: 'Narration is enabled but this slide has no voiceover text.',
      originalText: '',
      suggestion: fallback || 'Add voiceover text for this slide.',
      autoFixable: !!fallback,
    }));
  } else if (expectAudioUrls && !slide.voiceOverUrl && !slide.audioUrl) {
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'voiceOverUrl',
      type: 'narration_gap',
      severity: 'warning',
      message: 'Narration text exists but audio has not been generated for this slide.',
      originalText: slide.voiceOverText.slice(0, 120),
      suggestion: 'Regenerate narration audio for this slide.',
      autoFixable: false,
    }));
  }
  return issues;
}

const QUIZ_TYPES = new Set([
  'quiz', 'multiple-answer', 'multiple-choice', 'multiple-answers', 'true-false',
  'sorting', 'matching', 'drop-targets', 'drag-drop', 'drag-drop-activity', 'knowledge-check',
]);

function normalizeQuizType(type: string): string {
  if (type === 'drag-drop' || type === 'drag-drop-activity') return 'drop-targets';
  if (type === 'multiple-choice') return 'quiz';
  if (type === 'multiple-answer') return 'multiple-answers';
  return type;
}

function checkQuiz(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (!QUIZ_TYPES.has(slide.type) && !/^knowledge\s*check/i.test(String(slide.title || ''))) return [];
  const issues: QCIssue[] = [];
  const data = slide.data || slide.interactions?.[0] || {};
  const qType = normalizeQuizType(slide.type);

  // Sorting / matching / drop-targets: require items (covered also by INTERACTION_TYPES empty check)
  if (qType === 'sorting') {
    if (!Array.isArray(data.items) || data.items.length < 2) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field: 'data.items',
        type: 'quiz_integrity',
        severity: 'error',
        message: 'Sorting knowledge check has no items to reorder.',
        originalText: '',
        suggestion: 'Add at least 2 sortable items.',
        autoFixable: false,
        fixActions: ['regenerate', 'simplify'],
      }));
    }
    return issues;
  }
  if (qType === 'matching') {
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    const items = Array.isArray(data.items) ? data.items : [];
    const targets = Array.isArray(data.targets) ? data.targets : [];
    if (pairs.length === 0 && (items.length === 0 || targets.length === 0)) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field: 'data',
        type: 'quiz_integrity',
        severity: 'error',
        message: 'Matching knowledge check is empty (no pairs/items).',
        originalText: '',
        suggestion: 'Add matching items and targets.',
        autoFixable: false,
        fixActions: ['regenerate', 'simplify'],
      }));
    }
    return issues;
  }
  if (qType === 'drop-targets') {
    if (!Array.isArray(data.items) || data.items.length < 2) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field: 'data.items',
        type: 'quiz_integrity',
        severity: 'error',
        message: 'Drop-targets knowledge check has no draggable items.',
        originalText: '',
        suggestion: 'Add items and categories.',
        autoFixable: false,
        fixActions: ['regenerate', 'simplify'],
      }));
    }
    return issues;
  }

  // MC / MA / TF / quiz
  const options: any[] = data.options ?? [];
  const questionText = data.questionText || data.question || data.prompt || '';

  if (!questionText || String(questionText).trim() === '') {
    issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.questionText',
      type: 'empty_field',
      severity: 'error',
      message: 'Quiz / knowledge-check question text is missing.',
      originalText: '',
      suggestion: 'Add a question for this slide.',
      autoFixable: false,
      fixActions: ['regenerate'],
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
      fixActions: ['regenerate'],
    }));
  }
  const correctCount = options.filter((o: any) => o.isCorrect || o.correct).length;
  if (correctCount === 0 && options.length > 0 && slide.type !== 'true-false') {
    // TF may encode correctAnswer as index
    const hasIndexed = data.correctAnswer !== undefined && data.correctAnswer !== null;
    if (!hasIndexed) {
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
      // Skip decorative UI fills (carousel/tab/card accent colors). These are
      // backgrounds with white overlays — not body text on a white slide.
      // Flagging them as "Apply Dark Color" destroys intentional colorful designs.
      const isDecorativeFill =
        key === 'color' &&
        (
          /\.(cards|items|tabs|hotspots|segments|options)\.\d+\.color$/i.test(path) ||
          slide.type === 'carousel-panel' ||
          slide.type === 'tabbed-horizontal' ||
          slide.type === 'tabbed-vertical' ||
          slide.type === 'folder-explorer'
        );
      if (isDecorativeFill) return;

      // Direct color property names (real text colors)
      if (/^(text_?color|font_?color|foreground|textColor|fontColor|foregroundColor)$/i.test(key)) {
        flagColor(val, path);
      }
      // Named "color" on non-decorative paths only (e.g. content color tokens)
      if (key === 'color' && (val.startsWith('#') || val.startsWith('rgb'))) {
        // Still skip generic accent fills nested under interaction payloads
        if (/\.(cards|items|tabs|hotspots|segments)\./i.test(path)) return;
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

const INTERACTION_TYPES: Record<string, (slide: any) => boolean> = {
  accordion:        s => !s.data?.items      || s.data.items.length      === 0,
  flashcards:       s => !s.data?.cards      || s.data.cards.length      === 0,
  timeline:         s => !s.data?.events     || s.data.events.length     === 0,
  branching:        s => !s.data?.nodes      || s.data.nodes.length      === 0,
  jeopardy:         s => !s.data?.categories || s.data.categories.length === 0,
  // AI pipeline uses items/targets; legacy/regen may use pairs — either form is valid
  matching:         s => {
    const d = s.data || s.interactions?.[0] || {};
    const pairs = Array.isArray(d.pairs) ? d.pairs : [];
    const items = Array.isArray(d.items) ? d.items : [];
    const targets = Array.isArray(d.targets) ? d.targets : [];
    if (pairs.length > 0) return false;
    if (items.length > 0 && targets.length > 0) return false;
    return true;
  },
  sorting:          s => {
    const d = s.data || s.interactions?.[0] || {};
    return !Array.isArray(d.items) || d.items.length === 0;
  },
  'drop-targets':   s => {
    const d = s.data || s.interactions?.[0] || {};
    return !Array.isArray(d.items) || d.items.length === 0;
  },
  'drag-drop':      s => {
    const d = s.data || s.interactions?.[0] || {};
    return !Array.isArray(d.items) || d.items.length === 0;
  },
  'drag-drop-activity': s => {
    const d = s.data || s.interactions?.[0] || {};
    return !Array.isArray(d.items) || d.items.length === 0;
  },
  hotspot:          s => !s.data?.hotspots   || s.data.hotspots.length   === 0,
  scenario:         s => !s.data?.scenes     || s.data.scenes.length     === 0,
  'carousel-panel': s => {
    const cards = s.data?.cards || s.data?.items;
    return !cards || cards.length === 0;
  },
  'click-reveal':   s => !s.data?.items || s.data.items.length === 0,
  'tabbed-horizontal': s => !s.data?.tabs || s.data.tabs.length === 0,
  'tabbed-vertical':   s => !s.data?.tabs || s.data.tabs.length === 0,
  'folder-explorer':   s => !s.data?.items || s.data.items.length === 0,
  // Quiz data lives in slide.data (dummy course) OR slide.interactions[0] (AI pipeline)
  quiz:             s => { const d = s.data || s.interactions?.[0]; return !d?.questionText && !d?.options?.length; },
  'multiple-answer':s => { const d = s.data || s.interactions?.[0]; return !d?.questionText && !d?.options?.length; },
  'multiple-choice':s => { const d = s.data || s.interactions?.[0]; return !d?.questionText && !d?.options?.length; },
  'multiple-answers':s => { const d = s.data || s.interactions?.[0]; return !d?.questionText && !d?.options?.length; },
};

/** Diagram / Mermaid failure detection — catches blank or unusable process diagrams. */
function checkDiagram(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  if (slide.type !== 'diagram') return [];
  const code = String(slide.data?.mermaidCode || slide.data?.code || '').trim();
  if (!code) {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.mermaidCode',
      type: 'interaction_empty',
      severity: 'error',
      message: 'Diagram slide has no diagram code and will appear blank (or show a render failure) to learners.',
      originalText: '',
      suggestion: '',
      autoFixable: false,
      fixActions: ['simplify', 'regenerate'],
    })];
  }
  // Markdown fences often break Mermaid renderers
  if (/```/.test(code)) {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.mermaidCode',
      type: 'interaction_incomplete',
      severity: 'error',
      message: 'Diagram code still contains markdown fences (```), which usually causes “Diagram rendering failed”.',
      originalText: code.slice(0, 200),
      suggestion: code.replace(/```(?:mermaid)?/gi, '').replace(/```/g, '').trim(),
      autoFixable: true,
      fixActions: [],
    })];
  }
  // Must start with a recognizable Mermaid diagram keyword
  const head = code.split(/\n/).map(l => l.trim()).find(l => l && !l.startsWith('%%')) || '';
  if (!/^(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|pie|mindmap|timeline|journey|quadrantChart|sankey|block-beta|C4Context)/i.test(head)) {
    return [baseIssue(slide, modIdx, slideIdx, modTitle, {
      field: 'data.mermaidCode',
      type: 'interaction_incomplete',
      severity: 'error',
      message: 'Diagram code does not start with a valid Mermaid diagram type — learners will see a render failure.',
      originalText: code.slice(0, 200),
      suggestion: '',
      autoFixable: false,
      fixActions: ['simplify', 'regenerate'],
    })];
  }
  return [];
}

function checkEmptyInteraction(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  const isEmpty = INTERACTION_TYPES[slide.type];
  if (!isEmpty) return [];
  if (!isEmpty(slide)) return []; // data present and non-empty, skip
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

// ── Stub / Placeholder Content Check ─────────────────────────────────────────
// Detects AI-generated "under construction", placeholder, or stub text that
// slipped through the hydration pipeline and reached the learner view.
const STUB_PATTERNS = [
  /under construction/i,
  /\[hotspot\]\s*interaction/i,
  /\[.*?\]\s*interaction/i,
  /coming soon/i,
  /placeholder/i,
  /\[TODO\]/i,
  /to be (added|completed|filled|written)/i,
  /this slide covers key content for module/i,
];

function checkStubContent(slide: any, modIdx: number, slideIdx: number, modTitle: string): QCIssue[] {
  const issues: QCIssue[] = [];
  const fieldsToCheck: { field: string; value: string }[] = [];

  if (slide.content) fieldsToCheck.push({ field: 'content', value: slide.content });
  if (slide.voiceOverText) fieldsToCheck.push({ field: 'voiceOverText', value: slide.voiceOverText });

  // Also check common data fields
  (slide.data?.items ?? []).forEach((item: any, i: number) => {
    if (item.content) fieldsToCheck.push({ field: `data.items.${i}.content`, value: item.content });
  });

  for (const { field, value } of fieldsToCheck) {
    if (STUB_PATTERNS.some(rx => rx.test(value))) {
      issues.push(baseIssue(slide, modIdx, slideIdx, modTitle, {
        field,
        type: 'interaction_empty',
        severity: 'error',
        message: `Slide contains placeholder/stub text that will confuse learners. The interaction may not have generated correctly.`,
        originalText: value.slice(0, 200),
        suggestion: '',
        autoFixable: false,
        fixActions: ['simplify', 'regenerate'],
      }));
      break; // one issue per slide is enough
    }
  }
  return issues;
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

  // If any slide already has generated audio, expect the rest with VO text to have URLs too
  const anyAudioUrl = (course.modules ?? []).some((m: any) =>
    (m.slides ?? []).some((s: any) => !!(s.voiceOverUrl || s.audioUrl))
  );

  (course.modules ?? []).forEach((mod: any, modIdx: number) => {
    const modTitle = mod.title ?? `Module ${modIdx + 1}`;
    (mod.slides ?? []).forEach((slide: any, slideIdx: number) => {
      totalSlides++;
      // Skip overview-like / objectives slides left in modules — they are authoring shells, not learner bugs
      const title = String(slide.title || '');
      if (/module\s+\d+\s*[—\-:]?\s*overview/i.test(title) || /^(learning\s+)?objectives?$/i.test(title.trim())) {
        return;
      }
      issues.push(...checkEmptyTitle(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkTitleLength(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkContentEmpty(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkContentLength(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkNarration(slide, modIdx, slideIdx, modTitle, narrationEnabled, anyAudioUrl));
      issues.push(...checkQuiz(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkAccordion(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkFlashcards(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkTimeline(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkEmptyInteraction(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkDiagram(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkStubContent(slide, modIdx, slideIdx, modTitle));  // A3: hotspot stubs
      issues.push(...checkColorContrast(slide, modIdx, slideIdx, modTitle));
      issues.push(...checkThemeConsistency(slide, modIdx, slideIdx, modTitle));
    });
  });

  // Drop no-op "fixes" that would re-flag forever (suggestion empty or identical)
  const cleaned = issues.filter(i => {
    if (!i.autoFixable) return true;
    if (!i.suggestion || i.suggestion === i.originalText) return false;
    return true;
  });

  return {
    courseTitle: course.title ?? 'Untitled Course',
    runAt: new Date().toISOString(),
    score: calcScore(cleaned, totalSlides),
    totalIssues: cleaned.length,
    errors:   cleaned.filter(i => i.severity === 'error').length,
    warnings: cleaned.filter(i => i.severity === 'warning').length,
    info:     cleaned.filter(i => i.severity === 'info').length,
    issues: cleaned,
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
