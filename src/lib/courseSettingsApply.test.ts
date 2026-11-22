import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pickPreferredRecord } from './courseSettingsPick.ts';

test('newer local Course Settings beat a stale cloud copy', () => {
  const local = { imageMode: 'none', interactionTypes: ['click-reveal'], updatedAt: 2_000 };
  const cloud = {
    imageMode: 'ai',
    interactionTypes: ['tabbed-horizontal', 'tabbed-vertical', 'click-reveal'],
    updatedAt: 1_000,
  };
  const picked = pickPreferredRecord(local, cloud);
  assert.equal(picked?.imageMode, 'none');
  assert.deepEqual(picked?.interactionTypes, ['click-reveal']);
});

test('a session Save still wins even if updatedAt was not on the JSON yet', () => {
  const local = { imageMode: 'none', interactionTypes: ['click-reveal'] };
  const cloud = { imageMode: 'ai', updatedAt: 50 };
  const picked = pickPreferredRecord(local, cloud, 100);
  assert.equal(picked?.imageMode, 'none');
});

test('saveCourseSettings stamps updatedAt', () => {
  assert.match(
    readFileSync(resolve(process.cwd(), 'src/lib/courseSettingsStorage.ts'), 'utf8'),
    /updatedAt:\s*Date\.now\(\)/,
  );
});

test('Continue, retry, and Generate use live Course Settings', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const confirm = app.slice(
    app.indexOf('const confirmUploadPath'),
    app.indexOf('const cancelUploadPath'),
  );
  assert.match(confirm, /collectCurrentSettings\(\)/);
  assert.doesNotMatch(confirm, /settingsOverride = resolveCourseSettings/);

  const retry = app.slice(
    app.indexOf('const retryAnalysisAfterWarmup'),
    app.indexOf('const startColdStartCountdown'),
  );
  assert.match(retry, /collectCurrentSettings\(\)/);
  assert.doesNotMatch(retry, /resolveCourseSettings\(user/);

  const hydrate = app.slice(
    app.indexOf('const hydrateCourse = async'),
    app.indexOf('const hydrateCourse = async') + 1800,
  );
  assert.match(hydrate, /collectCurrentSettings\(\)/);

  assert.match(app, /pickPreferredCourseSettings/);
  const openFromUpload = app.slice(
    app.indexOf('const viewCourseSettingsFromUploadPath'),
    app.indexOf('const viewCourseSettingsFromUploadPath') + 500,
  );
  assert.doesNotMatch(openFromUpload, /applySavedSettings\(resolveCourseSettings/);
});
