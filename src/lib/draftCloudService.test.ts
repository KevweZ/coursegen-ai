import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('cloud upsert still POSTs after a failed GET probe, and does not cache false forever', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/draftCloudService.ts'), 'utf8');
  const upsert = src.slice(src.indexOf('export async function upsertCloudDraft'), src.indexOf('export async function fetchCloudDraft'));
  assert.match(src, /if \(cloudReady === true\) return true/);
  assert.doesNotMatch(src, /if \(cloudReady != null\) return cloudReady/);
  assert.doesNotMatch(upsert, /isCloudDraftsAvailable/);
  assert.match(upsert, /cloudReady = true/);
  assert.match(upsert, /Not signed in — cloud draft sync requires an active session/);
});
