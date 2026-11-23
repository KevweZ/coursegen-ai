import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizQuestionList } from './knowledgeCheckOst.ts';
import { inferChoiceCardsMode, choiceCardsAreSituationTiles, choiceCardsPromptForMode } from './choiceCardCopy.ts';
import { compactLeakingQuizQuestion, compactLeakingExamQuestion, quizOptionsLeakAnswer } from './scoredChoiceQuality.ts';
import { finalizeHydratedSlide } from './hydrateGuards.ts';

test('KC options that restate the stem collapse to the label', () => {
  const stem = 'Which traffic sign color indicates you must follow a specific rule or regulation?';
  const options = [
    { id: 'a', text: 'Red signs provide information about mandatory traffic rules.', isCorrect: false },
    { id: 'b', text: 'White signs display rules and regulations that drivers must obey.', isCorrect: true },
    { id: 'c', text: 'Yellow signs indicate legal requirements that apply to all drivers.', isCorrect: false },
    { id: 'd', text: 'Green signs mark locations where specific driving rules apply.', isCorrect: false },
  ];
  assert.equal(quizOptionsLeakAnswer(stem, options), true);
  const next = compactLeakingQuizQuestion({
    questionText: stem,
    options,
    feedback: '',
  });
  assert.deepEqual(next.options.map((o: any) => o.text), [
    'Red signs',
    'White signs',
    'Yellow signs',
    'Green signs',
  ]);
  assert.equal(next.options.find((o: any) => o.isCorrect)?.text, 'White signs');
  assert.match(String(next.feedback), /rules and regulations/i);

  const listed = quizQuestionList({
    questionText: stem,
    options,
    feedback: '',
  });
  assert.equal(listed[0].options.find((o: any) => o.isCorrect)?.text, 'White signs');
  assert.doesNotMatch(listed[0].options[1].text, /drivers must obey/i);

  const persisted = finalizeHydratedSlide({
    type: 'quiz',
    title: 'Knowledge Check: Traffic Signs and Right-of-Way',
    content: 'Check your understanding of sign colors.',
    data: { questionText: stem, options, feedback: '' },
  }, 'Traffic Laws and Signs');
  assert.deepEqual(persisted.data.options.map((o: any) => o.text), [
    'Red signs',
    'White signs',
    'Yellow signs',
    'Green signs',
  ]);
});

test('Mastery Quiz options that restate the stem collapse to the label', () => {
  const next = compactLeakingExamQuestion({
    question: 'Which traffic sign color indicates you must follow a specific rule or regulation?',
    options: [
      'Red signs provide information about mandatory traffic rules.',
      'White signs display rules and regulations that drivers must obey.',
      'Yellow signs indicate legal requirements that apply to all drivers.',
      'Green signs mark locations where specific driving rules apply.',
    ],
    correctAnswer: 1,
    explanation: '',
  });
  assert.deepEqual(next.options, ['Red signs', 'White signs', 'Yellow signs', 'Green signs']);
  assert.match(String(next.explanation), /rules and regulations/i);
});

test('full-claim options stay intact when the stem asks which statement is true', () => {
  const next = compactLeakingQuizQuestion({
    questionText: 'Which statement about traffic signs is true?',
    options: [
      { id: 'a', text: 'White signs display rules and regulations that drivers must obey.', isCorrect: true },
      { id: 'b', text: 'Red signs are used only for parking information.', isCorrect: false },
    ],
  });
  assert.match(next.options[0].text, /display rules and regulations/i);
});

test('scenario tiles with a Check prompt become explore, not a fake quiz', () => {
  const data = {
    mode: 'select' as const,
    prompt: 'Select the correct response to each aggressive driver scenario, then click Check.',
    cards: [
      { id: 'a', label: 'TAILGATING & HONKING', body: 'Another driver tailgates closely and honks.', isCorrect: false },
      { id: 'b', label: 'RUDE GESTURES', body: 'A driver makes rude gestures at you.', isCorrect: false },
      { id: 'c', label: 'BLOCKING TRAFFIC', body: 'You slow down to block a passing driver.', isCorrect: false },
      { id: 'd', label: 'SAFE PASSING', body: 'Let aggressive drivers pass and avoid eye contact.', isCorrect: true },
    ],
  };
  assert.equal(choiceCardsAreSituationTiles(data), true);
  assert.equal(inferChoiceCardsMode(data), 'explore');
  assert.match(choiceCardsPromptForMode(data.prompt, 'explore'), /select each card/i);

  const slide = finalizeHydratedSlide({
    type: 'choice-cards',
    title: 'Responding to Aggressive Drivers',
    content: '',
    data,
  }, 'Defensive Driving');
  assert.equal(slide.data.mode, 'explore');
  assert.doesNotMatch(String(slide.data.prompt), /\bcheck\b/i);
  assert.equal(slide.data.cards.filter((c: any) => c.isCorrect === true).length, 0);
});

test('parallel type cards stay scored Check', () => {
  assert.equal(inferChoiceCardsMode({
    mode: 'select',
    prompt: 'Select the correct process conditions for each polymerization type, then click Check.',
    cards: [
      { id: 'a', label: 'LDPE', isCorrect: true },
      { id: 'b', label: 'HDPE', isCorrect: false },
      { id: 'c', label: 'HDPE/PP', isCorrect: true },
      { id: 'd', label: 'LDPE catalytic', isCorrect: false },
    ],
  }), 'select');
});
