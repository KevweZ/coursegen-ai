import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COURSE_OBJECTIVES_NARRATION,
  PLAYER_TOUR_NARRATION,
  mergeCoursePreservingAudio,
  slideNarrationScript,
  tabNarrationScript,
} from './narrationAudio.ts';
import { autoFixCourse } from '../services/qcService.ts';
import { buildCourseNarrationItems } from '../hooks/useTTSGeneration.ts';
import { qcFieldTouchesNarration } from './qcTextFix.ts';

test('TTS speaks the Audio box script, not leftover OST', () => {
  const slide = {
    id: 's1',
    type: 'content',
    title: 'Furnace',
    content: 'On-screen bullets about residence time that must not be spoken.',
    voiceOverText: 'The furnace runs between 750 and 870 degrees Celsius.',
  };
  assert.equal(slideNarrationScript(slide), 'The furnace runs between 750 and 870 degrees Celsius.');
  const emptyBox = { ...slide, voiceOverText: '', narration: '' };
  assert.equal(slideNarrationScript(emptyBox), '');
  assert.equal(tabNarrationScript({ content: 'Tab body', voiceOverText: 'Spoken tab line here now.' }), 'Spoken tab line here now.');
  assert.equal(tabNarrationScript({ content: 'Tab body only' }), '');

  const { items } = buildCourseNarrationItems({
    modules: [{ slides: [slide, emptyBox] }],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].text, slide.voiceOverText);
});

test('merge keeps recorded clip and script when QC rewrites voiceOverText', () => {
  const prev = {
    modules: [{
      slides: [{
        id: 's1',
        voiceOverText: 'Hydrate script that was recorded.',
        voiceOverUrl: 'https://example.com/audio/s1.mp3'.padEnd(48, 'x'),
        data: {
          tabs: [{ id: 't1', voiceOverText: 'Tab recorded.', voiceOverUrl: 'https://example.com/audio/t1.mp3'.padEnd(48, 'x') }],
        },
      }],
    }],
  };
  const next = {
    coverImage: 'https://example.com/cover.png',
    modules: [{
      slides: [{
        id: 's1',
        voiceOverText: 'QC rewrote this narration after TTS.',
        data: {
          tabs: [{ id: 't1', voiceOverText: 'QC rewrote the tab too.' }],
        },
      }],
    }],
  };
  const merged = mergeCoursePreservingAudio(prev, next);
  const slide = merged.modules[0].slides[0];
  assert.match(slide.voiceOverUrl, /s1\.mp3/);
  assert.equal(slide.voiceOverText, 'Hydrate script that was recorded.');
  assert.equal(slide.data.tabs[0].voiceOverText, 'Tab recorded.');
});

test('background auto-fix skips narration fields', () => {
  const course = {
    title: 'Steam Cracker',
    modules: [{
      slides: [{
        id: 's1',
        type: 'content',
        title: 'Furnace',
        content: 'Residence time is short.',
        voiceOverText: 'The furnace runs hot.',
      }],
    }],
  };
  const report = {
    issues: [{
      id: 'i1',
      moduleIndex: 0,
      slideIndex: 0,
      slideId: 's1',
      field: 'voiceOverText',
      originalText: 'The furnace runs hot.',
      suggestion: 'The pyrolysis furnace operates at high temperature.',
      autoFixable: true,
      type: 'spelling',
      severity: 'error',
    }],
  } as any;
  const { course: fixed } = autoFixCourse(course, report);
  assert.equal(fixed.modules[0].slides[0].voiceOverText, 'The furnace runs hot.');
  assert.equal(qcFieldTouchesNarration('voiceOverText'), true);
});

test('player tour and objectives TTS copy matches the Audio box', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /PLAYER_TOUR_NARRATION/);
  assert.match(app, /COURSE_OBJECTIVES_NARRATION/);
  assert.equal(PLAYER_TOUR_NARRATION.includes('player preview'), false);
  assert.equal(COURSE_OBJECTIVES_NARRATION.includes('learning objectives'), false);
});
