import React from 'react';
import { motion } from 'framer-motion';
import { moduleAccentHex } from '../../lib/tabAccents';
import { shortenModuleTitle } from '../../lib/splitCourseTitle';
import { preventWidow } from '../../lib/preventWidow';

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

const PAGE_BG: Record<Theme, string> = { light: '#ffffff', dark: '#0f172a', unified: '#1e1b4b' };
const TITLE_CLR: Record<Theme, string> = { light: '#1a1f3c', dark: '#ffffff', unified: '#e2e8f0' };
const DESC_CLR: Record<Theme, string> = { light: '#6b7280', dark: '#94a3b8', unified: '#a5b4fc' };

export const ModuleCoverSlide: React.FC<ModuleCoverSlideProps> = ({
  moduleNumber,
  moduleTitle,
  description,
  theme,
}) => {
  const accent = moduleAccentHex(moduleNumber);
  const pageBg = PAGE_BG[theme] ?? PAGE_BG.dark;
  const titleClr = TITLE_CLR[theme] ?? TITLE_CLR.dark;
  const descClr = DESC_CLR[theme] ?? DESC_CLR.dark;
  const cleanTitle = preventWidow(cleanModuleTitle(shortenModuleTitle(moduleTitle)));
  const bannerFill = theme === 'light' ? `${accent}18` : `${accent}33`;

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: pageBg }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute top-10 left-10 w-24 h-24 border-t-4 border-l-4 rounded-tl-3xl opacity-60"
          style={{ borderColor: accent }}
        />
        <div
          className="absolute bottom-10 right-10 w-24 h-24 border-b-4 border-r-4 rounded-br-3xl opacity-50"
          style={{ borderColor: accent }}
        />
        <div
          className="absolute select-none font-black"
          style={{
            fontSize: 'clamp(8rem, 22vw, 16rem)',
            lineHeight: 1,
            color: accent,
            opacity: theme === 'light' ? 0.08 : 0.14,
            bottom: '-1.5rem',
            right: '6%',
          }}
        >
          {moduleNumber}
        </div>
      </div>

      <div className="relative z-[1] h-full flex flex-col justify-center">
        <motion.div
          className="w-full px-14 py-10"
          style={{ background: bannerFill }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            className="text-sm font-bold uppercase tracking-[0.22em] mb-4"
            style={{ color: accent }}
          >
            Module {moduleNumber}
          </p>
          <h1
            className="font-extrabold leading-[1.12] tracking-tight slide-title-balanced"
            style={{
              fontSize: 'clamp(2.1rem, 4.6vw, 3.6rem)',
              color: titleClr,
              maxWidth: '22ch',
            }}
          >
            {cleanTitle}
          </h1>
          {description && description.trim() && (
            <p className="mt-5 text-base font-medium leading-relaxed max-w-2xl" style={{ color: descClr }}>
              {preventWidow(description, 4)}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ModuleCoverSlide;
