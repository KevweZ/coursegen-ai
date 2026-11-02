import { coerceOstText } from './formatTabIntroOst';

/** SCORM export rewrites data: audio into relative media/001.mp3 (same folder as PNGs). */
function isPackagedRelativeAudio(url: string): boolean {
  const u = url.trim();
  if (!u || u.includes('://') || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:')) {
    return false;
  }
  return /\.(mp3|m4a|aac|wav|ogg|webm)(\?|#|$)/i.test(u);
}

/** True when a stored voiceOverUrl can actually play after a refresh (not a dead blob:). */
export function hasPlayableNarrationUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u.startsWith('blob:')) return false;
  if (isPackagedRelativeAudio(u)) return true;
  // Real MP3 data URLs are tens of KB. Short leftovers in the draft shell are not playable.
  if (u.startsWith('data:audio') || u.startsWith('data:application/octet-stream') || u.startsWith('data:;')) {
    return u.length >= 2000;
  }
  if (/^https?:\/\//i.test(u) && u.length >= 40) return true;
  return false;
}

/** True when audio can play in this session (includes blob: object URLs restored from IndexedDB). */
export function hasLiveNarrationUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u.startsWith('blob:') && u.length > 12) return true;
  return hasPlayableNarrationUrl(u);
}

function stripMarkup(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`]+/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainFrom(raw: unknown): string {
  return stripMarkup(coerceOstText(raw)).slice(0, 4096);
}

/** On-screen / script text that is long enough to send to TTS. */
export function usableNarrationText(raw: unknown): string {
  const plain = plainFrom(raw);
  if (plain.length < 12) return '';
  const words = plain.split(' ').filter(w => /[a-z0-9]/i.test(w));
  return words.length >= 3 ? plain : '';
}

export const PLAYER_TOUR_NARRATION =
  'Before we begin, take a moment to explore the player controls. Hover over each card to see the corresponding element highlighted.';

export const COURSE_OBJECTIVES_NARRATION =
  'These are the objectives for this course. Review each one so you know what you will be able to do when you finish.';

export const HUB_MENU_NARRATION =
  'Select a module from the main menu. Completed modules show a checkmark. The mastery quiz unlocks after every module is finished.';

export function defaultCoverNarration(title: string, description?: string): string {
  return `Welcome to ${title}. ${description || ''}`.trim();
}

/**
 * Script sent to TTS and shown in Edit Audio / Review.
 * Do not fall back to OST — that records a clip the Audio box does not show.
 */
export function slideNarrationScript(slide: any): string {
  return usableNarrationText(slide?.voiceOverText || slide?.narration);
}

export function tabNarrationScript(tab: any): string {
  return usableNarrationText(tab?.voiceOverText || tab?.narration);
}

function keepRecordedClip(nextItem: any, prevItem: any): any {
  if (!prevItem) return nextItem;
  if (hasLiveNarrationUrl(nextItem?.voiceOverUrl)) return nextItem;
  if (!hasLiveNarrationUrl(prevItem?.voiceOverUrl)) return nextItem;
  return {
    ...nextItem,
    voiceOverUrl: prevItem.voiceOverUrl,
    voiceOverText: prevItem.voiceOverText ?? nextItem?.voiceOverText,
  };
}

function mergeTabAudio(baseList: any[] | undefined, prevList: any[] | undefined) {
  if (!Array.isArray(baseList)) return baseList;
  if (!Array.isArray(prevList) || !prevList.length) return baseList;
  const prevTabById = new Map(prevList.filter((t: any) => t?.id).map((t: any) => [t.id, t]));
  return baseList.map((item: any) => {
    const fromPrev = item?.id ? prevTabById.get(item.id) : null;
    return keepRecordedClip(item, fromPrev);
  });
}

/** After TTS starts, keep recorded clips and the script those clips were read from. */
export function mergeCoursePreservingAudio(prev: any, next: any) {
  if (!prev) return next;
  if (!next) return prev;
  const prevById: Record<string, any> = {};
  for (const m of prev.modules || []) {
    for (const s of m.slides || []) {
      if (s?.id) prevById[s.id] = s;
    }
  }
  return {
    ...next,
    coverImage: next.coverImage || prev.coverImage,
    modules: (next.modules || []).map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        const p = prevById[s.id];
        if (!p) return s;
        const merged = keepRecordedClip(s, p);
        const data = s.data || p.data
          ? {
              ...(s.data || {}),
              tabs: mergeTabAudio(s.data?.tabs, p.data?.tabs),
              items: mergeTabAudio(s.data?.items, p.data?.items),
            }
          : s.data;
        return {
          ...merged,
          audioUrl: s.audioUrl || p.audioUrl,
          backgroundImage: s.backgroundImage || p.backgroundImage,
          backgroundDim: s.backgroundDim ?? p.backgroundDim,
          data,
        };
      }),
    })),
  };
}
