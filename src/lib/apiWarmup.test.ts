import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isApiColdStart, isImageNetworkFailure, PREVIEW_API_KEEPWARM_MS } from './apiWarmup.ts';
import { finishImageGenProgress } from './imageGenProgress.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('worker warmup copy and 503 are treated as a cold start, not a credit stop', () => {
  assert.equal(isApiColdStart({ status: 503, message: 'Server is warming up — please wait 20–30 seconds and try again.' }), true);
  assert.equal(isApiColdStart({ code: 'COLD_START' }), true);
  assert.equal(isApiColdStart('Server is warming up — please wait 20–30 seconds and try again.'), true);
  assert.equal(isApiColdStart({ status: 402, message: 'AI_NO_CREDITS' }), false);
  assert.equal(isApiColdStart({ status: 500, message: 'No image returned from AI model.' }), false);
  assert.equal(isImageNetworkFailure('Failed to fetch'), true);
  assert.equal(isImageNetworkFailure({ name: 'AbortError', message: 'Image generation timed out.' }), true);
  assert.equal(isImageNetworkFailure({ status: 402, message: 'AI_NO_CREDITS' }), false);
});

test('cold-start image errors never become a failed toast', () => {
  const done = finishImageGenProgress({
    jobsAttempted: 14,
    jobsApplied: 0,
    lastError: 'Server is warming up — please wait 20–30 seconds and try again.',
  });
  assert.equal(done.isRunning, false);
  assert.equal(done.isDone, true);
  assert.equal(done.error, null);
  assert.equal(done.current, 0);
});

test('image client retries cold starts after warming the API; cover waits on the Build progress bar', () => {
  const images = src('src/services/imageService.ts');
  assert.match(images, /isApiColdStart/);
  assert.match(images, /waitForApiWarm/);
  assert.match(images, /No image returned/);
  assert.match(images, /isImageNetworkFailure/);
  const coverFn = images.slice(images.indexOf('export async function generateCourseCoverImage'));
  assert.match(coverFn.slice(0, 500), /waitForApiWarm/);
  const deny = images.indexOf('isImageAuthOrCreditStop(err)');
  const cold = images.indexOf('isApiColdStart(err)');
  const empty = images.indexOf("No image returned");
  const rateLimit = images.indexOf("err?.status === 429");
  assert.ok(deny >= 0 && cold > deny, 'credit denials must not fall through to cold-start wait');
  assert.ok(cold >= 0 && empty > cold, 'empty model responses retry after cold start');
  assert.ok(empty >= 0 && rateLimit > empty, 'empty-image retry before the 429 retry');

  const app = src('src/App.tsx');
  const cover = app.slice(app.indexOf('setProgress(56)'), app.indexOf('setProgress(72)'));
  assert.match(cover, /waitForApiWarm/);
  assert.match(cover, /generateCourseCoverImage/);
  assert.match(app, /startPreviewApiKeepWarm/);
  assert.ok(PREVIEW_API_KEEPWARM_MS >= 60_000);
});
