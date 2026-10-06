/**
 * imageService.ts — AI Module Image Generation
 *
 * Generates professional banner images via /api/generate-image
 * (OpenRouter → Gemini Flash Image Preview).
 */

import {
  IMAGE_NO_TEXT_RULE,
  buildGroundedVisualPrompt,
  withImageNoTextRule,
  type VisualPromptInput,
} from '../lib/imageVisualPrompt';
import {
  applyContentImageUrl,
  collectContentImageJobs,
} from '../lib/contentImageJobs';

export {
  MAX_CONTENT_AI_IMAGES,
  applyContentImageUrl,
  collectContentImageJobs,
  topicBenefitsFromVisual,
} from '../lib/contentImageJobs';

const DEFAULT_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';

export { IMAGE_NO_TEXT_RULE };

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

/** Source pool entry used by attach / enrich (extends extract metadata). */
export type AttachableSourceImage = {
  dataUrl: string;
  width: number;
  height: number;
  contentScore?: number;
  sourceSlideIndex?: number;
  sourceContextText?: string;
  mediaName?: string;
};

const RELEVANCE_STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our',
  'out', 'has', 'have', 'been', 'from', 'they', 'this', 'that', 'with', 'will', 'your', 'what',
  'when', 'were', 'been', 'been', 'into', 'than', 'then', 'them', 'these', 'those', 'also',
  'such', 'only', 'over', 'after', 'before', 'about', 'their', 'there', 'where', 'which',
  'while', 'would', 'could', 'should', 'using', 'used', 'same', 'key', 'steps', 'step',
  'how', 'does', 'work', 'next', 'some', 'any', 'each', 'both', 'more', 'most', 'other',
  'content', 'slide', 'module', 'course', 'learn', 'learning', 'objective', 'objectives',
]);

/** Cooling / fridge analogy markers — demote when panel is facility-focused. */
const COOLING_MARKERS = [
  'fridge', 'refrigerator', 'refrigeration', 'refrigerant', 'evaporator', 'condenser',
  'domestic', 'freezer', 'vapour', 'vapor', 'mollier',
];

/** Facility / JV markers — used with cooling demotion for Sadara-vs-fridge cases. */
const FACILITY_MARKERS = [
  'sadara', 'yanbu', 'jubail', 'aramco', 'facility', 'facilities', 'venture', 'licensor',
  'licensing', 'capacity', 'kta', 'complex', 'joint', 'dow', 'partnership', 'polymers',
];

/** Minimum keyword overlap score to place a context-tagged source image. */
const MIN_RELEVANCE_SCORE = 3;

/** Tab/item titles that should not force a 1:1 source-slide title match. */
const GENERIC_PANEL_TITLE = /^(introduction|intro|overview|summary|key takeaways|conclusion)$/i;

function distinctiveTitleTokens(titleText: string): string[] {
  return tokenizeForRelevance(titleText).filter((t) => t.length >= 5);
}

/** True when a panel title like "Propylene" or "Ethane" must appear in the source slide text. */
function titleMustMatchSource(titleText: string): boolean {
  const trimmed = titleText.trim();
  if (!trimmed || GENERIC_PANEL_TITLE.test(trimmed)) return false;
  return distinctiveTitleTokens(trimmed).length >= 1;
}

function normalizeRelevanceToken(t: string): string {
  // Light stemming so facilities↔facility, crackers↔cracker still overlap
  if (t.endsWith('ies') && t.length > 5) return `${t.slice(0, -3)}y`;
  if (t.endsWith('ses') && t.length > 5) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss') && t.length > 4) return t.slice(0, -1);
  return t;
}

function tokenizeForRelevance(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/&amp;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((t) => normalizeRelevanceToken(t.trim()))
    .filter((t) => t.length >= 3 && !RELEVANCE_STOPWORDS.has(t));
}

function setHasMarker(tokens: Set<string>, markers: string[]): boolean {
  for (const m of markers) {
    if (tokens.has(m)) return true;
    for (const t of tokens) {
      if (t.startsWith(m) || m.startsWith(t)) return true;
    }
  }
  return false;
}

/**
 * Keyword overlap between course panel text and PPTX source-slide context.
 * Returns 0 for strong domain mismatches (e.g. fridge diagram vs Sadara facility tab).
 */
