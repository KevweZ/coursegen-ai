import { useRef, useState, useEffect, useCallback, type CSSProperties } from 'react';

/**
 * useScaleToFit — Articulate-style viewport scaling
 *
 * Measures the available canvas area and computes a CSS transform scale factor
 * so the slide frame always fills the container while maintaining its aspect ratio.
 *
 * Layout geometry (critical for overflow clipping):
 * - Outer wrapper is sized to the *visual* size (designW * scale × designH * scale)
 *   so parents that use overflow:hidden clip to what the user actually sees.
 * - Inner frame keeps design dimensions with transform: scale(s) and
 *   transformOrigin: 'top left' (layout box stays design-sized; paint is smaller).
 *
 * The container div gets `ref={containerRef}` (letterbox / measure target).
 * The visual wrapper gets `style={outerStyle}`.
 * The frame div gets `style={frameStyle}`.
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

    // Reserve a small fixed pixel safety margin in addition to the percentage
    // factor below -- this protects against late-appearing scrollbars, sidebar
    // width changes after content loads, and sub-pixel rounding, without
    // wasting large amounts of screen space around the frame.
    const SAFETY_PX = 8;
    const scaleX = (w - SAFETY_PX) / design.w;
    const scaleY = (h - SAFETY_PX) / design.h;
    // 0.99 factor -- frame fills nearly the entire available area while still
    // leaving a hair of breathing room so nothing sits flush against the edge.
    setScale(Math.min(scaleX, scaleY) * 0.99);
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
    window.addEventListener('orientationchange', scheduleRecalculate);
    window.visualViewport?.addEventListener('resize', scheduleRecalculate);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener('resize', scheduleRecalculate);
      window.removeEventListener('orientationchange', scheduleRecalculate);
      window.visualViewport?.removeEventListener('resize', scheduleRecalculate);
    };
  }, [scheduleRecalculate]);

  const visualW = design.w * scale;
  const visualH = design.h * scale;

  // Visual wrapper: occupies the on-screen footprint so overflow:hidden parents
  // clip to what the user sees (not the unscaled design box).
  const outerStyle: CSSProperties = {
    width: visualW,
    height: visualH,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  };

  // Inner frame: fixed design dimensions + CSS scale from top-left
  const frameStyle: CSSProperties = {
    width: design.w,
    height: design.h,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    flexShrink: 0,
    // Prevent layout interference from the scaled visual
    willChange: 'transform',
  };

  return {
    containerRef,
    outerStyle,
    frameStyle,
    scale,
    visualW,
    visualH,
    designW: design.w,
    designH: design.h,
  };
}
