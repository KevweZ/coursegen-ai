import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  attachHeavyMedia,
  countAudioAssetKeys,
  countImageAssetKeys,
  courseHasEmptyVisualSlots,
  hasOwnMediaPath,
  mergeDraftAssetPaths,
  needsCloudImageDownload,
} from './draftMedia.ts';
import { omitUndefinedDeep } from './promoteSlideImages.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

test('audio keys present, zero image keys still needs cloud download', () => {
  const assets = {
    'modules[0].slides[0].voiceOverUrl': new Blob([new Uint8Array(80)]),
    'slide:abc': new Blob([new Uint8Array(80)]),
  };
  assert.equal(countAudioAssetKeys(assets), 2);
  assert.equal(countImageAssetKeys(assets), 0);
  assert.equal(needsCloudImageDownload(assets), true);
});

test('local images skip a second cloud download', () => {
  const assets = {
    coverImage: new Blob([new Uint8Array(40)]),
    'modules[0].slides[0].voiceOverUrl': new Blob([new Uint8Array(80)]),
  };
  assert.equal(countImageAssetKeys(assets), 1);
  assert.equal(needsCloudImageDownload(assets), false);
});

test('empty cover or content slots look unrestored', () => {
  assert.equal(courseHasEmptyVisualSlots({ title: 'Tega', coverImage: null, modules: [] }), true);
  assert.equal(
    courseHasEmptyVisualSlots({
      coverImage: 'data:image/png;base64,aaa',
      modules: [{ slides: [{ type: 'content', imageUrl: null }] }],
    }),
    true,
  );
  assert.equal(
    courseHasEmptyVisualSlots({
      coverImage: 'data:image/png;base64,aaa',
      modules: [{ slides: [{ type: 'content', imageUrl: 'data:image/png;base64,bbb' }] }],
    }),
    false,
  );
});

test('loadDraftAssets fetches cloud when image keys are missing, not when audio count is zero', () => {
  const load = src('src/lib/useDraftCourses.ts');
  const start = load.indexOf('const loadDraftAssets');
  const end = load.indexOf('const loadDraftNarration');
  assert.ok(start >= 0 && end > start, 'loadDraftAssets markers missing');
  const fn = load.slice(start, end);
  assert.match(fn, /needsCloudImageDownload\(blobs\)/);
  assert.doesNotMatch(fn, /countAudioAssetKeys\(blobs\) === 0/);
});

test('deleted slide imageUrl is not a media path on the shell', () => {
  const slide = { id: 's14', title: 'Margins', floatingMedia: [{ id: 'fi-1', url: null }] };
  assert.equal(hasOwnMediaPath({ modules: [{ slides: [slide] }] }, 'modules[0].slides[0].imageUrl'), false);
  assert.equal(hasOwnMediaPath({ modules: [{ slides: [slide] }] }, 'modules[0].slides[0].floatingMedia[0].url'), true);
  assert.equal(
    hasOwnMediaPath({ modules: [{ slides: [{ id: 's1', imageUrl: null }] }] }, 'modules[0].slides[0].imageUrl'),
    true,
  );
});

test('attachHeavyMedia does not resurrect a deleted content imageUrl', () => {
  const course = {
    modules: [{ slides: [{ id: 's14', title: 'Margins', floatingMedia: [{ id: 'fi-1', url: null }] }] }],
  };
  attachHeavyMedia(course, new Map([
    ['modules[0].slides[0].imageUrl', 'blob:old-ai'],
    ['modules[0].slides[0].floatingMedia[0].url', 'blob:upload'],
  ]));
  assert.equal(course.modules[0].slides[0].imageUrl, undefined);
  assert.equal(course.modules[0].slides[0].floatingMedia[0].url, 'blob:upload');
});

test('attachHeavyMedia restores detached null image placeholders', () => {
  const course = {
    modules: [{ slides: [{ id: 's1', imageUrl: null }] }],
  };
  attachHeavyMedia(course, new Map([['modules[0].slides[0].imageUrl', 'blob:keep']]));
  assert.equal(course.modules[0].slides[0].imageUrl, 'blob:keep');
});

test('attachHeavyMedia does not duplicate a promoted tab image behind the float', () => {
  const course = {
    modules: [{
      slides: [{
        id: 's13',
        data: { tabs: [{ id: 'pe', label: 'PE' }] },
        floatingMedia: [{ id: 'fi-9', url: null, tabId: 'pe' }],
      }],
    }],
  };
  attachHeavyMedia(course, new Map([
    ['modules[0].slides[0].data.tabs[0].imageUrl', 'blob:orig'],
    ['modules[0].slides[0].floatingMedia[0].url', 'blob:enlarged'],
  ]));
  assert.equal(course.modules[0].slides[0].data.tabs[0].imageUrl, undefined);
  assert.equal(course.modules[0].slides[0].floatingMedia[0].url, 'blob:enlarged');
});

test('mergeDraftAssetPaths drops stale images and keeps leftover audio', () => {
  const paths = mergeDraftAssetPaths(
    [
      'modules[0].slides[0].imageUrl',
      'modules[0].slides[0].voiceOverUrl',
      'coverImage',
    ],
    [
      'modules[0].slides[0].floatingMedia[0].url',
      'coverImage',
    ],
  );
  assert.deepEqual(
    [...paths].sort(),
    [
      'coverImage',
      'modules[0].slides[0].floatingMedia[0].url',
      'modules[0].slides[0].voiceOverUrl',
    ].sort(),
  );
  assert.ok(!paths.includes('modules[0].slides[0].imageUrl'));
});

test('draft save uses mergeDraftAssetPaths and writes even when incoming assets are empty', () => {
  const srcText = src('src/lib/useDraftCourses.ts');
  assert.match(srcText, /mergeDraftAssetPaths\(prevPaths, incomingPaths\)/);
  assert.match(srcText, /if \(assets\) \{\s*await writeDraftAssets/s);
  assert.doesNotMatch(srcText, /\[\.\.\.prevPaths, \.\.\.converted\.map/);
});

test('omitUndefinedDeep drops deleted imageUrl so JSON will not keep the slot', () => {
  const slide = omitUndefinedDeep({
    id: 's14',
    imageUrl: undefined,
    data: { tabs: [{ id: 'pe', imageUrl: undefined, label: 'PE' }] },
  });
  assert.equal('imageUrl' in slide, false);
  assert.equal('imageUrl' in slide.data.tabs[0], false);
  assert.equal(slide.data.tabs[0].label, 'PE');
});

test('player persist omits undefined imageUrl on media updates and Crop/Move promote', () => {
  const app = src('src/App.tsx');
  assert.match(app, /omitUndefinedDeep\(\{ \.\.\.s, \.\.\.updates \}\)/);
  assert.match(app, /omitUndefinedDeep\(clear\(\{ \.\.\.s, floatingMedia:/);
});
