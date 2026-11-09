import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TTSRequestError,
  formatTtsErrorForUser,
  isTransientTtsNetworkError,
} from '../services/ttsService.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('lost narration jobs tell the user to retry and are treated as resumable', () => {
  const err = new TTSRequestError('Narration job not found.', {
    status: 404,
    code: 'TTS_JOB_NOT_FOUND',
  });
  assert.equal(isTransientTtsNetworkError(err), true);
  assert.match(formatTtsErrorForUser(err), /retry/i);
  assert.doesNotMatch(formatTtsErrorForUser(err), /not found/i);
});

test('dropped narration tells the author to click Generate again, not that a retry is already running', () => {
  const err = new TTSRequestError('Connection to the narration server dropped.', {
    status: 503,
    code: 'TTS_NETWORK',
  });
  const msg = formatTtsErrorForUser(err);
  assert.match(msg, /click generate again/i);
  assert.doesNotMatch(msg, /will retry automatically/i);
  assert.equal(isTransientTtsNetworkError(new TTSRequestError('busy', { status: 503, code: 'TTS_BUSY' })), true);
});

test('single-slide TTS warms the API, retries a busy queue, and does not hold a blocking alert', () => {
  const tts = src('src/services/ttsService.ts');
  const slideFn = tts.slice(tts.indexOf('export async function generateSlideTTS'));
  assert.match(slideFn.slice(0, 900), /waitForApiWarm/);
  assert.match(tts, /retryableStatus/);
  assert.match(tts, /status === 429/);
  assert.match(tts, /TTS_BUSY/);

  const server = src('server.js');
  assert.match(server, /TTS_BUSY/);
  assert.match(server, /ttsSynthesizerBusy/);
  assert.ok(
    server.indexOf('ttsSynthesizerBusy()') < server.indexOf("app.post('/api/tts/jobs'"),
    'POST /api/tts must refuse a held connection when the synthesizer is already busy',
  );

  const app = src('src/App.tsx');
  assert.doesNotMatch(app, /alert\(`TTS error:/);
  assert.match(app, /formatTtsErrorForUser/);
});
