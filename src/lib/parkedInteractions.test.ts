import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PARKED_INTERACTION_TYPES,
  stripParkedInteractionTypes,
} from './parkedInteractions.ts';
import { STORYBOARD_CONTENT_TYPES } from './storyboardSource.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('scenario stays in the parked list and is stripped from saved interaction types', () => {
  assert.ok((PARKED_INTERACTION_TYPES as readonly string[]).includes('scenario'));
  assert.deepEqual(
    stripParkedInteractionTypes(['click-reveal', 'scenario', 'hotspot', 'tabbed-horizontal']),
    ['click-reveal', 'hotspot', 'tabbed-horizontal'],
  );
});

test('author pickers do not offer Scenario this version', () => {
  const settings = src('src/components/builder/CourseSettingsPage.tsx');
  const gridStart = settings.indexOf('CLICK TO SELECT');
  const gridEnd = settings.indexOf("false && props.interactionTypes.includes('scenario')");
  assert.ok(gridStart >= 0 && gridEnd > gridStart, 'Course Settings grid markers missing');
  const grid = settings.slice(gridStart, gridEnd);
  assert.doesNotMatch(grid, /id:\s*'scenario'/);
  assert.match(settings, /false && props\.interactionTypes\.includes\('scenario'\)/);

  const outline = src('src/components/builder/OutlinePreview.tsx');
  const pickStart = outline.indexOf('const PICKABLE_CONTENT_TYPES');
  const pickEnd = outline.indexOf('] as const;', pickStart);
  const pickable = outline.slice(pickStart, pickEnd);
  assert.doesNotMatch(pickable, /['"]scenario['"]/);

  const app = src('src/App.tsx');
  const idsStart = app.indexOf('const GRID_INTERACTION_IDS');
  const idsEnd = app.indexOf('];', idsStart);
  const gridIds = app.slice(idsStart, idsEnd);
  assert.doesNotMatch(gridIds, /['"]scenario['"]/);

  assert.equal(STORYBOARD_CONTENT_TYPES.includes('scenario'), false);

  const examples = src('src/components/marketing/ExamplesPage.tsx');
  assert.match(examples, /SLIDES = ALL_SLIDES\.filter\(s => s\.id !== 'branching'\)/);
});