export function scoreSourceImageRelevance(panelText: string, imageContextText: string): number {
  const panelTokens = tokenizeForRelevance(panelText);
  const imgTokens = tokenizeForRelevance(imageContextText);
  if (!panelTokens.length || !imgTokens.length) return 0;

  const panelSet = new Set(panelTokens);
  const imgSet = new Set(imgTokens);

  let score = 0;
  for (const t of panelSet) {
    if (!imgSet.has(t)) continue;
    // Prefer distinctive terms (proper nouns / technical words)
    score += t.length >= 7 ? 4 : t.length >= 5 ? 3 : 2;
  }

  const imgCooling = setHasMarker(imgSet, COOLING_MARKERS);
  const panelCooling = setHasMarker(panelSet, COOLING_MARKERS);
  const panelFacility = setHasMarker(panelSet, FACILITY_MARKERS);

  // Fridge / refrigeration analogy must not land on facility-JV panels
  if (imgCooling && !panelCooling && (panelFacility || score < 8)) {
    return 0;
  }

  return score;
}

function buildSlidePanelText(slide: any): string {
  return [
    slide?.title,
    slide?.content,
    slide?.voiceOverText,
    slide?.narration,
    slide?.data?.introContent,
  ]
    .filter(Boolean)
    .join(' ');
}

function buildTabPanelText(slide: any, tab: any): string {
  return [
    slide?.title,
    tab?.title,
    tab?.label,
    tab?.name,
    tab?.content,
    tab?.body,
    tab?.text,
    tab?.voiceOverText,
    tab?.narration,
  ]
    .filter(Boolean)
    .join(' ');
}

function buildItemPanelText(slide: any, item: any): string {
  return [
    slide?.title,
    item?.title,
    item?.label,
    item?.heading,
    item?.content,
    item?.body,
    item?.text,
    item?.voiceOverText,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Pick the best unused source image for a panel.
 * When PPTX slide context exists: require keyword overlap; leave empty rather than a wrong diagram.
 * When no context (PDF / legacy): keep contentScore + size ranking.
 */
function pickRelevantSourceImage(
  pool: AttachableSourceImage[],
  used: Set<number>,
  panelText: string,
  opts?: { titleText?: string; allowReuse?: boolean }
): AttachableSourceImage | null {
  if (!pool.length) return null;
  const allowReuse = opts?.allowReuse !== false;

  const hasContext = pool.some((img) => !!img.sourceContextText?.trim());

  if (!hasContext) {
    for (let i = 0; i < pool.length; i++) {
      if (!used.has(i)) {
        used.add(i);
        return pool[i];
      }
    }
    if (!allowReuse) return null;
    // Soft reuse only when no slide context is available
    const idx = used.size % pool.length;
    return pool[idx] || null;
  }

  let bestIdx = -1;
  let bestScore = -1;
  const titleText = opts?.titleText?.trim() || '';
  const requireTitle = titleMustMatchSource(titleText);

  const consider = (i: number, unusedOnly: boolean) => {
    if (unusedOnly && used.has(i)) return;
    const img = pool[i];
    const ctx = img.sourceContextText || '';
    if (!ctx.trim()) return;
    let score = scoreSourceImageRelevance(panelText, ctx);
    if (score < MIN_RELEVANCE_SCORE) return;
    if (requireTitle) {
      const titleScore = scoreSourceImageRelevance(titleText, ctx);
      // "Propylene" / "Ethane" must appear on the source slide — shared deck
      // words in the body (olefin, steam, cracker) are not enough.
      if (titleScore < 2) return;
      score += titleScore * 1.5;
    }
    // Light tie-break: diagram-like contentScore, then area
    score += (img.contentScore ?? 40) / 200;
    score += Math.min((img.width * img.height) / 2_000_000, 0.5);
    // Prefer unused at equal-ish score
    if (!unusedOnly && !used.has(i)) score += 0.25;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  };

  for (let i = 0; i < pool.length; i++) consider(i, true);
  // Intro/content may reuse a still-relevant image; tabs/items must not.
  if (bestIdx < 0 && allowReuse) {
    for (let i = 0; i < pool.length; i++) consider(i, false);
  }

  if (bestIdx < 0) return null;
  used.add(bestIdx);
  return pool[bestIdx];
}

function groundedCall(input: VisualPromptInput): Promise<string> {
  const { prompt, intended } = buildGroundedVisualPrompt(input);
  return callImageEndpoint(prompt, DEFAULT_IMAGE_MODEL, intended);
}

async function callImageEndpoint(
  prompt: string,
  model = DEFAULT_IMAGE_MODEL,
  intended?: string,
): Promise<string> {
  const execute = async () => {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: withImageNoTextRule(prompt),
        model,
        ...(intended?.trim() ? { intended: intended.trim() } : {}),
      }),
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
  return groundedCall({
    courseTitle: courseTitle || 'Course',
    panelLabel: description?.trim() || courseTitle || 'professional workplace',
    panelBody: description?.trim() || '',
  });
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
      const imageDataUrl = await groundedCall({
        courseTitle: course.title ?? '',
        moduleTitle: module.title,
        panelLabel: module.title,
        panelBody: course.description || course.title || '',
      });
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
 *
 * When images carry PPTX slide context text, placement uses keyword overlap
 * (source slide ↔ panel title/body). No good match → leave empty for AI / blank
 * rather than round-robin a wrong diagram (e.g. fridge on Sadara tab).
 */
export function attachSourceImagesToCourse(
  course: any,
  images: Array<AttachableSourceImage>
): any {
  if (!course?.modules?.length || !images?.length) return course;
  // Prefer diagram-like / high contentScore, then larger rasters — demote sparse leftovers
  const pool = [...images].sort((a, b) => {
    const scoreA = a.contentScore ?? 40;
    const scoreB = b.contentScore ?? 40;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.width * b.height) - (a.width * a.height);
  });
  const used = new Set<number>();
  const take = (panelText: string, titleText?: string, allowReuse = true) =>
    pickRelevantSourceImage(pool, used, panelText, {
      titleText,
      allowReuse,
    });

  const skipEntirely = new Set([
    'multiple-choice', 'multiple-answers', 'true-false', 'quiz', 'knowledge-check',
    'matching', 'sorting', 'drop-targets', 'scenario', 'flashcards', 'timeline',
    'folder-explorer', 'carousel-panel', // carousel filled by enrichHotspotAndCarouselImages
    'game-template', 'mastery-exam', 'exam-intro', 'exam-results', 'closing',
    'title', 'cover', 'module-cover', 'module-overview', 'course-objectives',
    'learning-objectives', 'objectives', 'player-tour',
  ]);

  let placed = 0;
  let skippedNoMatch = 0;

  const result = {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        if (skipEntirely.has(s.type)) return s;

        if (s.type === 'hotspot') {
          if (s.coverImage || s.imageUrl || s.data?.imageUrl) return s;
          const img = take(buildSlidePanelText(s), s.title);
          if (!img) { skippedNoMatch++; return s; }
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
          // Tabs first (specific panels), then intro — avoids facility diagrams being
          // consumed by a generic intro before Sadara/Yanbu tabs can claim them.
          if (list.length) {
            const next = list.map((tab: any) => {
              if (tab?.imageUrl) return tab;
              const img = take(
                buildTabPanelText(s, tab),
                [tab?.title, tab?.label, tab?.name].filter(Boolean).join(' '),
                false
              );
              if (!img) {
                skippedNoMatch++;
                return tab;
              }
              changed = true;
              placed++;
              return { ...tab, imageUrl: img.dataUrl };
            });
            data = { ...data, [key]: next };
          }
          // Intro panel (opening narration) — slide-level text only (do not mix tab titles)
          if (!data.introImageUrl) {
            const introImg = take(buildSlidePanelText(s), s.title);
            if (introImg) {
              data = { ...data, introImageUrl: introImg.dataUrl };
              changed = true;
              placed++;
            } else {
              skippedNoMatch++;
            }
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
            const img = take(
              buildItemPanelText(s, item),
              [item?.title, item?.label, item?.heading].filter(Boolean).join(' '),
              false
            );
            if (!img) {
              skippedNoMatch++;
              return item;
            }
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
        const img = take(buildSlidePanelText(s), s.title);
        if (!img) { skippedNoMatch++; return s; }
        placed++;
        return { ...s, imageUrl: img.dataUrl };
      }),
    })),
  };

  const withCtx = images.filter((i) => i.sourceContextText?.trim()).length;
  console.log(
    `[ImageService] attachSourceImagesToCourse: placed ${placed} image(s) from pool of ${images.length}` +
    ` (slide-context ${withCtx}; skipped-no-match ${skippedNoMatch})`
  );
  return result;
}

