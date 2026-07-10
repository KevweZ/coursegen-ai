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

/** Remove leading "Module N — " prefix if present; it's shown separately. */
function cleanModuleTitle(title: string): string {
  return title.replace(/^Module\s+\d+\s*[—\-–]\s*/i, '').trim() || title;
}

/** Prevent a single orphan word on the last line. */
function preventWidow(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return text;
  return words.slice(0, -1).join(' ') + '\u00A0' + words[words.length - 1];
}

export const ModuleCoverSlide: React.FC<ModuleCoverSlideProps> = ({
  moduleNumber,
  moduleTitle,
  description,
  theme,
}) => {
  const accent   = getModuleColor(moduleNumber);
  const isDark   = theme !== 'light';
  const cleanTitle = preventWidow(cleanModuleTitle(moduleTitle));

  // Background: dark navy (dark mode) or very dark indigo (light mode)
  const bg = isDark ? '#0a0f1e' : '#1e1b4b';

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {/* ── Subtle accent gradient bar at the top ──────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: '4px', background: accent }}
      />

      {/* ── Faint large number watermark (very subtle, bottom-right) ───── */}
      <div
        className="absolute select-none pointer-events-none font-black"
        style={{
          fontSize: 'clamp(10rem, 28vw, 22rem)',
          lineHeight: 1,
          color: accent,
          opacity: 0.06,
          bottom: '-2rem',
          right: '-1rem',
        }}
      >
        {moduleNumber}
      </div>

      {/* ── Centered content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-3xl">

        {/* "MODULE 2" pill label */}
        <motion.div
          className="flex items-center gap-2 mb-6"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Circled number */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
            style={{ backgroundColor: accent }}
          >
            {moduleNumber}
          </div>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: accent }}
          >
            Module {moduleNumber}
          </span>
        </motion.div>

        {/* Module title — full width, horizontal, centered */}
        <motion.h1
          className="font-extrabold text-white text-center leading-tight"
          style={{
            fontSize: 'clamp(1.8rem, 4.5vw, 3.4rem)',
            letterSpacing: '-0.01em',
            wordBreak: 'break-word',
            hyphens: 'auto',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {cleanTitle}
        </motion.h1>

        {/* Optional description */}
        {description && (
          <motion.p
            className="mt-5 text-white/60 leading-relaxed max-w-lg"
            style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1rem)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.3 }}
          >
            {description}
          </motion.p>
        )}

        {/* Thin accent divider below title */}
        <motion.div
          className="mt-8 rounded-full"
          style={{ height: '3px', backgroundColor: accent, width: '60px' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
};

export default ModuleCoverSlide;
