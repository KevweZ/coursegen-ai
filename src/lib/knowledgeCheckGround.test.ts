import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isInstructionalObjectiveText,
  isNonAssessableFactText,
  isSkeletonKnowledgeCheckText,
  knowledgeCheckHasInstructionalOption,
  knowledgeCheckIsSkeleton,
  teachingSlideNeedsRetry,
} from './hydrateGuards.ts';
import { extractTeachingFacts, examQuestionIsMeta } from './masteryExam.ts';
import { groundModuleKnowledgeChecks } from './knowledgeCheckGround.ts';
import { ensureUniqueSlideIds } from './courseSlideEdits.ts';

const skeletonKc = {
  id: 'kc1',
  type: 'quiz',
  title: 'Knowledge Check: Catalysts and Molecular Weight Distribution',
  data: {
    questionText: 'Which statement about Catalysts and Molecular Weight Distribution is most accurate?',
    options: [
      { id: 'c', text: 'A condition that does not apply to Catalysts and Molecular Weight Distribution', isCorrect: false },
      { id: 'b', text: 'A common mix-up with a different process than Catalysts and Molecular Weight Distribution', isCorrect: false },
      { id: 'a', text: 'The primary role or definition of Catalysts and Molecular Weight Distribution in Process Variables and Catalysts', isCorrect: true },
      { id: 'd', text: 'A result that Catalysts and Molecular Weight Distribution never produces', isCorrect: false },
    ],
    feedback: 'Review Catalysts and Molecular Weight Distribution in Process Variables and Catalysts, then continue.',
  },
};

test('skeleton knowledge-check options are banned', () => {
  assert.equal(isSkeletonKnowledgeCheckText(skeletonKc.data.questionText + '\n' + skeletonKc.data.options[0].text), true);
  assert.equal(knowledgeCheckIsSkeleton(skeletonKc), true);
  assert.equal(teachingSlideNeedsRetry(skeletonKc), true);
  assert.equal(knowledgeCheckIsSkeleton({
    type: 'quiz',
    title: 'Knowledge Check: Melt Flow',
    data: {
      questionText: 'What happens to melt flow index when average molecular weight falls?',
      options: [
        { id: 'a', text: 'Melt flow index rises because shorter chains flow more easily.', isCorrect: true },
        { id: 'b', text: 'Melt flow index falls because the melt becomes more viscous.', isCorrect: false },
        { id: 'c', text: 'Melt flow index is unchanged because density controls flow.', isCorrect: false },
        { id: 'd', text: 'Melt flow index becomes undefined at the melting point.', isCorrect: false },
      ],
    },
  }), false);
});

test('skeleton knowledge checks are rewritten from teaching-slide facts in the same module', () => {
  const next = groundModuleKnowledgeChecks({
    title: 'Process Variables and Catalysts',
    slides: [
      {
        id: 't1',
        type: 'content',
        title: 'Catalysts and Molecular Weight Distribution',
        content: [
          'Ziegler-Natta catalysts produce mostly linear polyethylene chains with a broader molecular weight distribution.',
          'Metallocene catalysts give a narrower molecular weight distribution and more uniform comonomer incorporation.',
          'A broader molecular weight distribution improves melt strength during extrusion.',
          'Hydrogen is used as a chain-transfer agent to lower average molecular weight.',
        ].join('\n'),
      },
      skeletonKc,
    ],
  });
  const kc = next.slides.find((s: any) => s.id === 'kc1');
  assert.ok(kc);
  assert.equal(knowledgeCheckIsSkeleton(kc), false);
  assert.equal(teachingSlideNeedsRetry(kc), false);
  assert.doesNotMatch(String(kc.data.questionText), /which statement about /i);
  assert.doesNotMatch(JSON.stringify(kc.data.options), /primary role or definition of|common mix-up with a different process|condition that does not apply/i);
  const optionBlob = kc.data.options.map((o: any) => o.text).join(' ');
  assert.match(optionBlob, /catalyst|molecular weight|hydrogen|metallocene|Ziegler/i);
  assert.ok(kc.data.options.every((o: any) => String(o.text).split(/\s+/).length >= 5));
});

test('opening a saved draft heals skeleton knowledge checks from teaching slides', () => {
  const healed = ensureUniqueSlideIds({
    modules: [{
      title: 'Process Variables and Catalysts',
      slides: [
        {
          id: 't1',
          type: 'content',
          title: 'Catalysts',
          content: 'Metallocene catalysts give a narrower molecular weight distribution than Ziegler-Natta systems.\nHydrogen lowers average molecular weight as a chain-transfer agent.',
        },
        skeletonKc,
      ],
    }],
  });
  const kc = healed.modules[0].slides.find((s: any) => s.id === 'kc1');
  assert.equal(knowledgeCheckIsSkeleton(kc), false);
  assert.doesNotMatch(JSON.stringify(kc.data.options), /primary role or definition of/i);
});

