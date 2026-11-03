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

/** Stamp the Audio box the clip was recorded from so playback can refuse a mismatch. */
export function stampSpokenClip<T extends Record<string, any>>(item: T, url: string, text: string): T {
  const script = usableNarrationText(text) || String(text || '').trim();
  return {
    ...item,
    voiceOverUrl: url,
    ...(script ? { voiceOverText: script, voiceOverClipText: script } : {}),
  };
}

function clipMatchesScript(item: any, script: string): boolean {
  if (!script) return false;
  const recorded = usableNarrationText(item?.voiceOverClipText);
  if (!recorded) return true;
  return recorded === script;
}

/** True when this URL is a process/tab clip — it must not play as another slide’s intro. */
export function foreignTabOwnsUrl(course: any, slide: any, url: string | null | undefined): boolean {
  const u = String(url || '');
  if (!u) return false;
  for (const m of course?.modules || []) {
    for (const s of m?.slides || []) {
      if (!isTabbedNarrationType(s?.type)) continue;
      for (const listKey of ['tabs', 'items'] as const) {
        for (const t of s?.data?.[listKey] || []) {
          if (String(t?.voiceOverUrl || '') === u) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Drop a slide-level (or click-reveal row) URL that is actually a tab MP3.
 * Existing Steam Cracker drafts packed 4.14 Heat Integration onto 4.16.
 */
export function unbindStolenSlideAudio(course: any): any {
  if (!course?.modules) return course;
  const tabUrls = new Set<string>();
  for (const m of course.modules) {
    for (const s of m?.slides || []) {
      if (!isTabbedNarrationType(s?.type)) continue;
      for (const listKey of ['tabs', 'items'] as const) {
        for (const t of s?.data?.[listKey] || []) {
          const u = String(t?.voiceOverUrl || '');
          if (hasLiveNarrationUrl(u)) tabUrls.add(u);
        }
      }
    }
  }
  const seenSlideUrls = new Set<string>();
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        let slide = s;
        const url = String(s?.voiceOverUrl || '');
        if (url && (tabUrls.has(url) || seenSlideUrls.has(url))) {
          slide = { ...slide, voiceOverUrl: null };
        } else if (hasLiveNarrationUrl(url)) {
          seenSlideUrls.add(url);
        }
        if (isTabbedNarrationType(s?.type) || !slide.data || typeof slide.data !== 'object') return slide;
        let data = slide.data;
        let changed = false;
        for (const listKey of ['tabs', 'items'] as const) {
          if (!Array.isArray(data[listKey])) continue;
          let listChanged = false;
          const list = data[listKey].map((item: any) => {
            if (!item?.voiceOverUrl) return item;
            listChanged = true;
            return { ...item, voiceOverUrl: null };
          });
          if (listChanged) {
            data = { ...data, [listKey]: list };
            changed = true;
          }
        }
        return changed ? { ...slide, data } : slide;
      }),
    })),
  };
}

/** Player URL for this slide: Audio box script only — never another slide’s tab MP3. */
export function playbackUrlForSlide(
  slide: any,
  opts?: {
    tabAudioUrl?: string | null;
    syntheticUrl?: string | null;
    restoredUrl?: string | null;
    course?: any;
  },
): string | null {
  const tabUrl = opts?.tabAudioUrl;
  const tabHit = tabAudioOnSlide(slide, tabUrl);
  if (tabHit && hasLiveNarrationUrl(tabUrl) && clipMatchesScript(tabHit.tab, tabNarrationScript(tabHit.tab))) {
    return tabUrl as string;
  }
  const script = slideNarrationScript(slide);
  const candidates = [slide?.voiceOverUrl, slide?.audioUrl, opts?.syntheticUrl, opts?.restoredUrl];
  for (const url of candidates) {
    if (!hasLiveNarrationUrl(url)) continue;
    if (opts?.course && foreignTabOwnsUrl(opts.course, slide, url)) continue;
    if (!clipMatchesScript(slide, script)) continue;
    return url as string;
  }
  return null;
}

/** Per-tab TTS / playback only exists on process and vertical tabs — not click-reveal rows. */
export function isTabbedNarrationType(type: unknown): boolean {
  const t = String(type || '');
  return t === 'tabbed-horizontal' || t === 'tabbed-vertical';
}

