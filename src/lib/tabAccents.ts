/** Shared tab accent colors for horizontal/vertical tabs and Edit Slide. */
export const TAB_ACCENT_HEX = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#f43f5e',
] as const;

export function tabAccentHex(tab: { color?: string } | undefined, index: number): string {
  const c = String(tab?.color || '').trim();
  if (c) return c;
  return TAB_ACCENT_HEX[index % TAB_ACCENT_HEX.length];
}
