import backgroundData from './backgroundData.json';

// Group by theme Let's build a map of Theme -> Array of image URLs
export const backgroundThemes: Record<string, string[]> = backgroundData as Record<string, string[]>;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
const THEME_BG_PREFIX = '/eLearning Template Backgrounds/';

export const getAvailableThemes = (): string[] => Object.keys(backgroundThemes);

function resolveThemeName(theme?: string): string {
  const themesList = Object.keys(backgroundThemes);
  if (themesList.length === 0) return '';
  let selectedTheme = theme || 'Neutral';
  if (!backgroundThemes[selectedTheme] || backgroundThemes[selectedTheme].length === 0) {
    if (backgroundThemes['Neutral'] && backgroundThemes['Neutral'].length > 0) {
      selectedTheme = 'Neutral';
    } else {
      selectedTheme = themesList[0];
    }
  }
  return selectedTheme;
}

/** Still photos only — skip classroom mp4s and other motion files. */
export function themeBackgroundImages(theme?: string): string[] {
  const name = resolveThemeName(theme);
  const images = backgroundThemes[name] || [];
  return images.filter((url) => IMAGE_EXT.test(url));
}

export function isThemeBackgroundUrl(url?: string | null): boolean {
  return typeof url === 'string' && url.startsWith(THEME_BG_PREFIX);
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same title + theme always returns the same archive still — never Math.random. */
export function pickStableBackground(theme?: string, seed?: string): string {
  const images = themeBackgroundImages(theme);
  if (!images.length) return '';
  return images[hashSeed(String(seed || 'hub')) % images.length];
}

export function nextThemeBackground(theme?: string, current?: string | null): string {
  const images = themeBackgroundImages(theme);
  if (!images.length) return '';
  const i = images.indexOf(String(current || ''));
  return images[(i + 1) % images.length];
}

export const getRandomBackgroundForTheme = (theme?: string): string => {
  const themesList = Object.keys(backgroundThemes);
  if (themesList.length === 0) return ''; // No backgrounds found

  let selectedTheme = theme || 'Neutral';

  // Fallback to Neutral or a random theme if the requested theme doesn't exist
  if (!backgroundThemes[selectedTheme] || backgroundThemes[selectedTheme].length === 0) {
    if (backgroundThemes['Neutral'] && backgroundThemes['Neutral'].length > 0) {
      selectedTheme = 'Neutral';
    } else {
      selectedTheme = themesList[Math.floor(Math.random() * themesList.length)];
    }
  }

  const images = backgroundThemes[selectedTheme];
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
};
