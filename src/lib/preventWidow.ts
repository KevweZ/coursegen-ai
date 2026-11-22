/**
 * Keep the last two words together so titles and bullets do not hang a
 * single word on the next line ("Roads", "category.").
 */

const NBSP = '\u00A0';

export function preventWidow(text: string, minWords = 3): string {
  const raw = String(text || '');
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length < minWords) return raw;
  const last = words.pop() as string;
  const prev = words.pop() as string;
  return `${words.join(' ')} ${prev}${NBSP}${last}`.trim();
}

/** Glue last two words on markdown / HTML bullet lines only. */
export function preventWidowLines(markdown: string, minWords = 4): string {
  return String(markdown || '')
    .split('\n')
    .map((line) => {
      const bullet = line.match(/^(\s*(?:[-*•]|\d+[.)])\s+)(.+)$/);
      if (bullet) return `${bullet[1]}${preventWidow(bullet[2], minWords)}`;
      return line;
    })
    .join('\n');
}
