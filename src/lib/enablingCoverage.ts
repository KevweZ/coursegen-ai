import type { TerminalObjectiveGroup } from '../types/course';

const QUIZ_TYPES = new Set([
  'quiz', 'sorting', 'matching', 'drop-targets',
  'multiple-choice', 'multiple-answers', 'multiple-answer',
  'true-false', 'knowledge-check',
  'drag-drop', 'drag-drop-activity',
]);

const EXAM_NARRATION_SKIP_TYPES = new Set([
  'mastery-exam', 'exam-intro', 'exam-results',
]);

const SUMMARY_TYPES = new Set(['key-takeaways', 'summary']);

export const MAX_TEACHING_SLIDES_PER_ENABLING = 2;

export function normalizeTerminalGroups(
  objectives: Array<string | TerminalObjectiveGroup> | undefined | null,
): TerminalObjectiveGroup[] {
  return (objectives || [])
    .map(obj => {
      if (typeof obj === 'string') {
        const term = obj.trim();
        return term ? { terminalObjective: term, enablingObjectives: [] as string[] } : null;
      }
      const term = String(obj?.terminalObjective || '').trim();
      const ens = (obj?.enablingObjectives || []).map(e => String(e || '').trim()).filter(Boolean);
      if (!term && ens.length === 0) return null;
      return { terminalObjective: term || 'Untitled objective', enablingObjectives: ens };
    })
    .filter((g): g is TerminalObjectiveGroup => !!g);
}

export function isKnowledgeCheckSlide(slide: { type?: string; title?: string } | null | undefined): boolean {
  if (!slide) return false;
  const type = String(slide.type || '');
  if (QUIZ_TYPES.has(type)) return true;
  return /^knowledge\s*check/i.test(String(slide.title || '').trim());
}

/** In-module knowledge checks and mastery-quiz slides have no spoken narration. */
export function slideSkipsNarration(
  slide: { type?: string; title?: string; id?: string } | null | undefined,
): boolean {
  if (!slide) return false;
  const type = String(slide.type || '');
  if (EXAM_NARRATION_SKIP_TYPES.has(type)) return true;
  const id = String(slide.id || '');
  if (id === '__mastery-exam__' || id === '__exam-intro__' || id === '__exam-results__') return true;
  return isKnowledgeCheckSlide(slide);
}

/** Clear spoken scripts / audio URLs on assessment slides (hydrate + regen). */
export function stripSlideNarration<T extends Record<string, any>>(slide: T): T {
  if (!slide || !slideSkipsNarration(slide)) return slide;
  const next: any = { ...slide, voiceOverText: '', narration: '' };
  delete next.voiceOverUrl;
  delete next.audioUrl;
  if (next.data && typeof next.data === 'object') {
    const data = { ...next.data };
    const stripList = (arr: any[]) => arr.map((item: any) => {
      if (!item || typeof item !== 'object') return item;
      const { voiceOverUrl: _ignored, ...rest } = item;
      return { ...rest, voiceOverText: '' };
    });
    if (Array.isArray(data.tabs)) data.tabs = stripList(data.tabs);
    if (Array.isArray(data.items)) data.items = stripList(data.items);
    next.data = data;
  }
  return next;
}

export function isSummarySlide(slide: { type?: string; title?: string } | null | undefined): boolean {
  if (!slide) return false;
  const type = String(slide.type || '');
  if (SUMMARY_TYPES.has(type)) return true;
  return /module\s+summary|key\s*takeaways?/i.test(String(slide.title || ''));
}

export function isTeachingSlide(slide: { type?: string; title?: string } | null | undefined): boolean {
  if (!slide) return false;
  const type = String(slide.type || '');
  if (type === 'game-template' || type === 'module-cover' || type === 'module-overview' || type === 'title') {
    return false;
  }
  return !isKnowledgeCheckSlide(slide) && !isSummarySlide(slide);
}

function newSlideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Short Title Case label from an enabling sentence — used when we must insert a missing teaching slide. */
export function titleFromEnabling(text: string, index: number): string {
  const stripped = String(text || '')
    .replace(/^the learner will\s+/i, '')
    .replace(/\.$/, '')
    .trim();
  const words = stripped.split(/\s+/).filter(Boolean).slice(0, 8);
  if (words.length === 0) return `Enabling objective ${index + 1}`;
  const titled = words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && ['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'as'].includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
  return titled;
}

function makeTeachingSlide(title: string, enablingIndex: number): {
  id: string;
  type: string;
  title: string;
  enablingIndex: number;
} {
  return {
    id: newSlideId(),
    type: 'content',
    title,
    enablingIndex,
  };
}

function parseEnablingIndex(slide: { enablingIndex?: unknown }): number | null {
  const n = Number(slide?.enablingIndex);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export interface EnablingCoverageGap {
  moduleIndex: number;
  moduleTitle: string;
  enablingIndex: number;
  enablingText: string;
  slideId: string;
  slideTitle: string;
  slideIndex: number;
}

/**
 * After the outline model returns, force one module per terminal and
 * 1–2 teaching slides per enabling (insert missing, cap extras).
 */
export function ensureEnablingSlideCoverage<T extends {
  modules?: Array<{
    id?: string;
    title?: string;
    slides?: Array<{ id?: string; type?: string; title?: string; enablingIndex?: number; [k: string]: any }>;
    [k: string]: any;
  }>;
}>(outline: T, objectives: Array<string | TerminalObjectiveGroup> | undefined | null): T {
  const groups = normalizeTerminalGroups(objectives);
  if (groups.length === 0) return outline;

  const modules = [...(outline.modules || [])];

  while (modules.length < groups.length) {
    const g = groups[modules.length];
    modules.push({
      id: newSlideId(),
      title: titleFromEnabling(g.terminalObjective, modules.length),
      slides: [],
    });
  }
  if (modules.length > groups.length) {
    modules.length = groups.length;
  }

  const nextModules = modules.map((mod, mi) => {
    const ens = groups[mi].enablingObjectives;
    const slides = [...(mod.slides || [])];
    const kcAndSummary = slides.filter(s => !isTeachingSlide(s)).map(s => {
      if (s.enablingIndex == null) return s;
      const { enablingIndex: _ignored, ...rest } = s;
      return rest;
    });
    const teaching = slides.filter(s => isTeachingSlide(s));

    if (ens.length === 0) {
      if (teaching.length === 0) {
        return {
          ...mod,
          slides: [
            makeTeachingSlide(titleFromEnabling(groups[mi].terminalObjective, 0), 0),
            ...kcAndSummary,
          ],
        };
      }
      return {
        ...mod,
        slides: [
          ...teaching.map((s, i) => ({ ...s, enablingIndex: parseEnablingIndex(s) ?? i })),
          ...kcAndSummary,
        ],
      };
    }

    const buckets: typeof teaching[] = ens.map(() => []);
    const unindexed: typeof teaching = [];

    for (const slide of teaching) {
      const idx = parseEnablingIndex(slide);
      if (idx != null && idx < ens.length) {
        if (buckets[idx].length < MAX_TEACHING_SLIDES_PER_ENABLING) {
          buckets[idx].push({ ...slide, enablingIndex: idx });
        }
        // extras beyond the cap are dropped at outline time
      } else {
        unindexed.push(slide);
      }
    }

    for (const slide of unindexed) {
      let dest = buckets.findIndex(b => b.length === 0);
      if (dest < 0) dest = buckets.findIndex(b => b.length < MAX_TEACHING_SLIDES_PER_ENABLING);
      if (dest < 0) continue;
      buckets[dest].push({ ...slide, enablingIndex: dest });
    }

    const filled = buckets.flatMap((bucket, ei) => {
      if (bucket.length > 0) return bucket.slice(0, MAX_TEACHING_SLIDES_PER_ENABLING);
      return [makeTeachingSlide(titleFromEnabling(ens[ei], ei), ei)];
    });

    return { ...mod, slides: [...filled, ...kcAndSummary] };
  });

  return { ...outline, modules: nextModules };
}

export function findUncoveredEnablings(
  course: {
    learningObjectives?: Array<string | TerminalObjectiveGroup>;
    modules?: Array<{ title?: string; slides?: Array<{ id?: string; type?: string; title?: string; enablingIndex?: number }> }>;
  },
): EnablingCoverageGap[] {
  const groups = normalizeTerminalGroups(course.learningObjectives);
  const gaps: EnablingCoverageGap[] = [];

  groups.forEach((g, mi) => {
    const mod = course.modules?.[mi];
    const slides = mod?.slides || [];
    const teaching = slides.filter(s => isTeachingSlide(s));
    const modTitle = mod?.title || `Module ${mi + 1}`;
    const fallback = teaching[0] || slides[0];
    const tagged = teaching.filter(s => parseEnablingIndex(s) != null);

    g.enablingObjectives.forEach((text, ei) => {
      const covered = tagged.length > 0
        ? teaching.some(s => parseEnablingIndex(s) === ei)
        : teaching.length > ei;
      if (covered) return;
      gaps.push({
        moduleIndex: mi,
        moduleTitle: modTitle,
        enablingIndex: ei,
        enablingText: text,
        slideId: fallback?.id || `__module-${mi + 1}__`,
        slideTitle: fallback?.title || modTitle,
        slideIndex: fallback ? Math.max(0, slides.indexOf(fallback as typeof slides[number])) : 0,
      });
    });
  });

  return gaps;
}

/** Copy enablingIndex from the outline skeleton when hydrate omits it. */
export function preserveEnablingIndex<T extends { id?: string; enablingIndex?: number }>(
  hydrated: T,
  originals: Array<{ id?: string; enablingIndex?: number }>,
  fallbackIndex?: number,
): T {
  if (hydrated?.enablingIndex != null && Number.isInteger(Number(hydrated.enablingIndex))) {
    return hydrated;
  }
  const byId = originals.find(o => o.id && o.id === hydrated?.id);
  const fromOriginal = byId?.enablingIndex ?? originals[fallbackIndex ?? -1]?.enablingIndex;
  if (fromOriginal == null) return hydrated;
  return { ...hydrated, enablingIndex: fromOriginal };
}
