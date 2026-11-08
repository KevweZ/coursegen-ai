import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyNarrationUrls,
  unbindStolenNarrationRecords,
  attachHeavyMedia,
  countAudioAssetKeys,
  countImageAssetKeys,
  courseHasEmptyVisualSlots,
  durableAudioKeyFromCoursePath,
  hasOwnMediaPath,
  isIndexKeyedAudioPath,
  mergeDraftAssetPaths,
  needsCloudImageDownload,
} from './draftMedia.ts';
import { ensureUniqueSlideIds } from './courseSlideEdits.ts';
import { harvestClipBelongsToSlide } from './narrationCache.ts';
import {
  COVER_SLIDE_ID,
  HUB_SLIDE_ID,
  applyCoverMediaPatch,
  applyHubMediaPatch,
  resolveCoverTitleAlign,
  floatingMapFromCourse,
  omitUndefinedDeep,
  stampFloatingMediaOnCourse,
} from './promoteSlideImages.ts';

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

test('mergeDraftAssetPaths drops stale images and index-keyed leftover audio', () => {
  const paths = mergeDraftAssetPaths(
    [
      'modules[0].slides[0].imageUrl',
      'modules[0].slides[0].voiceOverUrl',
      'slide:abc',
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
      'slide:abc',
    ].sort(),
  );
  assert.ok(!paths.includes('modules[0].slides[0].imageUrl'));
  assert.ok(!paths.includes('modules[0].slides[0].voiceOverUrl'));
});

test('index-keyed leftover audio does not overwrite a slide-id clip', () => {
  assert.equal(isIndexKeyedAudioPath('modules[2].slides[8].voiceOverUrl'), true);
  assert.equal(isIndexKeyedAudioPath('slide:diagram-9'), false);
  const course = {
    modules: [{
      slides: [
        { id: 'diagram-9', title: 'Cracked Gas Processing Flow', voiceOverUrl: null },
        { id: 'summary-12', title: 'Module Summary', voiceOverUrl: null },
      ],
    }],
  };
  assert.equal(
    durableAudioKeyFromCoursePath(course, 'modules[0].slides[0].voiceOverUrl'),
    'slide:diagram-9',
  );
  const applied = applyNarrationUrls(course, {
    'slide:diagram-9': 'blob:correct-diagram',
    'slide:summary-12': 'blob:correct-summary',
    'modules[0].slides[0].voiceOverUrl': 'blob:stale-summary-in-old-slot',
  });
  assert.equal(applied.course.modules[0].slides[0].voiceOverUrl, 'blob:correct-diagram');
  assert.equal(applied.course.modules[0].slides[1].voiceOverUrl, 'blob:correct-summary');

  const attachCourse = {
    modules: [{ slides: [{ id: 'diagram-9', voiceOverUrl: 'blob:correct-diagram' }] }],
  };
  attachHeavyMedia(attachCourse, new Map([
    ['modules[0].slides[0].voiceOverUrl', 'blob:stale-summary-in-old-slot'],
  ]));
  assert.equal(attachCourse.modules[0].slides[0].voiceOverUrl, 'blob:correct-diagram');
});

test('duplicate slide ids are uniqued so two slides cannot share a clip key', () => {
  const course = ensureUniqueSlideIds({
    modules: [{
      slides: [
        { id: 'dup', title: 'Diagram', voiceOverText: 'Diagram script' },
        { id: 'dup', title: 'Module Summary', voiceOverText: 'Summary script' },
      ],
    }],
  });
  const ids = course.modules[0].slides.map((s: any) => s.id);
  assert.equal(new Set(ids).size, 2);
  assert.equal(course.modules[0].slides[0].id, 'dup');
  assert.notEqual(course.modules[0].slides[1].id, 'dup');
});

