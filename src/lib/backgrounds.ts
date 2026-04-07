import backgroundData from './backgroundData.json';

// Group by theme Let's build a map of Theme -> Array of image URLs
export const backgroundThemes: Record<string, string[]> = backgroundData as Record<string, string[]>;

export const getAvailableThemes = (): string[] => Object.keys(backgroundThemes);

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
