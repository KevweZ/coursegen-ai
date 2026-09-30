import { slidesMatchId } from './slideRegenMerge';

export function newCourseEntityId(prefix = 'slide'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

export function insertSlidesIntoCourse(
  course: any,
  slides: any[],
  opts: {
    placement: InsertPlacement;
    currentSlide?: { id?: string; type?: string } | null;
    newModule?: { title: string; description?: string };
  },
): { course: any; firstId: string } | null {
  const base = course || { modules: [] };
  const usedIds = new Set<string>();
  for (const m of base.modules || []) {
    for (const s of m.slides || []) {
      const existingId = String(s?.id || '').trim();
      if (existingId) usedIds.add(existingId);
    }
  }
  const incoming = (slides || []).filter(Boolean).map((s: any) => {
    let id = String(s?.id || '').trim();
    if (!id || usedIds.has(id)) id = newCourseEntityId();
    usedIds.add(id);
    return { ...s, id };
  });
  if (!incoming.length) return null;
  const firstId = String(incoming[0].id);

  if (opts.placement === 'new-module' || !(base.modules || []).length) {
    const mod = {
      id: newCourseEntityId('mod'),
      title: (opts.newModule?.title || 'New module').trim() || 'New module',
      description: opts.newModule?.description || '',
      slides: incoming,
    };
    return {
      course: { ...base, modules: [...(base.modules || []), mod] },
      firstId,
    };
  }

  const modules = [...base.modules];
  const mi = Math.min(resolveInsertModuleIndex(base, opts.currentSlide), modules.length - 1);
  const mod = modules[mi];
  const existing = [...(mod.slides || [])];
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
  return { course: { ...base, modules }, firstId };
}
