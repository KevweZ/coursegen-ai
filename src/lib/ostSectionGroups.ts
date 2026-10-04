/**
 * Promote ALL-CAPS / fully-bold list items to section headings so content
 * slides keep a parent (header, not bulleted) → child (bullets) relationship
 * instead of a flat two-column list.
 */

import { coerceOstText } from './formatTabIntroOst';
import { parseHeadingBulletSections, type HeadingBulletSection } from './parseHeadingSections';

export type OstSectionGroup = {
  heading: string;
  bullets: string[];
};

function itemPlain(raw: string): string {
  return String(raw || '')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/[_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFullyBoldItem(raw: string): boolean {
  const t = String(raw || '').replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
  if (/^\*\*[^*]+\*\*$/.test(t)) return true;
  if (/^<(strong|b)>[^<]+<\/(strong|b)>$/i.test(t)) return true;
  return false;
}

/** Short ALL-CAPS / fully-bold label — a section parent, not a teaching bullet. */
export function looksLikeSectionHeader(raw: string): boolean {
  const plain = itemPlain(raw);
  if (!plain) return false;
  if (plain.length > 72) return false;
  const words = plain.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 10) return false;
  if (/:[^:]{10,}/.test(plain) && !isFullyBoldItem(raw)) return false;
  const letters = plain.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return false;
  const upper = (plain.replace(/[^A-Z]/g, '').length) / letters.length;
  if (upper >= 0.78) return true;
  if (isFullyBoldItem(raw) && words.length <= 8) return true;
  return false;
}

function collectListItems(markdown: string): string[] {
  const raw = coerceOstText(markdown).replace(/\r\n/g, '\n');
  if (/<li[\s>]/i.test(raw)) {
    return [...raw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l));
}

function fromHeadingSections(sections: HeadingBulletSection[]): OstSectionGroup[] {
  return sections
    .map(s => ({
      heading: itemPlain(s.term),
      bullets: String(s.definition || '')
        .split('\n')
        .map(l => l.replace(/^[-*•]\s+/, '').trim())
        .filter(Boolean),
    }))
    .filter(s => s.heading && s.bullets.length);
}

/** Two or more parent headings each with child bullets — otherwise null. */
export function parseOstSectionGroups(content: unknown): OstSectionGroup[] | null {
  const raw = coerceOstText(content);
  if (!raw.trim()) return null;

  const fromHeadings = fromHeadingSections(parseHeadingBulletSections(raw));
  if (fromHeadings.length >= 2) return fromHeadings;

  const items = collectListItems(raw);
  if (items.length < 3) return null;

  const groups: OstSectionGroup[] = [];
  let current: OstSectionGroup | null = null;
  for (const item of items) {
    if (looksLikeSectionHeader(item)) {
      if (current && current.bullets.length) groups.push(current);
      current = { heading: itemPlain(item), bullets: [] };
      continue;
    }
    if (!current) continue;
    current.bullets.push(itemPlain(item));
  }
  if (current && current.bullets.length) groups.push(current);

  if (groups.length < 2) return null;
  if (groups.every(g => g.bullets.length === 0)) return null;
  return groups.filter(g => g.bullets.length);
}

/** Rewrite OST so parents are ### headings and children stay bullets. */
export function formatOstSectionGroups(content: unknown): string {
  const groups = parseOstSectionGroups(content);
  if (!groups) return coerceOstText(content);
  return groups
    .map(g => `### ${g.heading}\n${g.bullets.map(b => `- ${b}`).join('\n')}`)
    .join('\n\n');
}
