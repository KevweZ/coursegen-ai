import { coerceOstText } from './formatTabIntroOst';

/** True when a stored voiceOverUrl can actually play after a refresh (not a dead blob:). */
export function hasPlayableNarrationUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u.length < 40) return false;
  if (u.startsWith('blob:')) return false;
  if (u.startsWith('data:audio') || u.startsWith('data:application/octet-stream')) return true;
  if (/^https?:\/\//i.test(u)) return true;
  return false;
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

/** On-screen / script text that is long enough to send to TTS. */
export function usableNarrationText(raw: unknown): string {
  const plain = stripMarkup(coerceOstText(raw)).slice(0, 4096);
  if (plain.length < 24) return '';
  const words = plain.split(' ').filter(w => /[a-z0-9]/i.test(w));
  return words.length >= 5 ? plain : '';
}

/** Prefer the spoken script; if it was wiped, fall back to on-screen text. */
export function slideNarrationScript(slide: any): string {
  const script = usableNarrationText(slide?.voiceOverText || slide?.narration);
  if (script) return script;
  return usableNarrationText(slide?.content || slide?.data?.introContent);
}

export function tabNarrationScript(tab: any): string {
  const script = usableNarrationText(tab?.voiceOverText || tab?.narration);
  if (script) return script;
  return usableNarrationText(tab?.content || tab?.definition);
}
