import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * useScaleToFit — Articulate-style viewport scaling
 *
 * Measures the available canvas area and computes a CSS transform scale factor
 * so the slide frame always fills the container while maintaining its aspect ratio.
 *
 * Usage:
 *   const { containerRef, frameStyle, designW, designH } = useScaleToFit(resolution);
 *
 * The container div gets `ref={containerRef}` and a fixed size via inline style.
 * The frame div gets `style={frameStyle}` — this gives it the transform: scale(n).
 */

// Base design dimensions for each aspect ratio mode
export const DESIGN_SIZES: Record<string, { w: number; h: number }> = {
  'widescreen': { w: 960,  h: 540  },  // 16:9
  '4:3':        { w: 960,  h: 720  },  // 4:3
  'full':       { w: 1280, h: 720  },  // fills available — same logic but wider base
};

type Resolution = 'widescreen' | '4:3' | 'full';

export function useScaleToFit(resolution: Resolution | string, active: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]         = useState(1);
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(0);

  const design = DESIGN_SIZES[resolution] ?? DESIGN_SIZES['widescreen'];

  const recalculate = useCallback(() => {
    if (!active) { setScale(1); return; }
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    setContainerW(w);
    setContainerH(h);
    // Fit the design inside the container — like CSS object-fit: contain
    const scaleX = w / design.w;
    const scaleY = h / design.h;
    setScale(Math.min(scaleX, scaleY));
  }, [active, design.w, design.h]);

  useEffect(() => {
    recalculate();
    const ro = new ResizeObserver(recalculate);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recalculate);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalculate);
    };
  }, [recalculate]);

  // The container fills all available space
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // The frame sits at its fixed design size, transformed to fit
  const frameStyle: React.CSSProperties = {
    width:  design.w,
    height: design.h,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    flexShrink: 0,
  };

  return { containerRef, containerStyle, frameStyle, scale, designW: design.w, designH: design.h };
}
