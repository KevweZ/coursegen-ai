import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preventWidow, preventWidowLines } from './preventWidow.ts';

test('titles glue the last two words so Roads cannot hang alone', () => {
  const next = preventWidow("Safe Driving Skills for Today's Roads");
  assert.match(next, /Today's\u00A0Roads/);
  assert.doesNotMatch(next, /Today's Roads$/);
});

test('short strings are left alone', () => {
  assert.equal(preventWidow('Main Menu'), 'Main Menu');
  assert.equal(preventWidow('Roads'), 'Roads');
});

test('bullets glue the last two words on list lines', () => {
  const md = preventWidowLines(
    '- The learner will recognize the meaning of each traffic sign color category.\n' +
    '- Drivers must recognize and respond to each category',
  );
  assert.match(md, /color\u00A0category\./);
  assert.match(md, /each\u00A0category/);
});
