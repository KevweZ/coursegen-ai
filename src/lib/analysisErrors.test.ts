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
  formatHydrateFailure,
  formatOutlineFailure,
  HYDRATE_EMPTY_MESSAGE,
  isAiInfraFailure,
  isAnalysisTransient,
  isEmptyOrUnparseableAiPayload,
  OUTLINE_PARSE_MESSAGE,
  REGEN_KEEP_SLIDE_MESSAGE,
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
  assert.equal(isAiInfraFailure('No JSON structure found in AI response.'), true);
  assert.equal(isAiInfraFailure("Missing or empty 'slides' array in response."), true);
  assert.equal(isAiInfraFailure('Could not parse module JSON'), false);
  assert.match(SERVER_WARMING_MESSAGE, /warming up/i);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const hydrate = app.slice(app.indexOf('const hydrateCourse = async'), app.indexOf('const handleCreateReviewLink'));
  assert.match(hydrate, /await waitForApiWarm/);
  assert.match(hydrate, /ANALYSIS_WARM_TIMEOUT_MS/);
  assert.match(hydrate, /formatHydrateFailure/);
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
  assert.doesNotMatch(ADD_CONTENT_EMPTY_MESSAGE, /paste more|source text|Generate Course/i);

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

test('hydrate empty JSON and regen failure do not plant placeholder slides', () => {
  assert.equal(formatAddContentFailure('Critical Data Failure: Outline could not be parsed.'), OUTLINE_PARSE_MESSAGE);
  assert.equal(formatAddContentFailure('No JSON structure found in AI response.'), ADD_CONTENT_EMPTY_MESSAGE);
  assert.equal(formatHydrateFailure('No JSON structure found in AI response.'), HYDRATE_EMPTY_MESSAGE);
  assert.equal(formatOutlineFailure('No JSON structure found in AI response.'), OUTLINE_PARSE_MESSAGE);
  assert.doesNotMatch(OUTLINE_PARSE_MESSAGE, /Critical Data Failure|your file|Generate Course/i);
  assert.doesNotMatch(REGEN_KEEP_SLIDE_MESSAGE, /placeholder/i);

  const ai = readFileSync(resolve(process.cwd(), 'src/services/aiService.ts'), 'utf8');
  assert.match(ai, /OUTLINE_PARSE_MESSAGE/);
  assert.doesNotMatch(ai, /Critical Data Failure/);
  assert.doesNotMatch(ai, /This slide covers key content/);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const regen = app.slice(app.indexOf('const regenerateBlankSlide'), app.indexOf('const openRegenerateSlideDrawer'));
  assert.match(regen, /REGEN_KEEP_SLIDE_MESSAGE/);
  assert.doesNotMatch(regen, /Using a placeholder/);
  assert.doesNotMatch(regen, /Key point related to/);
});

test('Course Review hydrate failure stays on Review; Start Over does not leave a File Ready zombie', () => {
  assert.match(HYDRATE_EMPTY_MESSAGE, /Generate Course again/);
  assert.match(HYDRATE_EMPTY_MESSAGE, /do not need to start over/);
  assert.doesNotMatch(HYDRATE_EMPTY_MESSAGE, /busy server/i);
  assert.match(ADD_CONTENT_EMPTY_MESSAGE, /Generate in Add content/);
  assert.doesNotMatch(ADD_CONTENT_EMPTY_MESSAGE, /Generate Course/i);

  const review = readFileSync(resolve(process.cwd(), 'src/components/builder/CourseReviewPage.tsx'), 'utf8');
  assert.doesNotMatch(review, /if \(\(isGenerating \|\| isHydrating\) && renderProgressState\)/);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const hydrate = app.slice(app.indexOf('const hydrateCourse = async'), app.indexOf('const handleCreateReviewLink'));
  assert.match(hydrate, /setError\(null\)/);
  assert.match(hydrate, /formatHydrateFailure/);

  const failed = app.slice(app.indexOf('Generation Failed'), app.indexOf('const TimelinePreviewDemo'));
  assert.match(failed, /Try again/);
  assert.match(failed, /setUploadedFile\(null\)/);
  assert.match(failed, /navigateTo\(ROUTES\.upload/);
});

test('outline failure retries on Review; leftover error and File Ready do not survive leave', () => {
  assert.match(OUTLINE_PARSE_MESSAGE, /try again/i);
  assert.doesNotMatch(OUTLINE_PARSE_MESSAGE, /Generate Course/i);

  const review = readFileSync(resolve(process.cwd(), 'src/components/builder/CourseReviewPage.tsx'), 'utf8');
  const header = review.slice(review.indexOf('props.onGenerateCourse &&'), review.indexOf('{error &&'));
  assert.match(header, /onRegenerateOutline/);
  assert.match(header, /Generate Structure/);
  assert.match(header, /Try again/);
  const banner = review.slice(review.indexOf('{error &&'), review.indexOf("{activeTab === 'foundation'"));
  assert.match(banner, /onRegenerateOutline/);
  assert.match(banner, /Try again/);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const analysis = app.slice(app.indexOf('const runAnalysis = async'), app.indexOf('const handleFileUpload'));
  assert.match(analysis, /setError\(null\)/);
  assert.match(analysis, /formatOutlineFailure/);
  assert.match(analysis, /formatHydrateFailure/);
  assert.match(analysis, /quickOutline/);

  const regen = app.slice(app.indexOf('const regenerateOutlineForSettings'), app.indexOf('const handleGenerateCourseFromSettings'));
  assert.match(regen, /formatOutlineFailure/);

  const back = app.slice(app.indexOf('const backFromCourseSettings'), app.indexOf('viewCourseSettingsFromUploadPath'));
  assert.match(back, /setError\(null\)/);
  const home = app.slice(app.indexOf('const goHome ='), app.indexOf('backFromCourseSettings'));
  assert.match(home, /setError\(null\)/);

  const uploadNav = app.slice(app.indexOf("if (parsed.kind === 'upload')"), app.indexOf("if (parsed.kind === 'building')"));
  assert.match(uploadNav, /setUploadedFile\(null\)/);
  assert.match(uploadNav, /setError\(null\)/);

  const oversized = app.slice(app.indexOf('const handleFileUpload'), app.indexOf('const handleStartDetails'));
  assert.match(oversized, /setUploadedFile\(null\)/);
  const overlay = app.slice(app.indexOf('analyzeError && isAnalyzing'), app.indexOf('Normal loading state'));
  assert.match(overlay, /if \(!uploadedFile\)/);

  const settings = readFileSync(resolve(process.cwd(), 'src/components/builder/CourseSettingsPage.tsx'), 'utf8');
  assert.doesNotMatch(settings, /if \(\(isGenerating \|\| isHydrating\) && renderProgressState\)/);
});
