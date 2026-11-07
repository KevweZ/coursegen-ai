import { COVER_SLIDE_ID } from './promoteSlideImages';
import { slidesMatchId } from './slideRegenMerge';
import { formatTabIntroOst, sanitizeOstText } from './formatTabIntroOst';
import { moveArrayItem } from './objectiveOrder';
import { collapseDuplicateModuleSummaries } from './enablingCoverage';
import { ensureTabListIds, isTabbedNarrationType } from './narrationAudio';
import { groundModuleKnowledgeChecks } from './knowledgeCheckGround';

function slideBodyText(slide: any): string {
  const question = String(
    slide?.data?.questionText
    || slide?.interactions?.[0]?.questionText
    || '',
  );
  const content = String(slide?.content || '').replace(/<[^>]+>/g, ' ');
  return `${question} ${content}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Stable identity for clone detection. Empty when the slide is too thin to compare. */
export function slideIdentityFingerprint(slide: any): string {
  if (!slide || typeof slide !== 'object') return '';
  const type = String(slide.type || '').toLowerCase();
  const title = String(slide.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const body = slideBodyText(slide).slice(0, 280);
  if (!title || body.length < 24) return '';
  return `${type}|${title}|${body}`;
}

function dedupeSlideList(slides: any[]): { slides: any[]; changed: boolean } {
  const seen = new Set<string>();
  const next: any[] = [];
  let changed = false;
  for (const slide of slides || []) {
    const fp = slideIdentityFingerprint(slide);
    if (fp && seen.has(fp)) {
      changed = true;
      continue;
    }
    if (fp) seen.add(fp);
    next.push(slide);
  }
  return { slides: next, changed };
}

/**
 * Drop later copies of the same teaching/KC payload in a module.
 * Duplicate ids are not enough — Add content / hydrate chunks can clone
 * Dilution Steam with a fresh id.
 */
export function dedupeIdenticalModuleSlides(course: any): any {
  if (!course?.modules) return course;
  let changed = false;
  const modules = course.modules.map((m: any) => {
    const list = Array.isArray(m?.slides) ? m.slides : [];
    const next = dedupeSlideList(list);
    if (!next.changed) return m;
    changed = true;
    return { ...m, slides: next.slides };
  });
  const fingerprinted = changed ? { ...course, modules } : course;
  return collapseDuplicateModuleSummaries(fingerprinted);
}

export const MAX_SPECIFY_TABS = 6;
export const MIN_SPECIFY_TABS = 2;

export type SpecifySlideType = 'content' | 'tabbed-horizontal' | 'tabbed-vertical';

export type SpecifyTabDraft = {
  id?: string;
  label?: string;
  content?: string;
  narration?: string;
};

export function plainSpecifyText(raw: unknown): string {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSpecifyTabbedType(type: unknown): type is 'tabbed-horizontal' | 'tabbed-vertical' {
  return type === 'tabbed-horizontal' || type === 'tabbed-vertical';
}

export function blankSpecifyTab(): SpecifyTabDraft {
  return { id: newCourseEntityId('tab'), label: '', content: '', narration: '' };
}

export function filledSpecifyTabCount(tabs: SpecifyTabDraft[] | undefined): number {
  return (tabs || []).filter(t =>
    plainSpecifyText(t?.label) || plainSpecifyText(t?.content) || plainSpecifyText(t?.narration)
  ).length;
}

export function buildSpecifiedSlide(opts: {
  title?: string;
  ost?: string;
  narration?: string;
  type?: string;
  tabs?: SpecifyTabDraft[];
  showProcessStepLabels?: boolean;
}): {
  id: string;
  type: SpecifySlideType;
  title: string;
  content: string;
  voiceOverText: string;
  data?: {
    tabs: Array<{ id: string; label: string; content: string; voiceOverText: string }>;
    showProcessStepLabels?: boolean;
  };
} {
  const type: SpecifySlideType = isSpecifyTabbedType(opts.type) ? opts.type : 'content';
  const title = String(opts.title || '').trim() || 'New slide';
  const content = sanitizeOstText(opts.ost || '');
  const voiceOverText = String(opts.narration || '').trim();
  if (type === 'content') {
    return {
      id: newCourseEntityId(),
      type: 'content',
      title,
      content: content || `- ${title}`,
      voiceOverText,
    };
  }
  const stepWord = type === 'tabbed-horizontal' ? 'Step' : 'Tab';
  const tabs = (opts.tabs || [])
    .filter(t => plainSpecifyText(t?.label) || plainSpecifyText(t?.content) || plainSpecifyText(t?.narration))
    .slice(0, MAX_SPECIFY_TABS)
    .map((t, i) => {
      const label = String(t.label || '').trim() || `${stepWord} ${i + 1}`;
      const tabContent = sanitizeOstText(t.content || '');
      return {
        id: String(t.id || '').trim() || newCourseEntityId('tab'),
        label,
        content: tabContent || `- ${label}`,
        voiceOverText: String(t.narration || '').trim(),
      };
    });
  return {
    id: newCourseEntityId(),
    type,
    title,
    content: content || `- ${title}`,
    voiceOverText,
    data: {
      tabs,
      ...(type === 'tabbed-horizontal' ? { showProcessStepLabels: opts.showProcessStepLabels !== false } : {}),
    },
  };
}

export function buildSpecifiedContentSlide(opts: {
  title?: string;
  ost: string;
  narration?: string;
}): { id: string; type: 'content'; title: string; content: string; voiceOverText: string } {
  return buildSpecifiedSlide({ ...opts, type: 'content' }) as {
    id: string;
    type: 'content';
    title: string;
    content: string;
    voiceOverText: string;
  };
}

/**
 * Add content → generate must persist tab ids, intro OST, and per-tab OST/narration
 * so the canvas, Edit Text, and tab audio line up. Empty tab shells become content.
 */
export function ensureGeneratedTabSlide(slide: any): any {
  if (!slide || !isTabbedNarrationType(slide.type)) return slide;
  const stamped = ensureTabListIds(slide);
  const data = { ...(stamped.data || {}) };
  const listKey = Array.isArray(data.tabs) ? 'tabs' : Array.isArray(data.items) ? 'items' : 'tabs';
  const rawList = Array.isArray(data[listKey]) ? data[listKey] : [];
  const tabs = rawList
    .map((t: any, i: number) => {
      const label = String(t?.label || t?.title || '').trim() || `Topic ${i + 1}`;
      const content = sanitizeOstText(t?.content || t?.body || '');
      const voiceOverText = String(t?.voiceOverText || t?.narration || '').trim();
      if (!plainSpecifyText(label) && !plainSpecifyText(content) && !voiceOverText) return null;
      return {
        ...t,
        id: String(t?.id || '').trim() || `tab-${i + 1}`,
        label,
        content: content || `- ${label}`,
        voiceOverText,
      };
    })
    .filter(Boolean);
  if (tabs.length < MIN_SPECIFY_TABS) {
    return {
      ...stamped,
      type: 'content',
      content: sanitizeOstText(stamped.content || '') || `- ${stamped.title || 'New slide'}`,
      data: undefined,
    };
  }
  const intro = formatTabIntroOst({
    introContent: stamped.content,
    voiceOverText: stamped.voiceOverText,
    title: stamped.title,
  });
  return {
    ...stamped,
    content: intro,
    data: { ...data, [listKey]: tabs, tabs },
  };
}

export function newCourseEntityId(prefix = 'slide'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Later copies of a reused id get a new id so clips cannot land on two slides. */
export function ensureUniqueSlideIds(course: any): any {
  const deduped = dedupeIdenticalModuleSlides(course);
  if (!deduped?.modules) return deduped;
  const seen = new Set<string>();
  return {
    ...deduped,
    modules: deduped.modules.map((m: any) => groundModuleKnowledgeChecks({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        const id = String(s?.id || '').trim();
        if (id && !seen.has(id)) {
          seen.add(id);
          return s;
        }
        const nextId = newCourseEntityId();
        seen.add(nextId);
        return { ...s, id: nextId };
      }),
    })),
  };
}

const CHROME_TYPES = new Set([
  'cover',
  'player-tour',
  'course-objectives',
  'module-cover',
  'module-overview',
  'exam-intro',
  'mastery-exam',
  'exam-results',
  'closing',
  'title',
]);

export function isChromePlayerSlide(slide: { id?: string; type?: string } | null | undefined): boolean {
  if (!slide) return true;
  const id = String(slide.id || '');
  if (id.startsWith('__') && id.endsWith('__')) return true;
  return CHROME_TYPES.has(String(slide.type || ''));
}

export function isDeletableCourseSlide(slide: { id?: string; type?: string } | null | undefined): boolean {
  if (!slide || isChromePlayerSlide(slide)) return false;
  if (String(slide.type || '') === 'game-template') return false;
  return Boolean(String(slide.id || '').trim());
}

export function countRealModuleSlides(course: any): number {
  if (!course?.modules) return 0;
  return course.modules.reduce((n: number, m: any) => {
    const slides = Array.isArray(m?.slides) ? m.slides : [];
    return n + slides.filter((s: any) => s && s.type !== 'game-template').length;
  }, 0);
}

export function moduleIndexFromVirtualSlideId(id: unknown): number | null {
  const m = String(id || '').match(/^__module-(?:cover|overview)-(\d+)__$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : null;
}

export function findSlideLocation(
  course: any,
  slideId: unknown,
): { moduleIndex: number; slideIndex: number } | null {
  const id = String(slideId ?? '').trim();
  if (!id || !course?.modules) return null;
  for (let mi = 0; mi < course.modules.length; mi++) {
    const slides = course.modules[mi]?.slides || [];
    const si = slides.findIndex((s: any) => slidesMatchId(s?.id, id));
    if (si >= 0) return { moduleIndex: mi, slideIndex: si };
  }
  return null;
}

export function slideReorderState(
  course: any,
  slideId: unknown,
): { canUp: boolean; canDown: boolean } {
  const loc = findSlideLocation(course, slideId);
  if (!loc) return { canUp: false, canDown: false };
  const slides = course.modules[loc.moduleIndex]?.slides || [];
  const target = slides[loc.slideIndex];
  if (!isDeletableCourseSlide(target)) return { canUp: false, canDown: false };
  return {
    canUp: loc.slideIndex > 0,
    canDown: loc.slideIndex < slides.length - 1,
  };
}

/** Swap one teaching slide with its neighbor in the same module. */
export function moveSlideInCourse(course: any, slideId: unknown, delta: -1 | 1): any | null {
  const loc = findSlideLocation(course, slideId);
  if (!loc) return null;
  const slides = course.modules[loc.moduleIndex]?.slides || [];
  const target = slides[loc.slideIndex];
  if (!isDeletableCourseSlide(target)) return null;
  const to = loc.slideIndex + delta;
  const nextSlides = moveArrayItem(slides, loc.slideIndex, to);
  if (nextSlides === slides) return null;
  return {
    ...course,
    modules: course.modules.map((m: any, mi: number) => (
      mi !== loc.moduleIndex ? m : { ...m, slides: nextSlides }
    )),
  };
}

export function deleteSlideById(course: any, slideId: unknown): any | null {
  const loc = findSlideLocation(course, slideId);
  if (!loc) return null;
  const target = course.modules[loc.moduleIndex]?.slides?.[loc.slideIndex];
  if (!isDeletableCourseSlide(target)) return null;
  if (countRealModuleSlides(course) <= 1) return null;
  return {
    ...course,
    modules: course.modules.map((m: any, mi: number) => {
      if (mi !== loc.moduleIndex) return m;
      return {
        ...m,
        slides: (m.slides || []).filter((_: any, i: number) => i !== loc.slideIndex),
      };
    }),
  };
}

export type InsertPlacement = 'after' | 'end-module' | 'new-module';

function lastModuleIndex(course: any): number {
  return Math.max(0, (course?.modules?.length || 1) - 1);
}

export function resolveInsertModuleIndex(
  course: any,
  currentSlide: { id?: string; type?: string } | null | undefined,
): number {
  const modules = course?.modules || [];
  if (!modules.length) return 0;
  const id = String(currentSlide?.id || '');
  const type = String(currentSlide?.type || '');
  if (
    id === '__cover__' ||
    id === '__player-tour__' ||
    id === '__course-objectives__'
  ) {
    return 0;
  }
  if (
    id === '__exam-intro__' ||
    id === '__mastery-exam__' ||
    id === '__exam-results__' ||
    id === '__closing__' ||
    type === 'exam-intro' ||
    type === 'mastery-exam' ||
    type === 'exam-results' ||
    type === 'closing'
  ) {
    return lastModuleIndex(course);
  }
  const virtual = moduleIndexFromVirtualSlideId(id);
  if (virtual != null && virtual < modules.length) return virtual;
  const loc = findSlideLocation(course, id);
  if (loc) return loc.moduleIndex;
  return lastModuleIndex(course);
}

function uniquifyIncomingSlides(slides: any[], usedIds: Set<string>): any[] {
  return (slides || []).filter(Boolean).map((s: any) => {
    let id = String(s?.id || '').trim();
    if (!id || usedIds.has(id)) id = newCourseEntityId();
    usedIds.add(id);
    return { ...s, id };
  });
}

function rejectCloneSlides(incoming: any[], against: any[]): any[] {
  const seen = new Set<string>();
  for (const s of against || []) {
    const fp = slideIdentityFingerprint(s);
    if (fp) seen.add(fp);
  }
  const kept: any[] = [];
  for (const s of incoming) {
    const fp = slideIdentityFingerprint(s);
    if (fp && seen.has(fp)) continue;
    if (fp) seen.add(fp);
    kept.push(s);
  }
  return kept;
}

export function insertSlidesIntoCourse(
  course: any,
  slides: any[],
  opts: {
    placement: InsertPlacement;
    currentSlide?: { id?: string; type?: string } | null;
    newModule?: { title: string; description?: string };
  },
): { course: any; firstId: string; inserted: any[] } | null {
  const base = course || { modules: [] };
  const usedIds = new Set<string>();
  for (const m of base.modules || []) {
    for (const s of m.slides || []) {
      const existingId = String(s?.id || '').trim();
      if (existingId) usedIds.add(existingId);
    }
  }
  let incoming = uniquifyIncomingSlides(slides, usedIds);
  if (!incoming.length) return null;

  if (opts.placement === 'new-module' || !(base.modules || []).length) {
    incoming = rejectCloneSlides(incoming, []);
    if (!incoming.length) return null;
    const mod = {
      id: newCourseEntityId('mod'),
      title: (opts.newModule?.title || 'New module').trim() || 'New module',
      description: opts.newModule?.description || '',
      slides: incoming,
    };
    return {
      course: { ...base, modules: [...(base.modules || []), mod] },
      firstId: String(incoming[0].id),
      inserted: incoming,
    };
  }

  const modules = [...base.modules];
  const mi = Math.min(resolveInsertModuleIndex(base, opts.currentSlide), modules.length - 1);
  const mod = modules[mi];
  const existing = [...(mod.slides || [])];
  incoming = rejectCloneSlides(incoming, existing);
  if (!incoming.length) return null;
  const firstId = String(incoming[0].id);
  let at = existing.length;

  if (opts.placement === 'after') {
    const currentId = opts.currentSlide?.id;
    const virtual = moduleIndexFromVirtualSlideId(currentId);
    if (virtual != null) {
      at = 0;
    } else if (
      String(currentId || '') === '__cover__' ||
      String(currentId || '') === '__player-tour__' ||
      String(currentId || '') === '__course-objectives__'
    ) {
      at = 0;
    } else {
      const loc = findSlideLocation(base, currentId);
      if (loc && loc.moduleIndex === mi) at = loc.slideIndex + 1;
    }
  }

  modules[mi] = {
    ...mod,
    slides: [...existing.slice(0, at), ...incoming, ...existing.slice(at)],
  };
  return {
    course: dedupeIdenticalModuleSlides({ ...base, modules }),
    firstId,
    inserted: incoming,
  };
}

/**
 * Cover / module-title slides are injected chrome — they are not in modules[].slides.
 * Edit Slide → Save must write the title onto the course (or module), not only OST overrides.
 */
export function applySyntheticChromeSave(
  course: any,
  slide: { id?: string; title?: string } | null | undefined,
): any {
  if (!course || !slide) return course;
  const id = String(slide.id || '');
  const title = String(slide.title || '').trim();
  if (!id || !title) return course;
  if (id === COVER_SLIDE_ID) {
    if (course.title === title) return course;
    return { ...course, title };
  }
  const moduleCover = /^__module-cover-(\d+)__$/.exec(id);
  if (moduleCover) {
    const idx = Number(moduleCover[1]) - 1;
    const modules = course.modules || [];
    if (idx < 0 || idx >= modules.length) return course;
    if (String(modules[idx]?.title || '') === title) return course;
    return {
      ...course,
      modules: modules.map((m: any, i: number) => (i === idx ? { ...m, title } : m)),
    };
  }
  return course;
}