test('identical tab MP3 bytes are not restored as the next slide’s clip', () => {
  const heat = new Uint8Array(80);
  for (let i = 0; i < heat.length; i++) heat[i] = i + 3;
  const intro = new Uint8Array(80);
  for (let i = 0; i < intro.length; i++) intro[i] = 200 - i;
  const rec = { mime: 'audio/mpeg', data: heat.buffer };
  const cleaned = unbindStolenNarrationRecords({
    'tab:utility-systems:tabs:heat': rec,
    'slide:utility-points': rec,
    'slide:utility-systems': { mime: 'audio/mpeg', data: intro.buffer },
  });
  assert.ok(cleaned['tab:utility-systems:tabs:heat']);
  assert.ok(cleaned['slide:utility-systems']);
  assert.equal(cleaned['slide:utility-points'], undefined);
  const save = src('src/lib/useDraftCourses.ts');
  assert.match(save, /unbindStolenNarrationRecords/);
  const load = src('src/lib/useDraftCourses.ts');
  assert.match(load, /unbindStolenNarrationBlobs/);
});

test('leftover tab audio is not restored onto a click-reveal slide', () => {
  const heat = 'https://example.com/audio/heat-integration.mp3'.padEnd(48, 'x');
  const intro = 'https://example.com/audio/utility-points-intro.mp3'.padEnd(48, 'x');
  const course = {
    modules: [{
      slides: [{
        id: 'utility-points',
        type: 'click-reveal',
        voiceOverUrl: intro,
        data: {
          items: [{ id: 'furnace', term: 'Furnace Exhaust', voiceOverUrl: null }],
          tabs: [{ id: 'heat', label: 'Heat Integration Strategy', voiceOverUrl: null }],
        },
      }],
    }],
  };
  const applied = applyNarrationUrls(course, {
    'slide:utility-points': intro,
    'tab:utility-points:items:furnace': heat,
    'tab:utility-points:tabs:heat': heat,
  });
  const slide = applied.course.modules[0].slides[0];
  assert.equal(slide.voiceOverUrl, intro);
  assert.equal(slide.data.items[0].voiceOverUrl, null);
  assert.equal(slide.data.tabs[0].voiceOverUrl, null);

  const srcText = src('src/lib/draftMedia.ts');
  assert.match(srcText, /isTabbedNarrationType\(s\?\.type\)/);
});

test('harvest only keeps the clip that is actually this slide’s src', () => {
  assert.equal(harvestClipBelongsToSlide('blob:summary', 'blob:summary'), true);
  assert.equal(harvestClipBelongsToSlide('blob:summary', 'blob:diagram'), false);
  assert.equal(harvestClipBelongsToSlide('blob:summary', null), false);
  const save = src('src/lib/useDraftCourses.ts');
  assert.match(save, /harvestPlayerAudio\(extras\?\.currentSlideId, extras\?\.currentVoiceOverUrl\)/);
  const app = src('src/App.tsx');
  assert.match(app, /currentSlideIndex, currentSlide\?\.id, currentSlide\?\.voiceOverUrl/);
  assert.match(app, /ensureUniqueSlideIds/);
});

