import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ADD_CONTENT_EMPTY_MESSAGE,
  ANALYSIS_NO_CREDITS_MESSAGE,
  COLD_START_COUNTDOWN_SEC,
  DRAFT_OPEN_RETRY_MESSAGE,
  formatAddContentFailure,
  formatAnalysisFailure,
  formatDraftOpenFailure,
  isAiInfraFailure,
  isAnalysisTransient,
  isEmptyOrUnparseableAiPayload,
  SERVER_WARMING_MESSAGE,
  shouldRetryAiProxy,
  shouldRetryAiRateLimit,
} from './analysisErrors.ts';

test('credit denials become a short My Account message with no proxy JSON', () => {
  const wrapped =
    'AI Proxy request failed: AI proxy error 402: {"error":"No AI generation credits remaining. Upgrade your plan or purchase credits, then retry.","code":"AI_NO_CREDITS"}';
  const out = formatAnalysisFailure(wrapped);
  assert.equal(out.body, ANALYSIS_NO_CREDITS_MESSAGE);
  assert.equal(out.action, 'account');
  assert.doesNotMatch(out.body, /AI_NO_CREDITS|402|\[|\{/);
});

test('trial and generic analysis failures keep retry, not the raw proxy dump', () => {
  assert.equal(formatAnalysisFailure('TRIAL_EXPIRED').action, 'retry');
  assert.match(formatAnalysisFailure('TRIAL_EXPIRED').body, /trial access period has ended/i);
  const generic = formatAnalysisFailure('AI Proxy request failed: boom');
  assert.equal(generic.action, 'retry');
  assert.doesNotMatch(generic.body, /AI Proxy request failed/);
});

test('analysis overlay sends credit failures to My Account', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /formatAnalysisFailure/);
  assert.match(app, /analyzeErrorAction === 'account'/);
  assert.match(app, /My Account/);
});

test('Render sleep and proxy timeouts are warmup, not Analysis Failed', () => {
  assert.equal(isAnalysisTransient('AI Proxy request failed to fetch (server unreachable or timed out — often right after a Render deploy). Wait ~30s and try again.'), true);
  assert.equal(isAnalysisTransient('AI proxy error 504: {"code":"UPSTREAM_TIMEOUT"}'), true);
  assert.equal(isAnalysisTransient({ status: 503, message: 'Server is warming up — please wait 20–30 seconds and try again.' }), true);
  assert.equal(isAnalysisTransient('Failed to fetch'), true);
  assert.equal(isAnalysisTransient('AI Proxy request failed: boom'), false);
  assert.equal(isAnalysisTransient('AI_NO_CREDITS'), false);
  assert.ok(COLD_START_COUNTDOWN_SEC >= 50);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const run = app.slice(app.indexOf('const runAnalysis = async'), app.indexOf('const handleFileUpload'));
  assert.match(run, /waitForApiWarm/);
  assert.match(run, /isAnalysisTransient/);
  assert.match(run, /startColdStartCountdown/);
  assert.doesNotMatch(run, /err\?\.message\?\.includes\('503'\)/);
});

