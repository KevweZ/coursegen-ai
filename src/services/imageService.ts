/**
 * imageService.ts — AI Module Image Generation
 *
 * Generates professional banner images via /api/generate-image
 * (OpenRouter → Gemini Flash Image Preview).
 */

const DEFAULT_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';

/** Soft-pace between image API calls (was 1.2–2.0s sequential). */
const IMAGE_PACE_MS = 400;
/** Bounded parallel image generation — same $ as sequential, lower wall clock. */
const IMAGE_GEN_CONCURRENCY = 2;

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Run async work with at most `concurrency` in flight; results stay in input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/** Serialize module mutations when image jobs run in parallel. */
function createAsyncLock() {
  let chain: Promise<void> = Promise.resolve();
  return function withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(() => undefined, () => undefined);
    return run;
  };
}

/** Canonical multimedia image modes (legacy ai-title* still accepted via normalizeImageMode). */
export type CourseImageMode =
  | 'none'
  | 'ai'
  | 'source'
  | 'ai-and-source'
  | 'ai-title'            // legacy → ai
  | 'ai-title-and-source'; // legacy → ai-and-source

export function normalizeImageMode(mode?: string | null): 'none' | 'ai' | 'source' | 'ai-and-source' {
  if (mode === 'ai-title' || mode === 'ai') return 'ai';
  if (mode === 'ai-title-and-source' || mode === 'ai-and-source') return 'ai-and-source';
  if (mode === 'source') return 'source';
  if (mode === 'none') return 'none';
  return 'ai';
}

export function imageModeFlags(mode?: string | null): { ai: boolean; source: boolean } {
  const m = normalizeImageMode(mode);
  return {
    ai: m === 'ai' || m === 'ai-and-source',
    source: m === 'source' || m === 'ai-and-source',
  };
}

export function imageModeFromFlags(ai: boolean, source: boolean): CourseImageMode {
  if (ai && source) return 'ai-and-source';
  if (ai) return 'ai';
  if (source) return 'source';
  return 'none';
}

function buildModuleBannerPrompt(moduleTitle: string, courseTitle: string): string {
  return (
    `Professional eLearning course module banner image. ` +
    `Module title: "${moduleTitle}". Course: "${courseTitle}". ` +
    `Style: Clean modern corporate illustration, wide landscape (16:9 aspect ratio). ` +
    `Abstract conceptual visuals that evoke the subject matter. ` +
    `Muted professional gradient background (blues, teals, or slate purples). ` +
    `Sophisticated minimalist design with subtle geometric or abstract elements. ` +
    `No text, no human faces, no logos, no charts. High quality.`
  );
}

function buildCourseCoverPrompt(courseTitle: string, description?: string): string {
  const topic = description?.trim()
    ? description.trim().slice(0, 220)
    : courseTitle;
  return (
    `Create a photorealistic educational cover image for an eLearning course titled "${courseTitle}". ` +
    `The image MUST clearly depict the real-world subject of the course so a learner instantly recognizes the topic. ` +
    `Examples: cars/vehicles for automotive; HVAC units, ductwork, or air handlers for HVAC; pumps and piping for pump courses; ` +
    `electrical panels for electrical safety. Subject context: ${topic}. ` +
    `Composition: wide 16:9 landscape, the subject fills most of the frame, professional lighting, clean modern look. ` +
    `Do NOT include any text, titles, captions, logos, watermarks, UI chrome, or people faces.`
  );
}

async function callImageEndpoint(prompt: string, model = DEFAULT_IMAGE_MODEL): Promise<string> {
  const execute = async () => {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      const msg = err.error ?? `HTTP ${response.status}`;
      const e = new Error(msg) as Error & { status?: number };
      e.status = response.status;
      throw e;
    }

    const data = await response.json();
    if (!data.imageDataUrl) throw new Error('No imageDataUrl in response');
    return data.imageDataUrl as string;
  };

  try {
    return await execute();
  } catch (err: any) {
    if (err?.status === 429 || /429|rate.?limit|too many/i.test(String(err?.message || ''))) {
      console.warn('[ImageService] Rate limited — waiting 8s then retrying once…');
      await sleep(8000);
      return await execute();
    }
    throw err;
  }
}

