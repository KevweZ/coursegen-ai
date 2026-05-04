import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';

interface HotspotPoint {
  id: string;
  x: number;          // percentage 0-100
  y: number;          // percentage 0-100
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

  const panelBg   = theme === 'light' ? '#ffffff' : '#1e293b';
  const panelText = theme === 'light' ? '#1e293b' : '#e2e8f0';

  return (
    <div className="w-full space-y-3">
      {/* Image + hotspot pins */}
      <div className="relative w-full rounded-xl overflow-hidden border border-white/10"
        style={{ aspectRatio: '16/9', minHeight: '200px', backgroundColor: '#0f172a' }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Hotspot" className="w-full h-full object-cover" />
        ) : (
          /* Placeholder if no image */
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-40">
            <MapPin className="w-10 h-10 text-slate-400" />
            <p className="text-slate-400 text-sm">No image provided — hotspot pins are still interactive below</p>
          </div>
        )}

        {/* Hotspot pins */}
        {points.map((pt, i) => {
          const color = PIN_COLORS[i % PIN_COLORS.length];
          const isActive = active === pt.id;
          return (
            <motion.button
              key={pt.id}
              onClick={() => setActive(isActive ? null : pt.id)}
              className="absolute flex items-center justify-center rounded-full text-white font-bold text-xs shadow-lg"
              style={{
                left: `${pt.x}%`,
                top:  `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '36px',
                height: '36px',
                backgroundColor: color,
                border: isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.6)',
                zIndex: isActive ? 20 : 10,
              }}
              animate={{ scale: isActive ? 1.2 : 1 }}
              whileHover={{ scale: 1.15 }}
              transition={{ duration: 0.15 }}
              title={pt.label}
            >
              {i + 1}
            </motion.button>
          );
        })}
      </div>

      {/* Numbered legend */}
      <div className="flex flex-wrap gap-2">
        {points.map((pt, i) => {
          const color = PIN_COLORS[i % PIN_COLORS.length];
          const isActive = active === pt.id;
          return (
            <button
              key={pt.id}
              onClick={() => setActive(isActive ? null : pt.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
              style={{
                backgroundColor: isActive ? color : 'transparent',
                borderColor: color,
                color: isActive ? 'white' : color,
              }}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              {pt.label}
            </button>
          );
        })}
      </div>

      {/* Content reveal panel */}
      <AnimatePresence>
        {activePoint && (
          <motion.div
            key={activePoint.id}
            className="rounded-xl overflow-hidden border"
            style={{
              backgroundColor: panelBg,
              borderColor: PIN_COLORS[points.indexOf(activePoint) % PIN_COLORS.length] + '55',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="flex items-center justify-between px-4 py-2"
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
  );
};

export default HotspotInteraction;
