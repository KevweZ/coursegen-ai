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
export type ProcessSkinSetting = 'default' | 'blocks';

export function resolveVerticalTabSkin(raw: unknown): VerticalTabSkinSetting {
  return String(raw || '').trim().toLowerCase() === 'blocks' ? 'blocks' : 'default';
}

export function resolveProcessSkin(raw: unknown): ProcessSkinSetting {
  return String(raw || '').trim().toLowerCase() === 'blocks' ? 'blocks' : 'default';
}

/** Process STEP 01 / STEP 02 labels. Missing or anything other than false → shown. */
export function resolveProcessStepLabels(raw: unknown): boolean {
  return raw !== false && raw !== 'false' && raw !== 0;
}

/** Per-module accent (TOC underline, title rule, vertical strip). */
export const MODULE_ACCENT_HEX = [
  '#4f46e5',
  '#0891b2',
  '#16a34a',
  '#d97706',
  '#9333ea',
  '#e11d48',
  '#0d9488',
  '#b45309',
] as const;

export function moduleAccentHex(moduleNumber: number): string {
  const n = Math.max(1, Math.floor(Number(moduleNumber) || 1));
  return MODULE_ACCENT_HEX[(n - 1) % MODULE_ACCENT_HEX.length];
}

export type VerticalTabColorMode = 'per-tab' | 'unify' | 'module';

export function resolveVerticalTabColorMode(raw: unknown): VerticalTabColorMode {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'unify' || v === 'module') return v;
  return 'per-tab';
}

export const BLOCKS_WELL_DEFAULT = '#0b1220';
export const BLOCKS_WELL_PRESETS = [
  '#0b1220',
  '#111827',
  '#1e293b',
  '#1e1b4b',
  '#0f172a',
  '#f8fafc',
] as const;

export function resolveHexColor(raw: unknown, fallback: string): string {
  const c = String(raw || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback;
}

function mapVerticalTabSlides(course: any, fn: (slide: any, moduleIndex: number) => any): any {
  if (!course?.modules) return course;
  return {
    ...course,
    modules: course.modules.map((m: any, mi: number) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => (s?.type === 'tabbed-vertical' ? fn(s, mi) : s)),
    })),
  };
}

/** Stamp presentation skin onto every vertical-tab slide. Does not change interaction type. */
export function stampVerticalTabSkin(course: any, skin: VerticalTabSkinSetting): any {
  return mapVerticalTabSlides(course, (s) => ({ ...s, data: { ...(s.data || {}), tabSkin: skin } }));
}

/** One color for every vertical-tab slide, or each module's accent. `per-tab` leaves slide colors alone. */
export function stampVerticalTabColors(
  course: any,
  mode: VerticalTabColorMode,
  unifyColor?: string
): any {
  if (mode === 'per-tab') return course;
  const unifyHex = resolveHexColor(unifyColor, TAB_ACCENT_HEX[0]);
  return mapVerticalTabSlides(course, (s, mi) => {
    const hex = mode === 'module' ? moduleAccentHex(mi + 1) : unifyHex;
    const key = s.data?.tabs ? 'tabs' : 'items';
    const list = (s.data?.[key] || []).map((t: any) => ({ ...t, color: hex }));
    return {
      ...s,
      data: { ...(s.data || {}), [key]: list, unifyTabColors: true, introColor: hex },
    };
  });
}

export function stampVerticalTabWellColor(course: any, wellColor: string): any {
  const hex = resolveHexColor(wellColor, BLOCKS_WELL_DEFAULT);
  return mapVerticalTabSlides(course, (s) => ({
    ...s,
    data: { ...(s.data || {}), blocksWellColor: hex },
  }));
}

export function stampProcessSkin(
  course: any,
  skin: ProcessSkinSetting = 'default',
  wellColor?: string,
  showStepLabels: boolean = true
): any {
  if (!course?.modules) return course;
  const blocks = skin === 'blocks';
  const well = wellColor ? resolveHexColor(wellColor, BLOCKS_WELL_DEFAULT) : undefined;
  const labels = resolveProcessStepLabels(showStepLabels);
  return {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      slides: (m.slides || []).map((s: any) => {
        if (s?.type !== 'tabbed-horizontal') return s;
        return {
          ...s,
          data: {
            ...(s.data || {}),
            tabSkin: blocks ? 'blocks' : 'process',
            showProcessStepLabels: labels,
            ...(blocks && well ? { blocksWellColor: well } : {}),
          },
        };
      }),
    })),
  };
}

export function applyVerticalTabPresentation(
  course: any,
  opts: {
    skin: VerticalTabSkinSetting;
    colorMode: VerticalTabColorMode;
    unifyColor?: string;
    wellColor?: string;
    processSkin?: ProcessSkinSetting;
    processShowStepLabels?: boolean;
  }
): any {
  let next = stampVerticalTabSkin(course, opts.skin);
  next = stampVerticalTabColors(next, opts.colorMode, opts.unifyColor);
  if (opts.wellColor) next = stampVerticalTabWellColor(next, opts.wellColor);
  return stampProcessSkin(
    next,
    opts.processSkin ?? 'default',
    opts.wellColor,
    opts.processShowStepLabels !== false
  );
}