/** Generate a single AI cover image for the course title slide. */
export async function generateCourseCoverImage(
  courseTitle: string,
  description?: string
): Promise<string> {
  return callImageEndpoint(buildCourseCoverPrompt(courseTitle || 'Course', description));
}

/**
 * Generate banner images for every module in the course (bounded concurrency).
 */
export async function generateModuleImages(
  course: any,
  onImageReady: (slideId: string, imageDataUrl: string) => void
): Promise<void> {
  if (!course?.modules?.length) return;

  const targets = course.modules
    .map((module: any) => {
      const titleSlide = module.slides?.find(
        (s: any) => s.type === 'title' || s.type === 'cover'
      );
      if (!titleSlide || !module.title?.trim()) return null;
      return { module, titleSlide };
    })
    .filter(Boolean) as Array<{ module: any; titleSlide: any }>;

  await mapWithConcurrency(targets, IMAGE_GEN_CONCURRENCY, async ({ module, titleSlide }) => {
    try {
      const prompt = buildModuleBannerPrompt(module.title, course.title ?? '');
      const imageDataUrl = await callImageEndpoint(prompt);
      onImageReady(titleSlide.id, imageDataUrl);
      console.log(`[ImageService] ✓ Image ready for module: "${module.title}"`);
    } catch (err) {
      console.warn(`[ImageService] Failed image for module "${module.title}":`, err);
    }
    await sleep(IMAGE_PACE_MS);
  });
}

/**
 * Attach extracted source images onto slides that can show them.
 * Prefer source on content/summary/hotspot AND default interactions
 * (tabbed-horizontal/vertical, click-reveal, accordion) so AI only fills gaps.
 * Quiz/matching/scenario/etc. stay skipped.
 */
export function attachSourceImagesToCourse(
  course: any,
  images: Array<{ dataUrl: string; width: number; height: number; contentScore?: number }>
): any {
  if (!course?.modules?.length || !images?.length) return course;
  // Prefer diagram-like / high contentScore, then larger rasters — demote sparse leftovers
  const pool = [...images].sort((a, b) => {
    const scoreA = a.contentScore ?? 40;
    const scoreB = b.contentScore ?? 40;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.width * b.height) - (a.width * a.height);
  });
  let imgIdx = 0;
  const nextImg = () => {
    if (!pool.length) return null;
    // Soft round-robin: walk pool once preferring unused high-score images before wrapping
    const img = pool[imgIdx % pool.length];
    imgIdx++;
    return img;
  };

  const skipEntirely = new Set([
    'multiple-choice', 'multiple-answers', 'true-false', 'quiz', 'knowledge-check',
    'matching', 'sorting', 'drop-targets', 'scenario', 'flashcards', 'timeline',
    'folder-explorer', 'carousel-panel', // carousel filled by enrichHotspotAndCarouselImages
    'game-template', 'mastery-exam', 'exam-intro', 'exam-results', 'closing',
    'title', 'cover', 'module-cover', 'module-overview', 'course-objectives',
    'learning-objectives', 'objectives', 'player-tour',
  ]);

  let placed = 0;

  const result = {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        if (skipEntirely.has(s.type)) return s;

        if (s.type === 'hotspot') {
          if (s.coverImage || s.imageUrl || s.data?.imageUrl) return s;
          const img = nextImg();
          if (!img) return s;
          placed++;
          return {
            ...s,
            imageUrl: img.dataUrl,
            data: { ...(s.data || {}), imageUrl: img.dataUrl },
          };
        }

        if (s.type === 'tabbed-horizontal' || s.type === 'tabbed-vertical') {
          const key = s.data?.tabs ? 'tabs' : (Array.isArray(s.data?.items) ? 'items' : 'tabs');
          const list = [...(s.data?.[key] || [])];
          let data = { ...(s.data || {}) };
          let changed = false;
          // Intro panel first (shown during opening narration) — not in tabs[]
          if (!data.introImageUrl) {
            const introImg = nextImg();
            if (introImg) {
              data = { ...data, introImageUrl: introImg.dataUrl };
              changed = true;
              placed++;
            }
          }
          if (list.length) {
            const next = list.map((tab: any) => {
              if (tab?.imageUrl) return tab;
              const img = nextImg();
              if (!img) return tab;
              changed = true;
              placed++;
              return { ...tab, imageUrl: img.dataUrl };
            });
            data = { ...data, [key]: next };
          }
          if (!changed) return s;
          return { ...s, data };
        }

        if (s.type === 'click-reveal' || s.type === 'accordion') {
          const list = [...(s.data?.items || [])];
          if (!list.length) return s;
          let changed = false;
          const next = list.map((item: any) => {
            if (item?.imageUrl) return item;
            const img = nextImg();
            if (!img) return item;
            changed = true;
            placed++;
            return { ...item, imageUrl: img.dataUrl };
          });
          if (!changed) return s;
          return { ...s, data: { ...(s.data || {}), items: next } };
        }

        if (s.coverImage || s.imageUrl || s.data?.imageUrl) return s;

        // Text / summary — imageUrl drives a dedicated right column
        if (s.type !== 'content' && s.type !== 'summary' && s.type !== 'key-takeaways') return s;
        const img = nextImg();
        if (!img) return s;
        placed++;
        return { ...s, imageUrl: img.dataUrl };
      }),
    })),
  };

  console.log(
    `[ImageService] attachSourceImagesToCourse: placed ${placed} image(s) from pool of ${images.length}`
  );
  return result;
}

