/**
 * Mastery Quiz lock — never serve course-structure / [Draft] placeholders.
 * AI output is filtered; gaps are filled from teaching-slide facts.
 */

import { isKnowledgeCheckSlide, isTeachingSlide } from './enablingCoverage';
import { isMetaKnowledgeCheckText, isNonAssessableFactText } from './hydrateGuards';
import type { ExamConfig, ExamQuestion } from '../types/course';

export type ExamFact = {
  moduleIndex: number;
  topic: string;
  statement: string;
};

const CHROME_TYPES = new Set([
  'title', 'intro', 'outro', 'cover', 'player-tour', 'course-objectives',
  'module-cover', 'module-overview', 'exam-intro', 'mastery-exam', 'exam-results',
  'closing',
]);

function cleanLine(raw: unknown): string {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/[#*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsableFact(line: string): boolean {
  if (!line || line.length < 18) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;
  if (/^\[draft\]/i.test(line)) return false;
  if (isMetaKnowledgeCheckText(line)) return false;
  if (isNonAssessableFactText(line)) return false;
  if (/^(select|choose|click|tap|explore|visit each)\b/i.test(line)) return false;
  return true;
}

function splitFactLines(raw: unknown): string[] {
  const text = String(raw || '');
  if (!text.trim()) return [];
  const out: string[] = [];
  for (const block of text.split(/\n+/)) {
    const cleaned = cleanLine(block);
    if (!cleaned) continue;
    const sentences = cleaned.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length > 1) out.push(...sentences);
    else out.push(cleaned);
  }
  return out;
}

function pushFact(out: ExamFact[], seen: Set<string>, moduleIndex: number, topic: string, raw: unknown) {
  const statement = cleanLine(raw);
  if (!isUsableFact(statement)) return;
  const key = statement.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ moduleIndex, topic: topic || 'this topic', statement });
}

function collectFromData(out: ExamFact[], seen: Set<string>, moduleIndex: number, topic: string, data: any) {
  if (!data || typeof data !== 'object') return;
  const tabs = Array.isArray(data.tabs) ? data.tabs : [];
  for (const tab of tabs) {
    const label = cleanLine(tab?.label || tab?.title) || topic;
    splitFactLines(tab?.content).forEach(line => pushFact(out, seen, moduleIndex, label, line));
  }
  const cards = Array.isArray(data.cards) ? data.cards : [];
  for (const card of cards) {
    const label = cleanLine(card?.label || card?.title) || topic;
    splitFactLines(card?.reveal || card?.body || card?.content).forEach(line => pushFact(out, seen, moduleIndex, label, line));
  }
  const items = Array.isArray(data.items) ? data.items : [];
  for (const item of items) {
    const label = cleanLine(item?.term || item?.label || item?.title) || topic;
    splitFactLines(item?.definition || item?.content).forEach(line => pushFact(out, seen, moduleIndex, label, line));
  }
  if (Array.isArray(data.objectives)) {
    for (const obj of data.objectives) {
      pushFact(out, seen, moduleIndex, topic, obj?.label || obj?.content);
    }
  }
}

/** Pull technical statements from teaching slides — never titles-as-topics. */
export function extractTeachingFacts(course: any): ExamFact[] {
  const out: ExamFact[] = [];
  const seen = new Set<string>();
  const modules = Array.isArray(course?.modules) ? course.modules : [];
  modules.forEach((mod: any, moduleIndex: number) => {
    const slides = Array.isArray(mod?.slides) ? mod.slides : [];
    for (const slide of slides) {
      const type = String(slide?.type || '');
      if (CHROME_TYPES.has(type) || isKnowledgeCheckSlide(slide)) continue;
      if (!isTeachingSlide(slide) && type !== 'key-takeaways' && type !== 'summary') continue;
      const topic = cleanLine(slide?.title) || cleanLine(mod?.title) || 'this topic';
      // OST only — narration often starts with "In this module, you will…" and is not a quiz claim.
      splitFactLines(slide?.content).forEach(line => pushFact(out, seen, moduleIndex, topic, line));
      collectFromData(out, seen, moduleIndex, topic, slide?.data);
    }
  });
  return out;
}

