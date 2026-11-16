import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BROWSER_CACHE_FULL_MESSAGE,
  isBrowserStorageFull,
  MEDIA_SYNC_RETRY_MESSAGE,
  MEDIA_UPLOAD_ATTEMPTS,
} from './draftSaveErrors.ts';

test('cloud upsert still POSTs after a failed GET probe, and does not cache false forever', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/draftCloudService.ts'), 'utf8');
  const upsert = src.slice(src.indexOf('export async function upsertCloudDraft'), src.indexOf('export async function fetchCloudDraft'));
  assert.match(src, /if \(cloudReady === true\) return true/);
  assert.doesNotMatch(src, /if \(cloudReady != null\) return cloudReady/);
  assert.doesNotMatch(upsert, /isCloudDraftsAvailable/);
  assert.match(upsert, /cloudReady = true/);
  assert.match(upsert, /Not signed in — cloud draft sync requires an active session/);
});

test('cloud media upload retries then tells the author to Update Draft', () => {
  assert.equal(isBrowserStorageFull({ name: 'QuotaExceededError', message: 'The quota has been exceeded.' }), true);
  assert.equal(isBrowserStorageFull(new Error('Failed to fetch')), false);
  assert.ok(MEDIA_UPLOAD_ATTEMPTS >= 2);
  assert.doesNotMatch(MEDIA_SYNC_RETRY_MESSAGE, /background/i);
  assert.match(BROWSER_CACHE_FULL_MESSAGE, /browser is full/i);

  const src = readFileSync(resolve(process.cwd(), 'src/lib/draftCloudService.ts'), 'utf8');
  const upload = src.slice(src.indexOf('export async function uploadCloudAssets'), src.indexOf('export async function downloadCloudAssets'));
  assert.match(upload, /MEDIA_UPLOAD_ATTEMPTS/);
  assert.match(upload, /for \(let i = 0; i < MEDIA_UPLOAD_ATTEMPTS/);

  const hook = readFileSync(resolve(process.cwd(), 'src/lib/useDraftCourses.ts'), 'utf8');
  assert.match(hook, /persistShellAndMedia/);
  assert.match(hook, /await uploadCloudAssets/);
  assert.match(hook, /MEDIA_SYNC_RETRY_MESSAGE/);
  assert.match(hook, /isBrowserStorageFull/);
  assert.doesNotMatch(hook, /Background media sync failed/);
  assert.doesNotMatch(hook, /Cloud copy will finish in the background/);
  assert.doesNotMatch(hook, /void \(async \(\) =>/);
});
