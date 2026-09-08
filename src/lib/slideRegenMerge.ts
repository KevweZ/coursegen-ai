/**
 * Safe single-slide regeneration: only patch the matching id, merge data,
 * and drop stale audio when the narration script changed.
 */

export function slidesMatchId(slideId: unknown, targetId: unknown): boolean {
  if (slideId == null || targetId == null) return false;
  const a = String(slideId).trim();
  const b = String(targetId).trim();
  return a !== '' && a === b;
}

const KEEP_DATA_KEYS = [
  'imageUrl',
  'floatingMedia',
  'imagePlaceholder',
  'mediaUrl',
  'tabSkin',
  'blocksWellColor',
  'showProcessStepLabels',
  'introColor',
  'introLabelColor',
  'unifyTabColors',
  'introImageUrl',
];

function pickKeptMedia(existingData: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!existingData) return out;
  for (const k of KEEP_DATA_KEYS) {
    if (existingData[k] != null) out[k] = existingData[k];
  }
  return out;
}

export type RegenSlideResult = {
  type: string;
  data?: any;
  content?: string;
  voiceOverText?: string;
};

/** Merge AI regen payload into one existing slide without clobbering media/skins. */
export function mergeRegenIntoSlide(existing: any, result: RegenSlideResult): any {
  const existingData =
    existing?.data && typeof existing.data === 'object' ? { ...existing.data } : {};

  let nextData: any;
  if (result.data === undefined) {
    nextData = pickKeptMedia(existingData);
    if (!Object.keys(nextData).length) nextData = existing.data;
  } else {
    nextData = { ...pickKeptMedia(existingData), ...existingData, ...result.data };
  }

  const newScript = String(result.voiceOverText || '').trim();
  const oldScript = String(existing.voiceOverText || existing.narration || '').trim();
  const scriptChanged = !!newScript && newScript !== oldScript;

  const next: any = {
    ...existing,
    type: result.type || existing.type,
    data: nextData,
    content: (result.content != null && String(result.content).trim() !== '')
      ? result.content
      : existing.content,
    voiceOverText: newScript || existing.voiceOverText,
    narration: newScript || existing.narration,
  };

  if (scriptChanged) {
    next.voiceOverUrl = undefined;
  }

  const listKey = Array.isArray(result.data?.tabs)
    ? 'tabs'
    : Array.isArray(result.data?.items)
      ? 'items'
      : null;
  if (listKey && Array.isArray(next.data?.[listKey])) {
    const oldList = Array.isArray(existingData[listKey]) ? existingData[listKey] : [];
    next.data[listKey] = next.data[listKey].map((tab: any, i: number) => {
      const old = oldList[i];
      const sameVo =
        old &&
        String(old.voiceOverText || '').trim() === String(tab.voiceOverText || '').trim();
      if (sameVo && old?.voiceOverUrl) {
        return { ...tab, voiceOverUrl: old.voiceOverUrl };
      }
      const { voiceOverUrl: _drop, ...rest } = tab || {};
      return rest;
    });
  }

  return next;
}

/** Patch exactly the slides whose id matches. Never treat missing ids as a match. */
export function patchCourseSlideById(course: any, slideId: unknown, patch: (slide: any) => any): any {
  const id = String(slideId ?? '').trim();
  if (!id || !course) return course;
  let hits = 0;
  const next = {
    ...course,
    modules: (course.modules || []).map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        if (!slidesMatchId(s?.id, id)) return s;
        hits += 1;
        return patch(s);
      }),
    })),
  };
  if (hits !== 1) {
    console.warn(`[slide regen] expected 1 slide id=${id}, patched ${hits}`);
  }
  return hits === 0 ? course : next;
}
