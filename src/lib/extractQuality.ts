import { looksLikeStoryboard, shouldOfferStoryboardChoice } from './storyboardSource';

export type ExtractQuality = {
  wordCount: number;
  charCount: number;
  extension: string;
  thin: boolean;
  imageOnly: boolean;
  storyboardOffered: boolean;
  storyboardStructured: boolean;
  layoutBestEffort: boolean;
  lines: string[];
};

const IMAGE_ONLY_WORDS = 80;
const THIN_WORDS = 250;

export function fileExtension(fileName?: string): string {
  return String(fileName || '').split('.').pop()?.toLowerCase() || '';
}

/** Post-extract status lines shown before Build now / Review. */
export function assessExtract(text: string, fileName?: string): ExtractQuality {
  const src = String(text || '').trim();
  const words = src ? src.split(/\s+/).filter(Boolean).length : 0;
  const ext = fileExtension(fileName);
  const thin = words < THIN_WORDS;
  const imageOnly = words < IMAGE_ONLY_WORDS;
  const storyboardStructured = looksLikeStoryboard(src, fileName);
  const storyboardOffered = shouldOfferStoryboardChoice(src, fileName);
  const layoutBestEffort = ext === 'docx' || ext === 'pdf';

  const lines: string[] = [];
  if (imageOnly) {
    lines.push('Little extractable text — this file may be image-only or very short. The course will be thin unless you add source later.');
  } else if (thin) {
    lines.push(`Short extract (${words} words). The course will stay close to this amount of source — add content later if you need more depth.`);
  } else {
    lines.push(`Extracted about ${words.toLocaleString()} words.`);
  }

  if (storyboardStructured) {
    lines.push('Listed learner screens and scripts were found. Follow storyboard to match them; treat as lecture source to redesign.');
  } else if (storyboardOffered) {
    lines.push('This looks like a storyboard by name or heading. Screen/table layout may be looser than a slide-per-screen PowerPoint.');
  }

  if (layoutBestEffort && !imageOnly) {
    lines.push('Word and PDF keep the text we can read; columns, tables, and embedded layout are best-effort. Slide-per-screen PowerPoint with notes is the most reliable storyboard match. Review the outline before generate if you want to check it.');
  }

  return {
    wordCount: words,
    charCount: src.length,
    extension: ext,
    thin,
    imageOnly,
    storyboardOffered,
    storyboardStructured,
    layoutBestEffort,
    lines,
  };
}
