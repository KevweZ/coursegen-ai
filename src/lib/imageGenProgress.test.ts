import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { finishImageGenProgress } from './imageGenProgress.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('0 of N image jobs finish the toast as failed instead of spinning forever', () => {
  const stuck = finishImageGenProgress({
    jobsAttempted: 14,
    jobsApplied: 0,
    lastError: 'No endpoints found that support image output',
  });
  assert.equal(stuck.isRunning, false);
  assert.equal(stuck.isDone, true);
  assert.equal(stuck.current, 0);
  assert.equal(stuck.total, 14);
  assert.match(String(stuck.error), /No endpoints|image/i);
});

test('partial image success keeps the applied count and surfaces lastError', () => {
  const partial = finishImageGenProgress({
    jobsAttempted: 14,
    jobsApplied: 6,
    lastError: 'Rate limited',
  });
  assert.equal(partial.isRunning, false);
  assert.equal(partial.isDone, true);
  assert.equal(partial.current, 6);
  assert.equal(partial.error, 'Rate limited');
});

test('preview auto-gen and Edit → Generate both close the visuals toast from jobsApplied', () => {
  const app = src('src/App.tsx');
  assert.match(app, /finishImageGenProgress/);
  const auto = app.slice(
    app.indexOf('Generating content visuals'),
    app.indexOf('Background imagery failed'),
  );
  assert.match(auto, /finishImageGenProgress/);
  assert.match(auto, /jobsApplied/);
  assert.match(auto, /shouldCancel/);
  const manual = app.slice(app.indexOf('const runAiContentImages'), app.indexOf('openGenerateImagesPicker'));
  assert.match(manual, /finishImageGenProgress/);
});

test('OpenRouter image gen times out and falls back instead of hanging the 0/14 toast', () => {
  const server = src('server.js');
  const start = server.indexOf('const OPENROUTER_IMAGE_TIMEOUT_MS');
  const end = server.indexOf('async function reviewGeneratedImage');
  assert.ok(start >= 0 && end > start, 'OpenRouter image helper markers missing');
  const orFn = server.slice(start, end);
  assert.match(orFn, /AbortController/);
  assert.match(orFn, /\/api\/v1\/images/);
  assert.match(orFn, /aspect_ratio/);
  assert.match(orFn, /timed out/);

  const handlerStart = server.indexOf("app.post('/api/generate-image'");
  const handlerEnd = server.indexOf("app.post('/api/ai'");
  const handler = server.slice(handlerStart, handlerEnd);
  assert.match(handler, /google\/gemini-3\.1-flash-image['"]/);
  assert.match(handler, /OPENROUTER_IMAGE_MODELS|gemini-2\.5-flash-image/);

  const images = src('src/services/imageService.ts');
  const clientModel = images.match(/const DEFAULT_IMAGE_MODEL = '([^']+)'/)?.[1];
  assert.equal(clientModel, 'google/gemini-3.1-flash-image');
});
