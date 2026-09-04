/**
 * FloatingImageCanvas — Draggable, resizable floating images on the slide canvas.
 * Full feature set: drag (interact.js), resize (corner handles), delete, and crop modal.
 */
import interact from 'interactjs';
import { Trash2, Crop, X, Check, PanelRight } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FloatingImage } from '../types/course';

interface Props {
  images: FloatingImage[];
  isAuthoring: boolean;
  onChange: (images: FloatingImage[]) => void;
  onRemove: (id: string) => void;
  /** Put a detached tab/slide image back into the in-flow column. */
  onPinBack?: (img: FloatingImage) => void;
  /** Active tab on tabbed slides — filters which tab-scoped images are visible */
  activeTabId?: string | null;
  /** Called while dragging so parent can highlight tab drop zones */
  onDragOverTab?: (tabId: string | null) => void;
}

// ─────────────────────────────────────────────────────────────
// Crop Modal — Canvas-based interactive cropper
// ─────────────────────────────────────────────────────────────
interface CropModalProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedUrl: string) => void;
}

export function ImageCropModal({ imageUrl, onClose, onSave }: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropRect, setCropRect] = useState({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 }); // normalized 0-1
  const [dragging, setDragging] = useState<{ handle: string; startX: number; startY: number; startCrop: typeof cropRect } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      // Match canvas aspect to image — avoids letterbox dark side bars
      const maxW = 640;
      const maxH = 480;
      const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      let w = maxW;
      let h = Math.round(w / aspect);
      if (h > maxH) {
        h = maxH;
        w = Math.round(h * aspect);
      }
      setCanvasSize({ w, h });
      requestAnimationFrame(() => drawOverlay());
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    drawOverlay();
  }, [cropRect, canvasSize]);

  function drawOverlay() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const img = imgRef.current;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    // Dark overlay outside crop
    const cx = cropRect.x * canvasW;
    const cy = cropRect.y * canvasH;
    const cw = cropRect.w * canvasW;
    const ch = cropRect.h * canvasH;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
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
    out.width = Math.max(1, Math.round(img.naturalWidth * cropRect.w));
    out.height = Math.max(1, Math.round(img.naturalHeight * cropRect.h));
    const ctx = out.getContext('2d', { alpha: true })!;
    // Transparent clear — preserve PNG alpha (no black letterbox bake-in)
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.drawImage(
      img,
      img.naturalWidth * cropRect.x,
      img.naturalHeight * cropRect.y,
      img.naturalWidth * cropRect.w,
      img.naturalHeight * cropRect.h,
      0, 0, out.width, out.height
    );
    onSave(out.toDataURL('image/png'));
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

        {/* Checkerboard so PNG transparency is visible (no dark letterbox frame) */}
        <div
          className="p-4 flex items-center justify-center"
          ref={containerRef}
          style={{
            background:
              'repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%) 50% / 16px 16px',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="max-w-full cursor-crosshair rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <p className="text-xs text-slate-500 text-center pb-3">
          Drag corners freely · Drag inside to move · PNG transparency preserved
        </p>
      </div>
    </div>
  );
}

function tabIdFromPoint(clientX: number, clientY: number): string | null {
  const stack = (document.elementsFromPoint?.(clientX, clientY) || []) as HTMLElement[];
  for (const el of stack) {
    if (el.closest?.('.floating-image')) continue;
    const zone = el.closest?.('[data-tab-drop-zone]') as HTMLElement | null;
    if (zone) {
      const id = zone.getAttribute('data-tab-drop-zone');
      if (id) return id;
    }
  }
  return null;
}

/** Player scale-to-fit uses CSS transform: scale on an ancestor. interact.js reports screen px. */
function layoutScale(el: HTMLElement | null): number {
  if (!el) return 1;
  const layout = el.offsetWidth || parseFloat(getComputedStyle(el).width) || 0;
  if (layout < 8) return 1;
  const s = el.getBoundingClientRect().width / layout;
  return Number.isFinite(s) && s > 0.05 && s < 20 ? s : 1;
}

function clampSize(w: number, h: number, maxW = 720, maxH = 560, min = 64) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 240, height: 180 };
  }
  const aspect = w / Math.max(0.2, h);
  let width = w;
  let height = h;
  if (width > maxW) {
    width = maxW;
    height = width / aspect;
  }
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  if (width < min) {
    width = min;
    height = width / aspect;
  }
  if (height < min) {
    height = min;
    width = height * aspect;
  }
  if (width > maxW || height > maxH) {
    const s = Math.min(maxW / width, maxH / height, 1);
    width *= s;
    height *= s;
  }
  return {
    width: Math.max(min, Math.round(width)),
    height: Math.max(min, Math.round(height)),
  };
}

function clampPos(x: number, y: number, w: number, h: number, stageW: number, stageH: number) {
  const minX = -Math.max(24, w * 0.35);
  const minY = -Math.max(24, h * 0.35);
  const maxX = Math.max(0, stageW - w * 0.35);
  const maxY = Math.max(0, stageH - h * 0.35);
  return {
    x: Number.isFinite(x) ? Math.min(maxX, Math.max(minX, x)) : 24,
    y: Number.isFinite(y) ? Math.min(maxY, Math.max(minY, y)) : 24,
  };
}

