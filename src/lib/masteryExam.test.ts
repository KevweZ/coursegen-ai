import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyMasteryExamEdits,
  examQuestionIsMeta,
  generateContentGroundedExamQuestions,
  masteryExamEditQuestions,
  persistMasteryExamQuestions,
  sanitizeMasteryExamQuestions,
  setMasteryExamCorrect,
  setMasteryExamOption,
  setMasteryExamStem,
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

test('Edit Slide binds Mastery Quiz stems and choices from examQuestions', () => {
  const qs = masteryExamEditQuestions([
    {
      id: 'q-1',
      type: 'mc',
      question: 'Which product is the primary C2 olefin from steam cracking?',
      options: ['Ethylene', 'Propylene', 'Benzene', 'Fuel oil'],
      correctAnswer: 0,
    },
    {
      id: 'q-2',
      type: 'ma',
      question: 'Select all furnace-section duties.',
      options: ['Cracking', 'Quench', 'Compression', 'Fractionation'],
      correctAnswer: [0, 1],
    },
  ]);
  assert.match(qs[0].question, /C2 olefin/);
  assert.equal(qs[0].options[0], 'Ethylene');
  const stem = setMasteryExamStem(qs, 0, qs[0].question.replace('C2 olefin', 'C2 product'));
  const option = setMasteryExamOption(stem, 0, 0, 'Lower olefins');
  const flipped = setMasteryExamCorrect(option, 0, 1);
  assert.match(flipped[0].question, /C2 product/);
  assert.equal(flipped[0].options[0], 'Lower olefins');
  assert.equal(flipped[0].correctAnswer, 1);
  const ma = setMasteryExamCorrect(qs, 1, 3);
  assert.deepEqual(ma[1].correctAnswer, [0, 1, 3]);
  const saved = applyMasteryExamEdits(
    { id: '__mastery-exam__', type: 'mastery-exam', content: 'Answer each question.' },
    flipped,
  );
  assert.equal(saved.content, 'Answer each question.');
  assert.equal(saved._examQuestions[0].correctAnswer, 1);
  assert.equal(persistMasteryExamQuestions(saved._examQuestions)[0].options[0], 'Lower olefins');
});

test('Edit Slide hides leftover Mastery Quiz OST and saves examQuestions', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /isMasteryExamType\(editingSlide\.type\) \? null/);
  assert.match(app, /attachMasteryExamForEdit/);
  assert.match(app, /persistMasteryExamQuestions/);
  assert.match(app, /setExamQuestions\(qs\)/);
  const fields = readFileSync(resolve(process.cwd(), 'src/components/builder/EditSlideItemFields.tsx'), 'utf8');
  assert.match(fields, /masteryExamEditQuestions/);
  assert.match(fields, /applyMasteryExamEdits/);
  assert.match(fields, /setMasteryExamCorrect/);
});
