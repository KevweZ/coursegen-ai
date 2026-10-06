import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TTSRequestError,
  formatTtsErrorForUser,
  isTransientTtsNetworkError,
} from '../services/ttsService.ts';

test('lost narration jobs tell the user to retry and are treated as resumable', () => {
  const err = new TTSRequestError('Narration job not found.', {
    status: 404,
    code: 'TTS_JOB_NOT_FOUND',
  });
  assert.equal(isTransientTtsNetworkError(err), true);
  assert.match(formatTtsErrorForUser(err), /retry/i);
  assert.doesNotMatch(formatTtsErrorForUser(err), /not found/i);
});
