/**
 * imageService.ts — AI Module Image Generation
 *
 * Generates professional banner images via /api/generate-image
 * (OpenRouter → Gemini Flash Image Preview).
 */

const DEFAULT_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';

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
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.imageDataUrl) throw new Error('No imageDataUrl in response');
  return data.imageDataUrl;
}

/** Generate a single AI cover image for the course title slide. */
export async function generateCourseCoverImage(
  courseTitle: string,
  description?: string
): Promise<string> {
  return callImageEndpoint(buildCourseCoverPrompt(courseTitle || 'Course', description));
}

/**
 * Generate banner images for every module in the course, sequentially.
 */
export async function generateModuleImages(
  course: any,
  onImageReady: (slideId: string, imageDataUrl: string) => void
): Promise<void> {
  if (!course?.modules?.length) return;

  for (const module of course.modules) {
    const titleSlide = module.slides?.find(
      (s: any) => s.type === 'title' || s.type === 'cover'
    );
    if (!titleSlide || !module.title?.trim()) continue;

    try {
      const prompt = buildModuleBannerPrompt(module.title, course.title ?? '');
      const imageDataUrl = await callImageEndpoint(prompt);
      onImageReady(titleSlide.id, imageDataUrl);
      console.log(`[ImageService] ✓ Image ready for module: "${module.title}"`);
    } catch (err) {
      console.warn(`[ImageService] Failed image for module "${module.title}":`, err);
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

/**
 * Attach extracted source images onto slides that can show them without overlapping
 * interactive UI. Plain content/summary get a right-side imageUrl; hotspots get a
 * background only when empty. Quiz/matching/scenario/etc. are skipped entirely.
 */
export function attachSourceImagesToCourse(
  course: any,
  images: Array<{ dataUrl: string; width: number; height: number }>
): any {
  if (!course?.modules?.length || !images?.length) return course;
  const pool = [...images];
  let imgIdx = 0;

  const isInteractive = (s: any) => {
    const t = s.type;
    return [
      'multiple-choice', 'multiple-answers', 'true-false', 'quiz', 'knowledge-check',
      'matching', 'sorting', 'drop-targets', 'scenario', 'flashcards', 'timeline',
      'tabbed-horizontal', 'tabbed-vertical', 'folder-explorer', 'carousel-panel',
      'click-reveal', 'accordion', 'game-template', 'mastery-exam', 'exam-intro',
    ].includes(t);
  };

  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        if (isInteractive(s)) return s;
        if (s.coverImage || s.imageUrl || s.data?.imageUrl) return s;

        if (s.type === 'hotspot') {
          const img = pool[imgIdx % pool.length];
          if (!img) return s;
          imgIdx++;
          return {
            ...s,
            imageUrl: img.dataUrl,
            data: { ...(s.data || {}), imageUrl: img.dataUrl },
          };
        }

        // Text / summary — also seed floatingMedia so images are movable/deletable
        if (s.type !== 'content' && s.type !== 'summary') return s;
        const img = pool[imgIdx % pool.length];
        if (!img) return s;
        imgIdx++;
        const floating = Array.isArray(s.floatingMedia) ? [...s.floatingMedia] : [];
        if (!floating.some((f: any) => f.url === img.dataUrl)) {
          floating.push({
            id: `fi-src-${s.id || imgIdx}`,
            url: img.dataUrl,
            x: 440,
            y: 56,
            width: 300,
            height: 220,
            tabId: null,
          });
        }
        return {
          ...s,
          imageUrl: img.dataUrl,
          floatingMedia: floating,
        };
      }),
    })),
  };
}

/**
 * Fill missing hotspot backgrounds and carousel card images from source pool
 * and/or AI generation (topic-based simple illustrations).
 */