test('draft save uses mergeDraftAssetPaths and writes even when incoming assets are empty', () => {
  const srcText = src('src/lib/useDraftCourses.ts');
  assert.match(srcText, /mergeDraftAssetPaths\(prevPaths, incomingPaths\)/);
  assert.match(srcText, /if \(assets\) \{\s*await writeDraftAssets/s);
  assert.doesNotMatch(srcText, /\[\.\.\.prevPaths, \.\.\.converted\.map/);
});

test('SCORM export stamps live float x/y/size onto the slide JSON', () => {
  const course = {
    modules: [{ slides: [{ id: 's14', title: 'Margins', floatingMedia: [] }] }],
  };
  const stamped = stampFloatingMediaOnCourse(course, {
    s14: [{ id: 'fi-1', url: 'media/001.png', x: 640, y: 280, width: 420, height: 260 }],
  });
  const img = stamped.modules[0].slides[0].floatingMedia[0];
  assert.equal(img.x, 640);
  assert.equal(img.width, 420);
  const app = src('src/App.tsx');
  assert.match(app, /stampFloatingMediaOnCourse/);
  assert.match(app, /isScormPlayer \|\| isReviewPlayer/);
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

test('cover floats stamp onto course.coverFloatingMedia and restore on load', () => {
  const course = {
    coverImage: 'cover.png',
    coverFloatingMedia: [],
    modules: [{ slides: [{ id: 's1', floatingMedia: [] }] }],
  };
  const stamped = stampFloatingMediaOnCourse(course, {
    [COVER_SLIDE_ID]: [{ id: 'fi-1', url: 'cover.png', x: 640, y: 0, width: 520, height: 720 }],
    s1: [{ id: 'fi-2', url: 'slide.png', x: 10, y: 10, width: 80, height: 80 }],
  });
  assert.equal(stamped.coverFloatingMedia[0].width, 520);
  assert.equal(stamped.modules[0].slides[0].floatingMedia[0].id, 'fi-2');

  const map = floatingMapFromCourse(stamped);
  assert.equal(map[COVER_SLIDE_ID][0].x, 640);
  assert.equal(map.s1[0].id, 'fi-2');

  const deleted = applyCoverMediaPatch(stamped, { coverImage: undefined, floatingMedia: [] });
  assert.equal('coverImage' in deleted, false);
  assert.equal('coverFloatingMedia' in deleted, false);
  assert.equal(deleted.coverPanelHidden, true);

  const shown = applyCoverMediaPatch(deleted, { coverImage: 'new.png', coverPanelHidden: false });
  assert.equal(shown.coverImage, 'new.png');
  assert.equal('coverPanelHidden' in shown, false);

  const moved = applyCoverMediaPatch(stamped, {
    coverImage: undefined,
    coverPanelHidden: true,
    floatingMedia: [{ id: 'fi-1', url: 'cover.png', x: 640, y: 0, width: 520, height: 720 }],
  });
  assert.equal(moved.coverPanelHidden, true);
  assert.equal('coverImage' in moved, false);
  assert.equal(moved.coverFloatingMedia[0].id, 'fi-1');
  assert.equal(resolveCoverTitleAlign(undefined), 'left');
  assert.equal(applyCoverMediaPatch(moved, { coverTitleAlign: 'center' }).coverTitleAlign, 'center');

  const app = src('src/App.tsx');
  assert.match(app, /applyCoverMediaPatch/);
  assert.match(app, /COVER_SLIDE_ID/);
  assert.match(app, /coverPanelHidden/);
  assert.match(app, /regenerateCoverImage/);
  assert.match(app, /Regenerate cover image/);
  assert.doesNotMatch(app, /alert\(err\?\.message \|\| 'Could not regenerate title slide\.'\)/);
  assert.match(app, /coverPanelHidden:\s*true/);
  assert.match(app, /coverTitleAlign/);
  assert.match(app, /waitForApiWarm/);
});

test('hub floats stamp onto course.hubFloatingMedia and restore on load', () => {
  const course = {
    hubImage: '/eLearning Template Backgrounds/Neutral/blue door.jpg',
    hubFloatingMedia: [],
    modules: [{ slides: [] }],
  };
  const stamped = stampFloatingMediaOnCourse(course, {
    [HUB_SLIDE_ID]: [{ id: 'fi-hub', url: course.hubImage, x: 640, y: 0, width: 520, height: 720 }],
  });
  assert.equal(stamped.hubFloatingMedia[0].id, 'fi-hub');
  const map = floatingMapFromCourse(stamped);
  assert.equal(map[HUB_SLIDE_ID][0].width, 520);

  const deleted = applyHubMediaPatch(stamped, { hubImage: undefined, floatingMedia: [] });
  assert.equal('hubImage' in deleted, false);
  assert.equal('hubFloatingMedia' in deleted, false);
  assert.equal(deleted.hubPanelHidden, true);
});
