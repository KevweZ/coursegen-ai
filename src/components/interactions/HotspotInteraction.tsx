import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';

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
}

const PIN_COLORS = [
  '#4f46e5', '#d9582a', '#2d8b4e', '#f0a500',
  '#00a8a8', '#c94a1c', '#7a3a9e',
];

export const HotspotInteraction: React.FC<HotspotInteractionProps> = ({
  imageUrl,
  points = [],
  theme = 'dark',
}) => {
  const [active, setActive] = useState<string | null>(null);
  const activePoint = points.find(p => p.id === active);

  const panelBg   = theme === 'light' ? '#f8fafc' : '#1e293b';
  const panelText = theme === 'light' ? '#1e293b' : '#e2e8f0';
  const borderClr = theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.1)';

  return (
    /* Side-by-side layout — image fills left, legend+reveal fills right */
    <div className="w-full flex gap-4" style={{ height: '100%', minHeight: 0 }}>

      {/* ── Left: image + pins ─────────────────────────────────────────── */}
      <div
        className="relative rounded-xl overflow-hidden border shrink-0"
        style={{
          width: '58%',
          minHeight: '220px',
          backgroundColor: '#0f172a',
          borderColor: borderClr,
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Hotspot" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-40">
            <MapPin className="w-8 h-8 text-slate-400" />
            <p className="text-slate-400 text-xs text-center px-4">
              No image — pins are still interactive
            </p>
          </div>
        )}

        {/* Pins */}
        {points.map((pt, i) => {
          const color = PIN_COLORS[i % PIN_COLORS.length];
          const isActive = active === pt.id;
          return (
            <motion.button
              key={pt.id}
              onClick={() => setActive(isActive ? null : pt.id)}
              className="absolute flex items-center justify-center rounded-full text-white font-bold text-xs shadow-lg focus:outline-none"
              style={{
                left: `${pt.x}%`,
                top:  `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '34px',
                height: '34px',
                backgroundColor: color,
                border: isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.6)',
                zIndex: isActive ? 20 : 10,
              }}
              animate={{ scale: isActive ? 1.22 : 1 }}
              whileHover={{ scale: 1.15 }}
              transition={{ duration: 0.14 }}
              title={pt.label}
            >
              {i + 1}
            </motion.button>
          );
        })}
      </div>

      {/* ── Right: legend + content reveal ────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-y-auto">

        {/* Legend */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Click a pin</p>
          {points.map((pt, i) => {
            const color = PIN_COLORS[i % PIN_COLORS.length];
            const isActive = active === pt.id;
            return (
              <button
                key={pt.id}
                onClick={() => setActive(isActive ? null : pt.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 text-left transition-all text-sm"
                style={{
                  backgroundColor: isActive ? `${color}22` : 'transparent',
                  borderColor: isActive ? color : borderClr,
                  color: isActive ? (theme === 'light' ? '#1e293b' : 'white') : (theme === 'light' ? '#374151' : '#94a3b8'),
                }}
              >
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
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
              className="rounded-xl overflow-hidden border flex-1"
              style={{
                backgroundColor: panelBg,
                borderColor: PIN_COLORS[points.indexOf(activePoint) % PIN_COLORS.length] + '55',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ backgroundColor: PIN_COLORS[points.indexOf(activePoint) % PIN_COLORS.length] }}
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
