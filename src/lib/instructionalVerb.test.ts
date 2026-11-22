import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitInstructionalVerb } from './instructionalVerb.ts';
import { looksLikeSectionHeader, parseOstSectionGroups } from './ostSectionGroups.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Identify: and avoid… is not an instructional verb split', () => {
  assert.equal(
    splitInstructionalVerb('Identify: and avoid your blind spots'),
    null,
  );
  assert.equal(
    splitInstructionalVerb('Identify and avoid your blind spots', { inList: true }),
    null,
  );
});

test('list items never use the IDENTIFY: two-column layout', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /splitInstructionalVerb/);
  assert.match(app, /inList:\s*isList/);
});

test('Bloom-verb bullets stay teaching lines, not section headers', () => {
  assert.equal(looksLikeSectionHeader('- Identify: and avoid your blind spots'), false);
  const groups = parseOstSectionGroups(`
- Anticipate mistakes before they happen
- Maintain 3-second following distance
- Scan ahead, sides, and mirrors constantly
- Identify: and avoid your blind spots
- Use headlights in low visibility
`);
  assert.equal(groups, null);
});
