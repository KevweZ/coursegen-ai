import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractGeneratedImage } from './openRouterImage.js';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('extractGeneratedImage reads OpenRouter /images, chat, and OpenAI shapes', () => {
  assert.equal(
    extractGeneratedImage({ data: [{ b64_json: 'abc', media_type: 'image/png' }] }),
    'data:image/png;base64,abc',
  );
  assert.equal(
    extractGeneratedImage({
      choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,xyz' } }] } }],
    }),
    'data:image/png;base64,xyz',
  );
  assert.equal(
    extractGeneratedImage({ data: [{ url: 'https://cdn.example/p.png' }] }),
    'https://cdn.example/p.png',
  );
  assert.equal(extractGeneratedImage({ data: [] }), null);
});

test('generate-image tries OpenAI gpt-image-1-mini before OpenRouter', () => {
  const handler = src('server.js').slice(
    src('server.js').indexOf("app.post('/api/generate-image'"),
    src('server.js').indexOf("app.post('/api/ai'"),
  );
  const openai = handler.indexOf('generateImageViaOpenAI(p)');
  const or = handler.indexOf('generateImageViaOpenRouter(');
  assert.ok(openai >= 0 && or > openai, 'OpenAI must run before OpenRouter');
  assert.match(src('server.js'), /extractGeneratedImage/);
  assert.doesNotMatch(
    src('server.js').slice(
      src('server.js').indexOf('async function generateImageViaOpenRouter'),
      src('server.js').indexOf('async function reviewGeneratedImage'),
    ),
    /\/api\/v1\/chat\/completions/,
  );
});