const overviewVo = 'In this module, you will list the major process stages in a typical polyolefin plant. A polyolefin manufacturing facility runs as an integrated system where each stage feeds into the next. From the moment raw materials arrive at the plant gate through final pellet storage, seven key stages control quality, safety, and efficiency. Understanding how these stages connect helps you troubleshoot problems, optimize throughput, and recognize why each step matters for final product performance.';

test('learning-objective and you-will-learn copy is not a quiz claim', () => {
  assert.equal(isInstructionalObjectiveText('In this module, you will list the major process stages in a typical polyolefin plant.'), true);
  assert.equal(isInstructionalObjectiveText('Understanding how these stages connect helps you troubleshoot problems.'), true);
  assert.equal(isNonAssessableFactText(overviewVo), true);
  assert.equal(isNonAssessableFactText('Flash tanks evaporate unreacted feed from the cracked-gas stream.'), false);
  assert.equal(examQuestionIsMeta({
    question: 'Which of the following is true of Major Process Stages Overview?',
    options: [
      'Flash tanks evaporate unreacted feed',
      overviewVo,
    ],
  }), true);
});

test('knowledge checks do not use overview narration or glued application lists as options', () => {
  const instructionalKc = {
    id: 'kc-overview',
    type: 'quiz',
    title: 'Knowledge Check: Grade Applications',
    data: {
      questionText: 'Which of the following is true of Major Process Stages Overview?',
      options: [
        { id: 'a', text: 'Flexible tubing and hoses - Foam cushioning materials - Shoe soles and footwear - Hot-melt adhesives', isCorrect: false },
        { id: 'b', text: 'Flash tanks evaporate unreacted feed', isCorrect: false },
        { id: 'c', text: 'Melts and forms polymer into pellets - Removes residual monomer and volatiles - Stabilizes polymer for shipment', isCorrect: false },
        { id: 'd', text: overviewVo, isCorrect: true },
      ],
    },
  };
  assert.equal(knowledgeCheckHasInstructionalOption(instructionalKc), true);
  assert.equal(teachingSlideNeedsRetry(instructionalKc), true);

  const facts = extractTeachingFacts({
    modules: [{
      title: 'Polyolefin Manufacturing Stages',
      slides: [{
        type: 'content',
        title: 'Major Process Stages Overview',
        content: overviewVo,
        voiceOverText: overviewVo,
      }, {
        type: 'content',
        title: 'Cracked-gas handling',
        content: [
          'Flash tanks evaporate unreacted feed from the cracked-gas stream.',
          'Quench oil knocks out heavy tars before compression.',
          'Demethanizer overhead is recycled as cracker fuel gas.',
          'C2 splitters separate ethylene from ethane for polymer-grade feed.',
        ].join('\n'),
      }],
    }],
  });
  assert.equal(facts.some(f => /in this module, you will/i.test(f.statement)), false);
  assert.equal(facts.some(f => /helps you troubleshoot/i.test(f.statement)), false);
  assert.ok(facts.some(f => /flash tanks evaporate/i.test(f.statement)));

  const next = groundModuleKnowledgeChecks({
    title: 'Polyolefin Manufacturing Stages',
    slides: [
      {
        id: 't1',
        type: 'content',
        title: 'Cracked-gas handling',
        content: [
          'Flash tanks evaporate unreacted feed from the cracked-gas stream.',
          'Quench oil knocks out heavy tars before compression.',
          'Demethanizer overhead is recycled as cracker fuel gas.',
          'C2 splitters separate ethylene from ethane for polymer-grade feed.',
        ].join('\n'),
      },
      instructionalKc,
    ],
  });
  const kc = next.slides.find((s: any) => s.id === 'kc-overview');
  assert.ok(kc);
  assert.equal(knowledgeCheckHasInstructionalOption(kc), false);
  const optionBlob = kc.data.options.map((o: any) => o.text).join('\n');
  assert.doesNotMatch(optionBlob, /in this module, you will/i);
  assert.doesNotMatch(optionBlob, /helps you troubleshoot/i);
  assert.doesNotMatch(optionBlob, /Flexible tubing and hoses - Foam/i);
  assert.match(optionBlob, /flash tanks|quench oil|demethanizer|splitters/i);
});
