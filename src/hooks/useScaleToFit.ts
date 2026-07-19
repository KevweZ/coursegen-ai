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

    // Reserve a fixed pixel safety margin in addition to the percentage factor
    // below -- this protects against late-appearing scrollbars, sidebar width
    // changes after content loads, and sub-pixel rounding, all of which were
    // still letting player-bar controls (e.g. the CC button) sit flush against
    // -- and get clipped at -- the true container edge.
    const SAFETY_PX = 16;
    const scaleX = (w - SAFETY_PX) / design.w;
    const scaleY = (h - SAFETY_PX) / design.h;
    // Use 0.96 factor (extra margin) so the frame never clips at the edges
    setScale(Math.min(scaleX, scaleY) * 0.96);
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

    // Staggered fallback remeasurements:
    // On a fresh page load (especially on an external monitor), the browser may
    // not have finished laying out when the initial rAF fires — container reports
    // 0×0 and the w < 10 guard bails out early. These timers ensure we re-measure
    // after the layout is fully settled, fixing the HDMI refresh bug.
    const t1 = setTimeout(scheduleRecalculate, 100);
    const t2 = setTimeout(scheduleRecalculate, 400);
    const t3 = setTimeout(scheduleRecalculate, 1000);

    const ro = new ResizeObserver(scheduleRecalculate);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', scheduleRecalculate);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
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
