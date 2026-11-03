/**
 * Mastery Quiz navigation: learners stay in the quiz after Begin;
 * authors in Course Preview can leave and re-open the TOC.
 */

export type ExamPhase = 'idle' | 'active' | 'complete';

export type ExamNavTarget = 'content' | 'exam-intro' | 'mastery-exam' | 'exam-results' | 'hub';

export function examNavTargetFromSlide(slide: { type?: string; id?: string } | null | undefined): ExamNavTarget {
  const type = String(slide?.type || '');
  const id = String(slide?.id || '');
  if (type === 'exam-intro' || id === '__exam-intro__') return 'exam-intro';
  if (type === 'mastery-exam' || id === '__mastery-exam__') return 'mastery-exam';
  if (type === 'exam-results' || id === '__exam-results__') return 'exam-results';
  if (type === 'hub-menu' || id === '__hub-menu__') return 'hub';
  return 'content';
}

/**
 * Whether the player may open `target` given quiz phase.
 * Learners cannot return to course slides (or the intro) after Begin Quiz.
 * Authors in preview/build always can — they need the TOC while editing.
 */
export function examNavigationAllowed(opts: {
  examPhase: ExamPhase;
  isLearner: boolean;
  target: ExamNavTarget;
}): boolean {
  const { examPhase, isLearner, target } = opts;
  if (!isLearner) {
    if (target === 'exam-results') return examPhase === 'complete';
    return true;
  }
  if (target === 'exam-intro') return examPhase !== 'active';
  if (target === 'mastery-exam') return examPhase !== 'idle';
  if (target === 'exam-results') return examPhase === 'complete';
  if (target === 'hub') return examPhase !== 'active';
  if (examPhase === 'active') return false;
  return true;
}

export function previousAllowedIndex(
  fromIndex: number,
  canNavigateTo: (idx: number) => boolean,
): number {
  for (let i = fromIndex - 1; i >= 0; i -= 1) {
    if (canNavigateTo(i)) return i;
  }
  return fromIndex;
}
