import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSkeletonKnowledgeCheckText,
  knowledgeCheckIsSkeleton,
  teachingSlideNeedsRetry,
} from './hydrateGuards.ts';
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
