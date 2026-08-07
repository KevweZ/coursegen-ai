/**
 * MovableDiagramFrame — Authoring wrapper around Mermaid diagrams.
 * Drag to reposition, resize from corners, delete to remove diagram code from the slide.
 */
import interact from 'interactjs';
import { Trash2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import MermaidDiagram from './MermaidDiagram';

export interface DiagramLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  code: string;
  theme?: 'dark' | 'light' | 'unified';
  layout?: DiagramLayout | null;
  isAuthoring?: boolean;
  onLayoutChange?: (layout: DiagramLayout) => void;
  onDelete?: () => void;
}

const DEFAULT_LAYOUT: DiagramLayout = { x: 24, y: 8, width: 640, height: 360 };

export function MovableDiagramFrame({
  code,
  theme = 'light',
  layout,
  isAuthoring = false,
  onLayoutChange,
  onDelete,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<DiagramLayout>(layout || DEFAULT_LAYOUT);
  const onChangeRef = useRef(onLayoutChange);

  useEffect(() => {
    layoutRef.current = layout || DEFAULT_LAYOUT;
    onChangeRef.current = onLayoutChange;
  }, [layout, onLayoutChange]);

  useEffect(() => {
    if (!isAuthoring || !frameRef.current) return;
    const el = frameRef.current;

    const interactable = interact(el)
      .draggable({
        inertia: false,
        listeners: {
          move(event) {
            const target = event.target as HTMLElement;
            const x = (parseFloat(target.getAttribute('data-x') || '0') || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y') || '0') || 0) + event.dy;
            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', String(x));
            target.setAttribute('data-y', String(y));
          },
          end(event) {
            const target = event.target as HTMLElement;
            const x = parseFloat(target.getAttribute('data-x') || '0') || 0;
            const y = parseFloat(target.getAttribute('data-y') || '0') || 0;
            const width = parseFloat(target.style.width) || layoutRef.current.width;
            const height = parseFloat(target.style.height) || layoutRef.current.height;
            onChangeRef.current?.({ x, y, width, height });
          },
        },
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 240, height: 160 },
            max: { width: 960, height: 720 },
          }),
        ],
        listeners: {
          move(event) {
            const target = event.target as HTMLElement;
            let x = parseFloat(target.getAttribute('data-x') || '0') || 0;
            let y = parseFloat(target.getAttribute('data-y') || '0') || 0;
            x += event.deltaRect.left;
            y += event.deltaRect.top;
            Object.assign(target.style, {
              width: `${event.rect.width}px`,
              height: `${event.rect.height}px`,
              transform: `translate(${x}px, ${y}px)`,
            });
            target.setAttribute('data-x', String(x));
            target.setAttribute('data-y', String(y));
          },
          end(event) {
            const target = event.target as HTMLElement;
            const x = parseFloat(target.getAttribute('data-x') || '0') || 0;
            const y = parseFloat(target.getAttribute('data-y') || '0') || 0;
            const width = event.rect.width;
            const height = event.rect.height;
            onChangeRef.current?.({ x, y, width, height });
          },
        },
      });

    return () => interactable.unset();
  }, [isAuthoring, code]);

  const L = layout || DEFAULT_LAYOUT;

  if (!isAuthoring) {
    return (
      <div className="w-full overflow-auto">
        <MermaidDiagram code={code} theme={theme} className="mx-auto" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[200px]" style={{ minHeight: Math.max(200, L.height + 24) }}>
      <div
        ref={frameRef}
        data-x={L.x}
        data-y={L.y}
        className="absolute z-10 group rounded-xl border border-indigo-400/50 bg-white/80 shadow-lg cursor-move overflow-hidden"
        style={{
          width: L.width,
          height: L.height,
          transform: `translate(${L.x}px, ${L.y}px)`,
          touchAction: 'none',
        }}
        title="Drag to move · Resize from corners · Delete to remove"
      >
        <div className="w-full h-full overflow-auto p-2 pointer-events-none">
          <MermaidDiagram code={code} theme={theme} className="mx-auto" />
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-400 text-white rounded-full p-1.5 shadow cursor-pointer pointer-events-auto"
            title="Remove diagram"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="absolute top-0 left-0 w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-sm cursor-nesw-resize opacity-0 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-sm cursor-nesw-resize opacity-0 group-hover:opacity-100" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  );
}

export default MovableDiagramFrame;
