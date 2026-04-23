import React, { useRef, useEffect } from 'react';

/**
 * Wraps the external Accordion component in dark/unified theme mode.
 * Uses a MutationObserver to intercept and override any inline `style` attributes
 * (white/light backgrounds, dark text) that the external library hardcodes and that
 * CSS `!important` selectors cannot reach.
 */
export function AccordionDarkWrapper({
  theme,
  children,
}: {
  theme: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDark = theme === 'dark' || theme === 'unified';
    if (!isDark || !ref.current) return;

    const DARK_BG   = '#1e293b';
    const PANEL_BG  = '#0f172a';
    const LIGHT_TEXT = '#e2e8f0';
    const CODE_BG   = 'rgba(15,23,42,0.85)';
    const CODE_TEXT = '#a5b4fc';

    /** Inline-style whites / near-whites → dark slate */
    const LIGHT_BG_PATTERNS = [
      'rgb(255, 255, 255)',
      '#ffffff', '#fff', 'white',
      'rgb(249, 250, 251)',  // gray-50
      'rgb(248, 250, 252)',  // slate-50
      'rgb(241, 245, 249)',  // slate-100
      'rgb(243, 244, 246)',  // gray-100
      'rgb(229, 231, 235)',  // gray-200
      'rgb(226, 232, 240)',  // slate-200
    ];
    const DARK_TEXT_PATTERNS = [
      'rgb(0, 0, 0)', '#000000', '#000', 'black',
      'rgb(15, 23, 42)',   // slate-950
      'rgb(30, 41, 59)',   // slate-800 (already dark — skip below)
      'rgb(51, 65, 85)',   // slate-700
      'rgb(71, 85, 105)',  // slate-600
    ];

    const patchElement = (el: HTMLElement) => {
      const tagName = el.tagName?.toLowerCase();

      // Background
      const bg = el.style.backgroundColor;
      if (bg && LIGHT_BG_PATTERNS.some(p => bg === p)) {
        el.style.backgroundColor = DARK_BG;
      }

      // Text colour — only convert true blacks / very dark grays
      const col = el.style.color;
      if (col && (col === 'rgb(0, 0, 0)' || col === 'black' || col === '#000000' || col === '#000')) {
        el.style.color = LIGHT_TEXT;
      }

      // Code / pre inline elements
      if (tagName === 'code' || tagName === 'pre') {
        if (!el.style.backgroundColor || LIGHT_BG_PATTERNS.some(p => el.style.backgroundColor === p)) {
          el.style.backgroundColor = CODE_BG;
        }
        el.style.color = CODE_TEXT;
        el.style.borderRadius = '4px';
        el.style.padding = tagName === 'code' ? '0.1em 0.35em' : '0.5em 0.75em';
      }

      // Mark / highlight elements
      if (tagName === 'mark') {
        el.style.backgroundColor = 'rgba(99,102,241,0.3)';
        el.style.color = LIGHT_TEXT;
      }
    };

    const patchAll = () => {
      if (!ref.current) return;
      ref.current.querySelectorAll<HTMLElement>('*').forEach(patchElement);
    };

    // Run immediately after render
    patchAll();

    // Re-run on every DOM mutation (accordion expand/collapse)
    const observer = new MutationObserver(patchAll);
    observer.observe(ref.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => observer.disconnect();
  }, [theme, children]);

  return <div ref={ref}>{children}</div>;
}
