import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  examQuestionIsMeta,
  generateContentGroundedExamQuestions,
  sanitizeMasteryExamQuestions,
} from './masteryExam.ts';

const polymerCourse = {
  title: 'Polymers: PE and PP Chemistry',
  modules: [
    {
      title: 'Polymer Fundamentals',
      slides: [
        {
          type: 'content',
          title: 'Monomers, Chains, and Polymers',
          content: '- Monomers link through covalent bonds to form long polymer chains\n- Chain length controls melt viscosity and toughness\n- Branching reduces packing and lowers density',
        },
        {
          type: 'tabbed-horizontal',
          title: 'Free-Radical Polymerization: Initiation, Propagation, Termination',
          content: '- Three kinetic steps control PE molecular weight',
          data: {
            tabs: [
              { id: 't1', label: 'Initiation', content: '- Peroxide or oxygen starts a free radical\n- The radical attacks an ethylene double bond' },
              { id: 't2', label: 'Propagation', content: '- The chain grows rapidly by adding monomers\n- High pressure favors long-chain branching' },
            ],
          },
        },
      ],
    },
    {
      title: 'PE and PP Types',
      slides: [
        {
          type: 'click-reveal',
          title: 'Ethylene-Based Polyolefins: HDPE, LDPE, LLDPE, EVA',
          content: '- Density follows how linear the PE chain is',
          data: {
            items: [
              { id: 'r1', term: 'HDPE', definition: '- Linear chains pack tightly to high density\n- Used in bottles and pipe' },
              { id: 'r2', term: 'LDPE', definition: '- Long-chain branching from high-pressure radical routes\n- Used in film and coatings' },
            ],
          },
        },
      ],
    },
  ],
};

const examCfg = { questionMode: 'total' as const, questionCount: 12, questionTypes: ['mc', 'ma', 'tf'] as const };

test('draft course-structure mastery items are flagged as meta', () => {
  assert.equal(examQuestionIsMeta({
    question: '[Draft] What is the primary focus of "Monomers, Chains, and Polymers"?',
    options: ['Monomers, Chains, and Polymers', 'An unrelated topic', 'A concept from another module', 'None of the above'],
  }), true);
  assert.equal(examQuestionIsMeta({
    question: '[Draft] "High-Pressure Radical Reactions and LDPE Branching" is a key topic in this course.',
    options: ['True', 'False'],
  }), true);
  assert.equal(examQuestionIsMeta({
    question: 'Which PE grade packs most densely because of linear chains?',
    options: ['HDPE', 'LDPE', 'EVA', 'a-PP'],
  }), false);
});

test('sanitize replaces [Draft] mastery slop with technical facts from slides', () => {
  const slop = Array.from({ length: 12 }, (_, i) => ({
    id: `q-${i + 1}`,
    type: 'mc' as const,
    question: `[Draft] What is the primary focus of "Slide ${i}"?`,
    options: ['Slide title', 'An unrelated topic', 'A concept from another module', 'None of the above'],
    correctAnswer: 0,
  }));
  const next = sanitizeMasteryExamQuestions(slop as any, polymerCourse, examCfg);
  assert.equal(next.length, 12);
  for (const q of next) {
    assert.equal(examQuestionIsMeta(q), false);
    assert.doesNotMatch(q.question, /\[Draft\]/i);
    assert.doesNotMatch(q.question, /key topic in this course/i);
    assert.doesNotMatch(q.question, /primary focus of/i);
    assert.ok(!q.options.some(o => /^an unrelated topic$/i.test(o)));
  }
  const blob = next.map(q => `${q.question} ${q.options.join(' ')}`).join('\n');
  assert.match(blob, /HDPE|LDPE|free radical|branching|density|monomer/i);
});

test('grounded exam questions come from teaching facts, not titles', () => {
  const qs = generateContentGroundedExamQuestions(polymerCourse, examCfg);
  assert.ok(qs.length >= 8);
  assert.ok(qs.every(q => !examQuestionIsMeta(q)));
  assert.ok(qs.some(q => /linear|radical|branch|density|monomer|peroxide/i.test(`${q.question} ${q.options.join(' ')}`)));
});
