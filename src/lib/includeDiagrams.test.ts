import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'path';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('Course Settings can turn diagram slides off, and coerce honors that', () => {
  const settings = src('src/components/builder/CourseSettingsPage.tsx');
  const review = src('src/components/builder/CourseReviewPage.tsx');
  const storage = src('src/lib/courseSettingsStorage.ts');
  const ai = src('src/services/aiService.ts');
  const app = src('src/App.tsx');

  assert.match(settings, /Diagram slides/);
  assert.match(settings, /includeDiagrams/);
  assert.match(review, /Diagram slides/);
  assert.match(storage, /includeDiagrams: true/);
  assert.match(storage, /includeDiagrams: parsed\.includeDiagrams !== false/);

  assert.match(ai, /opts\?\.includeDiagrams !== false/);
  assert.match(ai, /Do NOT use type: "diagram"/);
  assert.match(ai, /raw === 'diagram' && !allow.has\('diagram'\)/);
  assert.match(app, /includeDiagrams=\{includeDiagrams\}/);
  assert.match(app, /includeDiagrams: outlineIncludeDiagrams/);
});