/**
 * Fill missing hotspot backgrounds and carousel card images from source pool
 * and/or AI generation (topic-based simple illustrations).
 */
export async function enrichHotspotAndCarouselImages(
  course: any,
  sourceImages: Array<{ dataUrl: string; width: number; height: number; contentScore?: number }>,
  opts: { generateAi: boolean; useSource: boolean; hotspotOnly?: boolean }
): Promise<any> {
  if (!course?.modules?.length) return course;
  const ranked = [...sourceImages].sort((a, b) => {
    const scoreA = a.contentScore ?? 40;
    const scoreB = b.contentScore ?? 40;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.width * b.height) - (a.width * a.height);
  });
  let srcIdx = 0;
  const nextSrc = () => {
    if (!opts.useSource || !ranked.length) return null;
    const img = ranked[srcIdx % ranked.length];
    srcIdx++;
    return img?.dataUrl || null;
  };

  type AiJob =
    | { kind: 'hotspot'; mi: number; si: number; prompt: string }
    | { kind: 'carousel'; mi: number; si: number; cardIndex: number; prompt: string };

  const modules = course.modules.map((m: any) => ({
    ...m,
    slides: (m.slides || []).map((s: any) => ({
      ...s,
      data: s.data ? { ...s.data } : s.data,
    })),
  }));

  const aiJobs: AiJob[] = [];

  modules.forEach((m: any, mi: number) => {
    (m.slides || []).forEach((slide: any, si: number) => {
      if (slide.type === 'hotspot') {
        const existing = slide.imageUrl || slide.data?.imageUrl || slide.coverImage;
        if (!existing) {
          const url = nextSrc();
          if (url) {
            modules[mi].slides[si] = {
              ...slide,
              imageUrl: url,
              data: { ...(slide.data || {}), imageUrl: url },
            };
          } else if (opts.generateAi) {
            aiJobs.push({
              kind: 'hotspot',
              mi,
              si,
              prompt:
                `Educational diagram-style illustration for: "${slide.title}". ` +
                `Clean labeled technical cutaway or schematic, light background, no text overlay, high quality, 16:9.`,
            });
          }
        }
      }

      if (!opts.hotspotOnly && slide.type === 'carousel-panel') {
        const cards = slide.data?.cards || slide.data?.items || [];
        if (Array.isArray(cards) && cards.length) {
          const nextCards = cards.map((c: any, cardIndex: number) => {
            if (c.imageUrl) return c;
            const url = nextSrc();
            if (url) return { ...c, imageUrl: url };
            if (opts.generateAi) {
              aiJobs.push({
                kind: 'carousel',
                mi,
                si,
                cardIndex,
                prompt:
                  `Simple educational illustration for carousel card "${c.label || c.title || 'topic'}" ` +
                  `in course "${course.title || ''}". Soft colors, no text, no logos.`,
              });
            }
            return c;
          });
          modules[mi].slides[si] = {
            ...slide,
            data: {
              ...(slide.data || {}),
              cards: nextCards,
              items: slide.data?.items ? nextCards : slide.data?.items,
            },
          };
        }
      }

      // Gap-fill tabs / click-reveal / accordion from source (prefer source before AI content pass)
      if (!opts.hotspotOnly && opts.useSource && (
        slide.type === 'tabbed-horizontal' ||
        slide.type === 'tabbed-vertical' ||
        slide.type === 'click-reveal' ||
        slide.type === 'accordion'
      )) {
        if (slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical') {
          const key = slide.data?.tabs ? 'tabs' : (Array.isArray(slide.data?.items) ? 'items' : 'tabs');
          const list = [...(slide.data?.[key] || [])];
          let data = { ...(modules[mi].slides[si].data || {}) };
          let changed = false;
          if (!data.introImageUrl) {
            const url = nextSrc();
            if (url) {
              data = { ...data, introImageUrl: url };
              changed = true;
            }
          }
          if (list.length) {
            const next = list.map((tab: any) => {
              if (tab?.imageUrl) return tab;
              const url = nextSrc();
              if (!url) return tab;
              changed = true;
              return { ...tab, imageUrl: url };
            });
            data = { ...data, [key]: next };
          }
          if (changed) {
            modules[mi].slides[si] = { ...modules[mi].slides[si], data };
          }
        } else {
          const list = [...(slide.data?.items || [])];
          if (list.length) {
            let changed = false;
            const next = list.map((item: any) => {
              if (item?.imageUrl) return item;
              const url = nextSrc();
              if (!url) return item;
              changed = true;
              return { ...item, imageUrl: url };
            });
            if (changed) {
              modules[mi].slides[si] = {
                ...modules[mi].slides[si],
                data: { ...(modules[mi].slides[si].data || {}), items: next },
              };
            }
          }
        }
      }
    });
  });

  if (aiJobs.length) {
    const withLock = createAsyncLock();
    await mapWithConcurrency(aiJobs, IMAGE_GEN_CONCURRENCY, async (job) => {
      let url: string | null = null;
      try {
        url = await callImageEndpoint(job.prompt);
      } catch (e) {
        console.warn('[ImageService] Hotspot/carousel AI image failed:', e);
      }
      if (url) {
        await withLock(() => {
          const slide = modules[job.mi].slides[job.si];
          if (job.kind === 'hotspot') {
            modules[job.mi].slides[job.si] = {
              ...slide,
              imageUrl: url,
              data: { ...(slide.data || {}), imageUrl: url },
            };
          } else {
            const key = slide.data?.cards ? 'cards' : 'items';
            const list = [...(slide.data?.[key] || [])];
            if (list[job.cardIndex]) {
              list[job.cardIndex] = { ...list[job.cardIndex], imageUrl: url };
              modules[job.mi].slides[job.si] = {
                ...slide,
                data: {
                  ...(slide.data || {}),
                  [key]: list,
                  ...(key === 'cards' && slide.data?.items ? { items: list } : {}),
                },
              };
            }
          }
        });
      }
      await sleep(IMAGE_PACE_MS);
    });
  }

  return { ...course, modules };
}

