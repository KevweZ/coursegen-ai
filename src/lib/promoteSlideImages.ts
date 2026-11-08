/**
 * Helpers for floating images. Tab / generated images stay as embedded imageUrl
 * (correct layout inside panels). Only author-uploaded floatingMedia is seeded.
 *
 * Also strips auto-promoted floating overlays from a prior beta build that
 * broke tab layout by floating images over titles. Author "Move and resize"
 * uses `fi-${Date.now()}` (kept). Do not restore `fi-ai-` auto-promote.
 */
import type { FloatingImage } from '../types/course';
import { HUB_SLIDE_ID, isHubMenuSlide } from './interactionGate';

/** Synthetic title slide — floats live on the course, not a module row. */
export const COVER_SLIDE_ID = '__cover__';

export { HUB_SLIDE_ID };
export const isHubAuthoringSlide = isHubMenuSlide;

/** Auto-promoted ids from the brief movable-image experiment */
const PROMOTED_ID = /^(fi-promo-|fi-ai-|fi-src-)/;

export function isCoverAuthoringSlide(slide?: { id?: string; type?: string } | null): boolean {
  const id = String(slide?.id || '');
  const type = String(slide?.type || '');
  return id === COVER_SLIDE_ID || type === 'cover' || type === 'title';
}

export type CoverTitleAlign = 'left' | 'center' | 'right';

export function resolveCoverTitleAlign(value: unknown): CoverTitleAlign {
  const v = String(value || '').toLowerCase();
  if (v === 'center' || v === 'right') return v;
  return 'left';
}

/** Write cover in-flow URL and/or moved floats. Drops deleted keys so drafts do not reattach them. */
export function applyCoverMediaPatch(
  course: any,
  updates: {
    coverImage?: string | null;
    floatingMedia?: FloatingImage[];
    coverPanelHidden?: boolean;
    coverTitleAlign?: CoverTitleAlign | string;
  },
): any {
  if (!course) return course;
  const next: Record<string, unknown> = { ...course };
  if ('coverImage' in updates) {
    if (updates.coverImage == null || updates.coverImage === '') {
      delete next.coverImage;
      if (!('coverPanelHidden' in updates)) next.coverPanelHidden = true;
    } else {
      next.coverImage = updates.coverImage;
      delete next.coverPanelHidden;
    }
  }
  if ('floatingMedia' in updates) {
    const floats = Array.isArray(updates.floatingMedia) ? updates.floatingMedia : [];
    if (floats.length) next.coverFloatingMedia = floats;
    else delete next.coverFloatingMedia;
  }
  if ('coverPanelHidden' in updates) {
    if (updates.coverPanelHidden) next.coverPanelHidden = true;
    else delete next.coverPanelHidden;
  }
  if ('coverTitleAlign' in updates) {
    next.coverTitleAlign = resolveCoverTitleAlign(updates.coverTitleAlign);
  }
  return omitUndefinedDeep(next);
}

/** Write Main Menu in-flow URL and/or moved floats. Independent of the cover photo. */
export function applyHubMediaPatch(
  course: any,
  updates: {
    hubImage?: string | null;
    floatingMedia?: FloatingImage[];
    hubPanelHidden?: boolean;
  },
): any {
  if (!course) return course;
  const next: Record<string, unknown> = { ...course };
  if ('hubImage' in updates) {
    if (updates.hubImage == null || updates.hubImage === '') {
      delete next.hubImage;
      if (!('hubPanelHidden' in updates)) next.hubPanelHidden = true;
    } else {
      next.hubImage = updates.hubImage;
      delete next.hubPanelHidden;
    }
  }
  if ('floatingMedia' in updates) {
    const floats = Array.isArray(updates.floatingMedia) ? updates.floatingMedia : [];
    if (floats.length) next.hubFloatingMedia = floats;
    else delete next.hubFloatingMedia;
  }
  if ('hubPanelHidden' in updates) {
    if (updates.hubPanelHidden) next.hubPanelHidden = true;
    else delete next.hubPanelHidden;
  }
  return omitUndefinedDeep(next);
}

/** Drop `undefined` so JSON/draft shells omit deleted imageUrl instead of keeping a hole. */
export function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested === undefined) continue;
      out[key] = omitUndefinedDeep(nested);
    }
    return out as T;
  }
  return value;
}

export function isAutoPromotedFloating(img: FloatingImage): boolean {
  return PROMOTED_ID.test(String(img?.id || ''));
}

