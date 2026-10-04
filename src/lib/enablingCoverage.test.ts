import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
