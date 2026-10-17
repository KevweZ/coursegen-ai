import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('phone portrait holds narration until the player is actually shown', () => {
  const app = src('src/App.tsx');
  assert.match(app, /needsLandscapeForPreview/);
  assert.match(app, /Rotate to landscape/);
  assert.match(app, /playerPauseRef/);
  assert.match(
    app,
    /if \(needsLandscapeForPreview\) \{\s*playerPauseRef\.current\(\);/,
  );
  assert.match(
    app,
    /activeTabAudioUrl, needsLandscapeForPreview/,
  );
});
