/**
 * MermaidDiagram.tsx
 *
 * Renders a Mermaid.js diagram from a raw code string.
 * Handles async v10+ API, per-theme initialisation, and graceful error display.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

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

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  code,
  theme = 'dark',
  className = '',
}) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<string>(nextId());

  useEffect(() => {
    if (!code?.trim()) return;

    setSvg('');
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        // Lazy-load mermaid so it doesn't bloat the initial bundle
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'light' ? 'default' : 'dark',
          themeVariables:
            theme === 'light'
              ? {
                  background: '#ffffff',
                  primaryColor: '#6366f1',
                  primaryTextColor: '#1e293b',
                  primaryBorderColor: '#6366f1',
                  lineColor: '#64748b',
                  secondaryColor: '#e2e8f0',
                  tertiaryColor: '#f8fafc',
                }
              : {
                  background: '#1e293b',
                  primaryColor: '#6366f1',
                  primaryTextColor: '#f1f5f9',
                  primaryBorderColor: '#4f46e5',
                  lineColor: '#64748b',
                  secondaryColor: '#334155',
                  tertiaryColor: '#0f172a',
                  edgeLabelBackground: '#1e293b',
                  clusterBkg: '#334155',
                  titleColor: '#e2e8f0',
                  nodeTextColor: '#f1f5f9',
                },
          flowchart: { useMaxWidth: true, htmlLabels: true },
          sequence: { useMaxWidth: true },
          fontFamily: 'Inter, ui-sans-serif, system-ui',
          fontSize: 14,
          securityLevel: 'loose',
        });

        // Always use a fresh ID on each render to avoid SVG ID conflicts
        const renderId = `${idRef.current}-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(renderId, code.trim());
        if (!cancelled) {
          setSvg(renderedSvg);
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

  // ─── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center ${className}`}
      >
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-300 font-medium">Diagram rendering failed</p>
        <pre className="text-xs text-red-400/70 max-w-full overflow-auto whitespace-pre-wrap">
          {error}
        </pre>
      </div>
    );
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────────
  if (!svg) {
    return (
      <div
        className={`rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse flex items-center justify-center ${className}`}
        style={{ minHeight: 220 }}
      >
        <div className="flex flex-col items-center gap-3 opacity-40">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/40 border-t-indigo-400 animate-spin" />
          <span className="text-slate-400 text-sm">Rendering diagram…</span>
        </div>
      </div>
    );
  }

  // ─── Rendered SVG ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`mermaid-diagram-wrapper w-full overflow-auto rounded-xl ${className}`}
      // Mermaid outputs complete SVG — safe since securityLevel is 'loose' with our own content
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ lineHeight: 1.5 }}
    />
  );
};

export default MermaidDiagram;
