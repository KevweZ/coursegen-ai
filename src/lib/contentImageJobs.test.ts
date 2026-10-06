import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MAX_CONTENT_AI_IMAGES,
  MAX_SLIDE_AI_IMAGES,
  applyContentImageUrl,
  collectContentImageJobs,
  contentSlideHasVisual,
  slideTypeSkipsAiContentImages,
} from './contentImageJobs.ts';

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

function courseWithSlides(slides: any[]) {
  return {
    title: 'Polymers: PE and PP Chemistry',
    modules: [{ id: 'm1', title: 'Polymer Fundamentals', slides }],
  };
}

function manyContentSlides(n: number, withImage = false) {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    type: 'content',
    title: `Furnace ${i + 1}`,
    content: 'Steam cracker furnace with radiant coils and process heat.',
    ...(withImage ? { imageUrl: `img-${i}` } : {}),
  }));
}

test('course-wide generate fills remaining empty slots only, capped at 14', () => {
  assert.equal(MAX_CONTENT_AI_IMAGES, 14);
  const slides = [
    ...manyContentSlides(10),
    { id: 'quiz', type: 'knowledge-check', title: 'Check', content: 'Furnace' },
    { id: 'has', type: 'content', title: 'Existing Furnace', content: 'Radiant coils.', imageUrl: 'keep-me' },
    ...manyContentSlides(8).map((s, i) => ({ ...s, id: `extra-${i}` })),
  ];
  const jobs = collectContentImageJobs(courseWithSlides(slides));
  assert.equal(jobs.length, 14);
  assert.ok(jobs.every((j) => j.kind === 'slide'));
  assert.ok(!jobs.some((j) => j.slideId === 'quiz' || j.slideId === 'has'));
});

test('this-slide option only collects jobs for that slide', () => {
  const slides = [
    { id: 'a', type: 'content', title: 'Furnace A', content: 'Radiant coils and process heat.' },
    { id: 'b', type: 'content', title: 'Furnace B', content: 'Radiant coils and process heat.' },
    {
      id: 'tabs',
      type: 'tabbed-horizontal',
      title: 'Steam Cracker',
      content: 'Overview of the furnace and quench.',
      data: {
        tabs: [
          { id: 't1', label: 'Furnace', content: 'Radiant coils heat the feedstock.' },
          { id: 't2', label: 'Quench', content: 'Cool the cracked gas quickly.' },
        ],
      },
    },
  ];
  const onlyB = collectContentImageJobs(courseWithSlides(slides), { slideId: 'b' });
  assert.equal(onlyB.length, 1);
  assert.equal(onlyB[0].slideId, 'b');

  const tabs = collectContentImageJobs(courseWithSlides(slides), {
    slideId: 'tabs',
    skipBenefitHeuristic: true,
  });
  assert.ok(tabs.length >= 1);
  assert.ok(tabs.every((j) => j.slideId === 'tabs'));
  assert.ok(tabs.length <= MAX_SLIDE_AI_IMAGES);
});

test('skips quizzes, objectives, and slides that already have in-flow or floating visuals', () => {
  assert.ok(slideTypeSkipsAiContentImages('knowledge-check'));
  assert.ok(slideTypeSkipsAiContentImages('mastery-exam'));
  assert.ok(!slideTypeSkipsAiContentImages('content'));
  assert.ok(contentSlideHasVisual({ imageUrl: 'x' }));
  assert.ok(contentSlideHasVisual({ floatingMedia: [{ id: 'fi-1', url: 'x', x: 0, y: 0, width: 100, height: 80 }] }));

  const jobs = collectContentImageJobs(courseWithSlides([
    { id: 'obj', type: 'course-objectives', title: 'Objectives', content: 'Furnace' },
    { id: 'kc', type: 'knowledge-check', title: 'KC', content: 'Furnace' },
    { id: 'float', type: 'content', title: 'Furnace', content: 'Radiant coils.', floatingMedia: [{ id: 'fi-9', url: 'u', x: 1, y: 1, width: 80, height: 80 }] },
    { id: 'ok', type: 'content', title: 'Furnace', content: 'Radiant coils and process heat.' },
  ]));
  assert.deepEqual(jobs.map((j) => j.slideId), ['ok']);
});