export function applyCoverImageToCourse(
  course: any,
  slideId: string,
  imageDataUrl: string
): any {
  if (slideId === '__cover__') {
    return { ...course, coverImage: imageDataUrl };
  }
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: m.slides.map((s: any) =>
        s.id === slideId ? { ...s, coverImage: imageDataUrl } : s
      ),
    })),
  };
}

/** Skip AI imagery on assessment / structural slides. */
const AI_CONTENT_SKIP_TYPES = new Set([
  'title', 'cover', 'module-cover', 'module-overview', 'course-objectives',
  'learning-objectives', 'objectives', 'player-tour', 'knowledge-check', 'quiz',
  'multiple-choice', 'multiple-answers', 'true-false', 'mastery-exam', 'exam-intro',
  'exam-results', 'closing', 'scenario', 'game-template', 'matching', 'sorting',
  'drop-targets',
]);

/**
 * Heuristic: only spend an AI image when the topic can be shown as a concrete visual
 * (signs, equipment, zones, vehicles…) — skip pure ideas / calculations / policy prose.
 */
export function topicBenefitsFromVisual(label: string, content?: string): boolean {
  const text = `${label || ''} ${content || ''}`.replace(/<[^>]+>/g, ' ').trim();
  if (text.length < 2) return false;
  const lower = text.toLowerCase();

  if (/\b(calculat|equation|formula|algebra|percentage|budget|policy language|terms and conditions|learning objective)\b/i.test(lower)
    && !/\b(sign|signal|vehicle|equipment|machine|zone|highway|school|traffic|pump|hvac|valve)\b/i.test(lower)) {
    return false;
  }

  // Strong concrete visual cues (incl. industrial / process-plant SME decks)
  if (/\b(sign|signal|stop|yield|light|traffic|vehicle|car|truck|bus|highway|school zone|residential|equipment|pump|valve|hvac|duct|motor|engine|pipe|panel|meter|gauge|tool|device|machine|intersection|crosswalk|lane|brake|steering|airbag|helmet|ppe|furnace|cracker|olefin|ethylene|reactor|distill|refinery|pipeline|compressor|tower|column|exchanger|catalyst|feedstock|vessel|tank|flare|steam|heat|process|schematic|diagram|plant|unit)\b/i.test(lower)) {
    return true;
  }

  // Short concrete tab/slide labels (e.g. "Red Signs", "School Zones")
  const words = (label || '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= 4 && !/^(how|why|what|when|overview|introduction|summary|tips|notes)\b/i.test(label)) {
    return true;
  }

  return false;
}