/** Remove auto-promoted floating images; keep user uploads / manual floats. */
export function stripAutoPromotedFloating(slide: any): any {
  if (!slide || !Array.isArray(slide.floatingMedia) || !slide.floatingMedia.length) return slide;
  const next = slide.floatingMedia.filter((f: FloatingImage) => !isAutoPromotedFloating(f));
  if (next.length === slide.floatingMedia.length) return slide;
  const copy = { ...slide };
  if (next.length) copy.floatingMedia = next;
  else delete copy.floatingMedia;
  return copy;
}

export function stripCourseAutoPromotedFloating(course: any): any {
  if (!course?.modules) return course;
  let changed = false;
  const modules = course.modules.map((m: any) => {
    let moduleChanged = false;
    const slides = (m.slides || []).map((s: any) => {
      const next = stripAutoPromotedFloating(s);
      if (next !== s) moduleChanged = true;
      return next;
    });
    if (!moduleChanged) return m;
    changed = true;
    return { ...m, slides };
  });
  let nextCourse = changed ? { ...course, modules } : course;
  if (Array.isArray(nextCourse.coverFloatingMedia) && nextCourse.coverFloatingMedia.length) {
    const kept = nextCourse.coverFloatingMedia.filter((f: FloatingImage) => !isAutoPromotedFloating(f));
    if (kept.length !== nextCourse.coverFloatingMedia.length) {
      nextCourse = { ...nextCourse, modules: nextCourse === course ? modules : nextCourse.modules };
      if (kept.length) nextCourse.coverFloatingMedia = kept;
      else delete nextCourse.coverFloatingMedia;
      changed = true;
    }
  }
  if (Array.isArray(nextCourse.hubFloatingMedia) && nextCourse.hubFloatingMedia.length) {
    const kept = nextCourse.hubFloatingMedia.filter((f: FloatingImage) => !isAutoPromotedFloating(f));
    if (kept.length !== nextCourse.hubFloatingMedia.length) {
      nextCourse = { ...nextCourse, modules: nextCourse === course ? modules : nextCourse.modules };
      if (kept.length) nextCourse.hubFloatingMedia = kept;
      else delete nextCourse.hubFloatingMedia;
      changed = true;
    }
  }
  // Preserve referential equality when nothing was stripped — callers use !== to skip setCourse
  if (!changed) return course;
  return nextCourse;
}

/** Copy live float geometry onto each slide so SCORM JSON matches preview. */
export function stampFloatingMediaOnCourse(
  course: any,
  map: Record<string, FloatingImage[]> | null | undefined,
): any {
  if (!course?.modules || !map || typeof map !== 'object') return course;
  let changed = false;
  const modules = course.modules.map((m: any) => ({
    ...m,
    slides: (m.slides || []).map((s: any) => {
      const floats = map[s?.id];
      if (!Array.isArray(floats) || !floats.length) return s;
      changed = true;
      return { ...s, floatingMedia: floats };
    }),
  }));
  let next = changed ? { ...course, modules } : course;
  const coverFloats = map[COVER_SLIDE_ID];
  if (Array.isArray(coverFloats) && coverFloats.length) {
    next = next === course ? { ...course, modules } : next;
    next.coverFloatingMedia = coverFloats;
    changed = true;
  }
  const hubFloats = map[HUB_SLIDE_ID];
  if (Array.isArray(hubFloats) && hubFloats.length) {
    next = next === course ? { ...course, modules } : next;
    next.hubFloatingMedia = hubFloats;
    changed = true;
  }
  return changed ? next : course;
}

/** Build floatingImagesMap from course slides (user floats only after strip). */
export function floatingMapFromCourse(course: any): Record<string, FloatingImage[]> {
  const map: Record<string, FloatingImage[]> = {};
  for (const m of course?.modules || []) {
    for (const s of m.slides || []) {
      if (Array.isArray(s.floatingMedia) && s.floatingMedia.length) {
        map[s.id] = s.floatingMedia;
      }
    }
  }
  if (Array.isArray(course?.coverFloatingMedia) && course.coverFloatingMedia.length) {
    map[COVER_SLIDE_ID] = course.coverFloatingMedia;
  }
  if (Array.isArray(course?.hubFloatingMedia) && course.hubFloatingMedia.length) {
    map[HUB_SLIDE_ID] = course.hubFloatingMedia;
  }
  return map;
}
