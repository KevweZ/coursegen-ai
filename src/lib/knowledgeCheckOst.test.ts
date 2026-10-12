import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  optionsWithCorrectFlags,
  quizQuestionList,
  shuffleKnowledgeCheckOptions,
  shuffleQuizQuestionOptions,
} from './knowledgeCheckOst.ts';

test('knowledge-check options shuffle stably and keep the correct flag', () => {
  const opts = [
    { id: 'a', text: 'Correct', isCorrect: true },
    { id: 'b', text: 'Wrong 1', isCorrect: false },
    { id: 'c', text: 'Wrong 2', isCorrect: false },
    { id: 'd', text: 'Wrong 3', isCorrect: false },
  ];
  const once = shuffleKnowledgeCheckOptions(opts, 'kc-slide-1');
  const twice = shuffleKnowledgeCheckOptions(opts, 'kc-slide-1');
  assert.deepEqual(once.map(o => o.id), twice.map(o => o.id));
  assert.deepEqual(once.map(o => o.id).sort(), ['a', 'b', 'c', 'd']);
  assert.equal(once.find(o => o.isCorrect)?.id, 'a');
  assert.equal(opts[0].id, 'a');

  const correctIdxBySeed = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']
    .map(seed => shuffleKnowledgeCheckOptions(opts, seed).findIndex(o => o.isCorrect));
  assert.ok(correctIdxBySeed.some(i => i > 0), 'at least one seed places the correct answer off the top');
});

test('quiz question lists shuffle per question without touching mastery-exam shape', () => {
  const questions = shuffleQuizQuestionOptions([
    {
      questionText: 'Which is densest?',
      options: [
        { id: 'a', text: 'HDPE', isCorrect: true },
        { id: 'b', text: 'LDPE', isCorrect: false },
        { id: 'c', text: 'LLDPE', isCorrect: false },
      ],
    },
  ], 'module-kc');
  assert.equal(questions[0].options.find(o => o.isCorrect)?.text, 'HDPE');
  assert.equal(questions[0].options.length, 3);
});

test('numeric correctAnswer is stamped onto options before shuffle', () => {
  const stamped = optionsWithCorrectFlags(
    [{ id: 'a', text: 'HDPE' }, { id: 'b', text: 'LDPE' }, { id: 'c', text: 'PP' }],
    0,
  );
  assert.equal(stamped[0].isCorrect, true);
  assert.equal(stamped[1].isCorrect, false);
  const listed = quizQuestionList({
    questionText: 'Which is a polymer?',
    options: [{ id: 'a', text: 'HDPE' }, { id: 'b', text: 'Water' }],
    correctAnswer: 0,
  });
  const shuffled = shuffleQuizQuestionOptions(listed, 'kc-index');
  assert.equal(shuffled[0].options.find(o => o.isCorrect)?.text, 'HDPE');
});
