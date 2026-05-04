import React from 'react';
import { motion } from 'framer-motion';

type Theme = 'light' | 'dark' | 'unified';

interface ModuleCoverSlideProps {
  moduleNumber: number;
  moduleTitle: string;
  description?: string;
  theme: Theme;
}

// Per-module accent color palette (cycles for >10 modules)
const MODULE_COLORS = [
  '#3b7dd8', // 1 — Royal Blue
  '#d9582a', // 2 — Terracotta
  '#2d8b4e', // 3 — Forest Green
  '#f0a500', // 4 — Amber/Gold
  '#00a8a8', // 5 — Teal/Cyan
  '#c94a1c', // 6 — Deep Orange
  '#1e6e78', // 7 — Dark Teal
  '#7a3a9e', // 8 — Purple
  '#e5a000', // 9 — Golden Yellow
  '#00808a', // 10 — Dark Teal
];

function getModuleColor(n: number): string {
  return MODULE_COLORS[(n - 1) % MODULE_COLORS.length];
}

function zeroPad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export const ModuleCoverSlide: React.FC<ModuleCoverSlideProps> = ({
  moduleNumber,
  moduleTitle,
  description,
  theme,
}) => {
  const accent   = getModuleColor(moduleNumber);
  const darkPanel = theme === 'dark' ? '#0f172a' : '#1a1a2e';

  return (
    <div className="w-full h-full flex flex-row overflow-hidden relative">
      {/* ── Left dark panel ───────────────────────────────────── */}
      <motion.div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ width: '38%', flexShrink: 0, backgroundColor: darkPanel }}
        initial={{ scaleY: 0, originY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Badge */}
        <div
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded text-white text-xs font-bold"
          style={{ backgroundColor: accent }}
        >
          {zeroPad(moduleNumber)}
        </div>
      </motion.div>

      {/* ── Right accent panel ────────────────────────────────── */}
      <motion.div
        className="flex-1 flex flex-col justify-between px-10 py-8"
        style={{ backgroundColor: accent }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        {/* Top spacer */}
        <div />

        {/* Module name */}
        <motion.div
          className="text-right"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <h2
            className="font-extrabold text-white uppercase tracking-tight leading-tight"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
          >
            {moduleTitle}
          </h2>
          {description && (
            <p className="text-white/75 mt-3 text-sm leading-relaxed max-w-xs ml-auto">
              {description}
            </p>
          )}
        </motion.div>

        <div />
      </motion.div>

      {/* ── Giant module number (overlays both panels) ────────── */}
      <motion.div
        className="absolute pointer-events-none select-none"
        style={{
          left: '8%',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 'clamp(10rem, 25vw, 18rem)',
          fontWeight: 900,
          lineHeight: 1,
          color: darkPanel,
          // Outline effect so it's visible on the right accent panel too
          WebkitTextStroke: `2px ${accent}33`,
          zIndex: 10,
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {moduleNumber}
      </motion.div>
    </div>
  );
};

export default ModuleCoverSlide;
