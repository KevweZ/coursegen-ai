import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildSpecifiedContentSlide,
  buildSpecifiedSlide,
  filledSpecifyTabCount,
  MAX_SPECIFY_TABS,
  MIN_SPECIFY_TABS,
} from './courseSlideEdits.ts';

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

test('specified Add content process/tabs write intro plus per-tab OST and narration', () => {
  const slide = buildSpecifiedSlide({
    title: 'Integrated Utility Systems',
    type: 'tabbed-horizontal',
    ost: '<ul><li>Furnace duty, quench, and refrigeration share headers</li></ul>',
    narration: 'The steam cracker is not a standalone furnace.',
    tabs: [
      { label: 'High-Pressure Steam Generation', content: '<ul><li>Waste heat makes 40–60 bar steam</li></ul>', narration: 'Waste heat boilers recover furnace exhaust heat.' },
      { label: 'Heat Integration Strategy', content: '<ul><li>Quench and steam share the energy grid</li></ul>', narration: 'All these systems are linked thermodynamically.' },
      { label: '', content: '', narration: '' },
    ],
  });
  assert.equal(slide.type, 'tabbed-horizontal');
  assert.equal(slide.title, 'Integrated Utility Systems');
  assert.match(slide.content, /Furnace duty/);
  assert.match(slide.voiceOverText, /standalone furnace/);
  assert.equal(slide.data?.tabs.length, 2);
  assert.equal(slide.data?.tabs[0].label, 'High-Pressure Steam Generation');
  assert.match(slide.data?.tabs[0].content, /<li>/);
  assert.match(slide.data?.tabs[1].voiceOverText, /linked thermodynamically/);
  assert.equal(filledSpecifyTabCount([
    { label: 'A', content: '', narration: '' },
    { label: '', content: '<p></p>', narration: '' },
    { label: 'B', content: '- Steam', narration: '' },
  ]), 2);
  assert.equal(MIN_SPECIFY_TABS, 2);
  assert.equal(MAX_SPECIFY_TABS, 6);
});

test('Add content modal offers specify fields, type chips, and per-tab audio regen', () => {
  const modal = src('src/components/builder/AddContentModal.tsx');
  assert.match(modal, /I will write OST \+ audio/);
  assert.match(modal, /Slide title/);
  assert.match(modal, /On-screen text/);
  assert.match(modal, /Audio narration/);
  assert.match(modal, /RichTextEditor/);
  assert.match(modal, /ADD_CONTENT_TYPE_OPTIONS/);
  assert.match(modal, /SPECIFY_TYPE_OPTIONS/);
  assert.match(modal, /Add step|Add tab/);
  const lock = src('.cursor/rules/add-content-specify-lock.mdc');
  assert.match(lock, /RichTextEditor/);
  assert.match(lock, /Slide title is on the specify tab/);
  assert.match(lock, /Process \/ Tabs/);
  const app = src('src/App.tsx');
  assert.match(app, /buildSpecifiedSlide/);
  assert.match(app, /form\.specifyTabs/);
  assert.match(app, /tabNarrationScript/);
  assert.match(app, /Generate this tab/);
  assert.match(app, /form\.preferredTypes/);
  assert.match(app, /addingContentRef/);
});
