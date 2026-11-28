import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CANONICAL_HOST,
  canonicalLocation,
  canonicalRedirectStatus,
} from './canonicalHost.ts';

test('www, http, and workers.dev canonicalize to https://nexcourse.ai with path and query', () => {
  assert.equal(CANONICAL_HOST, 'nexcourse.ai');
  assert.equal(
    canonicalLocation('https://www.nexcourse.ai/'),
    'https://nexcourse.ai/',
  );
  assert.equal(
    canonicalLocation('https://www.nexcourse.ai/pricing?plan=team'),
    'https://nexcourse.ai/pricing?plan=team',
  );
  assert.equal(
    canonicalLocation('http://nexcourse.ai/login'),
    'https://nexcourse.ai/login',
  );
  assert.equal(
    canonicalLocation('http://www.nexcourse.ai/CourseReview'),
    'https://nexcourse.ai/CourseReview',
  );
  assert.equal(
    canonicalLocation('https://coursegen-ai.ftnvz67rpv.workers.dev/examples'),
    'https://nexcourse.ai/examples',
  );
});

test('https://nexcourse.ai and local dev do not redirect', () => {
  assert.equal(canonicalLocation('https://nexcourse.ai/'), null);
  assert.equal(canonicalLocation('https://nexcourse.ai/pricing'), null);
  assert.equal(canonicalLocation('http://localhost:3000/'), null);
  assert.equal(canonicalLocation('http://127.0.0.1:3000/upload'), null);
});

test('GET/HEAD use 301; other methods use 308 so POSTs keep their body', () => {
  assert.equal(canonicalRedirectStatus('GET'), 301);
  assert.equal(canonicalRedirectStatus('HEAD'), 301);
  assert.equal(canonicalRedirectStatus('POST'), 308);
  assert.equal(canonicalRedirectStatus('PUT'), 308);
});

test('Worker applies canonical redirect before API proxy or assets', () => {
  const worker = readFileSync(resolve(process.cwd(), 'worker.js'), 'utf8');
  const wrangler = readFileSync(resolve(process.cwd(), 'wrangler.jsonc'), 'utf8');
  assert.match(worker, /canonicalLocation\(request\.url\)/);
  assert.match(worker, /canonicalRedirectStatus\(request\.method\)/);
  const fetchStart = worker.indexOf('async fetch(request, env)');
  const apiProxy = worker.indexOf("url.pathname.startsWith('/api/')");
  const canonicalCall = worker.indexOf('canonicalLocation(request.url)');
  assert.ok(canonicalCall > fetchStart && canonicalCall < apiProxy);
  assert.match(wrangler, /"pattern": "nexcourse\.ai"/);
  assert.match(wrangler, /www\.nexcourse\.ai/);
  assert.match(wrangler, /custom_domain/);
  assert.match(wrangler, /"run_worker_first": true/);
  assert.match(wrangler, /"workers_dev": true/);
});
