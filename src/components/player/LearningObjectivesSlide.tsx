import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

type Theme = 'light' | 'dark' | 'unified';

interface Objective {
  id?: string;
  label?: string;
  title?: string;
  content?: string;
  description?: string;
  icon?: string;
}

interface LearningObjectivesSlideProps {
  title: string;
  objectives: Objective[];
  accentColor?: string;
  theme: Theme;
}

const THEME_LEFT_BG: Record<Theme, string> = {
  light:   '#1e3a8a', // deep indigo
  dark:    '#1e1b4b', // dark indigo
  unified: '#2e1065', // deep purple
};

const THEME_PRIMARY_BAR: Record<Theme, string> = {
  light:   '#1e3a8a',
  dark:    '#3730a3',
  unified: '#4c1d95',
};

const THEME_ACCENT_BAR: Record<Theme, string> = {
  light:   '#f59e0b', // amber
  dark:    '#818cf8', // indigo-400
  unified: '#a78bfa', // violet-400
};

const THEME_CIRCLE: Record<Theme, string> = {
  light:   '#1e3a8a',
  dark:    '#818cf8',
  unified: '#a78bfa',
};

const THEME_TITLE_COLOR: Record<Theme, string> = {
  light:   '#1e3a8a',
  dark:    '#818cf8',
  unified: '#a78bfa',
};

const THEME_BODY_BG: Record<Theme, string> = {
  light:   '#f8fafc',
  dark:    '#0f172a',
  unified: '#1e1b4b',
};

const THEME_BODY_TEXT: Record<Theme, string> = {
  light:   '#374151',
  dark:    '#cbd5e1',
  unified: '#c4b5fd',
};

export const LearningObjectivesSlide: React.FC<LearningObjectivesSlideProps> = ({
  title,
  objectives,
  accentColor,
  theme,
}) => {
  const leftBg     = accentColor || THEME_LEFT_BG[theme];
  const primaryBar = THEME_PRIMARY_BAR[theme];
  const accentBar  = accentColor ? `${accentColor}aa` : THEME_ACCENT_BAR[theme];
  const circleColor = THEME_CIRCLE[theme];
  const titleColor  = THEME_TITLE_COLOR[theme];
  const bodyBg      = THEME_BODY_BG[theme];
  const bodyText    = THEME_BODY_TEXT[theme];

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      {/* ── Left color panel ──────────────────────────────────── */}
      <div
        className="flex items-center justify-center"
        style={{ width: '28%', flexShrink: 0, backgroundColor: leftBg }}
      >
        {/* Future: character image slot */}
        <div className="w-full h-full opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* ── Split border ──────────────────────────────────────── */}
      <div className="flex flex-row shrink-0">
        <div style={{ width: '8px', backgroundColor: primaryBar }} />
        <div style={{ width: '14px', backgroundColor: accentBar }} />
      </div>

      {/* ── Right content panel ───────────────────────────────── */}
      <div
        className="flex-1 flex flex-col justify-center px-8 py-6 overflow-hidden"
        style={{ backgroundColor: bodyBg }}
      >
        {/* Slide header */}
        <h2
          className="font-extrabold text-2xl mb-6 leading-tight"
          style={{ color: titleColor }}
        >
          {title}
        </h2>

        {/* Objectives list */}
        <div className="flex flex-col gap-5">
          {objectives.map((obj, i) => {
            const label   = obj.label || obj.title || `Objective ${i + 1}`;
            const content = obj.content || obj.description || '';
            return (
              <motion.div
                key={obj.id || i}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
              >
                {/* Circle number indicator */}
                <div
                  className="shrink-0 flex items-center justify-center rounded-full font-bold text-xl"
                  style={{
                    width: '52px',
                    height: '52px',
                    border: `2.5px solid ${circleColor}`,
                    color: circleColor,
                  }}
                >
                  {i + 1}
                </div>

                {/* Title + body */}
                <div className="flex flex-col justify-center">
                  <p
                    className="font-bold text-sm uppercase tracking-wide leading-snug"
                    style={{ color: titleColor }}
                  >
                    {label}
                  </p>
                  {content && (
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: bodyText }}>
                      {content}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LearningObjectivesSlide;