test('apply writes only image URL fields — text, type, and tab copy stay locked', () => {
  const tabSlide = {
    id: 'tabs',
    type: 'tabbed-horizontal',
    title: 'Steam Cracker',
    content: 'Overview copy stays.',
    voiceOverText: 'Narration stays.',
    data: {
      tabSkin: 'blocks',
      introContent: 'Intro stays.',
      tabs: [
        { id: 't1', label: 'Furnace', content: 'Radiant coils.', imageUrl: undefined },
        { id: 't2', label: 'Quench', content: 'Cool the gas.', extra: 'keep' },
      ],
    },
  };
  const afterIntro = applyContentImageUrl(tabSlide, { kind: 'intro' }, 'intro.png');
  assert.equal(afterIntro.content, 'Overview copy stays.');
  assert.equal(afterIntro.voiceOverText, 'Narration stays.');
  assert.equal(afterIntro.type, 'tabbed-horizontal');
  assert.equal(afterIntro.data.tabSkin, 'blocks');
  assert.equal(afterIntro.data.introContent, 'Intro stays.');
  assert.equal(afterIntro.data.tabs[0].label, 'Furnace');
  assert.equal(afterIntro.data.tabs[0].content, 'Radiant coils.');
  assert.equal(afterIntro.data.introImageUrl, 'intro.png');

  const afterTab = applyContentImageUrl(afterIntro, { kind: 'tab', tabIndex: 1 }, 'quench.png');
  assert.equal(afterTab.data.tabs[1].imageUrl, 'quench.png');
  assert.equal(afterTab.data.tabs[1].label, 'Quench');
  assert.equal(afterTab.data.tabs[1].content, 'Cool the gas.');
  assert.equal(afterTab.data.tabs[1].extra, 'keep');
  assert.equal(afterTab.data.tabs[0].content, 'Radiant coils.');
  assert.equal(afterTab.content, 'Overview copy stays.');

  const contentSlide = {
    id: 'c',
    type: 'content',
    title: 'Furnace',
    content: 'Teaching body stays.',
    voiceOverText: 'VO stays.',
  };
  const afterSlide = applyContentImageUrl(contentSlide, { kind: 'slide' }, 'furnace.png');
  assert.equal(afterSlide.imageUrl, 'furnace.png');
  assert.equal(afterSlide.content, 'Teaching body stays.');
  assert.equal(afterSlide.voiceOverText, 'VO stays.');
  assert.equal(afterSlide.type, 'content');
  assert.equal(afterSlide.title, 'Furnace');
});

test('image gen and authoring stay wired: remaining fill, this-slide, crop/move, no auto fi-ai- promote', () => {
  const service = src('src/services/imageService.ts');
  assert.match(service, /collectContentImageJobs/);
  assert.match(service, /applyContentImageUrl/);
  assert.match(service, /opts\?\: \{ slideId\?\: string \}/);

  const app = src('src/App.tsx');
  assert.match(app, /Generate AI images/);
  assert.match(app, /Fill slides that don[’']t have an image yet/);
  assert.match(app, /Generate AI image for this slide/);
  assert.match(app, /slideId:\s*currentSlide\.id/);
  assert.match(app, /onPromoteToFloat/);
  assert.doesNotMatch(app, /id:\s*`fi-ai-/);

  const enlarge = src('src/components/player/EnlargeableImage.tsx');
  assert.match(enlarge, /Crop/);
  assert.match(enlarge, /Move and resize/);
  assert.match(enlarge, /onPromoteToFloat/);

  const promote = src('src/lib/promoteSlideImages.ts');
  assert.match(promote, /fi-ai-/);
  assert.match(promote, /stripCourseAutoPromotedFloating/);
});
