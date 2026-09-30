import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tocNumberByIndex } from './playerToc.ts';
import { buildReviewScriptModel } from './reviewScriptDocx.ts';
import { mergeRegenIntoSlide } from './slideRegenMerge.ts';

test('TOC numbers duplicate ids by player position, not last-write id', () => {
  const slides = [
    { id: '__cover__', type: 'cover', title: 'Cover' },
    { id: '__module-cover-4__', type: 'module-cover', title: 'Auxiliary Systems', _moduleNumber: 4 },
    { id: '__module-overview-4__', type: 'module-overview', title: 'Overview' },
    { id: 'dup', type: 'content', title: 'Quench Oil Tower: Heat Removal and By-Products' },
    { id: 'other', type: 'content', title: 'Quench Water Tower' },
    { id: 'dup', type: 'content', title: 'Quench Oil Tower: Heat Recovery and Product Separation' },
  ];
  const refs = tocNumberByIndex(slides);
  assert.equal(refs[3], '4.2');
  assert.equal(refs[4], '4.3');
  assert.equal(refs[5], '4.4');

  const rows = buildReviewScriptModel(slides);
  assert.equal(rows[5].heading, 'Slide 4.4 — Quench Oil Tower: Heat Recovery and Product Separation');
  assert.equal(rows[3].heading, 'Slide 4.2 — Quench Oil Tower: Heat Removal and By-Products');
});

test('review script for a content slide ignores leftover tab/prompt data', () => {
  const slides = [
    {
      id: 's1',
      type: 'content',
      title: 'Quench Oil Tower: Heat Removal and By-Products',
      content: '- Removes extreme heat from cracked gas\n- Recovers heavy hydrocarbon liquids',
      voiceOverText: 'After cracking furnace reactions, gas leaves at 800 to 900 degrees Celsius.',
      data: {
        prompt: 'Old leftover prompt from a prior quiz regen',
        tabs: [
          { title: 'Stale tab', content: 'This was a process slide', voiceOverText: 'Old tab narration' },
        ],
      },
    },
  ];
  const row = buildReviewScriptModel(slides)[0];
  const ost = row.sections.flatMap(s => s.blocks.filter(b => b.style === 'ost').flatMap(b => b.lines.map(l => l.text))).join('\n');
  const narr = row.sections.flatMap(s => s.blocks.filter(b => b.style === 'narration').flatMap(b => b.lines.map(l => l.text))).join('\n');
  assert.match(ost, /Removes extreme heat/);
  assert.doesNotMatch(ost, /Old leftover prompt/);
  assert.doesNotMatch(ost, /Stale tab/);
  assert.match(narr, /After cracking furnace/);
  assert.doesNotMatch(narr, /Old tab narration/);
  assert.equal(row.sections.length, 1);
});

test('content regen drops leftover instructional data but keeps image', () => {
  const existing = {
    id: 's1',
    type: 'tabbed-horizontal',
    title: 'Quench Oil Tower',
    content: 'Old bullets',
    voiceOverText: 'Old narration',
    data: {
      imageUrl: 'https://example.com/keep.png',
      tabs: [{ title: 'Old', content: 'stale' }],
      prompt: 'leftover',
    },
    interactions: [{ type: 'tabs' }],
  };
  const next = mergeRegenIntoSlide(existing, {
    type: 'content',
    data: undefined,
    content: '- Removes extreme heat from cracked gas',
    voiceOverText: 'After cracking furnace reactions, gas leaves at 800 to 900 degrees Celsius.',
  });
  assert.equal(next.type, 'content');
  assert.equal(next.data?.imageUrl, 'https://example.com/keep.png');
  assert.equal(next.data?.tabs, undefined);
  assert.equal(next.data?.prompt, undefined);
  assert.equal(next.interactions, undefined);
  assert.match(String(next.content), /Removes extreme heat/);
  assert.match(String(next.voiceOverText), /After cracking furnace/);
});
