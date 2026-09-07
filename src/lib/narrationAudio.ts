import { coerceOstText } from './formatTabIntroOst';

/** True when a stored voiceOverUrl can actually play after a refresh (not a dead blob:). */
export function hasPlayableNarrationUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u.startsWith('blob:')) return false;
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

function nestedSlideText(slide: any): string {
  const data = slide?.data || {};
  const lists = [data.tabs, data.items, data.cards, data.events, data.points];
  const parts: string[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const it of list) {
      const t = usableNarrationText(
        it?.voiceOverText || it?.narration || it?.content || it?.definition || it?.description || it?.term || it?.label,
      );
      if (t) parts.push(t);
    }
  }
  return parts.join(' ').slice(0, 4096);
}

/** Prefer the spoken script; fall back to on-screen text, nested items, then the title. */
export function slideNarrationScript(slide: any): string {
  const script = usableNarrationText(slide?.voiceOverText || slide?.narration);
  if (script) return script;
  const ost = usableNarrationText(slide?.content || slide?.data?.introContent);
  if (ost) return ost;
  const nested = nestedSlideText(slide);
  if (nested) return nested;
  const title = String(slide?.title || '').trim();
  if (title.length >= 2) return `Let's review the key points for ${title}.`;
  return '';
}

export function tabNarrationScript(tab: any): string {
  const script = usableNarrationText(tab?.voiceOverText || tab?.narration);
  if (script) return script;
  return usableNarrationText(tab?.content || tab?.definition || tab?.description);
}