/**
 * Fill missing hotspot backgrounds and carousel card images from source pool
 * and/or AI generation (topic-based simple illustrations).
 */
export async function enrichHotspotAndCarouselImages(
  course: any,
  sourceImages: Array<AttachableSourceImage>,
  opts: { generateAi: boolean; useSource: boolean; hotspotOnly?: boolean }
): Promise<any> {
  if (!course?.modules?.length) return course;
  const ranked = [...sourceImages].sort((a, b) => {
    const scoreA = a.contentScore ?? 40;
    const scoreB = b.contentScore ?? 40;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.width * b.height) - (a.width * a.height);
  });
  const used = new Set<number>();
  const nextSrc = (
    panelText: string,
    opts2?: { titleText?: string; allowReuse?: boolean }
  ) => {
    if (!opts.useSource || !ranked.length) return null;
    const img = pickRelevantSourceImage(ranked, used, panelText, opts2);
    return img?.dataUrl || null;
  };

  type AiJob =
    | { kind: 'hotspot'; mi: number; si: number; prompt: string; intended: string }
    | { kind: 'carousel'; mi: number; si: number; cardIndex: number; prompt: string; intended: string };

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
          const url = nextSrc(buildSlidePanelText(slide));
          if (url) {
            modules[mi].slides[si] = {
              ...slide,
              imageUrl: url,
              data: { ...(slide.data || {}), imageUrl: url },
            };
          } else if (opts.generateAi) {
            const grounded = buildGroundedVisualPrompt({
              courseTitle: course.title,
              moduleTitle: m.title,
              slideTitle: slide.title,
              panelLabel: slide.title,
              panelBody: buildSlidePanelText(slide),
              mediaPrompt: slide.mediaPrompt,
            });
            aiJobs.push({
              kind: 'hotspot',
              mi,
              si,
              prompt: grounded.prompt,
              intended: grounded.intended,
            });
          }
        }
      }

      if (!opts.hotspotOnly && slide.type === 'carousel-panel') {
        const cards = slide.data?.cards || slide.data?.items || [];
        if (Array.isArray(cards) && cards.length) {
          const nextCards = cards.map((c: any, cardIndex: number) => {
            if (c.imageUrl) return c;
            const url = nextSrc(buildItemPanelText(slide, c));
            if (url) return { ...c, imageUrl: url };
            if (opts.generateAi) {
              const grounded = buildGroundedVisualPrompt({
                courseTitle: course.title,
                moduleTitle: m.title,
                slideTitle: slide.title,
                panelLabel: c.label || c.title || 'topic',
                panelBody: c.description || c.expandedContent || c.content || '',
                mediaPrompt: slide.mediaPrompt,
              });
              aiJobs.push({
                kind: 'carousel',
                mi,
                si,
                cardIndex,
                prompt: grounded.prompt,
                intended: grounded.intended,
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
          // Tabs before intro so specific panels claim the best source matches first
          if (list.length) {
            const next = list.map((tab: any) => {
              if (tab?.imageUrl) return tab;
              const url = nextSrc(buildTabPanelText(slide, tab), {
                titleText: [tab?.title, tab?.label, tab?.name].filter(Boolean).join(' '),
                allowReuse: false,
              });
              if (!url) return tab;
              changed = true;
              return { ...tab, imageUrl: url };
            });
            data = { ...data, [key]: next };
          }
          if (!data.introImageUrl) {
            // Slide-level text only — avoid mixing tab domain keywords into intro matching
            const url = nextSrc(buildSlidePanelText(slide));
            if (url) {
              data = { ...data, introImageUrl: url };
              changed = true;
            }
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
              const url = nextSrc(buildItemPanelText(slide, item), {
                titleText: [item?.title, item?.label, item?.heading].filter(Boolean).join(' '),
                allowReuse: false,
              });
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
        url = await callImageEndpoint(job.prompt, DEFAULT_IMAGE_MODEL, job.intended);
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

/**
 * Generate AI images for content slides and tab panels when they benefit from a visual.
 * Skips quizzes, knowledge checks, objectives/overview, and slides that already have an image.
 * Prefer leaving source-extracted imageUrl untouched.
 * Does not rewrite OST, voice-over, interaction type, or tab copy — only image URL fields.
 *
 * Course-wide (Edit → Generate AI images): remaining empty slots, cap MAX_CONTENT_AI_IMAGES.
 * `{ slideId }` (this slide only): empty slots on that slide, bypass visual heuristic, smaller cap.
 */
export type ContentImageGenResult = { course: any; jobsAttempted: number };

export async function generateContentSlideImages(
  course: any,
  onProgress?: (done: number, total: number) => void,
  opts?: { slideId?: string },
): Promise<ContentImageGenResult> {
  if (!course?.modules?.length) return { course, jobsAttempted: 0 };

  const selected = collectContentImageJobs(course, {
    slideId: opts?.slideId,
    skipBenefitHeuristic: !!opts?.slideId,
  });
  if (!selected.length) {
    onProgress?.(0, 0);
    return { course, jobsAttempted: 0 };
  }
  onProgress?.(0, selected.length);

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
      url = await groundedCall({
        courseTitle: course.title || 'Course',
        moduleTitle: job.moduleTitle,
        slideTitle: job.slideTitle,
        panelLabel: job.panelLabel,
        panelBody: job.panelBody,
        mediaPrompt: job.mediaPrompt,
      });
    } catch (err) {
      console.warn(`[ImageService] Content visual failed for "${job.subject}":`, err);
    }

    if (url) {
      await withLock(() => {
        const slide = modules[job.mi].slides[job.si];
        modules[job.mi].slides[job.si] = applyContentImageUrl(slide, job, url);
        console.log(`[ImageService] ✓ Content visual for "${job.subject}"`);
      });
    }

    done++;
    onProgress?.(done, selected.length);
    await sleep(IMAGE_PACE_MS);
  });

  return { course: { ...course, modules }, jobsAttempted: selected.length };
}
