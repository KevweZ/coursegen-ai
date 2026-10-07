import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { examShowsQuestionMap } from './examQuestionMap.ts';

test('question map defaults on unless the author turns it off', () => {
  assert.equal(examShowsQuestionMap(undefined), true);
  assert.equal(examShowsQuestionMap({}), true);
  assert.equal(examShowsQuestionMap({ showQuestionMap: true }), true);
  assert.equal(examShowsQuestionMap({ showQuestionMap: false }), false);
});

test('Mastery Quiz map and Settings/Player Properties share showQuestionMap', () => {
  const exam = readFileSync(resolve(process.cwd(), 'src/components/player/MasteryExamSlide.tsx'), 'utf8');
  assert.match(exam, /examShowsQuestionMap/);
  const settings = readFileSync(resolve(process.cwd(), 'src/components/builder/CourseSettingsPage.tsx'), 'utf8');
  assert.match(settings, /showQuestionMap/);
  const player = readFileSync(resolve(process.cwd(), 'src/components/builder/PlayerPropertiesModal.tsx'), 'utf8');
  assert.match(player, /showQuestionMap/);
});
