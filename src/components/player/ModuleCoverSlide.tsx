import React from 'react';
import { motion } from 'framer-motion';
import { MODULE_COLORS } from './ModuleOverviewSlide';

type Theme = 'light' | 'dark' | 'unified';

interface ModuleCoverSlideProps {
  moduleNumber: number;
  moduleTitle: string;
  description?: string;
  theme: Theme;
}


function getModuleColor(n: number): string {
  return MODULE_COLORS[(n - 1) % MODULE_COLORS.length];
}

/**
 * Prevent one-word-hanging: if the title has more than 2 words and wrapping
 * would leave a single word on the last line, we return the full title as-is
 * and let the container wrap it naturally with enough width.
 * The "Module N" label is on its own row, so the title gets a full row.
 */
function getTitleLines(title: string): string {
  // Remove any leading "Module N — " prefix if present (it's shown separately)
  return title.replace(/^Module\s+\d+\s*[—\-]\s*/i, '').trim() || title;
}

export const ModuleCoverSlide: React.FC<ModuleCoverSlideProps> = ({
  moduleNumber,
  moduleTitle,
  description,
  theme,
}) => {
  const accent    = getModuleColor(moduleNumber);
  const darkPanel = theme === 'dark' ? '#0a0f1e' : '#1a1a2e';
  const cleanTitle = getTitleLines(moduleTitle);

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      {/* ── Left dark panel ───────────────────────────────────── */}
      <motion.div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ width: '40%', flexShrink: 0, backgroundColor: darkPanel }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Giant module number — FILLED with accent color */}
        <motion.div
          className="select-none pointer-events-none font-black text-center"
          style={{
            fontSize: 'clamp(8rem, 22vw, 16rem)',
            lineHeight: 1,
            color: accent,           // ← solid fill, not just stroke
            opacity: 0.85,           // slight transparency so it feels embedded
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.85, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {moduleNumber}
        </motion.div>
      </motion.div>

      {/* ── Right accent panel ────────────────────────────────── */}
      <motion.div
        className="flex-1 flex flex-col"
        style={{ backgroundColor: accent }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.35 }}
      >
        {/* Centered content block */}
        <div className="flex-1 flex flex-col justify-center px-10 py-8">
          {/* "Module N" label — always its own line */}
          <motion.div
            className="text-white/70 font-bold uppercase tracking-widest text-sm mb-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45 }}
          >
            Module {moduleNumber}
          </motion.div>

          {/* Module title — on its own full-width row, no hanging risk */}
          <motion.h2
            className="font-extrabold text-white leading-tight"
            style={{
              fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',
              wordBreak: 'break-word',
              hyphens: 'auto',
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            {cleanTitle}
          </motion.h2>

          {description && (
            <motion.p
              className="mt-4 text-white/70 text-sm leading-relaxed max-w-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.65 }}
            >
              {description}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ModuleCoverSlide;
