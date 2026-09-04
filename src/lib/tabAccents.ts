/** Shared tab accent colors for horizontal/vertical tabs and Edit Slide. */
export const TAB_ACCENT_HEX = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#f43f5e',
  '#64748b',
  '#0f172a',
] as const;

export const TAB_INTRO_DEFAULT_HEX = TAB_ACCENT_HEX[0];

/** Title text on a selected tab (overrides auto-contrast). */
export const TAB_TITLE_HEX = ['#ffffff', '#e2e8f0', '#0f172a'] as const;

export function tabAccentHex(tab: { color?: string } | undefined, index: number): string {
  const c = String(tab?.color || '').trim();
  if (c) return c;
  return TAB_ACCENT_HEX[index % TAB_ACCENT_HEX.length];
}

export type VerticalTabSkinSetting = 'default' | 'blocks';

export function resolveVerticalTabSkin(raw: unknown): VerticalTabSkinSetting {
  return String(raw || '').trim().toLowerCase() === 'blocks' ? 'blocks' : 'default';
}

/** Stamp presentation skin onto every vertical-tab slide. Does not change interaction type. */
export function stampVerticalTabSkin(course: any, skin: VerticalTabSkinSetting): any {
  if (!course?.modules) return course;
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        if (s?.type !== 'tabbed-vertical') return s;
        return { ...s, data: { ...(s.data || {}), tabSkin: skin } };
      }),
    })),
  };
}
