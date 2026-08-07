/**
 * Promote static slide/tab imageUrl fields into FloatingImage entries so
 * generated and extracted images are movable and deletable in the authoring canvas.
 */
import type { FloatingImage } from '../types/course';

function makeFloating(
  url: string,
  id: string,
  opts?: { x?: number; y?: number; width?: number; height?: number; tabId?: string | null }
): FloatingImage {
  return {
    id,
    url,
    x: opts?.x ?? 420,
    y: opts?.y ?? 48,
    width: opts?.width ?? 320,
    height: opts?.height ?? 240,
    tabId: opts?.tabId ?? null,
  };
}

/** True if this URL is already represented in floatingMedia */
function hasUrl(media: FloatingImage[] | undefined, url: string): boolean {
  return (media || []).some(f => f.url === url);
}

/**
 * Ensure slide-level and tab-scoped imageUrls also exist as floatingMedia.
 * Does not remove existing floating images. Safe to run repeatedly.
 */
export function promoteSlideImagesToFloating(slide: any): any {
  if (!slide || typeof slide !== 'object') return slide;
  let floating: FloatingImage[] = Array.isArray(slide.floatingMedia)
    ? [...slide.floatingMedia]
    : [];
  let changed = false;

  const slideUrl = slide.imageUrl || slide.data?.imageUrl;
  if (typeof slideUrl === 'string' && slideUrl && !hasUrl(floating, slideUrl)) {
    floating.push(makeFloating(slideUrl, `fi-promo-${slide.id || 'slide'}-${floating.length}`, {
      x: 440,
      y: 56,
      width: 300,
      height: 220,
    }));
    changed = true;
  }

  // Tab / accordion item images → tab-scoped floating
  const data = slide.data && typeof slide.data === 'object' ? { ...slide.data } : null;
  if (data) {
    for (const key of ['tabs', 'items', 'cards'] as const) {
      if (!Array.isArray(data[key])) continue;
      data[key] = data[key].map((item: any, i: number) => {
        if (!item?.imageUrl || typeof item.imageUrl !== 'string') return item;
        const tabId = (item.id != null && String(item.id).trim()) ? String(item.id) : `tab-${i}`;
        if (hasUrl(floating, item.imageUrl)) return item;
        floating.push(makeFloating(item.imageUrl, `fi-promo-${slide.id}-${tabId}-${i}`, {
          x: 360 + (i % 3) * 24,
          y: 80 + (i % 3) * 20,
          width: 280,
          height: 200,
          tabId,
        }));
        changed = true;
        return item;
      });
    }
  }

  if (!changed) return slide;
  return {
    ...slide,
    floatingMedia: floating,
    ...(data ? { data } : {}),
  };
}

/** Walk a course and promote all slide imageUrls into floatingMedia. */
export function promoteCourseImagesToFloating(course: any): any {
  if (!course?.modules) return course;
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => promoteSlideImagesToFloating(s)),
    })),
  };
}

/** Build a floatingImagesMap from course slides (after promotion). */
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