/** True when `url` is a tab clip that belongs to this tabbed slide. */
export function tabAudioOnSlide(
  slide: any,
  url: string | null | undefined,
): { listKey: 'tabs' | 'items'; tab: any } | null {
  if (!url || !isTabbedNarrationType(slide?.type)) return null;
  const u = String(url);
  for (const listKey of ['tabs', 'items'] as const) {
    const list = slide?.data?.[listKey];
    if (!Array.isArray(list)) continue;
    const tab = list.find((t: any) => t && String(t.voiceOverUrl || '') === u && String(t.id || '').trim());
    if (tab) return { listKey, tab };
  }
  return null;
}

/**
 * Cache key for the clip currently playing. A tab MP3 must not be written as
 * `slide:{id}` — jumping to the next slide would pack that tab onto the new row.
 */
export function playbackNarrationKey(
  slide: any,
  playUrl: string,
  opts?: { syntheticUrl?: string | null; tabAudioUrl?: string | null },
): string {
  const id = String(slide?.id || '').trim();
  if (opts?.syntheticUrl && playUrl === opts.syntheticUrl) return `synth:${id}`;
  const tabUrl = opts?.tabAudioUrl && playUrl === opts.tabAudioUrl ? playUrl : null;
  const match = tabAudioOnSlide(slide, tabUrl);
  if (match) return `tab:${id}:${match.listKey}:${match.tab.id}`;
  return `slide:${id}`;
}

function keepRecordedClip(nextItem: any, prevItem: any): any {
  if (!prevItem) return nextItem;
  if (hasLiveNarrationUrl(nextItem?.voiceOverUrl)) return nextItem;
  if (!hasLiveNarrationUrl(prevItem?.voiceOverUrl)) return nextItem;
  return {
    ...nextItem,
    voiceOverUrl: prevItem.voiceOverUrl,
    voiceOverText: prevItem.voiceOverText ?? nextItem?.voiceOverText,
    voiceOverClipText: prevItem.voiceOverClipText ?? nextItem?.voiceOverClipText,
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

function mergeSnapshotDataOntoLive(liveData: any, snapData: any) {
  if (!snapData || typeof snapData !== 'object') return liveData;
  if (!liveData || typeof liveData !== 'object') return snapData;
  const out = { ...liveData };
  if (snapData.imageUrl && !out.imageUrl) out.imageUrl = snapData.imageUrl;
  if (snapData.introImageUrl && !out.introImageUrl) out.introImageUrl = snapData.introImageUrl;
  for (const key of ['tabs', 'items'] as const) {
    if (!Array.isArray(out[key]) || !Array.isArray(snapData[key])) continue;
    out[key] = out[key].map((item: any, i: number) => {
      const from = snapData[key][i];
      if (!from) return item;
      const withAudio = keepRecordedClip(item, from);
      if (!from.imageUrl || withAudio?.imageUrl) return withAudio;
      return { ...withAudio, imageUrl: from.imageUrl };
    });
  }
  return out;
}

/**
 * Background image/QC snapshots must not replace the author's slide list.
 * Keep live order and extras (Add content); copy new media onto matching ids;
 * ignore leftover copies that only exist on the stale snapshot.
 */
export function mergeBackgroundCourseSnapshot(prev: any, next: any) {
  if (!prev) return next;
  if (!next) return prev;
  const nextById: Record<string, any> = {};
  for (const m of next.modules || []) {
    for (const s of m.slides || []) {
      if (s?.id) nextById[String(s.id)] = s;
    }
  }
  return {
    ...prev,
    coverImage: prev.coverImage || next.coverImage,
    modules: (prev.modules || []).map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        const n = s?.id ? nextById[String(s.id)] : null;
        if (!n) return s;
        const withMedia = {
          ...s,
          imageUrl: s.imageUrl || n.imageUrl,
          coverImage: s.coverImage || n.coverImage,
          backgroundImage: s.backgroundImage || n.backgroundImage,
          backgroundDim: s.backgroundDim ?? n.backgroundDim,
          floatingMedia: (s.floatingMedia?.length ? s.floatingMedia : n.floatingMedia) || s.floatingMedia,
          data: mergeSnapshotDataOntoLive(s.data, n.data),
        };
        const merged = keepRecordedClip(withMedia, n);
        return {
          ...merged,
          audioUrl: s.audioUrl || n.audioUrl,
          voiceOverUrl: hasLiveNarrationUrl(s.voiceOverUrl) ? s.voiceOverUrl : (merged.voiceOverUrl || n.voiceOverUrl),
          voiceOverText: s.voiceOverText ?? merged.voiceOverText,
        };
      }),
    })),
  };
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
