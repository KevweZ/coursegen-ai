import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('successful /api/generate-image spends credits_ai; empty image does not', () => {
  const server = src('server.js');
  const start = server.indexOf("app.post('/api/generate-image'");
  const end = server.indexOf("app.post('/api/ai'");
  assert.ok(start >= 0 && end > start, 'generate-image handler markers missing');
  const handler = server.slice(start, end);

  assert.match(handler, /authorizeAiRequest\(req, \{\s*isComplexCall:\s*false\s*\}\)/);
  assert.match(handler, /await recordAiSuccess\(authz\.supabase, authz\.billing\)/);
  assert.ok(
    handler.indexOf('authorizeAiRequest') < handler.indexOf('generateOnce'),
    'auth must run before image generation',
  );
  const emptyImage = handler.indexOf("status(502)");
  const deduct = handler.indexOf('recordAiSuccess');
  assert.ok(emptyImage >= 0 && deduct > emptyImage, 'empty image must not deduct credits');
});

test('image client sends Bearer and does not retry credit denials as 429', () => {
  const images = src('src/services/imageService.ts');
  assert.match(images, /getSupabaseAccessToken/);
  assert.match(images, /Authorization:\s*`Bearer \$\{token\}`/);
  assert.match(images, /isImageAuthOrCreditStop/);
  const deny = images.indexOf('isImageAuthOrCreditStop(err)');
  const rateLimit = images.indexOf('isImageRateLimit(err)');
  assert.ok(deny >= 0 && rateLimit > deny, '402/401 must not fall through to the 429 retry');
});

test('image rate limit is per author token, not one global Render IP, and returns JSON', () => {
  const server = src('server.js');
  assert.match(server, /app\.set\('trust proxy', 1\)/);
  assert.match(server, /imageLimitKey/);
  assert.match(server, /img-user:/);
  assert.match(server, /ipKeyGenerator/);
  assert.match(server, /IMAGE_RATE_LIMIT/);
  assert.match(server, /Invalid JSON body/);
  const imagesLimiter = server.slice(server.indexOf('function imageLimitKey'), server.indexOf("app.post('/api/generate-image'"));
  assert.match(imagesLimiter, /keyGenerator:\s*imageLimitKey/);
  assert.doesNotMatch(imagesLimiter, /Please wait 15 minutes/);
});
