import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONTENT_IMAGE_CONCURRENCY,
  CONTENT_IMAGE_PACE_MS,
  CONTENT_IMAGE_RATE_LIMIT_WAIT_MS,
  CONTENT_IMAGE_TIMEOUT_MS,
  nextContentImageAttempt,
} from './contentImageBatch.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('bulk content images wait-and-retry 429 then continue; stop only on auth/credits', () => {
  assert.equal(CONTENT_IMAGE_CONCURRENCY, 1);
  assert.ok(CONTENT_IMAGE_PACE_MS >= 2000);
  assert.ok(CONTENT_IMAGE_TIMEOUT_MS <= 90000);
  assert.ok(CONTENT_IMAGE_TIMEOUT_MS >= 60000);
  assert.equal(CONTENT_IMAGE_RATE_LIMIT_WAIT_MS, 25000);

  const limited = nextContentImageAttempt({ status: 429, code: 'UPSTREAM_RATE_LIMIT', retryAfterMs: 25000 });
  assert.deepEqual(limited, { kind: 'retry', waitMs: 25000 });

  const timeout = nextContentImageAttempt({ status: 504, code: 'UPSTREAM_TIMEOUT' });
  assert.equal(timeout.kind, 'retry');
  assert.ok(timeout.kind === 'retry' && timeout.waitMs < 10000);

  const credits = nextContentImageAttempt({ status: 402, message: 'AI_NO_CREDITS' });
  assert.deepEqual(credits, { kind: 'stop' });

  const other = nextContentImageAttempt({ status: 500, message: 'model refused' });
  assert.deepEqual(other, { kind: 'skip' });
});

test('Generate AI images is sequential, skipQa, and keeps filling remaining slides', () => {
  const images = src('src/services/imageService.ts');
  const start = images.indexOf('export async function generateContentSlideImages');
  assert.ok(start >= 0, 'generateContentSlideImages missing');
  const bulk = images.slice(start);
  assert.match(bulk, /CONTENT_IMAGE_CONCURRENCY/);
  assert.match(bulk, /skipQa:\s*true/);
  assert.match(bulk, /retry:\s*false/);
  assert.match(bulk, /nextContentImageAttempt/);
  assert.match(bulk, /tried:\s*jobsTried/);
  assert.match(bulk, /mapWithConcurrency\(selected, CONTENT_IMAGE_CONCURRENCY/);
  assert.doesNotMatch(bulk, /mapWithConcurrency\(selected, IMAGE_GEN_CONCURRENCY/);

  const server = src('server.js');
  const handler = server.slice(
    server.indexOf("app.post('/api/generate-image'"),
    server.indexOf("app.post('/api/ai'"),
  );
  assert.match(handler, /skipVisionQa \? \{ skip: true \}/);
  assert.match(handler, /openRouterTimedOut/);
  assert.match(handler, /openRouterRateLimited/);
  assert.match(handler, /OpenAI first/);
  assert.match(handler, /generateImageViaOpenAI\(p\)/);
  assert.match(handler, /await recordAiSuccess/);

  const toast = src('src/components/ImageProgressToast.tsx');
  assert.match(toast, /working \$\{progress\.tried\}/);

  const app = src('src/App.tsx');
  assert.match(app, /tried:\s*meta\?\.tried/);
});
