import type { ExamConfig } from '../types/course';

/**
 * Learner-facing Mastery Quiz length.
 * Course Settings `questionCount` is either a course total or a per-module count.
 * Prefer the settings formula so per-module courses are not shown as a 3-question quiz.
 * If a longer generated bank already exists, show that length instead.
 */
export function resolveMasteryQuizQuestionCount(
  examConfig: Pick<ExamConfig, 'questionMode' | 'questionCount'>,
  moduleCount: number,
  actualQuestionCount?: number,
): number {
  const n = Math.max(1, Number(examConfig.questionCount) || 1);
  const expected =
    examConfig.questionMode === 'per-module'
      ? n * Math.max(1, moduleCount)
      : n;
  if (typeof actualQuestionCount === 'number' && actualQuestionCount > expected) {
    return actualQuestionCount;
  }
  return expected;
}

export function estimateMasteryQuizMinutes(questionCount: number): number {
  return Math.ceil(Math.max(1, questionCount) * 1.5);
}
