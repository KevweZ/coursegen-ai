import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOstSectionGroups,
  looksLikeSectionHeader,
  parseOstSectionGroups,
} from './ostSectionGroups.ts';

test('ALL-CAPS and fully-bold list items are section headers, not teaching bullets', () => {
  assert.equal(looksLikeSectionHeader('- **WHAT ARE COMONOMERS?**'), true);
  assert.equal(looksLikeSectionHeader('- HOW COMONOMERS CONTROL DENSITY'), true);
  assert.equal(looksLikeSectionHeader('- HIGH PRESSURE, HIGH TEMPERATURE CONTROL'), true);
  assert.equal(looksLikeSectionHeader('- Temperature: 150-300°C drives branching'), false);
  assert.equal(looksLikeSectionHeader('- Unsaturated molecules (C=C bonds) co-fed with main monomer'), false);
});

test('flat bold-header lists become two parent groups with child bullets', () => {
  const groups = parseOstSectionGroups(`
- **WHAT ARE COMONOMERS?**
- Unsaturated molecules (C=C bonds) co-fed with main monomer
- Incorporated into polymer backbone during catalytic polymerization
- **HOW COMONOMERS CONTROL DENSITY**
- Comonomer units become branch points on main chain
- More comonomer → more branches → lower density
- Linear HDPE: minimal comonomer; LLDPE: 5–10% comonomer
`);
  assert.ok(groups);
  assert.equal(groups!.length, 2);
  assert.match(groups![0].heading, /what are comonomers/i);
  assert.equal(groups![0].bullets.length, 2);
  assert.match(groups![1].heading, /how comonomers control density/i);
  assert.ok(groups![1].bullets.length >= 2);
  assert.doesNotMatch(groups![0].bullets.join(' '), /what are comonomers/i);

  const md = formatOstSectionGroups(`
- **HIGH PRESSURE, HIGH TEMPERATURE CONTROL**
- Temperature: 150-300°C drives branching
- Pressure: 1,000–3,000 atm initiates polymerization
- **MANAGING POLYMER PROPERTIES**
- Higher temperature → more branching
- Lower pressure → fewer side reactions
`);
  assert.match(md, /^### /m);
  assert.match(md, /### MANAGING POLYMER PROPERTIES/i);
  assert.doesNotMatch(md, /^- \*\*HIGH PRESSURE/m);
});
