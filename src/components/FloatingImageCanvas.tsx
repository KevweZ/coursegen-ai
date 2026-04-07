/**
 * FloatingImageCanvas — Draggable, resizable floating images on the slide canvas.
 * Full feature set: drag (interact.js), resize (corner handles), delete, and crop modal.
 */
import interact from 'interactjs';
import { Trash2, Crop, X, Check } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FloatingImage } from '../types/course';

interface Props {
  images: FloatingImage[];
  isAuthoring: boolean;
  onChange: (images: FloatingImage[]) => void;
  onRemove: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Crop Modal — Canvas-based interactive cropper
// ─────────────────────────────────────────────────────────────
interface CropModalProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedUrl: string) => void;
}

function CropModal({ imageUrl, onClose, onSave }: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [cropRect, setCropRect] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); // normalized 0-1
  const [dragging, setDragging] = useState<{ handle: string; startX: number; startY: number; startCrop: typeof cropRect } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawOverlay();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    drawOverlay();
  }, [cropRect]);

  function drawOverlay() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const img = imgRef.current;
    const ctx = canvas.getContext('2d')!;

    // Scale to fit canvas
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    // Dark overlay outside crop
    const cx = cropRect.x * canvasW;
    const cy = cropRect.y * canvasH;
    const cw = cropRect.w * canvasW;
    const ch = cropRect.h * canvasH;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvasW, cy);                       // top
    ctx.fillRect(0, cy + ch, canvasW, canvasH - cy - ch);  // bottom
    ctx.fillRect(0, cy, cx, ch);                            // left
    ctx.fillRect(cx + cw, cy, canvasW - cx - cw, ch);      // right

    // Crop border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    // Grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(cx + cw * i / 3, cy); ctx.lineTo(cx + cw * i / 3, cy + ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + ch * i / 3); ctx.lineTo(cx + cw, cy + ch * i / 3); ctx.stroke();
    }

    // Corner handles
    const handles = [
      { hx: cx, hy: cy }, { hx: cx + cw, hy: cy },
      { hx: cx, hy: cy + ch }, { hx: cx + cw, hy: cy + ch }
    ];
    handles.forEach(({ hx, hy }) => {
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(hx - 6, hy - 6, 12, 12);
    });
  }

  function getRelativePos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function getHandle(rx: number, ry: number) {
    const { x, y, w, h } = cropRect;
    const tol = 0.04;
    if (Math.abs(rx - x) < tol && Math.abs(ry - y) < tol) return 'nw';
    if (Math.abs(rx - (x + w)) < tol && Math.abs(ry - y) < tol) return 'ne';
    if (Math.abs(rx - x) < tol && Math.abs(ry - (y + h)) < tol) return 'sw';
    if (Math.abs(rx - (x + w)) < tol && Math.abs(ry - (y + h)) < tol) return 'se';
    if (rx > x && rx < x + w && ry > y && ry < y + h) return 'move';
    return null;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x: rx, y: ry } = getRelativePos(e);
    const handle = getHandle(rx, ry);
    if (handle) setDragging({ handle, startX: rx, startY: ry, startCrop: { ...cropRect } });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    const { x: rx, y: ry } = getRelativePos(e);
    const dx = rx - dragging.startX;
    const dy = ry - dragging.startY;
    const sc = dragging.startCrop;
    const minSize = 0.05;

    let { x, y, w, h } = sc;
    if (dragging.handle === 'move') {
      x = Math.max(0, Math.min(1 - w, sc.x + dx));
      y = Math.max(0, Math.min(1 - h, sc.y + dy));
    } else if (dragging.handle === 'nw') {
      x = Math.max(0, Math.min(sc.x + sc.w - minSize, sc.x + dx));
      y = Math.max(0, Math.min(sc.y + sc.h - minSize, sc.y + dy));
      w = sc.x + sc.w - x;
      h = sc.y + sc.h - y;
    } else if (dragging.handle === 'ne') {
      y = Math.max(0, Math.min(sc.y + sc.h - minSize, sc.y + dy));
      w = Math.max(minSize, Math.min(1 - sc.x, sc.w + dx));
      h = sc.y + sc.h - y;
    } else if (dragging.handle === 'sw') {
      x = Math.max(0, Math.min(sc.x + sc.w - minSize, sc.x + dx));
      w = sc.x + sc.w - x;
      h = Math.max(minSize, Math.min(1 - sc.y, sc.h + dy));
    } else if (dragging.handle === 'se') {
      w = Math.max(minSize, Math.min(1 - sc.x, sc.w + dx));
      h = Math.max(minSize, Math.min(1 - sc.y, sc.h + dy));
    }
    setCropRect({ x, y, w, h });
  }

  function handleMouseUp() { setDragging(null); }

  function applyCrop() {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = Math.round(img.naturalWidth * cropRect.w);
    out.height = Math.round(img.naturalHeight * cropRect.h);
    const ctx = out.getContext('2d')!;
    ctx.drawImage(
      img,
      img.naturalWidth * cropRect.x,
      img.naturalHeight * cropRect.y,
      img.naturalWidth * cropRect.w,
      img.naturalHeight * cropRect.h,
      0, 0, out.width, out.height
    );
    onSave(out.toDataURL('image/png', 0.95));
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2 text-white font-bold">
            <Crop className="w-4 h-4 text-indigo-400" />
            Crop Image
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white text-sm font-bold flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />Cancel
            </button>
            <button
              onClick={applyCrop}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />Apply Crop
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="p-4 bg-slate-950 flex items-center justify-center" ref={containerRef}>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="max-w-full object-contain cursor-crosshair rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <p className="text-xs text-slate-500 text-center pb-3">
          Drag corners to resize crop area · Drag inside to move · Click Apply to save
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FloatingImageCanvas
// ─────────────────────────────────────────────────────────────
export function FloatingImageCanvas({ images, isAuthoring, onChange, onRemove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const latestImages = useRef(images);
  const latestOnChange = useRef(onChange);
  const [cropTarget, setCropTarget] = useState<FloatingImage | null>(null);

  useEffect(() => {
    latestImages.current = images;
    latestOnChange.current = onChange;
  }, [images, onChange]);

  useEffect(() => {
    if (!isAuthoring) return;

    const interactable = interact('.floating-image').draggable({
      inertia: true,
      autoScroll: true,
      listeners: {
        move(event) {
          const target = event.target;
          const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
          const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        },
        end(event) {
          const target = event.target;
          const id = target.getAttribute('data-id');
          const x = parseFloat(target.getAttribute('data-x')) || 0;
          const y = parseFloat(target.getAttribute('data-y')) || 0;
          const updatedImages = latestImages.current.map(img =>
            img.id === id ? { ...img, x, y } : img
          );
          latestOnChange.current(updatedImages);
        }
      }
    }).resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      modifiers: [
        interact.modifiers.restrictSize({ min: { width: 100, height: 100 } })
      ],
      listeners: {
        move(event) {
          const target = event.target;
          let x = (parseFloat(target.getAttribute('data-x')) || 0);
          let y = (parseFloat(target.getAttribute('data-y')) || 0);
          x += event.deltaRect.left;
          y += event.deltaRect.top;
          Object.assign(target.style, {
            width: `${event.rect.width}px`,
            height: `${event.rect.height}px`,
            transform: `translate(${x}px, ${y}px)`
          });
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        },
        end(event) {
          const target = event.target;
          const id = target.getAttribute('data-id');
          const x = parseFloat(target.getAttribute('data-x')) || 0;
          const y = parseFloat(target.getAttribute('data-y')) || 0;
          const width = parseFloat(target.style.width) || 320;
          const height = parseFloat(target.style.height) || 240;
          const updatedImages = latestImages.current.map(img =>
            img.id === id ? { ...img, x, y, width, height } : img
          );
          latestOnChange.current(updatedImages);
        }
      }
    });

    return () => interactable.unset();
  }, [isAuthoring]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef}>
        {images.map(img => (
          <div
            key={img.id}
            data-id={img.id}
            data-x={img.x}
            data-y={img.y}
            className={`floating-image absolute shadow-2xl rounded-xl border border-white/20 overflow-hidden bg-slate-900 group ${isAuthoring ? 'pointer-events-auto cursor-move' : 'pointer-events-auto'}`}
            style={{
              width: img.width ? `${img.width}px` : '320px',
              height: img.height ? `${img.height}px` : '240px',
              transform: `translate(${img.x}px, ${img.y}px)`,
              touchAction: 'none'
            }}
          >
            <img
              src={img.url}
              alt="Floating layout"
              className="w-full h-full object-contain bg-slate-800/50 select-none"
              draggable={false}
              onDragStart={e => e.preventDefault()}
            />

            {isAuthoring && (
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {/* Crop button */}
                <button
                  onClick={e => { e.stopPropagation(); setCropTarget(img); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-1.5 shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer"
                  title="Crop image"
                >
                  <Crop className="w-3.5 h-3.5" />
                </button>
                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); onRemove(img.id); }}
                  className="bg-red-500 hover:bg-red-400 text-white rounded-full p-1.5 shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer"
                  title="Remove image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Corner resize handles */}
            {isAuthoring && (
              <>
                <div className="absolute top-0 left-0 w-4 h-4 bg-indigo-500 shadow-md border-2 border-white cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-4 h-4 bg-indigo-500 shadow-md border-2 border-white cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-4 h-4 bg-indigo-500 shadow-md border-2 border-white cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 shadow-md border-2 border-white cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Crop Modal ── */}
      {cropTarget && (
        <CropModal
          imageUrl={cropTarget.url}
          onClose={() => setCropTarget(null)}
          onSave={croppedUrl => {
            const updatedImages = images.map(img =>
              img.id === cropTarget.id ? { ...img, url: croppedUrl } : img
            );
            onChange(updatedImages);
            setCropTarget(null);
          }}
        />
      )}
    </>
  );
}
