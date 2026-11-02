import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collapseDuplicateModuleSummaries,
  ensureEnablingSlideCoverage,
  isKnowledgeCheckSlide,
  MAX_TEACHING_SLIDES_PER_ENABLING,
  stripSlideNarration,
} from './enablingCoverage.ts';

test('outline is forced to one module per terminal and 1-2 teaching slides per enabling', () => {
  const outline = {
    modules: [
      {
        id: 'm1',
        title: 'Too Many',
        slides: [
          { id: 'a', type: 'content', title: 'A', enablingIndex: 0 },
          { id: 'b', type: 'content', title: 'B', enablingIndex: 0 },
          { id: 'c', type: 'content', title: 'C', enablingIndex: 0 },
          { id: 'd', type: 'content', title: 'D', enablingIndex: 1 },
        ],
      },
      { id: 'm2', title: 'Extra module', slides: [{ id: 'x', type: 'content', title: 'X' }] },
    ],
  };
  const next = ensureEnablingSlideCoverage(outline, [
    { terminalObjective: 'Explain PE grades', enablingObjectives: ['Density', 'Branching'] },
  ]);
  assert.equal(next.modules.length, 1);
  const teaching = next.modules[0].slides.filter((s: any) => s.type === 'content');
  const byEnabling = new Map<number, number>();
  for (const s of teaching) {
    const ei = s.enablingIndex;
    byEnabling.set(ei, (byEnabling.get(ei) || 0) + 1);
  }
  assert.equal(byEnabling.get(0), MAX_TEACHING_SLIDES_PER_ENABLING);
  assert.ok((byEnabling.get(1) || 0) >= 1);
  assert.ok((byEnabling.get(1) || 0) <= MAX_TEACHING_SLIDES_PER_ENABLING);
});

test('missing enabling slides are inserted so coverage is complete', () => {
  const next = ensureEnablingSlideCoverage({
    modules: [{ id: 'm1', title: 'PE', slides: [{ id: 'a', type: 'content', title: 'Density', enablingIndex: 0 }] }],
  }, [
    { terminalObjective: 'Explain PE', enablingObjectives: ['Density', 'Melting point', 'Branching'] },
  ]);
  const teaching = next.modules[0].slides.filter((s: any) => !isKnowledgeCheckSlide(s) && s.type !== 'key-takeaways');
  const covered = new Set(teaching.map((s: any) => s.enablingIndex));
  assert.equal(covered.size, 3);
  assert.ok(covered.has(1));
  assert.ok(covered.has(2));
});

test('knowledge checks never keep spoken narration', () => {
  const next = stripSlideNarration({
    type: 'quiz',
    title: 'Knowledge Check: Density',
    voiceOverText: 'The answer is HDPE.',
    narration: 'The answer is HDPE.',
    voiceOverUrl: 'blob:audio',
  });
  assert.equal(next.voiceOverText, '');
  assert.equal(next.narration, '');
  assert.equal(next.voiceOverUrl, undefined);
});

test('one Module Summary per module keeps the detailed cards and distinct knowledge checks', () => {
  const next = collapseDuplicateModuleSummaries({
    modules: [{
      id: 'm4',
      slides: [
        { id: 'teach', type: 'content', title: 'Quench Oil Tower', content: '- Quench oil removes heat from cracked gas' },
        {
          id: 'thin',
          type: 'key-takeaways',
          title: 'Module Summary: Auxiliary Systems Overview',
          data: {
            objectives: [
              { id: '1', label: 'Quench oil separates heat and recovered hydrocarbons' },
              { id: '2', label: 'Quench water cools gas to compressor entry point' },
              { id: '3', label: 'Dilution steam prevents coke, improves product yield' },
              { id: '4', label: 'Integrated utility systems ensure stable cracker operation' },
            ],
          },
        },
        { id: 'kc-a', type: 'quiz', title: 'Knowledge Check: Quench Systems', data: { questionText: 'What does quench oil remove?' } },
        { id: 'kc-b', type: 'quiz', title: 'Knowledge Check: Utility Systems', data: { questionText: 'Which header is shared?' } },
        {
          id: 'rich',
          type: 'key-takeaways',
          title: 'Module Summary',
          data: {
            objectives: [
              { id: '1', label: 'The quench oil tower rapidly cools cracked gas leaving the furnace, condenses heavy hydrocarbons such as pyrolysis fuel oil, and circulates cooled oil back to the furnace outlet.' },
              { id: '2', label: 'The quench water tower condenses dilution steam carried in the cracked gas stream and cools the gas to compressor suction temperature.' },
              { id: '3', label: 'Dilution steam is generated from recovered and treated process condensate, superheated to furnace inlet conditions, and injected into furnace coils.' },
              { id: '4', label: 'The cracker complex integrates waste heat boilers for steam generation powering turbine drivers, and cascaded refrigerant circuits for light olefin recovery.' },
            ],
          },
        },
      ],
    }],
  });
  const slides = next.modules[0].slides;
  const summaries = slides.filter((s: any) => s.type === 'key-takeaways');
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].id, 'rich');
  assert.ok(slides.some((s: any) => s.id === 'kc-a'));
  assert.ok(slides.some((s: any) => s.id === 'kc-b'));
  assert.ok(slides.some((s: any) => s.id === 'teach'));
});
