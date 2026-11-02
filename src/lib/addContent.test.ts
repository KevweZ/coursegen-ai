import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSpecifiedContentSlide } from './courseSlideEdits.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('specified Add content slide keeps authored OST and narration', () => {
  const slide = buildSpecifiedContentSlide({
    title: 'Feedstock types',
    ost: '- Ethane: light gas, higher ethylene yield',
    narration: 'Ethane is the preferred feedstock when ethylene is the goal.',
  });
  assert.equal(slide.type, 'content');
  assert.equal(slide.title, 'Feedstock types');
  assert.match(slide.content, /Ethane: light gas/);
  const htmlSlide = buildSpecifiedContentSlide({
    title: 'Furnace',
    ost: '<ul><li>Temperature range 750–870°C</li></ul>',
    narration: 'The furnace runs hot.',
  });
  assert.match(htmlSlide.content, /<li>/);
  assert.match(slide.voiceOverText, /preferred feedstock/);
});

test('Add content modal offers specify fields, type chips, and per-tab audio regen', () => {
  const modal = src('src/components/builder/AddContentModal.tsx');
  assert.match(modal, /I will write OST \+ audio/);
  assert.match(modal, /Slide title/);
  assert.match(modal, /On-screen text/);
  assert.match(modal, /Audio narration/);
  assert.match(modal, /RichTextEditor/);
  assert.match(modal, /ADD_CONTENT_TYPE_OPTIONS/);
  const lock = src('.cursor/rules/add-content-specify-lock.mdc');
  assert.match(lock, /RichTextEditor/);
  assert.match(lock, /Slide title is on the specify tab/);
  const app = src('src/App.tsx');
  assert.match(app, /buildSpecifiedContentSlide/);
  assert.match(app, /Generate this tab/);
  assert.match(app, /form\.preferredTypes/);
});
