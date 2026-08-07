/**
 * MermaidDiagram.tsx
 *
 * Renders a Mermaid.js diagram from a raw code string.
 * Handles async v10+ API, per-theme initialisation, and graceful error display.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface MermaidDiagramProps {
  /** Raw mermaid markup — no markdown fences */
  code: string;
  theme?: 'dark' | 'light' | 'unified';
  /** Extra CSS classes on the wrapper div */
  className?: string;
}

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `mermaid-diagram-${_idCounter}`;
}

/**
 * Best-effort auto-repair for the #1 cause of "Diagram rendering failed": the AI
 * writes an UNQUOTED node label (e.g. `A[Check Suite Availability (fast path)]`)
 * that contains characters mermaid's flowchart parser treats as syntax --
 * parentheses, quotes, colons, semicolons, braces. Quoting the label text fixes
 * this without changing what it says. Applied automatically as a retry when the
 * first render attempt fails, so a single stray character never blanks a slide.
 */
function sanitizeMermaidCode(code: string): string {
  let out = code
    // Normalize smart quotes/dashes the AI sometimes emits -- also invalid here
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');

  const wrapLabel = (label: string): string => {
    const inner = label.trim();
    if (!inner || /^".*"$/.test(inner)) return label; // empty or already quoted
    if (/[()":;{}]/.test(inner)) {
      return `"${inner.replace(/"/g, '#quot;')}"`;
    }
    return label;
  };

  // Node shape labels: [square], {curly/decision}, (round/terminal)
  out = out.replace(/\[([^\[\]]*)\]/g, (_m, label) => `[${wrapLabel(label)}]`);
  out = out.replace(/\{([^{}]*)\}/g, (_m, label) => `{${wrapLabel(label)}}`);
  out = out.replace(/\(([^()]*)\)/g, (_m, label) => `(${wrapLabel(label)})`);

  return out;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  code,
  theme = 'dark',
  className = '',
}) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<string>(nextId());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svg || !wrapRef.current) return;
    const svgEl = wrapRef.current.querySelector('svg');
    if (!svgEl) return;
    // Mermaid may emit width="100%" which defeats L/C/R alignment — use intrinsic size
    svgEl.removeAttribute('width');
    svgEl.style.maxWidth = '100%';
    svgEl.style.width = 'auto';
    svgEl.style.height = 'auto';
    svgEl.style.display = 'block';
  }, [svg]);

  useEffect(() => {
    if (!code?.trim()) return;

    setSvg('');
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        // Lazy-load mermaid so it doesn't bloat the initial bundle
        const mermaid = (await import('mermaid')).default;

        // Always prefer the light/base palette on light course themes so the
        // diagram blends into the white slide canvas (no dark gray "card" fill).
        // `theme: 'base'` + transparent background is more reliable than
        // `default`, which still paints an opaque SVG backdrop rect.
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'light' ? 'base' : 'dark',
          themeVariables:
            theme === 'light'
              ? {
                  background: 'transparent',
                  mainBkg: '#dbeafe',
                  primaryColor: '#bfdbfe',
                  primaryTextColor: '#0f172a',
                  primaryBorderColor: '#2563eb',
                  secondaryColor: '#fce7f3',
                  tertiaryColor: '#d1fae5',
                  lineColor: '#475569',
                  edgeLabelBackground: '#ffffff',
                  clusterBkg: '#eef2ff',
                  titleColor: '#0f172a',
                  nodeTextColor: '#0f172a',
                  actorBkg: '#fef3c7',
                  actorBorder: '#d97706',
                  actorTextColor: '#0f172a',
                }
              : {
                  background: 'transparent',
                  primaryColor: '#6366f1',
                  primaryTextColor: '#f1f5f9',
                  primaryBorderColor: '#818cf8',
                  lineColor: '#94a3b8',
                  secondaryColor: '#db2777',
                  tertiaryColor: '#059669',
                  edgeLabelBackground: '#1e293b',
                  clusterBkg: '#334155',
                  titleColor: '#e2e8f0',
                  nodeTextColor: '#f1f5f9',
                },
          flowchart: { useMaxWidth: false, htmlLabels: true },
          sequence: { useMaxWidth: false },
          fontFamily: 'Inter, ui-sans-serif, system-ui',
          fontSize: 14,
          securityLevel: 'loose',
        });

        // Sanitize FIRST so a single stray parenthesis in a node label never
        // blanks the slide. Fall back to the raw string only if sanitizing
        // somehow produces empty output.
        const raw = code.trim();
        const sanitized = sanitizeMermaidCode(raw) || raw;
        const renderId = `${idRef.current}-${Date.now()}`;
        try {
          const { svg: renderedSvg } = await mermaid.render(renderId, sanitized);
          if (!cancelled) setSvg(renderedSvg);
        } catch (firstErr: any) {
          // Last-chance retry with the unsanitized original (in case our
          // quote-wrapping accidentally broke a rare valid construct).
          if (sanitized === raw) throw firstErr;
          const retryId = `${idRef.current}-${Date.now()}-retry`;
          const { svg: retrySvg } = await mermaid.render(retryId, raw);
          if (!cancelled) setSvg(retrySvg);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to render diagram');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  const isLight = theme === 'light';

  // ─── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center ${isLight ? 'border-red-200 bg-red-50' : 'border-red-500/30 bg-red-950/20'} ${className}`}
      >
        <AlertCircle className={cn('w-8 h-8', isLight ? 'text-red-500' : 'text-red-400')} />
        <p className={cn('text-sm font-medium', isLight ? 'text-red-700' : 'text-red-300')}>Diagram rendering failed</p>
        <pre className={cn('text-xs max-w-full overflow-auto whitespace-pre-wrap', isLight ? 'text-red-600/80' : 'text-red-400/70')}>
          {error}
        </pre>
      </div>
    );
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────────
  if (!svg) {
    return (
      <div
        className={`rounded-xl animate-pulse flex items-center justify-center ${isLight ? 'bg-slate-50 border border-slate-200' : 'bg-slate-800/50 border border-slate-700/50'} ${className}`}
        style={{ minHeight: 220 }}
      >
        <div className={cn('flex flex-col items-center gap-3', isLight ? 'opacity-60' : 'opacity-40')}>
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/40 border-t-indigo-400 animate-spin" />
          <span className={cn('text-sm', isLight ? 'text-slate-500' : 'text-slate-400')}>Rendering diagram…</span>
        </div>
      </div>
    );
  }

  // ─── Rendered SVG ─────────────────────────────────────────────────────────────
  // Transparent wrapper so the diagram sits on the slide landscape itself —
  // no dark gray "card" behind the flowchart/shapes.
  // Prefer intrinsic SVG size (not width:100%) so parent align L/C/R can work.
  return (
    <div
      ref={wrapRef}
      className={`mermaid-diagram-wrapper overflow-visible inline-block max-w-full ${className}`}
      // Mermaid outputs complete SVG — safe since securityLevel is 'loose' with our own content
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        lineHeight: 1.5,
        background: 'transparent',
      }}
    />
  );
};

export default MermaidDiagram;
