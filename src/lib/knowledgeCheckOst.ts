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

/** Short story / situation the learner reads before a quiz question (not the question itself). */
export function quizScenarioText(source: any): string {
  if (!source || typeof source !== 'object') return '';
  const d = source.data && typeof source.data === 'object' ? source.data : source;
  return String(d.scenarioText || d.stem || d.preamble || d.situation || '').trim();
}

const COUNT_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function optionIsCorrect(opt: any): boolean {
  return opt?.isCorrect === true || opt?.correct === true;
}

function statedSelectCount(text: string): number | null {
  const selectMatch = String(text || '').match(
    /\b(?:select|choose|pick)\s+(?:the\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i
  );
  const whichMatch = String(text || '').match(
    /\bwhich\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i
  );
  const token = selectMatch?.[1] || whichMatch?.[1];
  if (!token) return null;
  const fromWord = COUNT_WORDS[token.toLowerCase()];
  if (fromWord) return fromWord;
  const n = parseInt(token, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * When a stem says "select two" but the key marks a different number correct
 * (including all-of-the-above), drop the false count so learners are not
 * boxed into picking only N answers.
 */
export function alignQuizSelectPrompt(questionText: string, options?: any[]): string {
  const q = String(questionText || '');
  if (!q.trim() || !Array.isArray(options) || options.length < 2) return q;
  const stated = statedSelectCount(q);
  if (stated == null) return q;
  const correctCount = options.filter(optionIsCorrect).length;
  if (correctCount === stated) return q;
  let next = q.replace(
    /\b((?:select|choose|pick)\s+)(?:the\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+/i,
    (_m, verb: string) => `${String(verb).replace(/\s+$/, '')} the `
  );
  next = next.replace(
    /\bwhich\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+/i,
    'which '
  );
  return next;
}

export function applyAlignedQuizPrompt(target: any): any {
  if (!target || typeof target !== 'object') return target;
  const options = Array.isArray(target.options) ? target.options : [];
  const key = target.questionText != null ? 'questionText'
    : target.prompt != null ? 'prompt'
    : target.question != null ? 'question'
    : null;
  if (!key) return target;
  const aligned = alignQuizSelectPrompt(String(target[key] || ''), options);
  if (aligned === target[key]) return target;
  return { ...target, [key]: aligned };
}

/**
 * Empty branching-scenario payloads with quiz options should play as a KC.
 * Used when a storyboard "Scenario:" screen was typed as ScenarioEngine.
 */
export function emptyScenarioQuizKind(slide: any): 'quiz' | 'multiple-answers' | null {
  if (!slide || slide.type !== 'scenario') return null;
  const d = slide.data || {};
  if (Array.isArray(d.nodes) && d.nodes.length > 0 && d.startNodeId) return null;
  const opts = d.options || slide.interactions?.[0]?.options;
  if (!Array.isArray(opts) || opts.length < 2) return null;
  const correct = opts.filter((o: any) => o?.isCorrect === true || o?.correct === true).length;
  return correct >= 2 ? 'multiple-answers' : 'quiz';
}
