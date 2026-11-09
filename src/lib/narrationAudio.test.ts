import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COURSE_OBJECTIVES_NARRATION,
  PLAYER_TOUR_NARRATION,
  mergeBackgroundCourseSnapshot,
  mergeCoursePreservingAudio,
  playbackNarrationKey,
  ensureTabListIds,
  playbackUrlForSlide,
  resolveTabForAudio,
  slideNarrationScript,
  stampSpokenClip,
  tabAudioOnSlide,
  tabNarrationScript,
  unbindStolenSlideAudio,
} from './narrationAudio.ts';
import { autoFixCourse } from '../services/qcService.ts';
import { buildCourseNarrationItems, slideTtsPatchAppliesTo, ttsResultIsTab } from '../hooks/useTTSGeneration.ts';
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

test('background snapshot keeps author-added slides and does not append stale copies', () => {
  const live = {
    coverImage: null,
    modules: [{
      slides: [
        { id: 'ds', title: 'Dilution Steam', content: '- Boiler steam', voiceOverUrl: 'https://example.com/audio/ds.mp3'.padEnd(48, 'x') },
        { id: 'new', title: 'Very High Pressure Steam Generation', content: '- VHP steam drives the compressor' },
      ],
    }],
  };
  const stale = {
    coverImage: 'https://example.com/cover.png',
    modules: [{
      slides: [
        { id: 'ds', title: 'Dilution Steam', content: '- Boiler steam', imageUrl: 'https://example.com/ds.png' },
        { id: 'ds-copy', title: 'Dilution Steam', content: '- Boiler steam' },
        { id: 'ds-copy-2', title: 'Dilution Steam', content: '- Boiler steam' },
      ],
    }],
  };
  const merged = mergeBackgroundCourseSnapshot(live, stale);
  const titles = merged.modules[0].slides.map((s: any) => s.title);
  assert.deepEqual(titles, ['Dilution Steam', 'Very High Pressure Steam Generation']);
  assert.equal(merged.modules[0].slides[0].imageUrl, 'https://example.com/ds.png');
  assert.match(merged.modules[0].slides[0].voiceOverUrl, /ds\.mp3/);
  assert.equal(merged.coverImage, 'https://example.com/cover.png');
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

test('chrome narration jobs are queued before teaching slides', () => {
  const { items } = buildCourseNarrationItems({
    modules: [{
      slides: [{
        id: 's1',
        type: 'content',
        title: 'Furnace',
        voiceOverText: 'The furnace runs hot enough to crack naphtha.',
      }],
    }],
  }, {
    synthetic: [
      { id: '__module-overview-1__', text: "Let's revisit the objectives for this module." },
      { id: '__cover__', text: 'Welcome to Steam Cracker operations training today.' },
    ],
  });
  assert.equal(items[0].id, '__module-overview-1__');
  assert.equal(items[0].target, 'synthetic');
  assert.equal(items[1].id, '__cover__');
  assert.equal(items[2].id, 's1');

  const missing = buildCourseNarrationItems({
    modules: [{
      slides: [{
        id: 's1',
        type: 'content',
        title: 'Furnace',
        voiceOverText: 'The furnace runs hot enough to crack naphtha.',
        voiceOverUrl: 'https://example.com/audio/s1.mp3'.padEnd(48, 'x'),
      }],
    }],
  }, {
    onlyMissing: true,
    synthetic: [
      {
        id: '__module-overview-1__',
        text: "Let's revisit the objectives for this module.",
        voiceOverUrl: 'https://example.com/audio/overview.mp3'.padEnd(48, 'x'),
      },
      { id: '__module-overview-2__', text: "Let's revisit the objectives for this module." },
    ],
  });
  assert.deepEqual(missing.items.map(i => i.id), ['__module-overview-2__']);

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const hook = readFileSync(resolve(process.cwd(), 'src/hooks/useTTSGeneration.ts'), 'utf8');
  assert.match(app, /collectSyntheticNarrationJobs/);
  assert.match(app, /voiceOverUrl: s\.voiceOverUrl/);
  assert.match(hook, /Chrome clips first/);
});

test('player tour and objectives TTS copy matches the Audio box', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /PLAYER_TOUR_NARRATION/);
  assert.match(app, /COURSE_OBJECTIVES_NARRATION/);
  assert.equal(PLAYER_TOUR_NARRATION.includes('player preview'), false);
  assert.equal(COURSE_OBJECTIVES_NARRATION.includes('learning objectives'), false);
});

test('player tour narration waits for Show Me', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const tour = readFileSync(resolve(process.cwd(), 'src/components/player/PlayerTourSlide.tsx'), 'utf8');
  assert.match(tour, /onShowMe/);
  assert.match(app, /playerTourUnlocked/);
  assert.match(app, /onShowMe=/);
});

test('process and tabs can generate main slide audio without regenerating tabs', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /Generate Overview audio|Generate Instruction audio|Generate main slide audio/);
  assert.match(app, /main:\$\{/);
});

