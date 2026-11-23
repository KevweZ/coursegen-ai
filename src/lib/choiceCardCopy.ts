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

export type ChoiceCardsMode = 'explore' | 'select';

export function choiceCardIsAccepted(card: { isCorrect?: boolean; accepted?: boolean } | null | undefined): boolean {
  return card?.isCorrect === true || card?.accepted === true;
}

/**
 * Teaching tiles, not a fake matching quiz.
 * 5+ cards, or every tile marked correct, is explore (click-to-reveal) — Check would
 * green-check the whole board.
 */
function cardText(card: { label?: string; body?: string; description?: string } | null | undefined): string {
  return `${card?.label || ''} ${card?.body || ''} ${card?.description || ''}`.replace(/\s+/g, ' ').trim();
}

/** Tiles describe incidents/scenarios, not parallel answers to one Check prompt. */
export function choiceCardsAreSituationTiles(data: {
  prompt?: string;
  mode?: string;
  cards?: Array<{ label?: string; body?: string; description?: string; isCorrect?: boolean; accepted?: boolean }>;
  items?: Array<{ label?: string; body?: string; description?: string; isCorrect?: boolean; accepted?: boolean }>;
} | null | undefined): boolean {
  if (!data) return false;
  const cards = (Array.isArray(data.cards) && data.cards.length ? data.cards : data.items) || [];
  if (cards.length < 2) return false;
  const prompt = String(data.prompt || '');
  const situationCue = /\b(response|react|respond)\b[\s\S]{0,40}\beach\b|\beach\b[\s\S]{0,40}\b(scenario|situation|case)\b/i.test(prompt);
  const looksSituation = cards.filter((c) => {
    const body = String(c?.body || c?.description || '').replace(/\s+/g, ' ').trim();
    if (/^(another driver|a driver|the other driver|another vehicle|someone)\b/i.test(body)) return true;
    if (/^(you (are|see|encounter|notice|slow down)|while driving)\b/i.test(body)) return true;
    if (/\b(tailgate|honk|rude gesture|cuts? you off|road rage|blocks? traffic)\b/i.test(cardText(c))
      && !/^(let |create |avoid |do not |stay |report |maintain )/i.test(body)) return true;
    return false;
  }).length;
  if (looksSituation >= 2 && (situationCue || looksSituation >= Math.ceil(cards.length / 2))) return true;
  if (situationCue && looksSituation >= 1) return true;
  return false;
}

export function inferChoiceCardsMode(data: {
  mode?: string;
  prompt?: string;
  cards?: Array<{ isCorrect?: boolean; accepted?: boolean; reveal?: string }>;
  items?: Array<{ isCorrect?: boolean; accepted?: boolean; reveal?: string }>;
  selectMode?: string;
} | null | undefined): ChoiceCardsMode {
  if (!data) return 'select';
  const cards = (Array.isArray(data.cards) && data.cards.length ? data.cards : data.items) || [];
  if (cards.length > 4) return 'explore';
  const acceptedCount = cards.filter(choiceCardIsAccepted).length;
  if (cards.length >= 2 && acceptedCount === cards.length) return 'explore';
  if (choiceCardsAreSituationTiles(data)) return 'explore';
  if (data.mode === 'explore' || data.mode === 'select') return data.mode;
  if (acceptedCount > 0) return 'select';
  const hasReveal = cards.some(c => String(c?.reveal || '').trim());
  if (hasReveal) return 'explore';
  const prompt = String(data.prompt || '');
  if (/select each|click each|explore|visit|reveal|callout|pairs?/i.test(prompt)) return 'explore';
  return 'explore';
}

export function choiceCardsPromptForMode(prompt: unknown, mode: ChoiceCardsMode): string {
  const p = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (mode === 'explore' && /\bcheck\b|correct (card )?pairs/i.test(p)) {
    return 'Select each card to explore this topic.';
  }
  return p;
}
