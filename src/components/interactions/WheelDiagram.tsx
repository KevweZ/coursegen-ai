import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type Theme = 'light' | 'dark' | 'unified';

interface WheelSegment {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  content: string;
}

interface WheelDiagramProps {
  centerLabel: string;
  centerImage?: string;
  segments: WheelSegment[];
  theme: Theme;
}

// Default color sequence (matches spec)
const DEFAULT_COLORS = [
  '#3b7dd8', '#d9582a', '#2d8b4e', '#f0a500',
  '#00a8a8', '#c94a1c', '#1e6e78', '#7a3a9e', '#e5a000',
];

function getColor(seg: WheelSegment, index: number): string {
  return seg.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

// Determine grid positions for n segments around a center
// Returns array of { row, col } for a 3x3 grid (max 8 outer cells)
// For segments > 4, use a radial absolute layout instead
function getGridLayout(n: number): { row: number; col: number }[] {
  // For 3–8 segments, distribute around center in a logical ring
  const positions: { row: number; col: number }[] = [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, // top row
    { row: 1, col: 2 },                                           // right mid
    { row: 2, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 0 }, // bottom row
    { row: 1, col: 0 },                                           // left mid
  ];
  return positions.slice(0, Math.min(n, 8));
}

export const WheelDiagram: React.FC<WheelDiagramProps> = ({
  centerLabel,
  centerImage,
  segments,
  theme,
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedSeg = segments.find(s => s.id === selected);

  const panelBg   = theme === 'light' ? '#ffffff' : theme === 'dark' ? '#1e293b' : '#1e1b4b';
  const panelText = theme === 'light' ? '#1e293b' : '#e2e8f0';
  const centerBg  = theme === 'light' ? '#ffffff' : '#1e293b';
  const centerText = theme === 'light' ? '#1e293b' : '#e2e8f0';

  const gridPositions = getGridLayout(segments.length);

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* ── 3×3 Grid layout ───────────────────────────────────── */}
      <div
        className="relative"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '8px',
          width: 'min(100%, 520px)',
          height: 'min(100%, 420px)',
        }}
      >
        {/* Outer segment cards */}
        {segments.map((seg, i) => {
          const pos   = gridPositions[i];
          if (!pos) return null;
          const color  = getColor(seg, i);
          const isActive = selected === seg.id;

          return (
            <motion.button
              key={seg.id}
              onClick={() => setSelected(isActive ? null : seg.id)}
              className="rounded-xl flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all"
              style={{
                gridRow:  pos.row + 1,
                gridColumn: pos.col + 1,
                backgroundColor: isActive ? color : `${color}cc`,
                opacity: selected && !isActive ? 0.45 : 1,
                boxShadow: isActive ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none',
              }}
              whileHover={{ scale: 1.04, opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              {seg.icon && (
                <span className="text-xl mb-1">{seg.icon}</span>
              )}
              <span className="text-white font-bold text-xs leading-tight">{seg.label}</span>
            </motion.button>
          );
        })}

        {/* Center hub */}
        <div
          className="rounded-full flex flex-col items-center justify-center text-center p-2 shadow-lg z-10"
          style={{
            gridRow: 2,
            gridColumn: 2,
            backgroundColor: centerBg,
            border: `3px solid ${DEFAULT_COLORS[0]}55`,
          }}
        >
          {centerImage ? (
            <img src={centerImage} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span
              className="font-extrabold text-xs leading-tight text-center"
              style={{ color: centerText }}
            >
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Content reveal panel ──────────────────────────────── */}
      <AnimatePresence>
        {selectedSeg && (
          <motion.div
            key={selectedSeg.id}
            className="absolute right-0 top-0 bottom-0 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              width: '38%',
              backgroundColor: panelBg,
              borderLeft: `4px solid ${getColor(selectedSeg, segments.indexOf(selectedSeg))}`,
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: getColor(selectedSeg, segments.indexOf(selectedSeg)) }}
            >
              <h3 className="text-white font-bold text-sm">{selectedSeg.label}</h3>
              <button onClick={() => setSelected(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <p className="text-sm leading-relaxed" style={{ color: panelText }}>
                {selectedSeg.content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WheelDiagram;
