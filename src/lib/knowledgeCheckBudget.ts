import type { TerminalObjectiveGroup } from '../types/course';
import {
  isKnowledgeCheckSlide,
  isSummarySlide,
  isTeachingSlide,
  normalizeTerminalGroups,
  titleFromEnabling,
} from './enablingCoverage';

export type KnowledgeCheckMode = 'total' | 'per-module';

export interface KnowledgeCheckBudgetOptions {
  includeKnowledgeChecks: boolean;
  knowledgeCheckMode: KnowledgeCheckMode;
  knowledgeCheckCount: number;
  quizActivityTypes: string[];
  objectives?: Array<string | TerminalObjectiveGroup> | null;
}

type OutlineSlide = {
  id?: string;
  type?: string;
  title?: string;
  enablingIndex?: number;
  [k: string]: any;
};

function newSlideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseEnablingIndex(slide: { enablingIndex?: unknown }): number | null {
  const n = Number(slide?.enablingIndex);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function stripEnablingIndex<T extends { enablingIndex?: unknown }>(slide: T): T {
  if (slide?.enablingIndex == null) return slide;
  const { enablingIndex: _ignored, ...rest } = slide;
  return rest as T;
}

const QUIZ_DATA_KEYS = [
  'questionText', 'options', 'feedback', 'scenarioText', 'questions',
  'correctAnswer', 'correctOrder', 'pairs', 'targets', 'categories', 'items',
];

function asTeachingContent(hydrated: OutlineSlide, outline: OutlineSlide): string {
  const existing = String(hydrated?.content || '').trim();
  if (existing && !/^knowledge\s*check/i.test(existing)) return existing;
  const q = String(hydrated?.data?.questionText || hydrated?.data?.prompt || '').trim();
  if (q) return `- ${q.replace(/\?$/, '')}`;
  return String(outline?.content || '').trim();
}

function lockHydratedKind(hydrated: OutlineSlide, outline: OutlineSlide): OutlineSlide {
  const base = hydrated && typeof hydrated === 'object' ? { ...hydrated } : {};
  const outlineKc = isKnowledgeCheckSlide(outline);
  const next: OutlineSlide = {
    ...base,
    id: outline.id || base.id,
    title: outline.title || base.title,
  };
  if (outline.enablingIndex != null) next.enablingIndex = outline.enablingIndex;
  else delete next.enablingIndex;

  if (outlineKc) {
    next.type = outline.type || base.type || 'quiz';
    if (!/^knowledge\s*check/i.test(String(next.title || ''))) {
      next.title = outline.title || `Knowledge Check: ${String(next.title || 'Practice')}`;
    }
    return next;
  }

  next.type = outline.type && !isKnowledgeCheckSlide(outline) ? outline.type : (isKnowledgeCheckSlide(base) ? 'content' : (base.type || 'content'));
  if (isKnowledgeCheckSlide({ type: next.type, title: next.title })) {
    next.type = outline.type || 'content';
    next.title = outline.title || String(next.title || '').replace(/^knowledge\s*check:\s*/i, '');
  }
  if (isKnowledgeCheckSlide(base) && !isKnowledgeCheckSlide(next)) {
    next.content = asTeachingContent(base, outline);
    if (next.data && typeof next.data === 'object') {
      const data = { ...next.data };
      for (const k of QUIZ_DATA_KEYS) delete data[k];
      next.data = Object.keys(data).length ? data : undefined;
    }
    delete next.interactions;
  }
  return next;
}

/**
 * Hydrate must not invent extra knowledge checks or convert teaching slides
 * into quizzes. Map the model output 1:1 onto the outline chunk.
 */
export function alignHydratedSlidesToOutline(
  parsedSlides: OutlineSlide[] | null | undefined,
  outlineChunk: OutlineSlide[] | null | undefined,
): OutlineSlide[] {
  const list = Array.isArray(parsedSlides) ? parsedSlides.filter(Boolean) : [];
  const outline = Array.isArray(outlineChunk) ? outlineChunk.filter(Boolean) : [];
  if (!outline.length) return list;
  const used = new Set<number>();
  const pickIndex = (outlineSlide: OutlineSlide, position: number): number => {
    const id = String(outlineSlide?.id || '').trim();
    if (id) {
      const idIdx = list.findIndex((s, i) => !used.has(i) && String(s?.id || '').trim() === id);
      if (idIdx >= 0) return idIdx;
    }
    const want = String(outlineSlide?.title || '').trim().toLowerCase();
    if (want) {
      const titleIdx = list.findIndex((s, i) => !used.has(i) && String(s?.title || '').trim().toLowerCase() === want);
      if (titleIdx >= 0) return titleIdx;
    }
    const wantKc = isKnowledgeCheckSlide(outlineSlide);
    const kindIdx = list.findIndex((s, i) => !used.has(i) && isKnowledgeCheckSlide(s) === wantKc);
    if (kindIdx >= 0) return kindIdx;
    if (!used.has(position) && list[position]) return position;
    return list.findIndex((_, i) => !used.has(i));
  };

  return outline.map((o, pos) => {
    const idx = pickIndex(o, pos);
    if (idx < 0) return o;
    used.add(idx);
    return lockHydratedKind(list[idx], o);
  });
}

/**
 * Per-module KC slots from Course Settings.
 * Total mode: even split, leftover checks go to denser modules (more teaching slides).
 * Example: 10 checks, 4 modules → 2 each, then the 2 largest get a 3rd.
 */
export function allocateKnowledgeCheckSlots(
  moduleCount: number,
  mode: KnowledgeCheckMode,
  count: number,
  weights: number[] = [],
): number[] {
  if (moduleCount <= 0) return [];
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (mode === 'per-module') {
    return Array.from({ length: moduleCount }, () => n);
  }

  const base = Math.floor(n / moduleCount);
  const remainder = n % moduleCount;
  const slots = Array.from({ length: moduleCount }, () => base);
  const ranked = Array.from({ length: moduleCount }, (_, i) => ({
    i,
    w: Number.isFinite(weights[i]) ? weights[i] : 0,
  })).sort((a, b) => b.w - a.w || a.i - b.i);

  for (let k = 0; k < remainder; k++) {
    slots[ranked[k].i] += 1;
  }
  return slots;
}

function rankKnowledgeChecks(kcs: OutlineSlide[], enablingCount: number): OutlineSlide[] {
  const tagged = kcs.map((s, order) => {
    const existing = parseEnablingIndex(s);
    const inferred = existing ?? (enablingCount > 0 ? order % enablingCount : null);
    return { slide: s, ei: inferred, order };
  });

  const unique: typeof tagged = [];
  const rest: typeof tagged = [];
  const seen = new Set<number>();
  for (const item of tagged) {
    if (item.ei != null && !seen.has(item.ei)) {
      seen.add(item.ei);
      unique.push(item);
    } else {
      rest.push(item);
    }
  }
  return [...unique, ...rest].map(item => item.slide);
}

function nextUncoveredEnabling(kept: OutlineSlide[], enablingCount: number): number {
  if (enablingCount <= 0) return 0;
  const covered = new Set(
    kept.map(parseEnablingIndex).filter((n): n is number => n != null),
  );
  for (let i = 0; i < enablingCount; i++) {
    if (!covered.has(i)) return i;
  }
  return kept.length % enablingCount;
}

function makeKnowledgeCheckSlide(
  quizTypes: string[],
  index: number,
  enablingText: string,
  enablingIndex: number,
): OutlineSlide {
  const type = quizTypes[index % Math.max(1, quizTypes.length)] || 'quiz';
  const label = titleFromEnabling(enablingText, enablingIndex);
  return {
    id: newSlideId(),
    type,
    title: `Knowledge Check: ${label}`,
    enablingIndex,
  };
}

/**
 * Cap / fill in-module knowledge checks to match Course Settings.
 * Enabling coverage (1–2 teaching slides per enabling) must not change this count.
 */
export function ensureKnowledgeCheckBudget<T extends {
  modules?: Array<{
    id?: string;
    title?: string;
    slides?: OutlineSlide[];
    [k: string]: any;
  }>;
}>(outline: T, options: KnowledgeCheckBudgetOptions): T {
  const modules = [...(outline.modules || [])];
  if (modules.length === 0) return outline;

  const quizTypes = (options.quizActivityTypes || []).filter(Boolean);
  const include = options.includeKnowledgeChecks !== false && quizTypes.length > 0;
  const groups = normalizeTerminalGroups(options.objectives);
  const weights = modules.map(mod => (mod.slides || []).filter(s => isTeachingSlide(s)).length);
  const slots = include
    ? allocateKnowledgeCheckSlots(
      modules.length,
      options.knowledgeCheckMode === 'total' ? 'total' : 'per-module',
      Math.max(0, Math.floor(options.knowledgeCheckCount ?? 0)),
      weights,
    )
    : modules.map(() => 0);

  const nextModules = modules.map((mod, mi) => {
    const slides = [...(mod.slides || [])];
    const teaching = slides.filter(s => isTeachingSlide(s));
    const summaries = slides.filter(s => isSummarySlide(s));
    const other = slides.filter(s => !isTeachingSlide(s) && !isKnowledgeCheckSlide(s) && !isSummarySlide(s));
    const kcs = slides.filter(s => isKnowledgeCheckSlide(s));
    const target = slots[mi] ?? 0;
    const ens = groups[mi]?.enablingObjectives || [];

    if (target <= 0) {
      return {
        ...mod,
        slides: [...teaching, ...other, ...summaries.map(stripEnablingIndex)],
      };
    }

    const ranked = rankKnowledgeChecks(kcs, ens.length);
    const kept: OutlineSlide[] = ranked.slice(0, target).map((s, i) => {
      if (parseEnablingIndex(s) != null) return s;
      return { ...s, enablingIndex: ens.length > 0 ? i % ens.length : 0 };
    });

    while (kept.length < target) {
      const ei = nextUncoveredEnabling(kept, ens.length);
      kept.push(makeKnowledgeCheckSlide(quizTypes, kept.length, ens[ei] || mod.title || 'Practice', ei));
    }

    return {
      ...mod,
      slides: [
        ...teaching,
        ...kept.map(stripEnablingIndex),
        ...other.map(stripEnablingIndex),
        ...summaries.map(stripEnablingIndex),
      ],
    };
  });

  return { ...outline, modules: nextModules };
}