function buildSlideVisualPrompt(courseTitle: string, slideTitle: string, subject: string): string {
  return (
    `Simple clear educational photo or illustration of: ${subject}. ` +
    `Context: course "${courseTitle}", slide "${slideTitle}". ` +
    `Show the real-world subject so a learner recognizes it instantly. ` +
    `Wide landscape composition, clean professional look, soft background. ` +
    `No text, no logos, no watermarks, no UI, no people faces.`
  );
}

const MAX_CONTENT_AI_IMAGES = 14;

/**
 * Generate AI images for content slides and tab panels when they benefit from a visual.
 * Skips quizzes, knowledge checks, objectives/overview, and slides that already have an image.
 * Prefer leaving source-extracted imageUrl untouched.
 */
export type ContentImageGenResult = { course: any; jobsAttempted: number };

export async function generateContentSlideImages(
  course: any,
  onProgress?: (done: number, total: number) => void
): Promise<ContentImageGenResult> {
  if (!course?.modules?.length) return { course, jobsAttempted: 0 };

  type Job = { kind: 'slide' | 'tab' | 'intro'; mi: number; si: number; tabIndex?: number; subject: string; slideTitle: string };
  const jobs: Job[] = [];
  const introJobs: Job[] = [];

  course.modules.forEach((m: any, mi: number) => {
    (m.slides || []).forEach((s: any, si: number) => {
      if (AI_CONTENT_SKIP_TYPES.has(s.type)) return;

      if (s.type === 'content' || s.type === 'summary' || s.type === 'key-takeaways') {
        if (s.imageUrl || s.coverImage) return;
        if (!topicBenefitsFromVisual(s.title || '', s.content || '')) return;
        jobs.push({ kind: 'slide', mi, si, subject: s.title || 'course topic', slideTitle: s.title || '' });
        return;
      }

      if (s.type === 'tabbed-horizontal' || s.type === 'tabbed-vertical') {
        const tabs = s.data?.tabs || s.data?.items || [];
        // Intro panel first — prioritize within MAX_CONTENT_AI_IMAGES budget
        if (!s.data?.introImageUrl) {
          const introBody = s.content || s.data?.introContent || s.voiceOverText || s.narration || '';
          if (topicBenefitsFromVisual(s.title || '', introBody)) {
            introJobs.push({
              kind: 'intro',
              mi,
              si,
              subject: s.title || 'course topic',
              slideTitle: s.title || '',
            });
          }
        }
        if (!Array.isArray(tabs)) return;
        tabs.forEach((tab: any, tabIndex: number) => {
          if (tab?.imageUrl) return;
          const label = tab?.label || tab?.title || `Tab ${tabIndex + 1}`;
          // Generic labels like "Introduction" still qualify via slide title + tab body
          const body = `${tab?.content || ''} ${s.title || ''}`;
          if (!topicBenefitsFromVisual(label, body) && !topicBenefitsFromVisual(s.title || '', tab?.content || '')) return;
          jobs.push({
            kind: 'tab',
            mi,
            si,
            tabIndex,
            subject: /^(introduction|overview|summary)$/i.test(String(label).trim())
              ? (s.title || label)
              : label,
            slideTitle: s.title || label,
          });
        });
        return;
      }

      if (s.type === 'click-reveal' || s.type === 'accordion') {
        const items = s.data?.items || [];
        if (!Array.isArray(items)) return;
        items.forEach((item: any, tabIndex: number) => {
          if (item?.imageUrl) return;
          const label = item?.title || item?.label || item?.term || `Item ${tabIndex + 1}`;
          const body = item?.content || item?.definition || '';
          if (!topicBenefitsFromVisual(label, body)) return;
          jobs.push({
            kind: 'tab',
            mi,
            si,
            tabIndex,
            subject: label,
            slideTitle: s.title || label,
          });
        });
      }
    });
  });

  // Intro panels before content tabs / slides so opening narration is not left text-only
  const selected = [...introJobs, ...jobs].slice(0, MAX_CONTENT_AI_IMAGES);
  if (!selected.length) return { course, jobsAttempted: 0 };

  // Deep-clone modules we will mutate
  const modules = course.modules.map((m: any) => ({
    ...m,
    slides: (m.slides || []).map((s: any) => ({
      ...s,
      data: s.data ? { ...s.data } : s.data,
    })),
  }));

  let done = 0;
  const withLock = createAsyncLock();

  await mapWithConcurrency(selected, IMAGE_GEN_CONCURRENCY, async (job) => {
    let url: string | null = null;
    try {
      url = await callImageEndpoint(
        buildSlideVisualPrompt(course.title || 'Course', job.slideTitle, job.subject)
      );
    } catch (err) {
      console.warn(`[ImageService] Content visual failed for "${job.subject}":`, err);
    }

    if (url) {
      await withLock(() => {
        const slide = modules[job.mi].slides[job.si];
        if (job.kind === 'slide') {
          modules[job.mi].slides[job.si] = { ...slide, imageUrl: url };
        } else if (job.kind === 'intro') {
          modules[job.mi].slides[job.si] = {
            ...slide,
            data: { ...(slide.data || {}), introImageUrl: url },
          };
        } else if (typeof job.tabIndex === 'number') {
          if (slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical') {
            const key = slide.data?.tabs ? 'tabs' : 'items';
            const list = [...(slide.data?.[key] || [])];
            if (list[job.tabIndex]) {
              list[job.tabIndex] = { ...list[job.tabIndex], imageUrl: url };
              modules[job.mi].slides[job.si] = {
                ...slide,
                data: { ...(slide.data || {}), [key]: list },
              };
            }
          } else if (slide.type === 'click-reveal' || slide.type === 'accordion') {
            const list = [...(slide.data?.items || [])];
            if (list[job.tabIndex]) {
              list[job.tabIndex] = { ...list[job.tabIndex], imageUrl: url };
              modules[job.mi].slides[job.si] = {
                ...slide,
                data: { ...(slide.data || {}), items: list },
              };
            }
          }
        }
        console.log(`[ImageService] ✓ Content visual for "${job.subject}"`);
      });
    }

    done++;
    onProgress?.(done, selected.length);
    await sleep(IMAGE_PACE_MS);
  });

  return { course: { ...course, modules }, jobsAttempted: selected.length };
}
