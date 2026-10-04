import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTabIntroOst, sanitizeOstText } from './formatTabIntroOst.ts';

test('tab intro drops Select-a-tab CTAs and [object Object] payloads', () => {
  const ost = formatTabIntroOst({
    introContent: '- Chain branching changes density\n- Select a tab to continue',
    voiceOverText: 'Branching changes how tightly chains pack, which changes density and stiffness.',
    title: 'PE Grades',
  });
  assert.doesNotMatch(ost, /select a tab/i);
  assert.match(ost, /branching/i);
  const ost2 = formatTabIntroOst({
    introContent: '- Three sequential steps\n- Select below to continue →',
    title: 'Free-Radical Polymerization',
  });
  assert.doesNotMatch(ost2, /select below/i);
  assert.match(ost2, /sequential/i);
  const ost3 = formatTabIntroOst({
    introContent: '- Four major PE grades differ by chain branching\n- Select a topic to continue →',
    title: 'Types of Polyethylene',
  });
  assert.doesNotMatch(ost3, /select a topic/i);
  assert.match(ost3, /four major/i);
  assert.equal(sanitizeOstText({ bullets: ['Density rises with fewer branches'] }).includes('[object Object]'), false);
  assert.match(sanitizeOstText({ bullets: ['Density rises with fewer branches'] }), /Density rises/);
});
