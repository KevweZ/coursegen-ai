import { useRef, useState, useEffect, useLayoutEffect, useCallback, type CSSProperties } from 'react';

/**
 * useScaleToFit — Articulate-style viewport scaling
 *
 * The measure host MUST be an empty `absolute inset-0` layer whose size comes
 * only from the stage (flex parent). Never put this ref on the scaled player.
 *
 * Measuring the player itself (or a parent that shrink-wraps to it) plus any
 * <1 safety factor creates a feedback loop: scale shrinks → host shrinks →
 * scale shrinks → the canvas animates away. Do not “fix” that by toggling
 * flex-fill vs transform; that bounce is the other failure mode.
 *
 * Layout:
 * - Measure host: empty, position absolute, inset 0 (out of flow).
 * - Outer wrapper: visual size (design × scale) so overflow clips to what
 *   the user sees. Also out of flow (centered in an absolute inset-0 host).
 * - Inner frame: design size + transform:scale from top-left. No CSS
 *   transition on width/height/transform.
 */

export const DESIGN_SIZES: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1280, h: 720 },
  '4:3':  { w: 1024, h: 768 },
  'full': { w: 1280, h: 720 },
};

type Resolution = '16:9' | '4:3' | 'full';

export function useScaleToFit(resolution: Resolution | string, active: boolean = true) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);

  const design = DESIGN_SIZES[resolution] ?? DESIGN_SIZES['16:9'];

  const applyMeasurement = useCallback((w: number, h: number) => {
    if (!active) {
      setScale(1);
      return;
    }
    // Collapsed / not-yet-laid-out hosts are not a real stage.
    if (w < 80 || h < 80) return;

    const INSET = 4;
    const next = Math.min((w - INSET) / design.w, (h - INSET) / design.h);
    if (!Number.isFinite(next) || next <= 0) return;

    setScale(prev => {
      // A healthy player must not collapse because a child-sized host flickered.
      if (prev >= 0.4 && next < 0.2) return prev;
      if (next > 6) return prev;
      if (Math.abs(prev - next) < 0.003) return prev;
      return next;
    });
  }, [active, design.w, design.h]);

  const measureNode = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    applyMeasurement(rect.width, rect.height);
  }, [applyMeasurement]);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measureNode();
    });
  }, [measureNode]);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || !active) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) applyMeasurement(cr.width, cr.height);
    });
    observerRef.current = ro;
    ro.observe(node);
    applyMeasurement(node.getBoundingClientRect().width, node.getBoundingClientRect().height);
  }, [active, applyMeasurement]);

  useLayoutEffect(() => {
    if (!active) return;
    measureNode();
  }, [active, measureNode]);

  useEffect(() => {
    if (!active) {
      setScale(1);
      return;
    }

    scheduleMeasure();
    const t1 = setTimeout(scheduleMeasure, 100);
    const t2 = setTimeout(scheduleMeasure, 400);

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);

    let dprMql: MediaQueryList | null = null;
    const onDprChange = () => {
      attachDprListener();
      scheduleMeasure();
    };
    const attachDprListener = () => {
      dprMql?.removeEventListener('change', onDprChange);
      dprMql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprMql.addEventListener('change', onDprChange);
    };
    attachDprListener();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
      dprMql?.removeEventListener('change', onDprChange);
    };
  }, [active, scheduleMeasure]);

  useEffect(() => () => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const visualW = design.w * scale;
  const visualH = design.h * scale;

  const outerStyle: CSSProperties = {
    width: visualW,
    height: visualH,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    transition: 'none',
  };

  const frameStyle: CSSProperties = {
    width: design.w,
    height: design.h,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    flexShrink: 0,
    transition: 'none',
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