function stageLimits(stage: HTMLElement | null) {
  const sw = Math.max(160, stage?.clientWidth || 720);
  const sh = Math.max(160, stage?.clientHeight || 480);
  return { sw, sh, maxW: Math.max(120, sw - 24), maxH: Math.max(120, sh - 24) };
}

// ─────────────────────────────────────────────────────────────
// FloatingImageCanvas
// ─────────────────────────────────────────────────────────────
export function FloatingImageCanvas({
  images,
  isAuthoring,
  onChange,
  onRemove,
  onPinBack,
  activeTabId = null,
  onDragOverTab,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const latestImages = useRef(images);
  const latestOnChange = useRef(onChange);
  const latestHover = useRef(onDragOverTab);
  const [cropTarget, setCropTarget] = useState<FloatingImage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleImages = images.filter(img => {
    if (!img.tabId) return true;
    if (img.tabId === '__intro__') return !activeTabId;
    if (!activeTabId) return false; // tab-scoped hidden on intro / no active tab
    return img.tabId === activeTabId;
  });

  useEffect(() => {
    latestImages.current = images;
    latestOnChange.current = onChange;
    latestHover.current = onDragOverTab;
  }, [images, onChange, onDragOverTab]);

  // Clear selection when slide images change / tab changes
  useEffect(() => {
    setSelectedId(null);
  }, [visibleImages.map(i => i.id).join('|'), activeTabId]);

  // Click outside → deselect (hide border / handles)
  useEffect(() => {
    if (!isAuthoring || !selectedId) return;
    const onDocPointer = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest?.('.floating-image') || t.closest?.('[data-floating-crop-modal]')) return;
      setSelectedId(null);
    };
    document.addEventListener('mousedown', onDocPointer, true);
    return () => document.removeEventListener('mousedown', onDocPointer, true);
  }, [isAuthoring, selectedId]);

  useEffect(() => {
    if (!isAuthoring) return;

    const interactable = interact('.floating-image').draggable({
      inertia: false,
      autoScroll: false,
      ignoreFrom: 'button, .float-handle',
      listeners: {
        start(event) {
          const id = (event.target as HTMLElement).getAttribute('data-id');
          if (id) setSelectedId(id);
        },
        move(event) {
          const target = event.target as HTMLElement;
          const scale = layoutScale(containerRef.current);
          const x = (parseFloat(target.getAttribute('data-x') || '0') || 0) + event.dx / scale;
          const y = (parseFloat(target.getAttribute('data-y') || '0') || 0) + event.dy / scale;
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', String(x));
          target.setAttribute('data-y', String(y));
          const tab = tabIdFromPoint(event.clientX, event.clientY);
          latestHover.current?.(tab);
          if (tab) target.setAttribute('data-over-tab', tab);
          else target.removeAttribute('data-over-tab');
        },
        end(event) {
          const target = event.target as HTMLElement;
          const id = target.getAttribute('data-id');
          const { sw, sh } = stageLimits(containerRef.current);
          const w = parseFloat(target.style.width) || 240;
          const h = parseFloat(target.style.height) || 180;
          const pos = clampPos(
            parseFloat(target.getAttribute('data-x') || '0') || 0,
            parseFloat(target.getAttribute('data-y') || '0') || 0,
            w,
            h,
            sw,
            sh
          );
          target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          target.setAttribute('data-x', String(pos.x));
          target.setAttribute('data-y', String(pos.y));
          latestHover.current?.(null);
          target.removeAttribute('data-over-tab');
          const tab = tabIdFromPoint(event.clientX, event.clientY);
          const updatedImages = latestImages.current.map(img =>
            img.id === id ? { ...img, x: pos.x, y: pos.y, tabId: tab || img.tabId || null } : img
          );
          latestOnChange.current(updatedImages);
        }
      }
    }).resizable({
      // Corner handles only — default 50px edge margin made the whole tall column a resize target.
      edges: {
        left: '.float-handle-w',
        right: '.float-handle-e',
        top: '.float-handle-n',
        bottom: '.float-handle-s',
      },
      margin: 6,
      listeners: {
        start(event) {
          const target = event.target as HTMLElement;
          const id = target.getAttribute('data-id');
          if (id) setSelectedId(id);
          const w = Math.max(1, target.offsetWidth);
          const h = Math.max(1, target.offsetHeight);
          target.setAttribute('data-aspect', String(w / h));
        },
        move(event) {
          const target = event.target as HTMLElement;
          const scale = layoutScale(containerRef.current);
          const { maxW, maxH } = stageLimits(containerRef.current);
          let x = parseFloat(target.getAttribute('data-x') || '0') || 0;
          let y = parseFloat(target.getAttribute('data-y') || '0') || 0;
          x += event.deltaRect.left / scale;
          y += event.deltaRect.top / scale;
          const aspect = parseFloat(target.getAttribute('data-aspect') || '0') || (target.offsetWidth / Math.max(1, target.offsetHeight));
          let width = event.rect.width / scale;
          let height = event.rect.height / scale;
          if (Math.abs(event.deltaRect.width) >= Math.abs(event.deltaRect.height)) {
            height = width / Math.max(0.2, aspect);
          } else {
            width = height * Math.max(0.2, aspect);
          }
          const clamped = clampSize(width, height, maxW, maxH, 64);
          width = clamped.width;
          height = clamped.height;
          if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width < 32 ||
            height < 32
          ) {
            return;
          }
          Object.assign(target.style, {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${x}px, ${y}px)`,
          });
          target.setAttribute('data-x', String(x));
          target.setAttribute('data-y', String(y));
        },
        end(event) {
          const target = event.target as HTMLElement;
          const id = target.getAttribute('data-id');
          const { sw, sh, maxW, maxH } = stageLimits(containerRef.current);
          const { width, height } = clampSize(
            parseFloat(target.style.width) || 240,
            parseFloat(target.style.height) || 180,
            maxW,
            maxH,
            64
          );
          const pos = clampPos(
            parseFloat(target.getAttribute('data-x') || '0') || 0,
            parseFloat(target.getAttribute('data-y') || '0') || 0,
            width,
            height,
            sw,
            sh
          );
          target.style.width = `${width}px`;
          target.style.height = `${height}px`;
          target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          target.setAttribute('data-x', String(pos.x));
          target.setAttribute('data-y', String(pos.y));
          if (!id) return;
          const updatedImages = latestImages.current.map(img =>
            img.id === id ? { ...img, x: pos.x, y: pos.y, width, height } : img
          );
          latestOnChange.current(updatedImages);
        }
      }
    });

    return () => interactable.unset();
  }, [isAuthoring, visibleImages.map(i => i.id).join('|')]);

  return (
    <>
      <div className="absolute inset-0 z-20 pointer-events-none" ref={containerRef} data-float-stage>
        {visibleImages.map(img => {
          const isSelected = isAuthoring && selectedId === img.id;
          return (
            <div
              key={img.id}
              data-id={img.id}
              data-x={img.x}
              data-y={img.y}
              onMouseDown={() => {
                if (isAuthoring) setSelectedId(img.id);
              }}
              className={`floating-image absolute overflow-visible rounded-lg ${
                isAuthoring ? 'pointer-events-auto cursor-move' : 'pointer-events-auto'
              } ${isSelected ? 'ring-2 ring-indigo-500 z-30' : ''}`}
              style={{
                width: `${Math.max(64, img.width || 320)}px`,
                height: `${Math.max(64, img.height || 240)}px`,
                transform: `translate(${Number.isFinite(img.x) ? img.x : 40}px, ${Number.isFinite(img.y) ? img.y : 40}px)`,
                touchAction: 'none',
                background: 'transparent',
              }}
              title={
                img.tabId
                  ? `Tab image — drag to move, corners to resize`
                  : 'Click to select · Drag to move · Crop / delete when selected'
              }
            >
              <img
                src={img.url}
                alt="Floating layout"
                className={`w-full h-full object-contain select-none ${
                  isSelected ? 'shadow-lg' : 'shadow-sm'
                }`}
                style={{ background: 'transparent' }}
                draggable={false}
                onDragStart={e => e.preventDefault()}
              />

              {isSelected && img.tabId && (
                <span className="absolute -top-2 left-2 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold shadow">
                  Tab
                </span>
              )}

              {isSelected && (
                <div className="absolute top-1 right-1 flex gap-1 z-50">
                  {onPinBack && (
                    <button
                      onClick={e => { e.stopPropagation(); onPinBack(img); setSelectedId(null); }}
                      className="bg-sky-600 hover:bg-sky-500 text-white rounded-full p-1.5 shadow cursor-pointer"
                      title="Return to the tab column"
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setCropTarget(img); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-1.5 shadow cursor-pointer"
                    title="Crop image"
                  >
                    <Crop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(img.id); setSelectedId(null); }}
                    className="bg-red-500 hover:bg-red-400 text-white rounded-full p-1.5 shadow cursor-pointer"
                    title="Remove image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isSelected && (
                <>
                  <div className="float-handle float-handle-n float-handle-w absolute -top-1 -left-1 z-40 w-3 h-3 bg-indigo-500 border-2 border-white rounded-sm cursor-nwse-resize" />
                  <div className="float-handle float-handle-n float-handle-e absolute -top-1 -right-1 z-40 w-3 h-3 bg-indigo-500 border-2 border-white rounded-sm cursor-nesw-resize" />
                  <div className="float-handle float-handle-s float-handle-w absolute -bottom-1 -left-1 z-40 w-3 h-3 bg-indigo-500 border-2 border-white rounded-sm cursor-nesw-resize" />
                  <div className="float-handle float-handle-s float-handle-e absolute -bottom-1 -right-1 z-40 w-3 h-3 bg-indigo-500 border-2 border-white rounded-sm cursor-nwse-resize" />
                </>
              )}
            </div>
          );
        })}
      </div>

      {cropTarget && (
        <div data-floating-crop-modal>
          <ImageCropModal
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
        </div>
      )}
    </>
  );
}
