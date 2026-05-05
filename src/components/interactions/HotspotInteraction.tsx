import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Upload, Move } from 'lucide-react';

interface HotspotPoint {
  id: string;
  x: number;    // percentage 0-100
  y: number;    // percentage 0-100
  label: string;
  content: string;
}

interface HotspotInteractionProps {
  imageUrl?: string;
  points?: HotspotPoint[];
  theme?: string;
  /** Enables image upload + draggable pin repositioning (authoring mode) */
  editable?: boolean;
}

const PIN_COLORS = [
  '#4f46e5', '#d9582a', '#2d8b4e', '#f0a500',
  '#00a8a8', '#c94a1c', '#7a3a9e',
];

export const HotspotInteraction: React.FC<HotspotInteractionProps> = ({
  imageUrl,
  points = [],
  theme = 'dark',
  editable = true,
}) => {
  const [active, setActive]               = useState<string | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | undefined>(imageUrl);
  const [localPoints, setLocalPoints]     = useState<HotspotPoint[]>([...points]);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [imgOffset, setImgOffset]         = useState({ x: 50, y: 50 }); // object-position %
  const [isPanningImg, setIsPanningImg]   = useState(false);
  const panStart   = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  const activePoint = localPoints.find(p => p.id === active);
  const panelBg     = theme === 'light' ? '#f8fafc' : '#1e293b';
  const panelText   = theme === 'light' ? '#1e293b' : '#e2e8f0';
  const borderClr   = theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.1)';

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleUploadClick = () => { if (editable) fileInputRef.current?.click(); };
  const handleFileChange  = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLocalImageUrl(URL.createObjectURL(file));
  };

  // ── Pin drag ──────────────────────────────────────────────────────────────
  const handlePinMouseDown = (pinId: string, e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation(); e.preventDefault();
    setDraggingPinId(pinId);
    setActive(null);
  };

  // ── Image pan ─────────────────────────────────────────────────────────────
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!editable || draggingPinId || !localImageUrl) return;
    setIsPanningImg(true);
    panStart.current = { mx: e.clientX, my: e.clientY, ox: imgOffset.x, oy: imgOffset.y };
  };

  // ── Shared mousemove on the container ─────────────────────────────────────
  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x    = Math.max(0, Math.min(100, ((e.clientX - rect.left)  / rect.width)  * 100));
    const y    = Math.max(0, Math.min(100, ((e.clientY - rect.top)   / rect.height) * 100));

    if (draggingPinId) {
      setLocalPoints(pts => pts.map(p => p.id === draggingPinId ? { ...p, x, y } : p));
    } else if (isPanningImg && panStart.current) {
      const dx = ((e.clientX - panStart.current.mx) / rect.width)  * 100;
      const dy = ((e.clientY - panStart.current.my) / rect.height) * 100;
      setImgOffset({
        x: Math.max(0, Math.min(100, panStart.current.ox - dx)),
        y: Math.max(0, Math.min(100, panStart.current.oy - dy)),
      });
    }
  }, [draggingPinId, isPanningImg]);

  const handleContainerMouseUp = useCallback(() => {
    setDraggingPinId(null);
    setIsPanningImg(false);
    panStart.current = null;
  }, []);

  return (
    <div className="w-full flex gap-4" style={{ height: '100%', minHeight: 0 }}>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* ── Left: image canvas + pins ──────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border shrink-0 select-none"
        style={{
          width: '58%',
          minHeight: '260px',
          backgroundColor: '#0f172a',
          borderColor: borderClr,
          cursor: draggingPinId ? 'grabbing' : isPanningImg ? 'grabbing' : 'default',
        }}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
      >
        {/* Background image or upload placeholder */}
        {localImageUrl ? (
          <img
            src={localImageUrl}
            alt="Hotspot background"
            draggable={false}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${imgOffset.x}% ${imgOffset.y}%`,
              userSelect: 'none',
              cursor: editable ? 'grab' : 'default',
            }}
            onMouseDown={handleImageMouseDown}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={handleUploadClick}
          >
            <Upload className="w-10 h-10 text-indigo-400 opacity-70" />
            <div className="text-center px-6">
              <p className="text-slate-300 text-sm font-semibold">Click to upload a background image</p>
              <p className="text-slate-500 text-xs mt-1">Pins remain interactive without an image</p>
            </div>
          </div>
        )}

        {/* Change image button (shown when image is already set) */}
        {localImageUrl && editable && (
          <button
            onClick={handleUploadClick}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1 z-30 transition-colors"
            title="Replace background image"
          >
            <Upload className="w-3 h-3" /> Change Image
          </button>
        )}

        {/* Pan + drag hint bar */}
        {editable && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none">
            <span className="bg-black/50 text-white/60 rounded-full px-3 py-0.5 text-[10px] flex items-center gap-1.5">
              <Move className="w-3 h-3" />
              {localImageUrl ? 'Drag image to pan · Drag numbered pins to reposition' : 'Drag numbered pins to reposition'}
            </span>
          </div>
        )}

        {/* Pins — draggable when editable */}
        {localPoints.map((pt, i) => {
          const color        = PIN_COLORS[i % PIN_COLORS.length];
          const isActive     = active === pt.id;
          const isDraggingThis = draggingPinId === pt.id;
          return (
            <motion.div
              key={pt.id}
              className="absolute flex items-center justify-center rounded-full text-white font-bold text-sm shadow-xl"
              style={{
                left: `${pt.x}%`,
                top:  `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                backgroundColor: color,
                border: isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.7)',
                zIndex: isDraggingThis ? 30 : isActive ? 20 : 10,
                cursor: editable ? (isDraggingThis ? 'grabbing' : 'grab') : 'pointer',
                boxShadow: isDraggingThis
                  ? `0 0 0 6px ${color}44, 0 4px 20px rgba(0,0,0,0.5)`
                  : isActive
                  ? `0 0 0 3px ${color}66, 0 2px 12px rgba(0,0,0,0.4)`
                  : `0 2px 8px rgba(0,0,0,0.4)`,
                pointerEvents: 'auto',
              }}
              animate={{ scale: isDraggingThis ? 1.35 : isActive ? 1.2 : 1 }}
              transition={{ duration: 0.12 }}
              onMouseDown={(e) => editable && handlePinMouseDown(pt.id, e)}
              onClick={(e) => {
                if (!draggingPinId) { e.stopPropagation(); setActive(isActive ? null : pt.id); }
              }}
              title={editable ? `${pt.label} — drag to reposition` : pt.label}
            >
              {i + 1}
            </motion.div>
          );
        })}
      </div>

      {/* ── Right: legend + content reveal ────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-y-auto">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Click a pin</p>
          {localPoints.map((pt, i) => {
            const color    = PIN_COLORS[i % PIN_COLORS.length];
            const isActive = active === pt.id;
            return (
              <button
                key={pt.id}
                onClick={() => setActive(isActive ? null : pt.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all text-sm"
                style={{
                  backgroundColor: isActive ? `${color}22` : 'transparent',
                  borderColor:     isActive ? color : borderClr,
                  color: isActive
                    ? (theme === 'light' ? '#1e293b' : 'white')
                    : (theme === 'light' ? '#374151' : '#94a3b8'),
                }}
              >
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <span className="font-semibold truncate">{pt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content reveal */}
        <AnimatePresence>
          {activePoint && (
            <motion.div
              key={activePoint.id}
              className="rounded-xl overflow-hidden border"
              style={{
                backgroundColor: panelBg,
                borderColor: PIN_COLORS[localPoints.indexOf(activePoint) % PIN_COLORS.length] + '55',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ backgroundColor: PIN_COLORS[localPoints.indexOf(activePoint) % PIN_COLORS.length] }}
              >
                <h3 className="text-white font-bold text-sm">{activePoint.label}</h3>
                <button onClick={() => setActive(null)} className="text-white/80 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed" style={{ color: panelText }}>
                  {activePoint.content}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HotspotInteraction;
