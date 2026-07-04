/**
 * imageService.ts — AI Module Image Generation
 *
 * Generates professional banner images for each course module via the
 * /api/generate-image server endpoint (OpenRouter → Gemini Flash Image Preview).
 *
 * Design decisions:
 * - Sequential generation (not parallel) to avoid OpenRouter rate limits
 * - 2-second gap between requests
 * - Silent failures: if a module image fails, course still works fine
 * - Images stored as data URLs on the slide.coverImage field
 */

const DEFAULT_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';

/**
 * Build a detailed banner-image prompt for a given module.
 * The prompt is crafted to produce professional, wide-format educational images
 * that complement eLearning course slides without being distracting.
 */
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

/**
 * Call the server-side /api/generate-image endpoint for a single prompt.
 * Returns a data URL string, or throws on failure.
 */
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

/**
 * Generate banner images for every module in the course, sequentially.
 *
 * @param course        The fully-hydrated course object
 * @param onImageReady  Callback invoked as each image is generated.
 *                      Receives the slide ID and the data URL — caller
 *                      should update the slide's coverImage field.
 */
export async function generateModuleImages(
  course: any,
  onImageReady: (slideId: string, imageDataUrl: string) => void
): Promise<void> {
  if (!course?.modules?.length) return;

  for (const module of course.modules) {
    // Only generate for modules that have a title slide and a meaningful title
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
      // Silent failure — course still works without images
      console.warn(`[ImageService] Failed image for module "${module.title}":`, err);
    }

    // Stagger requests to respect OpenRouter rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
}

/**
 * Apply a generated image to the correct slide in the course state.
 * Returns a new course object (immutable update) with the coverImage set.
 */
export function applyCoverImageToCourse(
  course: any,
  slideId: string,
  imageDataUrl: string
): any {
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
