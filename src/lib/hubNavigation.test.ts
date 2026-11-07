import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  allContentModulesComplete,
  ensureHubImage,
  hubSlideIndex,
  isFirstSlideOfModule,
  moduleIndexRange,
  nextIndexAfterSlide,
} from './hubNavigation.ts';
import { HUB_SLIDE_ID } from './interactionGate.ts';
import { nextThemeBackground, pickStableBackground, themeBackgroundImages } from './backgrounds.ts';
import { applyHubMediaPatch } from './promoteSlideImages.ts';

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

test('Main Menu stamps one theme-archive still and keeps it on reopen', () => {
  const images = themeBackgroundImages('Neutral');
  assert.ok(images.length >= 2);
  assert.equal(pickStableBackground('Neutral', 'Polymers'), pickStableBackground('Neutral', 'Polymers'));
  assert.notEqual(pickStableBackground('Neutral', 'Polymers'), pickStableBackground('Neutral', 'Steam Cracker'));

  const a = ensureHubImage({
    title: 'Polymers: Chemistry and Processes',
    visualTheme: 'Neutral',
    navigationMode: 'hub',
    modules: [],
  });
  const b = ensureHubImage(a, 'hub');
  assert.match(String(a.hubImage), /\/eLearning Template Backgrounds\//);
  assert.equal(b.hubImage, a.hubImage);
  assert.equal(b, a);

  const hidden = ensureHubImage({
    title: 'Polymers: Chemistry and Processes',
    visualTheme: 'Neutral',
    navigationMode: 'hub',
    hubPanelHidden: true,
    modules: [],
  });
  assert.equal(hidden.hubImage, undefined);

  const skipped = ensureHubImage({
    title: 'Polymers: Chemistry and Processes',
    visualTheme: 'Neutral',
    navigationMode: 'free',
    modules: [],
  });
  assert.equal(skipped.hubImage, undefined);

  const next = nextThemeBackground('Neutral', a.hubImage);
  assert.ok(images.includes(next));
  assert.notEqual(next, a.hubImage);

  const swapped = applyHubMediaPatch(a, { hubImage: next });
  assert.equal(swapped.hubImage, next);
  const deleted = applyHubMediaPatch(swapped, { hubImage: undefined, hubPanelHidden: true });
  assert.equal('hubImage' in deleted, false);
  assert.equal(deleted.hubPanelHidden, true);
});

test('Main Menu authoring uses hubImage, not a random courseBg fallback', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /ensureHubImage/);
  assert.match(app, /applyHubMediaPatch/);
  assert.match(app, /hubImage/);
  assert.doesNotMatch(
    app,
    /isHubMenuSlide\(currentSlide\)[\s\S]{0,400}coverImage=\{\(course as any\)\?\.coverImage \|\| courseBg/,
  );
  const hub = readFileSync(resolve(process.cwd(), 'src/components/player/HubMenuSlide.tsx'), 'utf8');
  assert.match(hub, /EnlargeableImage/);
  assert.match(hub, /onSwap/);
  assert.match(hub, /Swap backdrop/);
  const lock = readFileSync(resolve(process.cwd(), '.cursor/rules/image-visual-lock.mdc'), 'utf8');
  assert.match(lock, /hubImage/);
});
