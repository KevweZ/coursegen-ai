import { coerceOstText } from './formatTabIntroOst';

/** Player-chrome hint for sorting (and drop-targets rendered as sorting). Never a learning bullet. */
export const SORTING_REORDER_HINT = 'Drag items or use ↑ ↓ arrows to reorder.';

const INTERACTION_HINT_RE = [
  /^drag items or use [↑^]\s*[↓v] arrows to reorder\.?$/i,
];

function stripListMarker(line: string): string {
  return line.replace(/^\s*[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
}

function isInteractionHint(line: string): boolean {
  const body = stripListMarker(line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  return INTERACTION_HINT_RE.some(re => re.test(body));
}

function normalizeHint(line: string): string {
  const body = stripListMarker(line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  if (/^drag items or use [↑^]\s*[↓v] arrows to reorder\.?$/i.test(body)) {
    return SORTING_REORDER_HINT;
  }
  return /[.!?]$/.test(body) ? body : `${body}.`;
}

/**
 * Pull player-chrome interaction hints out of OST so they are never mixed
 * into the synopsis list (and never rendered with a bullet disc).
 */
export function extractInteractionHint(text: string): { body: string; instruction: string } {
  const rawLines = String(text || '').split('\n');
  const bodyLines: string[] = [];
  let instruction = '';
  for (const line of rawLines) {
    if (!line.trim()) {
      bodyLines.push(line);
      continue;
    }
    if (isInteractionHint(line)) {
      if (!instruction) instruction = normalizeHint(line);
      continue;
    }
    bodyLines.push(line);
  }
  return {
    body: bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    instruction,
  };
}

/** One list item → plain paragraph text (keep inner markdown/HTML). */
export function unwrapSingletonList(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';

  const mdLines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  if (mdLines.length === 1 && /^[-*•]\s+\S/.test(mdLines[0])) {
    return stripListMarker(mdLines[0]);
  }
  if (mdLines.length === 1 && /^\d+[.)]\s+\S/.test(mdLines[0])) {
    return stripListMarker(mdLines[0]);
  }

  const htmlSingle = trimmed.match(
    /^<(?:ul|ol)[^>]*>\s*<li[^>]*>([\s\S]*?)<\/li>\s*<\/(?:ul|ol)>$/i
  );
  if (htmlSingle) return htmlSingle[1].trim();

  return trimmed;
}

function sameHint(a: string, b: string): boolean {
  return a.trim().toLowerCase().replace(/\.+$/, '') === b.trim().toLowerCase().replace(/\.+$/, '');
}

/**
 * Split knowledge-check OST into course-content synopsis vs player-chrome instruction.
 * One framing sentence is a paragraph; two or more points stay bullets.
 */
export function splitKnowledgeCheckOst(
  content: unknown,
  extraHint?: string
): { synopsis: string; instruction: string } {
  const text = coerceOstText(content).trim();
  const extra = (extraHint || '').trim();
  if (!text) {
    return { synopsis: '', instruction: extra };
  }

  const { body, instruction: fromContent } = extractInteractionHint(text);
  const instruction =
    fromContent && extra && sameHint(fromContent, extra)
      ? fromContent
      : fromContent || extra;

  if (!body) return { synopsis: '', instruction };

  const lines = body
    .split('\n')
    .map(l => l.replace(/^\s*[-*•]\s*/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!lines.length) return { synopsis: '', instruction };

  const colonTeaching = lines.filter(l => /:\s+\S/.test(l)).length >= 2;
  const longProse = lines.filter(l => l.split(/\s+/).length > 14).length >= 2;
  if (colonTeaching || longProse) return { synopsis: '', instruction };

  if (lines.length === 1) {
    return { synopsis: unwrapSingletonList(body), instruction };
  }

  const display = body
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => stripListMarker(l))
    .filter(Boolean)
    .slice(0, 2)
    .map(l => `- ${l}`)
    .join('\n');

  return { synopsis: display, instruction };
}

/**
 * Knowledge-check on-screen text should frame the TASK, not teach the answers.
 * Colon-heavy "term: meaning" lists and long prose are treated as cheat sheets
 * and dropped in the player (teaching belongs in feedback after submit).
 */
export function knowledgeCheckFramingOst(content: unknown): string {
  return splitKnowledgeCheckOst(content).synopsis;
}

export function knowledgeCheckInstruction(content: unknown, extraHint?: string): string {
  return splitKnowledgeCheckOst(content, extraHint).instruction;
}
