/**
 * imageService.ts — AI Module Image Generation
 *
 * Generates professional banner images via /api/generate-image
 * (OpenRouter → Gemini Flash Image Preview).
 */

const DEFAULT_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';

export type CourseImageMode = 'none' | 'ai-title' | 'source' | 'ai-title-and-source';

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
    ? description.trim().slice(0, 180)
    : `a course about ${courseTitle}`;
  return (
    `Create a simple, high-quality educational cover illustration for an eLearning course titled "${courseTitle}". ` +
    `Topic context: ${topic}. ` +
    `Style: clean modern corporate illustration, wide 16:9 landscape, soft professional colors, ` +
    `clear visual metaphor for the subject, minimal detail, no text, no logos, no watermarks, no people faces.`
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
 * Attach extracted source images (from PPTX/PDF) onto content slides as coverImage.
 */
export function attachSourceImagesToCourse(
  course: any,
  images: Array<{ dataUrl: string; width: number; height: number }>
): any {
  if (!course?.modules?.length || !images?.length) return course;
  const pool = [...images];
  let imgIdx = 0;
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        if (!['content', 'summary', 'key-takeaways', 'hotspot'].includes(s.type)) return s;
        if (s.coverImage || s.imageUrl) return s;
        const img = pool[imgIdx % pool.length];
        imgIdx++;
        if (!img) return s;
        return { ...s, coverImage: img.dataUrl, imageUrl: img.dataUrl };
      }),
    })),
  };
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
