import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alignHydratedSlidesToOutline,
  ensureKnowledgeCheckBudget,
} from './knowledgeCheckBudget.ts';

test('hydrate cannot insert extra knowledge checks into a teaching chunk', () => {
  const outline = [
    { id: 't1', type: 'content', title: 'Melt Flow Index', enablingIndex: 0 },
    { id: 't2', type: 'content', title: 'Molecular Weight Distribution', enablingIndex: 1 },
    { id: 'k1', type: 'quiz', title: 'Knowledge Check: Melt Flow Index' },
  ];
  const parsed = [
    { id: 't1', type: 'content', title: 'Melt Flow Index', content: '- High MFI means low MW' },
    { id: 'extra', type: 'true-false', title: 'Knowledge Check: Crystallinity', data: { questionText: 'Is this true?', options: [] } },
    { id: 't2', type: 'quiz', title: 'Knowledge Check: MFI and Molecular Weight', data: { questionText: 'What is MFI?' } },
    { id: 'k1', type: 'quiz', title: 'Knowledge Check: Melt Flow Index', data: { questionText: 'Which sample has higher MW?' } },
    { id: 'extra2', type: 'quiz', title: 'Knowledge Check: Catalyst Type' },
  ];
  const aligned = alignHydratedSlidesToOutline(parsed, outline);
  assert.equal(aligned.length, 3);
  assert.equal(aligned[0].id, 't1');
  assert.equal(aligned[0].type, 'content');
  assert.doesNotMatch(String(aligned[0].title), /knowledge check/i);
  assert.equal(aligned[1].id, 't2');
  assert.equal(aligned[1].type, 'content');
  assert.equal(aligned[2].id, 'k1');
  assert.equal(aligned[2].type, 'quiz');
});

test('post-hydrate budget clusters leftover checks before the summary and caps per module', () => {
  const course = {
    learningObjectives: [{
      terminalObjective: 'Explain molecular properties',
      enablingObjectives: ['MFI', 'MWD', 'Branching'],
    }],
    modules: [{
      id: 'm3',
      title: 'Molecular Properties',
      slides: [
        { id: 'a', type: 'content', title: 'MFI' },
        { id: 'k1', type: 'quiz', title: 'Knowledge Check: MFI' },
        { id: 'b', type: 'content', title: 'MWD' },
        { id: 'k2', type: 'true-false', title: 'Knowledge Check: Crystallinity' },
        { id: 'c', type: 'content', title: 'Branching' },
        { id: 'k3', type: 'quiz', title: 'Knowledge Check: Catalyst' },
        { id: 'k4', type: 'quiz', title: 'Knowledge Check: Density' },
        { id: 'k5', type: 'quiz', title: 'Knowledge Check: Extra' },
        { id: 'sum', type: 'key-takeaways', title: 'Module Summary' },
      ],
    }],
  };
  const next = ensureKnowledgeCheckBudget(course, {
    includeKnowledgeChecks: true,
    knowledgeCheckMode: 'per-module',
    knowledgeCheckCount: 2,
    quizActivityTypes: ['quiz', 'true-false'],
    objectives: course.learningObjectives,
  });
  const types = next.modules[0].slides.map((s: any) => `${s.type}:${s.title}`);
  assert.deepEqual(types.slice(0, 3), [
    'content:MFI',
    'content:MWD',
    'content:Branching',
  ]);
  const kcs = next.modules[0].slides.filter((s: any) => String(s.title).startsWith('Knowledge Check'));
  assert.equal(kcs.length, 2);
  assert.equal(next.modules[0].slides.at(-1).type, 'key-takeaways');
});
