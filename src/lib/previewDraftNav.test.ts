import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolvePreviewDraftNav } from './previewDraftNav.ts';

test('a saved draft keeps its own navigation, even if the account default is restricted', () => {
  const fromDraft = resolvePreviewDraftNav({
    navigationMode: 'free',
    requireInteractionsComplete: false,
    playerConfig: { navigationMode: 'free' },
  });
  assert.equal(fromDraft.navigationMode, 'free');
  assert.equal(fromDraft.requireInteractionsComplete, false);

  const restrictedDraft = resolvePreviewDraftNav({
    playerConfig: { navigationMode: 'restricted' },
    requireInteractionsComplete: true,
  });
  assert.equal(restrictedDraft.navigationMode, 'restricted');
  assert.equal(restrictedDraft.requireInteractionsComplete, true);
});

test('older preview drafts without top-level nav fall back to playerConfig, then free', () => {
  const fromPlayer = resolvePreviewDraftNav({
    course: { navigationMode: 'linear' },
    playerConfig: { navigationMode: 'hub' },
  });
  assert.equal(fromPlayer.navigationMode, 'hub');

  const legacy = resolvePreviewDraftNav({ course: {} });
  assert.equal(legacy.navigationMode, 'free');
  assert.equal(legacy.requireInteractionsComplete, false);
});

test('opening a preview draft restores saved nav and is not overwritten by account prefs', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /resolvePreviewDraftNav/);
  assert.match(app, /previewDraftOpenIdRef/);
  assert.doesNotMatch(
    app,
    /Authoring preview: always allow free navigation/,
  );
  assert.match(app, /if \(previewDraftOpenIdRef\.current\)/);
});