test('Generate / outline / Add content wait for health and do not stub cold-start failures', () => {
  assert.equal(shouldRetryAiProxy('AI proxy error 503: {"code":"COLD_START"}'), true);
  assert.equal(shouldRetryAiProxy({ status: 503, message: 'Server is warming up' }), true);
  assert.equal(shouldRetryAiProxy('Failed to fetch'), true);
  assert.equal(shouldRetryAiProxy('AI proxy error 401: Sign in required to generate.'), false);
  assert.equal(shouldRetryAiProxy('AI_NO_CREDITS'), false);
  assert.equal(shouldRetryAiRateLimit('AI proxy error 429: rate_limit'), true);
  assert.equal(shouldRetryAiRateLimit('TRIAL_LIMIT_EXCEEDED weekly AI generation limit'), false);
  assert.equal(shouldRetryAiRateLimit({ status: 402, message: 'AI_NO_CREDITS' }), false);
  assert.equal(isAiInfraFailure('AI Proxy request failed to fetch (server unreachable or timed out — often right after a Render deploy). Wait ~30s and try again.'), true);
  assert.equal(isAiInfraFailure('AI proxy error 401: Sign in required'), true);
  assert.equal(isAiInfraFailure('Could not parse module JSON'), false);
  assert.match(SERVER_WARMING_MESSAGE, /warming up/i);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const hydrate = app.slice(app.indexOf('const hydrateCourse = async'), app.indexOf('const handleCreateReviewLink'));
  assert.match(hydrate, /await waitForApiWarm/);
  assert.match(hydrate, /ANALYSIS_WARM_TIMEOUT_MS/);
  assert.match(hydrate, /isAnalysisTransient/);
  assert.match(hydrate, /SERVER_WARMING_MESSAGE/);
  assert.doesNotMatch(hydrate, /void waitForApiWarm/);

  const outline = app.slice(app.indexOf('const generateOutline = async'), app.indexOf('Apply Course Settings, generate cover'));
  assert.match(outline, /await waitForApiWarm/);
  assert.match(outline, /SERVER_WARMING_MESSAGE/);

  const add = app.slice(app.indexOf('const handleGenerateAddedContent'), app.indexOf('const finishQcApplyUi'));
  assert.match(add, /await waitForApiWarm/);
  assert.match(add, /SERVER_WARMING_MESSAGE/);

  const ai = readFileSync(resolve(process.cwd(), 'src/services/aiService.ts'), 'utf8');
  assert.match(ai, /shouldRetryAiProxy/);
  assert.match(ai, /shouldRetryAiRateLimit/);
  assert.match(ai, /getSupabaseAccessTokenAsync/);
  assert.match(ai, /if \(isAiInfraFailure\(e1\)\) throw e1/);
  assert.match(ai, /if \(isAiInfraFailure\(e2\)\) throw e2/);
  assert.match(ai, /if \(isAiInfraFailure\(e3\)\) throw e3/);
});

test('Add content empty JSON and draft-open fetch failures do not blame the author', () => {
  assert.equal(
    isEmptyOrUnparseableAiPayload('The generator did not return any slides. Paste more of the source text and try again.'),
    true,
  );
  assert.equal(isEmptyOrUnparseableAiPayload('No JSON structure found in AI response.'), true);
  assert.equal(isEmptyOrUnparseableAiPayload('All JSON parse attempts failed. Tail: "<html>"'), true);
  assert.equal(
    formatAddContentFailure('The generator did not return any slides. Paste more of the source text and try again.'),
    ADD_CONTENT_EMPTY_MESSAGE,
  );
  assert.doesNotMatch(formatAddContentFailure('Paste more of the source text and try again.'), /paste more/i);
  assert.equal(formatAddContentFailure('Failed to fetch'), SERVER_WARMING_MESSAGE);
  assert.equal(formatAddContentFailure('AI_NO_CREDITS'), ANALYSIS_NO_CREDITS_MESSAGE);
  assert.doesNotMatch(ADD_CONTENT_EMPTY_MESSAGE, /paste more|source text/i);

  assert.equal(formatDraftOpenFailure('Failed to open draft. It may be corrupted.'), DRAFT_OPEN_RETRY_MESSAGE);
  assert.equal(formatDraftOpenFailure('Unexpected token < in JSON at position 0'), DRAFT_OPEN_RETRY_MESSAGE);
  assert.equal(formatDraftOpenFailure('Could not load draft (524).'), SERVER_WARMING_MESSAGE);
  assert.equal(formatDraftOpenFailure('Failed to fetch'), SERVER_WARMING_MESSAGE);
  assert.doesNotMatch(formatDraftOpenFailure(new Error('Unexpected token <')), /corrupt/i);
  assert.doesNotMatch(DRAFT_OPEN_RETRY_MESSAGE, /corrupt/i);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /formatAddContentFailure/);
  assert.match(app, /formatDraftOpenFailure/);
  assert.doesNotMatch(app, /It may be corrupted/);

  const ai = readFileSync(resolve(process.cwd(), 'src/services/aiService.ts'), 'utf8');
  assert.match(ai, /ADD_CONTENT_EMPTY_MESSAGE/);
  assert.doesNotMatch(ai, /Paste more of the source text/);
});
