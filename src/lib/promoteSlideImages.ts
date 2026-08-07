/**
 * Helpers for floating images. Tab / generated images stay as embedded imageUrl
 * (correct layout inside panels). Only author-uploaded floatingMedia is seeded.
 *
 * Also strips auto-promoted floating overlays from a prior beta build that
 * broke tab layout by floating images over titles.
 */
import type { FloatingImage } from '../types/course';

/** Auto-promoted ids from the brief movable-image experiment */
const PROMOTED_ID = /^(fi-promo-|fi-ai-|fi-src-)/;

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
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => stripAutoPromotedFloating(s)),
    })),
  };
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
