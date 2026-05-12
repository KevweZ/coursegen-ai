import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * useScaleToFit — Articulate-style viewport scaling
 *
 * Measures the available canvas area and computes a CSS transform scale factor
 * so the slide frame always fills the container while maintaining its aspect ratio.
 *
 * The container div gets `ref={containerRef}`.
 * The frame div gets `style={frameStyle}` — this applies transform: scale(n).
 */

// Base design dimensions for each aspect ratio mode
export const DESIGN_SIZES: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1280, h: 720 },  // 16:9 widescreen — matches 720p/1080p screens
  '4:3':  { w: 1024, h: 768 },  // 4:3 classic
  'full': { w: 1280, h: 720 }, // handled separately (flex-fill, not scaled)
};

type Resolution = '16:9' | '4:3' | 'full';

export function useScaleToFit(resolution: Resolution | string, active: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const rafRef = useRef<number | null>(null);

  const design = DESIGN_SIZES[resolution] ?? DESIGN_SIZES['16:9'];

  const recalculate = useCallback(() => {
    if (!active) {
      setScale(1);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    // getBoundingClientRect is more reliable than clientWidth during flex reflows
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 10 || h < 10) return; // skip if layout not ready

    const scaleX = w / design.w;
    const scaleY = h / design.h;
    // Use 0.98 factor so frame never clips at edges
    setScale(Math.min(scaleX, scaleY) * 0.98);
  }, [active, design.w, design.h]);

  // Schedule recalculate via rAF so layout is always settled before measuring
  const scheduleRecalculate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      recalculate();
      rafRef.current = null;
    });
  }, [recalculate]);

  useEffect(() => {
    // Measure immediately in rAF after mount/update
    scheduleRecalculate();

    const ro = new ResizeObserver(scheduleRecalculate);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', scheduleRecalculate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener('resize', scheduleRecalculate);
    };
  }, [scheduleRecalculate]);

  // The frame: fixed design dimensions + CSS scale to fill container
  const frameStyle: React.CSSProperties = {
    width:  design.w,
    height: design.h,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    flexShrink: 0,
    // Prevent layout interference from the scaled visual
    willChange: 'transform',
  };

  return { containerRef, frameStyle, scale, designW: design.w, designH: design.h };
}
