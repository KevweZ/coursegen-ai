import { coerceOstText } from './formatTabIntroOst';

export interface HeadingBulletSection {
  term: string;
  definition: string;
}

/**
 * Split a content slide into heading + bullet groups.
 * Used to convert Overview-style ### sections into click-to-reveal items
 * without asking the model to rewrite (and inflate) the copy.
 */
export function parseHeadingBulletSections(markdown: unknown): HeadingBulletSection[] {
  const raw = coerceOstText(markdown).replace(/\r\n/g, '\n').trim();
  if (!raw) return [];

  if (/<h[2-4]/i.test(raw)) {
    const parts = raw.split(/<h[2-4][^>]*>/i).slice(1);
    return parts
      .map(part => {
        const close = part.match(/<\/h[2-4]>/i);
        const term = (close ? part.slice(0, close.index) : part)
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const rest = close ? part.slice((close.index || 0) + close[0].length) : '';
        const lis = [...rest.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
          .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        const definition = lis.length
          ? lis.map(l => `- ${l}`).join('\n')
          : rest.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return { term, definition };
      })
      .filter(s => s.term && s.definition);
  }

  const lines = raw.split('\n');
  const sections: HeadingBulletSection[] = [];
  let current: { term: string; bullets: string[] } | null = null;
  const flush = () => {
    if (current?.term && current.bullets.length) {
      sections.push({ term: current.term, definition: current.bullets.join('\n') });
    }
  };

  for (const line of lines) {
    const heading = line.match(/^#{2,4}\s+(.+)/);
    if (heading) {
      flush();
      current = { term: heading[1].replace(/\*\*/g, '').trim(), bullets: [] };
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^\s*[-*•]\s+(.+)/);
    if (bullet) {
      current.bullets.push(`- ${bullet[1].trim()}`);
    }
  }
  flush();
  return sections;
}

/** Player/regen view: headed leftover OST becomes the reveal items; do not also show it above. */
export function resolveClickRevealSlide(slide: any): { items: any[]; content: string } {
  const items = slide?.data?.items || slide?.interactions?.[0]?.items || [];
  const sections = parseHeadingBulletSections(slide?.content);
  if (sections.length >= 2) {
    return {
      items: sections.map((s, i) => ({
        id: items[i]?.id || `cr-${i + 1}`,
        term: s.term,
        definition: s.definition,
      })),
      content: '',
    };
  }
  if (sections.length >= 1 && Array.isArray(items) && items.length > 0) {
    const merged = items.map((it: any) => {
      const match = sections.find(
        s => s.term.replace(/\s+/g, ' ').toLowerCase() === String(it.term || it.label || '').replace(/\s+/g, ' ').toLowerCase()
      );
      return match ? { ...it, term: match.term, definition: match.definition } : it;
    });
    return { items: merged, content: '' };
  }
  return { items, content: String(slide?.content || '') };
}
