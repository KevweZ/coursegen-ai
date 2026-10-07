import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HUB_SLIDE_ID,
  isHubNavigation,
  isSlideInteractionGateOpen,
  navigationGatesInteractions,
} from './interactionGate.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('restricted Next stays locked until every step is explored', () => {
  assert.equal(
    isSlideInteractionGateOpen({
      requireInteractionsComplete: true,
      navigationMode: 'restricted',
      expectedIds: ['t1', 't2', 't3'],
      exploredIds: ['t1', 't2'],
      slideCompleted: false,
    }),
    false,
  );
  assert.equal(
    isSlideInteractionGateOpen({
      requireInteractionsComplete: true,
      navigationMode: 'restricted',
      expectedIds: ['t1', 't2', 't3'],
      exploredIds: ['t1', 't2', 't3'],
      slideCompleted: false,
    }),
    true,
  );
});

test('intro is not a required step; completed slides stay unrestricted on return', () => {
  assert.ok(navigationGatesInteractions('restricted'));
  assert.ok(navigationGatesInteractions('hub'));
  assert.equal(navigationGatesInteractions('free'), false);
  assert.equal(
    isSlideInteractionGateOpen({
      requireInteractionsComplete: true,
      navigationMode: 'restricted',
      expectedIds: ['t1', 't2'],
      exploredIds: [],
      slideCompleted: true,
    }),
    true,
  );
  assert.equal(
    isSlideInteractionGateOpen({
      requireInteractionsComplete: true,
      navigationMode: 'free',
      expectedIds: ['t1'],
      exploredIds: [],
      slideCompleted: false,
    }),
    true,
  );
});

test('process rail and vertical tabs expose a return-to-intro control', () => {
  const horiz = src('src/components/interactions/TabbedContentHorizontal.tsx');
  assert.match(horiz, /selectIntro/);
  assert.match(horiz, /aria-label="Introduction"/);
  const vert = src('src/components/interactions/TabbedContentVertical.tsx');
  assert.match(vert, /selectIntro/);
  assert.match(vert, /Introduction/);
});

test('hub is an opt-in nav mode with a dedicated menu slide id', () => {
  assert.equal(HUB_SLIDE_ID, '__hub-menu__');
  assert.equal(isHubNavigation('hub'), true);
  assert.equal(isHubNavigation('restricted'), false);
  const settings = src('src/components/builder/CourseSettingsPage.tsx');
  assert.match(settings, /mode:\s*'hub'/);
});
