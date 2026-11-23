/**
 * Scored-choice quality: options must be the thing being asked (a color, a type),
 * not the explanation. Teaching stays in feedback / reveal.
 */

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at', 'by',
  'is', 'are', 'that', 'this', 'which', 'what', 'who', 'with', 'from', 'you',
  'must', 'should', 'your', 'their', 'about', 'into', 'than', 'then',
]);

const REST_VERB =
  /\s+(provide|provides|display|displays|indicate|indicates|indicating|mark|marks|mean|means|is|are|show|shows|showing|represent|represents|describe|describes|require|requires|allow|allows|apply|applies|give|gives|tell|tells|signal|signals)\s+/i;

function stemWord(w: string): string {
  if (w.length > 5 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function words(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map(stemWord)
    .filter(w => w.length > 1 && !STOP.has(w));
}

function optionText(opt: unknown): string {
  if (typeof opt === 'string') return opt.trim();
  if (!opt || typeof opt !== 'object') return '';
  const o = opt as { text?: unknown; label?: unknown };
  return String(o.text || o.label || '').replace(/\s+/g, ' ').trim();
}

/** Stem is asking for a short label (color, type, sign), not a full claim. */
export function stemAsksForShortLabel(stem: unknown): boolean {
  const s = String(stem || '').replace(/\s+/g, ' ').trim();
  if (!s) return false;
  if (/\bwhich statement\b/i.test(s)) return false;
  if (/\bwhat does\b.+\bstand for\b/i.test(s)) return false;
  return (
    /\bwhich\b[\s\S]{0,80}\b(color|colour|sign|symbol|letter|number|code|grade|class|category|type|kind)\b/i.test(s)
    || /\bwhat\s+(color|colour|sign|symbol|grade|type|kind)\b/i.test(s)
    || /\bwhich\s+of\s+the\s+following\s+(colors?|colours?|signs?|types?|grades?|categories)\b/i.test(s)
  );
}

function splitLabelAndRest(text: string): { label: string; rest: string } | null {
  const m = String(text || '').match(REST_VERB);
  if (!m || m.index == null || m.index < 1) return null;
  const label = text.slice(0, m.index).replace(/[,:;]+$/, '').trim();
  const rest = text.slice(m.index + m[0].length).trim();
  const labelWords = label.split(/\s+/).filter(Boolean);
  if (labelWords.length < 1 || labelWords.length > 6) return null;
  if (rest.split(/\s+/).filter(Boolean).length < 5) return null;
  return { label, rest };
}

function restOverlapsStem(rest: string, stem: string): boolean {
  const sw = new Set(words(stem));
  const rw = words(rest);
  if (!rw.length || !sw.size) return false;
  const hit = rw.filter(w => sw.has(w)).length;
  return hit >= 2 || hit / rw.length >= 0.28;
}

function uniqueLabels(parts: Array<{ label: string }>): boolean {
  const seen = new Set<string>();
  for (const p of parts) {
    const k = p.label.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

/** True when choices restate the stem instead of naming the answer. */
export function quizOptionsLeakAnswer(stem: unknown, options: unknown[] | undefined): boolean {
  if (!stemAsksForShortLabel(stem)) return false;
  const texts = (options || []).map(optionText).filter(Boolean);
  if (texts.length < 2) return false;
  const parts = texts.map(splitLabelAndRest);
  if (parts.some(p => !p)) return false;
  const ok = parts as Array<{ label: string; rest: string }>;
  if (!uniqueLabels(ok)) return false;
  return ok.some(p => restOverlapsStem(p.rest, String(stem || '')));
}

/**
 * When every option is "Label + restates the question", keep the label.
 * Put the correct option's explanation onto feedback if it was empty.
 */
export function compactLeakingQuizQuestion<T extends {
  questionText?: string;
  question?: string;
  options?: any[];
  feedback?: string;
}>(q: T): T {
  if (!q || typeof q !== 'object') return q;
  const stem = String(q.questionText || q.question || '');
  const options = Array.isArray(q.options) ? q.options : [];
  if (!quizOptionsLeakAnswer(stem, options)) return q;
  const texts = options.map(optionText);
  const parts = texts.map(splitLabelAndRest) as Array<{ label: string; rest: string }>;
  let feedback = q.feedback != null ? String(q.feedback) : '';
  const nextOpts = options.map((opt, i) => {
    const label = parts[i]?.label || texts[i];
    const rest = parts[i]?.rest || '';
    const isCorrect = !!(opt && typeof opt === 'object' && (opt.isCorrect === true || opt.correct === true));
    if (isCorrect && rest && !feedback.trim()) feedback = rest;
    if (typeof opt === 'string') return label;
    return { ...opt, text: label };
  });
  return { ...q, options: nextOpts, feedback };
}

export function compactLeakingExamQuestion<T extends {
  question?: string;
  options?: string[];
  explanation?: string;
  correctAnswer?: number | number[];
}>(q: T): T {
  if (!q || typeof q !== 'object') return q;
  const stem = String(q.question || '');
  const options = Array.isArray(q.options) ? q.options.map(o => String(o ?? '')) : [];
  if (!quizOptionsLeakAnswer(stem, options)) return q;
  const parts = options.map(splitLabelAndRest) as Array<{ label: string; rest: string }>;
  let explanation = q.explanation != null ? String(q.explanation) : '';
  const correct = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
  if (!explanation.trim() && parts[correct]?.rest) explanation = parts[correct].rest;
  return {
    ...q,
    options: parts.map(p => p.label),
    explanation,
  };
}
