/** WCAG-style relative luminance for hex colors (sRGB). */
export function relativeLuminance(hex: string): number {
  const raw = String(hex || '').replace('#', '').trim();
  if (!raw) return 0;
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 0;
  const n = parseInt(full, 16);
  const toLin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin((n >> 16) & 255) + 0.7152 * toLin((n >> 8) & 255) + 0.0722 * toLin(n & 255);
}

/** White on dark fills, near-black on light fills. */
export function contrastTextOn(hex: string): '#ffffff' | '#0f172a' {
  return relativeLuminance(hex) > 0.46 ? '#0f172a' : '#ffffff';
}

/** Dark fills that keep white card/tab text readable. Used for carousel generation + picker. */
export const CAROUSEL_CARD_HEX = [
  '#4f46e5',
  '#0f766e',
  '#9f1239',
  '#1d4ed8',
  '#b45309',
  '#6d28d9',
  '#166534',
  '#0f172a',
] as const;

export function carouselCardHex(card: { color?: string } | undefined, index: number): string {
  const c = String(card?.color || '').trim();
  if (c) return c;
  return CAROUSEL_CARD_HEX[index % CAROUSEL_CARD_HEX.length];
}

/** Map an AI-picked light/pastel fill onto the locked dark carousel palette. */
export function coerceCarouselColor(hex: unknown, index: number): string {
  const c = String(hex || '').trim();
  if (c && relativeLuminance(c) <= 0.46) return c;
  return CAROUSEL_CARD_HEX[index % CAROUSEL_CARD_HEX.length];
}
