import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyKnowledgeCheckEdits,
  knowledgeCheckEditQuestions,
  optionsWithCorrectFlags,
  quizQuestionList,
  setKnowledgeCheckCorrect,
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

test('Edit Slide reads KC stem from interactions and writes back to both stores', () => {
  const slide = {
    type: 'quiz',
    title: 'Knowledge Check: Olefin Products and Applications',
    content: 'Test your understanding of steam cracking.',
    data: {},
    interactions: [{
      questionText: "Which statement BEST DESCRIBES the term 'base olefins' in steam cracking?",
      options: [
        { id: 'a', text: 'Base olefins are the primary C2 and C3 products.', isCorrect: true },
        { id: 'b', text: 'Base olefins are heavy fuel oil byproducts.', isCorrect: false },
        { id: 'c', text: 'Base olefins are secondary products such as butadiene.', isCorrect: false },
        { id: 'd', text: 'Base olefins are aromatic compounds in boiler fuel.', isCorrect: false },
      ],
    }],
  };
  const listed = knowledgeCheckEditQuestions(slide);
  assert.match(listed[0].questionText, /base olefins/i);
  assert.equal(listed[0].options.length, 4);
  listed[0].questionText = listed[0].questionText.replace(/base olefins/gi, 'Lower olefins');
  listed[0].options[0].text = listed[0].options[0].text.replace(/Base olefins/g, 'Lower olefins');
  const saved = applyKnowledgeCheckEdits(slide, listed);
  assert.match(saved.data.questionText, /Lower olefins/);
  assert.match(saved.interactions[0].questionText, /Lower olefins/);
  assert.match(saved.interactions[0].options[0].text, /Lower olefins/);
  assert.equal(saved.interactions[0].options[0].isCorrect, true);
});

test('single-select toggle marks one correct; multiple-answers can mark two', () => {
  const qs = knowledgeCheckEditQuestions({
    type: 'quiz',
    data: {
      questionText: 'Pick one',
      options: [
        { id: 'a', text: 'A', isCorrect: true },
        { id: 'b', text: 'B', isCorrect: false },
        { id: 'c', text: 'C', isCorrect: false },
      ],
    },
  });
  const single = setKnowledgeCheckCorrect(qs, 0, 1, false);
  assert.equal(single[0].options.filter(o => o.isCorrect).map(o => o.id).join(), 'b');
  const multi = setKnowledgeCheckCorrect(single, 0, 2, true);
  assert.deepEqual(multi[0].options.filter(o => o.isCorrect).map(o => o.id).sort(), ['b', 'c']);
});

test('Edit Slide hides leftover KC OST and binds question fields', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /isQuizKnowledgeCheckType\(editingSlide\.type\) \? null/);
  const fields = readFileSync(resolve(process.cwd(), 'src/components/builder/EditSlideItemFields.tsx'), 'utf8');
  assert.match(fields, /knowledgeCheckEditQuestions/);
  assert.match(fields, /applyKnowledgeCheckEdits/);
  assert.match(fields, /setKnowledgeCheckCorrect/);
});
