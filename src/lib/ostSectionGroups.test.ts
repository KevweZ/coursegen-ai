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

test('topic-lead two-column lists keep parents unbulleted', () => {
  const md = `
- Melt Flow Index (MFI): polymer flow rate at 190°C under load
- Higher MFI = lower average molecular weight
- Lower MFI = higher average molecular weight
- MFI inversely correlates with chain length
- Faster-flowing polymers have shorter chains
`;
  const groups = parseOstSectionGroups(md);
  assert.ok(groups);
  assert.equal(groups!.length, 2);
  assert.match(groups![0].heading, /melt flow index/i);
  assert.doesNotMatch(groups![0].heading, /^-/);
  assert.ok(groups![0].bullets.some(b => /polymer flow rate/i.test(b)));
  assert.ok(groups![0].bullets.some(b => /higher mfi/i.test(b)));
  assert.match(groups![1].heading, /inversely correlates/i);
  assert.ok(groups![1].bullets.some(b => /faster-flowing/i.test(b)));
});

test('ALL-CAPS parent lines stay headers with only children bulleted', () => {
  const md = `
- DENSITY CONTROLS CRYSTALLINITY
- Linear PE (HDPE): low branching → high density → high crystallinity
- Branched PE (LDPE): more branches → low density → low crystallinity
- BRANCHING REDUCES CRYSTALLINE PACKING
- Branch points disrupt regular chain alignment
- Comonomer branches create amorphous regions
- More branches = looser polymer structure
`;
  const groups = parseOstSectionGroups(md);
  assert.ok(groups);
  assert.equal(groups!.length, 2);
  assert.match(groups![0].heading, /density controls crystallinity/i);
  assert.equal(groups![0].bullets.length, 2);
  assert.match(groups![1].heading, /branching reduces crystalline packing/i);
  assert.doesNotMatch(groups![0].heading, /^-/);
});
