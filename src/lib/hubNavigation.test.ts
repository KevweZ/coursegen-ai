import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allContentModulesComplete,
  hubSlideIndex,
  isFirstSlideOfModule,
  moduleIndexRange,
  nextIndexAfterSlide,
} from './hubNavigation.ts';
import { HUB_SLIDE_ID } from './interactionGate.ts';

const slides = [
  { id: '__cover__', type: 'cover' },
  { id: HUB_SLIDE_ID, type: 'hub-menu' },
  { id: '__module-cover-1__', type: 'module-cover', _moduleNumber: 1 },
  { id: 'a1', type: 'content', _moduleNumber: 1 },
  { id: 'a2', type: 'key-takeaways', _moduleNumber: 1 },
  { id: '__module-cover-2__', type: 'module-cover', _moduleNumber: 2 },
  { id: 'b1', type: 'content', _moduleNumber: 2 },
  { id: '__exam-intro__', type: 'exam-intro' },
];

test('hub Next from the last slide of a module returns to the menu', () => {
  assert.equal(hubSlideIndex(slides), 1);
  assert.equal(nextIndexAfterSlide(slides, 4, true), 1);
  assert.equal(nextIndexAfterSlide(slides, 3, true), 4);
  assert.equal(nextIndexAfterSlide(slides, 4, false), 5);
});

test('module ranges and completion check', () => {
  assert.deepEqual(moduleIndexRange(slides, 1), { start: 2, end: 4 });
  assert.equal(isFirstSlideOfModule(slides, 2), true);
  assert.equal(isFirstSlideOfModule(slides, 3), false);
  assert.equal(allContentModulesComplete(2, [1]), false);
  assert.equal(allContentModulesComplete(2, [1, 2]), true);
});
