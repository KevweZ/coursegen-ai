import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ANALYSIS_NO_CREDITS_MESSAGE,
  formatAnalysisFailure,
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
