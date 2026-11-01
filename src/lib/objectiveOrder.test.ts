import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { moveArrayItem } from './objectiveOrder.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('moveArrayItem reorders terminals and enablings without dropping items', () => {
  assert.deepEqual(moveArrayItem(['a', 'b', 'c'], 1, 2), ['a', 'c', 'b']);
  assert.deepEqual(moveArrayItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(moveArrayItem(['a', 'b'], 0, 1), ['b', 'a']);
  assert.deepEqual(moveArrayItem(['only'], 0, 1), ['only']);
  assert.deepEqual(moveArrayItem(['a', 'b'], -1, 0), ['a', 'b']);
});

test('Edit Slide, Course Review, and Course Settings all expose objective reorder controls', () => {
  const app = src('src/App.tsx');
  const objEdit = app.slice(
    app.indexOf('String(editingSlide.id) === \'__course-objectives__\''),
    app.indexOf('Add parent objective'),
  );
  assert.match(objEdit, /ObjectiveReorderButtons/);
  assert.match(objEdit, /moveArrayItem/);
  assert.match(objEdit, /Promote/);

  const settings = src('src/components/builder/CourseSettingsPage.tsx');
  assert.match(settings, /ObjectiveReorderButtons/);
  assert.match(settings, /moveArrayItem/);

  const review = src('src/components/builder/CourseReviewPage.tsx');
  assert.match(review, /ObjectiveReorderButtons/);
  assert.match(review, /moveArrayItem/);
});
