import React from 'react';
import { motion } from 'framer-motion';

type Theme = 'light' | 'dark' | 'unified';

interface ClosingSlideProps {
  heading?: string;
  subheading?: string;
  exitText?: string;
  coverImage?: string;
  accentColor?: string;
  theme: Theme;
}

const THEME_ACCENT: Record<Theme, string> = {
  light:   '#4f46e5',
  dark:    '#3730a3',
  unified: '#6d28d9',
};

const THEME_BOTTOM_BG: Record<Theme, string> = {
  light:   '#ffffff',
  dark:    '#0f172a',
  unified: '#1e1b4b',
};

const THEME_BOTTOM_TEXT: Record<Theme, string> = {
  light:   '#374151',
  dark:    '#94a3b8',
  unified: '#a5b4fc',
};

export const ClosingSlide: React.FC<ClosingSlideProps> = ({
  heading   = 'Thank You for Completing This Course',
  subheading = 'We hope you found this course valuable.',
  exitText  = 'You may now exit the course.',
  coverImage,
  accentColor,
  theme,
}) => {
  const accent   = accentColor || THEME_ACCENT[theme];
  const bottomBg = THEME_BOTTOM_BG[theme];
  const bottomTx = THEME_BOTTOM_TEXT[theme];

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      {/* ── Left image panel ──────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ width: '35%', flexShrink: 0 }}>
        {coverImage ? (
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(160deg, #1e293b 0%, ${accent}44 100%)` }}
          />
        )}
      </div>

      {/* ── Right accent panel ────────────────────────────────── */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: accent }}>
        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center px-14 py-10">
          <motion.h1
            className="font-extrabold text-white leading-tight"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {heading}
          </motion.h1>

          {subheading && (
            <motion.p
              className="mt-4 text-white/80 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              {subheading}
            </motion.p>
          )}
        </div>

        {/* Bottom exit bar */}
        <div
          className="px-8 flex items-center"
          style={{ height: '60px', backgroundColor: bottomBg }}
        >
          <p
            className="text-sm font-medium tracking-wide"
            style={{ color: bottomTx }}
          >
            {exitText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClosingSlide;
