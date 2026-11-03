/**
 * Helpers for floating images. Tab / generated images stay as embedded imageUrl
 * (correct layout inside panels). Only author-uploaded floatingMedia is seeded.
 *
 * Also strips auto-promoted floating overlays from a prior beta build that
 * broke tab layout by floating images over titles. Author "Move and resize"
 * uses `fi-${Date.now()}` (kept). Do not restore `fi-ai-` auto-promote.
 */
import type { FloatingImage } from '../types/course';

/** Auto-promoted ids from the brief movable-image experiment */
const PROMOTED_ID = /^(fi-promo-|fi-ai-|fi-src-)/;

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
  // Preserve referential equality when nothing was stripped — callers use !== to skip setCourse
  if (!changed) return course;
  return { ...course, modules };
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
  return changed ? { ...course, modules } : course;
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
  return map;
}
