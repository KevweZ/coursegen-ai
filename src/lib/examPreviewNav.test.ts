import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  examNavTargetFromSlide,
  examNavigationAllowed,
  previousAllowedIndex,
} from './examPreviewNav.ts';

test('learners cannot leave the quiz after Begin; authors in preview can', () => {
  assert.equal(examNavTargetFromSlide({ type: 'exam-intro', id: '__exam-intro__' }), 'exam-intro');
  assert.equal(examNavTargetFromSlide({ type: 'content' }), 'content');

  assert.equal(examNavigationAllowed({ examPhase: 'active', isLearner: true, target: 'content' }), false);
  assert.equal(examNavigationAllowed({ examPhase: 'active', isLearner: true, target: 'exam-intro' }), false);
  assert.equal(examNavigationAllowed({ examPhase: 'active', isLearner: true, target: 'mastery-exam' }), true);

  assert.equal(examNavigationAllowed({ examPhase: 'active', isLearner: false, target: 'content' }), true);
  assert.equal(examNavigationAllowed({ examPhase: 'active', isLearner: false, target: 'exam-intro' }), true);
  assert.equal(examNavigationAllowed({ examPhase: 'idle', isLearner: true, target: 'content' }), true);
  assert.equal(examNavigationAllowed({ examPhase: 'idle', isLearner: true, target: 'exam-intro' }), true);

  const canGo = (idx: number) => idx !== 4 && idx !== 5;
  assert.equal(previousAllowedIndex(6, canGo), 3);
  assert.equal(previousAllowedIndex(0, canGo), 0);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /examNavigationAllowed/);
  assert.match(app, /previousAllowedIndex/);
  assert.match(app, /handleAuthorExitQuiz/);
  assert.match(app, /onAuthorExit=\{!isLearnerPlayer \? handleAuthorExitQuiz/);
  const intro = readFileSync(resolve(process.cwd(), 'src/components/player/ExamIntroSlide.tsx'), 'utf8');
  assert.match(intro, /Exit quiz — back to slides/);
  const quiz = readFileSync(resolve(process.cwd(), 'src/components/player/MasteryExamSlide.tsx'), 'utf8');
  assert.match(quiz, /Exit quiz — back to slides/);
});
