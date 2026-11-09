import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatImageApiError,
  isApiColdStart,
  isImageNetworkFailure,
  isImageRateLimit,
  isImageTimeout,
  publicImageError,
  PREVIEW_API_KEEPWARM_MS,
} from './apiWarmup.ts';
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
  assert.equal(isImageRateLimit({ status: 429, message: 'API error (429). If you were saving a draft, try Sync again.' }), true);
  assert.equal(isApiColdStart({ status: 429, message: 'API error (429). If you were saving a draft, try Sync again.' }), false);
  assert.equal(
    formatImageApiError({ status: 502, message: 'API error (429). If you were saving a draft, try Sync again.' }),
    'The image API is rate-limited right now. Wait a minute, then click AI again. You do not need to Sync or save a draft.',
  );
  assert.match(String(formatImageApiError({ status: 429, code: 'UPSTREAM_RATE_LIMIT' })), /rate-limited/i);
  assert.match(String(formatImageApiError({ status: 504, code: 'UPSTREAM_TIMEOUT' })), /timed out/i);
  assert.match(publicImageError('Error'), /could not generate a picture/i);
  assert.match(publicImageError({ status: 500, message: 'Error' }), /could not generate a picture/i);
  assert.equal(isImageTimeout({ status: 504, code: 'UPSTREAM_TIMEOUT' }), true);
  assert.equal(isImageTimeout({ status: 524, message: 'timeout' }), true);
  assert.equal(isImageNetworkFailure({ status: 504, code: 'UPSTREAM_TIMEOUT', message: 'The image request timed out.' }), false);
  assert.equal(isApiColdStart({ status: 504, code: 'UPSTREAM_TIMEOUT' }), false);
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
  const rateLimit = images.indexOf('isImageRateLimit(err)');
  assert.ok(deny >= 0 && cold > deny, 'credit denials must not fall through to cold-start wait');
  assert.ok(cold >= 0 && empty > cold, 'empty model responses retry after cold start');
  assert.ok(empty >= 0 && rateLimit > empty, 'empty-image retry before the 429 retry');
  assert.match(images, /retryAfterMs/);
  assert.match(images, /Math\.min\(60000, waitMs\)/);

  const app = src('src/App.tsx');
  const cover = app.slice(app.indexOf('setProgress(56)'), app.indexOf('setProgress(72)'));
  assert.match(cover, /waitForApiWarm/);
  assert.match(cover, /generateCourseCoverImage/);
  assert.match(app, /startPreviewApiKeepWarm/);
  assert.match(app, /publicImageError/);
  assert.match(app, /isApiColdStart\(imageResult.lastError\)/);
  const autoGen = app.slice(app.indexOf('Generating content visuals'), app.indexOf('Background imagery failed'));
  assert.doesNotMatch(autoGen, /isImageRateLimit\(imageResult.lastError\)/);
  assert.match(src('src/services/ttsService.ts'), /waitForApiWarm/);
  assert.ok(PREVIEW_API_KEEPWARM_MS >= 60_000);
});