export async function enrichHotspotAndCarouselImages(
  course: any,
  sourceImages: Array<{ dataUrl: string; width: number; height: number }>,
  opts: { generateAi: boolean; useSource: boolean; hotspotOnly?: boolean }
): Promise<any> {
  if (!course?.modules?.length) return course;
  let srcIdx = 0;
  const nextSrc = () => {
    if (!opts.useSource || !sourceImages.length) return null;
    const img = sourceImages[srcIdx % sourceImages.length];
    srcIdx++;
    return img?.dataUrl || null;
  };

  const modules = [];
  for (const m of course.modules) {
    const slides = [];
    for (const s of m.slides || []) {
      let slide = { ...s, data: s.data ? { ...s.data } : s.data };

      if (slide.type === 'hotspot') {
        const existing = slide.imageUrl || slide.data?.imageUrl || slide.coverImage;
        if (!existing) {
          let url = nextSrc();
          if (!url && opts.generateAi) {
            try {
              url = await callImageEndpoint(
                `Educational diagram-style illustration for: "${slide.title}". ` +
                `Clean labeled technical cutaway or schematic, light background, no text overlay, high quality, 16:9.`
              );
            } catch (e) {
              console.warn('[ImageService] Hotspot AI image failed:', e);
            }
          }
          if (url) {
            slide = {
              ...slide,
              imageUrl: url,
              data: { ...(slide.data || {}), imageUrl: url },
            };
          }
        }
      }

      if (!opts.hotspotOnly && slide.type === 'carousel-panel') {
        const cards = slide.data?.cards || slide.data?.items || [];
        if (Array.isArray(cards) && cards.length) {
          const nextCards = [];
          for (const c of cards) {
            if (c.imageUrl) { nextCards.push(c); continue; }
            let url = nextSrc();
            if (!url && opts.generateAi) {
              try {
                url = await callImageEndpoint(
                  `Simple educational illustration for carousel card "${c.label || c.title || 'topic'}" ` +
                  `in course "${course.title || ''}". Soft colors, no text, no logos.`
                );
              } catch { /* non-fatal */ }
            }
            nextCards.push(url ? { ...c, imageUrl: url } : c);
            if (opts.generateAi) await new Promise(r => setTimeout(r, 1200));
          }
          slide = {
            ...slide,
            data: {
              ...(slide.data || {}),
              cards: nextCards,
              items: slide.data?.items ? nextCards : slide.data?.items,
            },
          };
        }
      }

      slides.push(slide);
      if (opts.generateAi && slide.type === 'hotspot') await new Promise(r => setTimeout(r, 1200));
    }
    modules.push({ ...m, slides });
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

  // Strong concrete visual cues
  if (/\b(sign|signal|stop|yield|light|traffic|vehicle|car|truck|bus|highway|school zone|residential|equipment|pump|valve|hvac|duct|motor|engine|pipe|panel|meter|gauge|tool|device|machine|intersection|crosswalk|lane|brake|steering|airbag|helmet|ppe)\b/i.test(lower)) {
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
export async function generateContentSlideImages(
  course: any,
  onProgress?: (done: number, total: number) => void
): Promise<any> {
  if (!course?.modules?.length) return course;

  type Job = { kind: 'slide' | 'tab'; mi: number; si: number; tabIndex?: number; subject: string; slideTitle: string };
  const jobs: Job[] = [];

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
        if (!Array.isArray(tabs)) return;
        tabs.forEach((tab: any, tabIndex: number) => {
          if (tab?.imageUrl) return;
          const label = tab?.label || tab?.title || `Tab ${tabIndex + 1}`;
          if (!topicBenefitsFromVisual(label, tab?.content || '')) return;
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

      if (s.type === 'click-reveal' || s.type === 'accordion') {
        const items = s.data?.items || [];
        if (!Array.isArray(items)) return;
        items.forEach((item: any, tabIndex: number) => {
          if (item?.imageUrl) return;
          const label = item?.title || item?.label || `Item ${tabIndex + 1}`;
          if (!topicBenefitsFromVisual(label, item?.content || '')) return;
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

  const selected = jobs.slice(0, MAX_CONTENT_AI_IMAGES);
  if (!selected.length) return course;

  // Deep-clone modules we will mutate
  const modules = course.modules.map((m: any) => ({
    ...m,
    slides: (m.slides || []).map((s: any) => ({
      ...s,
      data: s.data ? { ...s.data } : s.data,
    })),
  }));

  let done = 0;
  for (const job of selected) {
    try {
      const url = await callImageEndpoint(
        buildSlideVisualPrompt(course.title || 'Course', job.slideTitle, job.subject)
      );
      const slide = modules[job.mi].slides[job.si];
      if (job.kind === 'slide') {
        const floating = Array.isArray(slide.floatingMedia) ? [...slide.floatingMedia] : [];
        if (!floating.some((f: any) => f.url === url)) {
          floating.push({
            id: `fi-ai-${slide.id || `${job.mi}-${job.si}`}`,
            url,
            x: 440,
            y: 56,
            width: 300,
            height: 220,
            tabId: null,
          });
        }
        modules[job.mi].slides[job.si] = { ...slide, imageUrl: url, floatingMedia: floating };
      } else if (typeof job.tabIndex === 'number') {
        if (slide.type === 'tabbed-horizontal' || slide.type === 'tabbed-vertical') {
          const key = slide.data?.tabs ? 'tabs' : 'items';
          const list = [...(slide.data?.[key] || [])];
          if (list[job.tabIndex]) {
            const tab = list[job.tabIndex];
            const tabId = (tab.id != null && String(tab.id).trim()) ? String(tab.id) : `tab-${job.tabIndex}`;
            list[job.tabIndex] = { ...tab, imageUrl: url };
            const floating = Array.isArray(slide.floatingMedia) ? [...slide.floatingMedia] : [];
            if (!floating.some((f: any) => f.url === url)) {
              floating.push({
                id: `fi-ai-${slide.id}-${tabId}`,
                url,
                x: 360,
                y: 80,
                width: 280,
                height: 200,
                tabId,
              });
            }
            modules[job.mi].slides[job.si] = {
              ...slide,
              floatingMedia: floating,
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
    } catch (err) {
      console.warn(`[ImageService] Content visual failed for "${job.subject}":`, err);
    }
    done++;
    onProgress?.(done, selected.length);
    if (done < selected.length) await new Promise(r => setTimeout(r, 1400));
  }

  return { ...course, modules };
}