test('a leftover tab clip does not stamp the next slide’s cache key', () => {
  const heatUrl = 'https://example.com/audio/heat-integration.mp3'.padEnd(48, 'x');
  const introUrl = 'https://example.com/audio/utility-points-intro.mp3'.padEnd(48, 'x');
  const processSlide = {
    id: 'utility-systems',
    type: 'tabbed-horizontal',
    voiceOverUrl: introUrl,
    voiceOverText: 'The steam cracker is not a standalone furnace.',
    data: {
      tabs: [{
        id: 'heat',
        label: 'Heat Integration Strategy',
        voiceOverUrl: heatUrl,
        voiceOverText: 'All these systems are linked thermodynamically in the complex.',
      }],
    },
  };
  const clickReveal = {
    id: 'utility-points',
    type: 'click-reveal',
    voiceOverUrl: heatUrl,
    voiceOverText: 'The steam cracker operates as a tightly coupled energy system.',
    data: {
      items: [{ id: 'furnace', term: 'Furnace Exhaust', voiceOverUrl: heatUrl }],
    },
  };
  const course = { modules: [{ slides: [processSlide, clickReveal] }] };

  assert.equal(tabAudioOnSlide(processSlide, heatUrl)?.tab.id, 'heat');
  assert.equal(tabAudioOnSlide(clickReveal, heatUrl), null);
  assert.equal(
    playbackNarrationKey(processSlide, heatUrl, { tabAudioUrl: heatUrl }),
    'tab:utility-systems:tabs:heat',
  );
  assert.equal(
    playbackNarrationKey(clickReveal, introUrl, { tabAudioUrl: heatUrl }),
    'slide:utility-points',
  );

  assert.equal(playbackUrlForSlide(clickReveal, { course }), null);
  assert.equal(playbackUrlForSlide(processSlide, { course }), introUrl);
  assert.equal(playbackUrlForSlide(processSlide, { course, tabAudioUrl: heatUrl }), heatUrl);
  assert.equal(
    playbackUrlForSlide(processSlide, { course, tabAudioUrl: heatUrl, tabExclusive: true }),
    heatUrl,
  );
  assert.equal(
    playbackUrlForSlide(processSlide, { course, tabExclusive: true }),
    null,
    'a selected tab must not replay Introduction audio',
  );
  const untitled = {
    ...processSlide,
    data: { tabs: [{ label: 'Heat', voiceOverUrl: heatUrl, voiceOverText: processSlide.data.tabs[0].voiceOverText }] },
  };
  const resolved = resolveTabForAudio(ensureTabListIds(untitled), 'tab-1');
  assert.equal(resolved?.label, 'Heat');
  const healed = unbindStolenSlideAudio(course);
  assert.equal(healed.modules[0].slides[1].voiceOverUrl, null);
  assert.equal(healed.modules[0].slides[1].data.items[0].voiceOverUrl, null);
  assert.match(healed.modules[0].slides[0].data.tabs[0].voiceOverUrl, /heat-integration/);

  const stamped = stampSpokenClip(clickReveal, introUrl, clickReveal.voiceOverText);
  assert.equal(stamped.voiceOverClipText, clickReveal.voiceOverText);
  assert.equal(
    playbackUrlForSlide(
      { ...stamped, voiceOverText: 'Edited box that was never re-recorded at all.' },
      { course: { modules: [{ slides: [stamped] }] } },
    ),
    null,
  );

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.match(app, /playbackUrlForSlide\(currentSlide/);
  assert.match(app, /playbackNarrationKey\(currentSlide, playUrl/);
  assert.match(app, /isTabbedNarrationType\(result\.type\)/);
  const lock = readFileSync(resolve(process.cwd(), '.cursor/rules/narration-align-lock.mdc'), 'utf8');
  assert.match(lock, /unbindStolenSlideAudio/);
  assert.match(lock, /voiceOverClipText/);
});

test('TTS tab results cannot overwrite a slide-level voiceOverUrl', () => {
  const sid = 'utility-points';
  assert.equal(ttsResultIsTab({ target: 'tab', slideId: sid, tabId: 'heat', id: `${sid}::tab::heat` }), true);
  assert.equal(ttsResultIsTab({ id: `${sid}::tab::heat`, slideId: sid }), true);
  assert.equal(ttsResultIsTab({ target: 'slide', id: sid, slideId: sid }), false);
  assert.equal(slideTtsPatchAppliesTo({ target: 'slide', id: sid, slideId: sid }, sid), true);
  assert.equal(slideTtsPatchAppliesTo({ target: 'tab', id: `${sid}::tab::heat`, slideId: sid, tabId: 'heat' }, sid), false);
  assert.equal(slideTtsPatchAppliesTo({ id: `${sid}::tab::heat`, slideId: sid }, sid), false);
  const hook = readFileSync(resolve(process.cwd(), 'src/hooks/useTTSGeneration.ts'), 'utf8');
  assert.match(hook, /slideTtsPatchAppliesTo\(r, sid\)/);
  assert.doesNotMatch(hook, /String\(r\.id\) === sid \|\| String\(r\.slideId/);
});
