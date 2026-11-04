/**
 * Ground knowledge checks in teaching-slide facts — same thoroughness as Mastery Quiz.
 * Never ship "Which statement about X is most accurate?" with role/mix-up placeholders.
 */

import { isKnowledgeCheckSlide } from './enablingCoverage';
import {
  knowledgeCheckHasMetaStem,
  knowledgeCheckIsSkeleton,
  quizHasLearnerPayload,
} from './hydrateGuards';
import { generateContentGroundedExamQuestions } from './masteryExam';
import type { ExamQuestion } from '../types/course';

export function knowledgeCheckNeedsGrounding(slide: any): boolean {
  if (!isKnowledgeCheckSlide(slide)) return false;
  if (!quizHasLearnerPayload(slide)) return true;
  if (knowledgeCheckHasMetaStem(slide)) return true;
  if (knowledgeCheckIsSkeleton(slide)) return true;
  return false;
}

function examTypeForSlide(slide: any): 'mc' | 'ma' | 'tf' {
  const type = String(slide?.type || '');
  if (type === 'true-false') return 'tf';
  if (type === 'multiple-answers' || type === 'multiple-answer') return 'ma';
  return 'mc';
}

export function knowledgeCheckDataFromExam(q: ExamQuestion): Record<string, unknown> {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const correct = q.correctAnswer;
  const options = (q.options || []).map((text, i) => ({
    id: letters[i] || String(i),
    text: String(text || ''),
    isCorrect: Array.isArray(correct) ? correct.includes(i) : i === Number(correct),
  }));
  let questionText = String(q.question || '').trim();
  const about = questionText.match(/which statement about (.+) is (?:most )?accurate\??/i);
  if (about) questionText = `Which of the following is true of ${about[1].trim()}?`;
  return {
    questionText,
    options,
    feedback: String(q.explanation || '').trim() || `Review this topic, then continue.`,
  };
}

export function groundKnowledgeCheckSlide(slide: any, module: any, index = 0): any {
  if (!slide || !knowledgeCheckNeedsGrounding(slide)) return slide;
  const kind = examTypeForSlide(slide);
  const qs = generateContentGroundedExamQuestions(
    { modules: [module] },
    {
      questionMode: 'total',
      questionCount: Math.max(index + 1, 4),
      questionTypes: [kind],
    },
  );
  const q = qs[index % Math.max(1, qs.length)];
  if (!q || !(q.options || []).length) return slide;
  const data = knowledgeCheckDataFromExam(q);
  const nextType = kind === 'tf' ? 'quiz' : (kind === 'ma' ? 'multiple-answers' : (slide.type || 'quiz'));
  return {
    ...slide,
    type: nextType,
    data: {
      ...(slide.data && typeof slide.data === 'object' ? slide.data : {}),
      ...data,
    },
  };
}

/** Rewrite empty / meta / skeleton KCs from this module's teaching slides. */
export function groundModuleKnowledgeChecks<T extends { title?: string; slides?: any[] }>(mod: T): T {
  const slides = Array.isArray(mod?.slides) ? [...mod.slides] : [];
  if (!slides.length) return mod;
  let groundedIndex = 0;
  const next = slides.map((s) => {
    if (!knowledgeCheckNeedsGrounding(s)) return s;
    const g = groundKnowledgeCheckSlide(s, { ...mod, slides }, groundedIndex);
    groundedIndex += 1;
    return g;
  });
  return { ...mod, slides: next };
}
