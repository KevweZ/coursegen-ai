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

/** Child fact under a topic: comparative lead-in or a relation (=, arrow). */
function looksLikeSupportingBullet(raw: string): boolean {
  const plain = itemPlain(raw);
  if (!plain) return false;
  if (/^(higher|lower|more|less|faster|slower|also|this|it)\b/i.test(plain)) return true;
  if (/[=→]/.test(plain) && !looksLikeSectionHeader(raw)) return true;
  return false;
}

function splitColonTopic(raw: string): { heading: string; lead?: string } {
  const plain = itemPlain(raw);
  const m = plain.match(/^(.{2,48}?):\s+(.+)$/);
  if (m) {
    const label = m[1].trim();
    const rest = m[2].trim();
    if (label.split(/\s+/).length <= 8 && rest.split(/\s+/).length >= 3) {
      return { heading: label, lead: rest };
    }
  }
  return { heading: plain };
}

/**
 * Two-column peer lists (4–6 items) where each column lead is a topic and
 * the rest are supporting facts. Matches Melt Flow Index-style overviews.
 */
function fromBalancedTopicColumns(lines: string[]): OstSectionGroup[] | null {
  if (lines.length < 4 || lines.length > 6) return null;
  if (lines.some(l => looksLikeSectionHeader(l) || /^#{2,4}\s+/.test(l))) return null;
  const mid = Math.ceil(lines.length / 2);
  const chunks = [lines.slice(0, mid), lines.slice(mid)];
  if (chunks.some(c => c.length < 2)) return null;
  if (!chunks.every(c => !looksLikeSupportingBullet(c[0]) && c.slice(1).every(looksLikeSupportingBullet))) {
    return null;
  }
  return chunks.map(c => {
    const split = splitColonTopic(c[0]);
    const bullets = [
      ...(split.lead ? [split.lead] : []),
      ...c.slice(1).map(itemPlain),
    ].filter(Boolean);
    return { heading: split.heading, bullets };
  });
}

function collectFlowLines(markdown: string): string[] {
  const raw = coerceOstText(markdown).replace(/\r\n/g, '\n');
  if (/<h[2-4][\s>]|<li[\s>]/i.test(raw)) {
    const chunks: string[] = [];
    if (/<h[2-4]/i.test(raw)) {
      const headingParts = raw.split(/(?=<h[2-4][\s>])/i);
      for (const part of headingParts) {
        const hm = part.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
        if (hm) chunks.push(`### ${hm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
        const lis = [...part.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
          .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        lis.forEach(t => chunks.push(`- ${t}`));
      }
      if (chunks.length >= 3) return chunks;
    }
    const fromLi = [...raw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (fromLi.length) return fromLi.map(t => `- ${t}`);
  }
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
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

  const lines = collectFlowLines(raw);
  if (lines.length < 3) return null;

  const groups: OstSectionGroup[] = [];
  let current: OstSectionGroup | null = null;
  for (const line of lines) {
    if (/^#{2,4}\s+/.test(line) || looksLikeSectionHeader(line)) {
      if (current && current.bullets.length) groups.push(current);
      current = { heading: itemPlain(line.replace(/^#{2,4}\s+/, '')), bullets: [] };
      continue;
    }
    if (!current) continue;
    current.bullets.push(itemPlain(line));
  }
  if (current && current.bullets.length) groups.push(current);

  const headed = groups.filter(g => g.bullets.length);
  if (headed.length >= 2) return headed;

  const columns = fromBalancedTopicColumns(lines);
  if (columns && columns.length >= 2) return columns;
  return null;
}

/** Rewrite OST so parents are ### headings and children stay bullets. */
export function formatOstSectionGroups(content: unknown): string {
  const groups = parseOstSectionGroups(content);
  if (!groups) return coerceOstText(content);
  return groups
    .map(g => `### ${g.heading}\n${g.bullets.map(b => `- ${b}`).join('\n')}`)
    .join('\n\n');
}
