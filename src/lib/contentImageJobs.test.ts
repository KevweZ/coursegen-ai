import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MAX_CONTENT_AI_IMAGES,
  MAX_SLIDE_AI_IMAGES,
  applyContentImageUrl,
  collectContentImageJobs,
  contentImageJobKey,
  contentImageJobSlotLabel,
  contentSlideHasVisual,
  groupContentImageJobs,
  slideTypeSkipsAiContentImages,
  topicBenefitsFromVisual,
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
    { id: 'has', type: 'content', title: 'Existing Furnace', content: 'Radiant coils.', imageUrl: 'keep-me.png' },
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
  assert.ok(contentSlideHasVisual({ imageUrl: 'keep-me.png' }));
  assert.ok(contentSlideHasVisual({ floatingMedia: [{ id: 'fi-1', url: 'keep-me.png', x: 0, y: 0, width: 100, height: 80 }] }));
  assert.equal(contentSlideHasVisual({ imageUrl: null }), false);
  assert.equal(contentSlideHasVisual({ floatingMedia: [{ id: 'fi-stub', url: null, x: 0, y: 0, width: 100, height: 80 }] }), false);

  const jobs = collectContentImageJobs(courseWithSlides([
    { id: 'obj', type: 'course-objectives', title: 'Objectives', content: 'Furnace' },
    { id: 'kc', type: 'knowledge-check', title: 'KC', content: 'Furnace' },
    { id: 'float', type: 'content', title: 'Furnace', content: 'Radiant coils.', floatingMedia: [{ id: 'fi-9', url: 'keep-me.png', x: 1, y: 1, width: 80, height: 80 }] },
    { id: 'stub', type: 'content', title: 'Furnace', content: 'Radiant coils and process heat.', floatingMedia: [{ id: 'fi-empty', url: null, x: 1, y: 1, width: 80, height: 80 }] },
    { id: 'ok', type: 'content', title: 'Furnace', content: 'Radiant coils and process heat.' },
  ]));
  assert.deepEqual(jobs.map((j) => j.slideId), ['stub', 'ok']);
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

test('author generate lists empty content slides in course order, including abstract titles', () => {
  const howTitle = 'How Triangle and Circle Compositions Shape Viewer Experience';
  assert.equal(topicBenefitsFromVisual(howTitle, 'Triangle composition: stability and drama.'), false);

  const slides = [
    { id: 'ov', type: 'module-overview', title: 'Module 1 — Overview', content: 'Overview copy.' },
    {
      id: 'how',
      type: 'tabbed-horizontal',
      title: howTitle,
      content: 'Triangle composition: stability, movement, drama.',
      data: {
        tabs: [
          { id: 't1', label: 'Triangle', content: 'Stability and drama.' },
          { id: 't2', label: 'Circle', content: 'Harmony and unity.' },
        ],
      },
    },
    { id: 'kc', type: 'knowledge-check', title: 'Knowledge Check', content: 'Composition types.' },
    { id: 'plain', type: 'content', title: 'What Is Visual Composition in Practice', content: 'Shape psychology affects feeling.' },
  ];
  const auto = collectContentImageJobs(courseWithSlides(slides));
  assert.ok(!auto.some((j) => j.kind === 'intro' && j.slideId === 'how'));
  assert.ok(!auto.some((j) => j.slideId === 'plain'));

  const author = collectContentImageJobs(courseWithSlides(slides), { skipBenefitHeuristic: true });
  assert.ok(author.some((j) => j.slideId === 'how' && j.kind === 'intro'));
  assert.ok(author.some((j) => j.slideId === 'plain'));
  assert.ok(!author.some((j) => j.slideId === 'ov' || j.slideId === 'kc'));
  const howJobs = author.filter((j) => j.slideId === 'how');
  assert.deepEqual(howJobs.map((j) => j.kind), ['intro', 'tab', 'tab']);
  assert.ok(author.findIndex((j) => j.slideId === 'how') < author.findIndex((j) => j.slideId === 'plain'));

  const groups = groupContentImageJobs(author, { how: '2.3', plain: '2.4' });
  assert.equal(groups[0].tocRef, '2.3');
  assert.equal(groups[0].jobs.length, 3);
  assert.equal(contentImageJobSlotLabel(howJobs[0]), 'Overview photo');
  assert.equal(contentImageJobSlotLabel(howJobs[1]), 'Triangle');
  assert.equal(contentImageJobKey(howJobs[1]), 'how:tab:0');
});

test('image gen and authoring stay wired: remaining fill, this-slide, crop/move, no auto fi-ai- promote', () => {
  const service = src('src/services/imageService.ts');
  assert.match(service, /collectContentImageJobs/);
  assert.match(service, /applyContentImageUrl/);
  assert.match(service, /jobsApplied/);
  assert.match(service, /onJob\?:/);
  assert.match(service, /jobs\?: ContentImageJob\[\]/);

  const app = src('src/App.tsx');
  assert.match(app, /jobsApplied/);
  assert.match(app, /Generate AI images/);
  assert.match(app, /Fill empty pictures on content slides \(up to 14\)/);
  assert.match(app, /Generate AI image for this slide/);
  assert.match(app, /openGenerateImagesPicker/);
  assert.match(app, /GenerateImagesDialog/);
  assert.match(app, /skipBenefitHeuristic: true/);
  assert.match(app, /slideId:\s*currentSlide\.id/);
  assert.match(app, /onPromoteToFloat/);
  assert.doesNotMatch(app, /id:\s*`fi-ai-/);

  const dialog = src('src/components/builder/GenerateImagesDialog.tsx');
  assert.match(dialog, /Stop generating images\?/);
  assert.match(dialog, /No further images will be generated/);
  assert.match(dialog, /Pictures already on slides will stay/);
  assert.match(dialog, /Uncheck any you want to skip/);

  const enlarge = src('src/components/player/EnlargeableImage.tsx');
  assert.match(enlarge, /Crop/);
  assert.match(enlarge, /Move and resize/);
  assert.match(enlarge, /onPromoteToFloat/);

  const promote = src('src/lib/promoteSlideImages.ts');
  assert.match(promote, /fi-ai-/);
  assert.match(promote, /stripCourseAutoPromotedFloating/);
});