export function examQuestionIsMeta(q: { question?: string; options?: string[] } | null | undefined): boolean {
  if (!q) return true;
  const stem = String(q.question || '');
  const opts = (q.options || []).map(o => String(o || ''));
  const blob = [stem, ...opts].join('\n');
  if (!stem.trim()) return true;
  if (/\[draft\]/i.test(stem)) return true;
  if (isMetaKnowledgeCheckText(blob)) return true;
  if (/primary focus of\s*["“']/i.test(stem)) return true;
  if (/which are discussed in/i.test(stem)) return true;
  if (/key learning point from this course/i.test(stem)) return true;
  if (/is a key topic in this (course|module)/i.test(stem)) return true;
  if (opts.some(o => /^an unrelated topic$/i.test(o.trim()))) return true;
  if (opts.some(o => /^a concept from another (module|domain)$/i.test(o.trim()))) return true;
  if (opts.some(o => /^a core concept from the course$/i.test(o.trim()))) return true;
  if (isNonAssessableFactText(stem) || opts.some(o => isNonAssessableFactText(o))) return true;
  return false;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const next = items.slice();
  let h = hashSeed(seed);
  for (let i = next.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function otherFacts(facts: ExamFact[], primary: ExamFact, n: number, seed: string): ExamFact[] {
  const pool = facts.filter(f => f.statement !== primary.statement);
  return seededShuffle(pool, seed).slice(0, n);
}

function neededCount(course: any, config: Pick<ExamConfig, 'questionMode' | 'questionCount'>): number {
  const n = Math.max(1, Number(config.questionCount) || 5);
  const modules = Math.max(1, course?.modules?.length || 1);
  return config.questionMode === 'per-module' ? n * modules : n;
}

function examTypes(config: Pick<ExamConfig, 'questionTypes'>): Array<'mc' | 'ma' | 'tf'> {
  const types = (config.questionTypes || []).filter((t): t is 'mc' | 'ma' | 'tf' => t === 'mc' || t === 'ma' || t === 'tf');
  return types.length ? types : ['mc', 'ma', 'tf'];
}

function groundedOne(
  facts: ExamFact[],
  index: number,
  type: 'mc' | 'ma' | 'tf',
): ExamQuestion | null {
  if (facts.length < 1) return null;
  const primary = facts[index % facts.length];
  const seed = `${type}:${index}:${primary.statement}`;
  if (type === 'tf') {
    const distractors = otherFacts(facts, primary, 1, seed);
    const makeFalse = index % 2 === 1 && distractors[0];
    if (makeFalse) {
      return {
        id: `q-${index + 1}`,
        type: 'tf',
        question: `${primary.topic} is characterized by the following: ${distractors[0].statement}`,
        options: ['True', 'False'],
        correctAnswer: 1,
        explanation: `That description belongs to ${distractors[0].topic}, not ${primary.topic}.`,
        moduleIndex: primary.moduleIndex,
      };
    }
    return {
      id: `q-${index + 1}`,
      type: 'tf',
      question: primary.statement,
      options: ['True', 'False'],
      correctAnswer: 0,
      explanation: `${primary.topic}: ${primary.statement}`,
      moduleIndex: primary.moduleIndex,
    };
  }

  if (type === 'ma') {
    const sameTopic = facts.filter(f => f.topic === primary.topic && f.statement !== primary.statement);
    const extraCorrect = sameTopic[0] || facts[(index + 1) % facts.length];
    const wrong = otherFacts(facts, primary, 2, seed + ':ma').filter(f => f.topic !== primary.topic);
    const correctSet = [primary, extraCorrect].filter((f, i, arr) => arr.findIndex(x => x.statement === f.statement) === i);
    const optionsFacts = seededShuffle([...correctSet, ...wrong.slice(0, 2)], seed + ':opts');
    if (optionsFacts.length < 3) return groundedOne(facts, index, 'mc');
    const correctAnswer = optionsFacts
      .map((f, i) => (correctSet.some(c => c.statement === f.statement) ? i : -1))
      .filter(i => i >= 0);
    if (correctAnswer.length < 2) return groundedOne(facts, index, 'mc');
    return {
      id: `q-${index + 1}`,
      type: 'ma',
      question: `Which of the following are true of ${primary.topic}? (Select all that apply)`,
      options: optionsFacts.map(f => f.statement),
      correctAnswer,
      explanation: `Review ${primary.topic}.`,
      moduleIndex: primary.moduleIndex,
    };
  }

  const distractors = otherFacts(facts, primary, 3, seed);
  const optionFacts = seededShuffle([primary, ...distractors], seed + ':mc');
  while (optionFacts.length < 4 && facts[optionFacts.length]) {
    optionFacts.push(facts[optionFacts.length % facts.length]);
  }
  if (optionFacts.length < 2) return null;
  const correctAnswer = Math.max(0, optionFacts.findIndex(f => f.statement === primary.statement));
  return {
    id: `q-${index + 1}`,
    type: 'mc',
    question: `Which statement about ${primary.topic} is accurate?`,
    options: optionFacts.slice(0, 4).map(f => f.statement),
    correctAnswer,
    explanation: primary.statement,
    moduleIndex: primary.moduleIndex,
  };
}

/** Technical questions from slide facts. Never [Draft] / “is this in the course”. */
export function generateContentGroundedExamQuestions(
  course: any,
  config: Pick<ExamConfig, 'questionMode' | 'questionCount' | 'questionTypes'>,
): ExamQuestion[] {
  const facts = extractTeachingFacts(course);
  const total = neededCount(course, config);
  const types = examTypes(config);
  const questions: ExamQuestion[] = [];
  if (!facts.length) return questions;
  for (let i = 0; i < total; i++) {
    const q = groundedOne(facts, i, types[i % types.length]);
    if (q && !examQuestionIsMeta(q)) questions.push({ ...q, id: `q-${questions.length + 1}` });
  }
  return questions.slice(0, total);
}

/**
 * Drop course-structure slop. Fill holes from teaching facts so the quiz
 * stays technical even when the AI times out.
 */
export function sanitizeMasteryExamQuestions(
  questions: ExamQuestion[] | null | undefined,
  course: any,
  config: Pick<ExamConfig, 'questionMode' | 'questionCount' | 'questionTypes'>,
): ExamQuestion[] {
  const total = neededCount(course, config);
  const grounded = generateContentGroundedExamQuestions(course, config);
  const incoming = Array.isArray(questions) ? questions : [];
  const kept = incoming.filter(q => q && !examQuestionIsMeta(q) && Array.isArray(q.options) && q.options.length >= 2);
  const out: ExamQuestion[] = [];
  for (let i = 0; i < total; i++) {
    const next = kept[i] || grounded[i] || grounded[i % Math.max(1, grounded.length)];
    if (!next) continue;
    out.push({ ...next, id: `q-${out.length + 1}` });
  }
  return out;
}

export const MAX_MASTERY_EXAM_OPTIONS = 6;

export function isMasteryExamType(type?: string): boolean {
  return String(type || '') === 'mastery-exam';
}

function clampCorrectIndex(n: number, optionCount: number): number {
  if (!optionCount) return 0;
  return Math.max(0, Math.min(Math.floor(n), optionCount - 1));
}

/** Stem + choices for Edit Slide — player source is `examQuestions`, not leftover OST. */
export function masteryExamEditQuestions(questions: ExamQuestion[] | null | undefined): ExamQuestion[] {
  if (!Array.isArray(questions) || !questions.length) return [];
  return questions.map((q, i) => {
    const type: ExamQuestion['type'] = q?.type === 'ma' || q?.type === 'tf' ? q.type : 'mc';
    const options = type === 'tf'
      ? ['True', 'False']
      : (Array.isArray(q?.options) ? q.options.map(o => String(o ?? '')) : []).slice();
    while (type !== 'tf' && options.length < 2) options.push('');
    let correctAnswer: number | number[];
    if (type === 'ma') {
      const arr = (Array.isArray(q?.correctAnswer) ? q.correctAnswer : [q?.correctAnswer])
        .map(n => Number(n))
        .filter(n => Number.isFinite(n) && n >= 0 && n < options.length);
      correctAnswer = arr.length ? Array.from(new Set(arr)).sort((a, b) => a - b) : [0];
    } else {
      const n = typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0;
      correctAnswer = clampCorrectIndex(n, options.length);
    }
    return {
      ...q,
      id: q?.id || `q-${i + 1}`,
      type,
      question: String(q?.question || ''),
      options,
      correctAnswer,
      explanation: q?.explanation != null ? String(q.explanation) : undefined,
    };
  });
}

export function attachMasteryExamForEdit(slide: any, questions: ExamQuestion[] | null | undefined): any {
  if (!slide || !isMasteryExamType(slide.type)) return slide;
  return { ...slide, _examQuestions: masteryExamEditQuestions(questions) };
}

export function applyMasteryExamEdits(slide: any, questions: ExamQuestion[]): any {
  return {
    ...slide,
    _examQuestions: masteryExamEditQuestions(questions),
  };
}

export function persistMasteryExamQuestions(questions: ExamQuestion[] | null | undefined): ExamQuestion[] {
  return masteryExamEditQuestions(questions);
}

export function setMasteryExamCorrect(
  questions: ExamQuestion[],
  questionIndex: number,
  optionIndex: number,
): ExamQuestion[] {
  return questions.map((q, qi) => {
    if (qi !== questionIndex) return q;
    if (q.type === 'ma') {
      const current = Array.isArray(q.correctAnswer) ? q.correctAnswer.map(Number) : [];
      const has = current.includes(optionIndex);
      const next = has
        ? current.filter(n => n !== optionIndex)
        : [...current, optionIndex].sort((a, b) => a - b);
      return { ...q, correctAnswer: next.length ? next : [optionIndex] };
    }
    return { ...q, correctAnswer: optionIndex };
  });
}

export function setMasteryExamStem(
  questions: ExamQuestion[],
  questionIndex: number,
  text: string,
): ExamQuestion[] {
  return questions.map((q, qi) => (qi === questionIndex ? { ...q, question: text } : q));
}

export function setMasteryExamOption(
  questions: ExamQuestion[],
  questionIndex: number,
  optionIndex: number,
  text: string,
): ExamQuestion[] {
  return questions.map((q, qi) => {
    if (qi !== questionIndex) return q;
    if (q.type === 'tf') return q;
    const options = [...(q.options || [])];
    options[optionIndex] = text;
    return { ...q, options };
  });
}

export function addMasteryExamOption(questions: ExamQuestion[], questionIndex: number): ExamQuestion[] {
  return questions.map((q, qi) => {
    if (qi !== questionIndex) return q;
    if (q.type === 'tf') return q;
    const options = [...(q.options || [])];
    if (options.length >= MAX_MASTERY_EXAM_OPTIONS) return q;
    return { ...q, options: [...options, ''] };
  });
}

export function removeMasteryExamOption(
  questions: ExamQuestion[],
  questionIndex: number,
  optionIndex: number,
): ExamQuestion[] {
  return questions.map((q, qi) => {
    if (qi !== questionIndex) return q;
    if (q.type === 'tf') return q;
    const options = (q.options || []).filter((_, j) => j !== optionIndex);
    if (options.length < 2) return q;
    if (q.type === 'ma') {
      const arr = (Array.isArray(q.correctAnswer) ? q.correctAnswer : [])
        .filter(n => n !== optionIndex)
        .map(n => (n > optionIndex ? n - 1 : n));
      return { ...q, options, correctAnswer: arr.length ? arr : [0] };
    }
    const cur = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
    let next = cur;
    if (cur === optionIndex) next = 0;
    else if (cur > optionIndex) next = cur - 1;
    return { ...q, options, correctAnswer: clampCorrectIndex(next, options.length) };
  });
}
