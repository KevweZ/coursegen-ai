import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Move, ChevronDown } from 'lucide-react';
import { markdownToHtml } from '../../lib/markdownInline';

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
  editable?: boolean;
  onPinOpen?: (pinId: string) => void;
}

const PIN_COLORS = [
  '#4f46e5', '#d9582a', '#2d8b4e', '#f0a500',
  '#00a8a8', '#c94a1c', '#7a3a9e', '#e5a000', '#1e6e78', '#8b3a3a',
];

function cn(...c: (string | false | undefined | null)[]) { return c.filter(Boolean).join(' '); }

/** Ensure every pin has a stable unique id — missing/duplicate ids open all panels at once. */
function normalizePoints(points: HotspotPoint[]): HotspotPoint[] {
  const seen = new Set<string>();
  return (points || []).map((pt, i) => {
    let id = (pt?.id != null && String(pt.id).trim()) ? String(pt.id) : `hs-${i}`;
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return {
      id,
      x: typeof pt.x === 'number' ? pt.x : 20 + (i % 4) * 20,
      y: typeof pt.y === 'number' ? pt.y : 25 + Math.floor(i / 4) * 25,
      label: pt.label || `Point ${i + 1}`,
      content: pt.content || '',
    };
  });
}

export const HotspotInteraction: React.FC<HotspotInteractionProps> = ({
  imageUrl,
  points = [],
  theme = 'light',
  editable = true,
  onPinOpen,
}) => {
  const normalized = useMemo(() => normalizePoints(points), [points]);
  const [active, setActive]               = useState<string | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | undefined>(imageUrl);
  const [localPoints, setLocalPoints]     = useState<HotspotPoint[]>(normalized);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [imgOffset, setImgOffset]         = useState({ x: 50, y: 50 });
  const [isPanningImg, setIsPanningImg]   = useState(false);
  const panStart     = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalPoints(normalizePoints(points));
  }, [points]);

  const panelBg    = theme === 'light' ? '#f8fafc' : '#1e293b';
  const panelText  = theme === 'light' ? '#1e293b' : '#e2e8f0';
  const borderClr  = theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.12)';
  const canvasBg   = theme === 'light' ? '#f1f5f9' : '#0f172a';
  const uploadIconClr  = theme === 'light' ? '#4f46e5' : '#818cf8';
  const uploadTextClr  = theme === 'light' ? '#334155' : '#cbd5e1';
  const uploadSubClr   = theme === 'light' ? '#64748b' : '#64748b';
  const uploadHoverClr = theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';

  const handleUploadClick = () => { if (editable) fileInputRef.current?.click(); };
  const handleFileChange  = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLocalImageUrl(URL.createObjectURL(file));
  };

  const handlePinMouseDown = (pinId: string, e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation(); e.preventDefault();
    setDraggingPinId(pinId);
    setActive(null);
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!editable || draggingPinId || !localImageUrl) return;
    setIsPanningImg(true);
    panStart.current = { mx: e.clientX, my: e.clientY, ox: imgOffset.x, oy: imgOffset.y };
  };

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left)  / rect.width)  * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top)   / rect.height) * 100));

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
    <div className="w-full h-full flex gap-5 items-stretch">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border shrink-0 select-none"
        style={{
          width: 'clamp(280px, 60%, 600px)',
          minHeight: '420px',
          height: '100%',
          backgroundColor: canvasBg,
          borderColor: borderClr,
          cursor: draggingPinId ? 'grabbing' : isPanningImg ? 'grabbing' : 'default',
        }}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
      >
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
            className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = uploadHoverClr; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            onClick={handleUploadClick}
          >
            <Upload className="w-10 h-10 opacity-70" style={{ color: uploadIconClr }} />
            <div className="text-center px-6">
              <p className="text-sm font-semibold" style={{ color: uploadTextClr }}>Click to upload a background image</p>
              <p className="text-xs mt-1" style={{ color: uploadSubClr }}>Pins remain interactive without an image</p>
            </div>
          </div>
        )}

        {localImageUrl && editable && (
          <button
            onClick={handleUploadClick}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1 z-30 transition-colors"
            title="Replace background image"
          >
            <Upload className="w-3 h-3" /> Change Image
          </button>
        )}

        {editable && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none">
            <span className="bg-black/50 text-white/60 rounded-full px-3 py-0.5 text-[10px] flex items-center gap-1.5">
              <Move className="w-3 h-3" />
              {localImageUrl ? 'Drag image to pan · Drag pins to reposition' : 'Drag pins to reposition'}
            </span>
          </div>
        )}

        {localPoints.map((pt, i) => {
          const color          = PIN_COLORS[i % PIN_COLORS.length];
          const isActive       = active === pt.id;
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
                if (!draggingPinId) {
                  e.stopPropagation();
                  const next = isActive ? null : pt.id;
                  setActive(next);
                  if (next) onPinOpen?.(next);
                }
              }}
              title={editable ? `${pt.label} — drag to reposition` : pt.label}
            >
              {i + 1}
            </motion.div>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col min-w-0 gap-2">
        <p className="text-xs font-bold uppercase tracking-widest opacity-50 shrink-0">Click a pin</p>

        <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '65vh' }}>
          {localPoints.map((pt, i) => {
            const color    = PIN_COLORS[i % PIN_COLORS.length];
            const isActive = active === pt.id;
            return (
              <div key={pt.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    const next = isActive ? null : pt.id;
                    setActive(next);
                    if (next) onPinOpen?.(next);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 border-2 text-left transition-all text-sm"
                  style={{
                    backgroundColor: isActive ? `${color}22` : 'transparent',
                    borderColor:     isActive ? color : borderClr,
                    borderRadius:    isActive ? '8px 8px 0 0' : '8px',
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
                  <span className="font-semibold flex-1 truncate" dangerouslySetInnerHTML={{ __html: markdownToHtml(pt.label) }} />
                  <motion.span
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      key={`panel-${pt.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 py-3 text-sm leading-relaxed border-x-2 border-b-2 hotspot-panel-content"
                        style={{
                          borderColor:     color,
                          backgroundColor: panelBg,
                          color:           panelText,
                          borderRadius:    '0 0 8px 8px',
                        }}
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(pt.content) }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HotspotInteraction;
