import React from 'react';
import { motion } from 'framer-motion';
import { moduleAccentHex } from '../../lib/tabAccents';

type Theme = 'light' | 'dark' | 'unified';

interface ModuleCoverSlideProps {
  moduleNumber: number;
  moduleTitle: string;
  description?: string;
  theme: Theme;
}

/** Remove leading "Module N — " prefix if present; it's shown separately. */
function cleanModuleTitle(title: string): string {
  return title.replace(/^Module\s+\d+\s*[—\-–]\s*/i, '').trim() || title;
}

/** Keep the last two words together so the title does not hang a single word. */
function preventWidow(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return text;
  return words.slice(0, -1).join(' ') + '\u00A0' + words[words.length - 1];
}

const LEFT_BG: Record<Theme, string> = { light: '#ffffff', dark: '#0f172a', unified: '#1e1b4b' };
const TITLE_CLR: Record<Theme, string> = { light: '#1a1f3c', dark: '#ffffff', unified: '#e2e8f0' };
const DESC_CLR: Record<Theme, string> = { light: '#6b7280', dark: '#94a3b8', unified: '#a5b4fc' };
const STRIP: Record<Theme, string> = { light: '#e2e8f0', dark: '#1e293b', unified: '#312e81' };

export const ModuleCoverSlide: React.FC<ModuleCoverSlideProps> = ({
  moduleNumber,
  moduleTitle,
  description,
  theme,
}) => {
  const accent = moduleAccentHex(moduleNumber);
  const leftBg = LEFT_BG[theme] ?? LEFT_BG.dark;
  const titleClr = TITLE_CLR[theme] ?? TITLE_CLR.dark;
  const descClr = DESC_CLR[theme] ?? DESC_CLR.dark;
  const stripBg = STRIP[theme] ?? STRIP.dark;
  const cleanTitle = preventWidow(cleanModuleTitle(moduleTitle));

  return (
    <div className="w-full h-full flex flex-row overflow-hidden" style={{ backgroundColor: leftBg }}>
      <div
        className="flex flex-col justify-center px-14 py-10 text-left"
        style={{ width: '58%', flexShrink: 0, backgroundColor: leftBg }}
      >
        <motion.p
          className="text-sm font-bold uppercase tracking-[0.22em] mb-5"
          style={{ color: accent }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          Module {moduleNumber}
        </motion.p>

        <motion.h1
          className="font-extrabold leading-[1.12] tracking-tight"
          style={{
            fontSize: 'clamp(2rem, 4.4vw, 3.4rem)',
            color: titleClr,
            maxWidth: '18ch',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {cleanTitle}
        </motion.h1>

        {description && description.trim() && (
          <motion.p
            className="mt-5 text-sm font-medium leading-relaxed max-w-md"
            style={{ color: descClr }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.22 }}
          >
            {description}
          </motion.p>
        )}

        <motion.div
          className="mt-8 rounded-full"
          style={{ height: '3px', backgroundColor: accent, width: '3.5rem' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        style={{
          background: `linear-gradient(155deg, ${accent}40 0%, ${stripBg} 52%, ${leftBg} 100%)`,
        }}
      >
        <div
          className="absolute select-none pointer-events-none font-black"
          style={{
            fontSize: 'clamp(9rem, 24vw, 18rem)',
            lineHeight: 1,
            color: accent,
            opacity: theme === 'light' ? 0.22 : 0.28,
            bottom: '-1.25rem',
            right: '6%',
          }}
        >
          {moduleNumber}
        </div>
      </div>

      <div className="shrink-0" style={{ width: '7%', backgroundColor: stripBg }} />
    </div>
  );
};

export default ModuleCoverSlide;
