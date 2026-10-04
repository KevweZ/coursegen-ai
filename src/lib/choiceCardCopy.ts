/**
 * Choice-card faces stay short. Spec-table rows (Reaction conditions:, Key product:)
 * belong in the after-click reveal, not stacked on the tile.
 */
import { coerceOstText } from './formatTabIntroOst';

const FACE_WORD_MAX = 28;

function bodyLines(raw: string): string[] {
  return coerceOstText(raw)
    .split(/\n/)
    .map(l => l.replace(/^[-*•]\s+/, '').trim())
    .filter(Boolean);
}

function isSpecRow(line: string): boolean {
  if (!/^.+?:\s+\S/.test(line)) return false;
  const label = line.split(':')[0] || '';
  if (label.split(/\s+/).length > 8) return false;
  return line.split(/\s+/).filter(Boolean).length >= 3;
}

function wordCount(text: string): number {
  return String(text || '').split(/\s+/).filter(Boolean).length;
}

/** Move labeled fact rows (and overflow) off the card face into reveal. */
export function compactChoiceCardCopy<T extends { body?: string; description?: string; reveal?: string }>(card: T): T {
  if (!card || typeof card !== 'object') return card;
  const body = coerceOstText(card.body || card.description || '');
  const reveal = coerceOstText(card.reveal || '');
  const lines = bodyLines(body);
  const spec = lines.filter(isSpecRow);
  const overflow = spec.length >= 2 || lines.length >= 4 || wordCount(body) > FACE_WORD_MAX;
  if (!overflow) {
    return { ...card, body, reveal };
  }
  const teaser = lines.filter(l => !spec.includes(l))[0] || '';
  const moved = (spec.length ? spec : lines.slice(teaser ? 1 : 0))
    .map(l => `- ${l}`)
    .join('\n');
  const nextReveal = [moved, reveal].filter(Boolean).join('\n\n');
  return { ...card, body: teaser, reveal: nextReveal };
}

export function compactChoiceCardsList<T extends { body?: string; description?: string; reveal?: string }>(cards: T[] | undefined | null): T[] {
  return (Array.isArray(cards) ? cards : []).map(c => compactChoiceCardCopy(c));
}
