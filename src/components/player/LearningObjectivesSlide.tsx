import React from 'react';
import { motion } from 'framer-motion';

type Theme = 'light' | 'dark' | 'unified';

interface Objective {
  id?: string;
  label?: string;
  title?: string;
  content?: string;
  description?: string;
}

interface LearningObjectivesSlideProps {
  title: string;
  objectives: Objective[];
  accentColor?: string;
  theme: Theme;
}

// ── Theme tokens ───────────────────────────────────────────────────────────────
const PANELS: Record<Theme, {
  leftBg: string; rightBg: string;
  numText: string; titleText: string;
  bodyText: string; subText: string;
  labelText: string; rowBorder: string;
}> = {
  dark: {
    leftBg:   '#1e1b4b', rightBg:  '#0f172a',
    numText:  'rgba(255,255,255,0.07)',
    titleText: '#818cf8', bodyText: '#e2e8f0',
    subText:  '#94a3b8',  labelText: '#cbd5e1',
    rowBorder: 'rgba(255,255,255,0.09)',
  },
  light: {
    leftBg:   '#1e3a8a', rightBg:  '#f8fafc',
    numText:  'rgba(255,255,255,0.08)',
    titleText: '#1e3a8a', bodyText: '#1e293b',
    subText:  '#475569',  labelText: '#334155',
    rowBorder: 'rgba(0,0,0,0.08)',
  },
  unified: {
    leftBg:   '#2e1065', rightBg:  '#1e1b4b',
    numText:  'rgba(255,255,255,0.07)',
    titleText: '#a78bfa', bodyText: '#e0e7ff',
    subText:  '#a5b4fc',  labelText: '#c4b5fd',
    rowBorder: 'rgba(167,139,250,0.15)',
  },
};

const ACCENT = '#818cf8';

/**
 * Classic house-key SVG — circular bow with inner hole, diagonal shaft,
 * rectangular teeth. Matches the style in the reference image.
 */
const ClassicKeyIcon: React.FC<{ size: number; color: string; opacity?: number }> = ({
  size, color, opacity = 1,
}) => {
  const sw = 3.5;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity }}
    >
      {/* Bow — outer circle */}
      <circle cx="27" cy="27" r="22" strokeWidth={sw} />
      {/* Bow — inner hole */}
      <circle cx="27" cy="27" r="9" strokeWidth={sw * 0.85} />
      {/* Decorative hatching lines inside bow (like reference image) */}
      <line x1="19" y1="22" x2="24" y2="17" strokeWidth={sw * 0.65} />
      <line x1="23" y1="28" x2="29" y2="21" strokeWidth={sw * 0.65} />
      {/* Shaft — thick diagonal stroke from bow to tip */}
      <line x1="44" y1="44" x2="88" y2="88" strokeWidth={sw * 2.4} />
      {/* Teeth — perpendicular notches on upper-right edge of shaft */}
      <line x1="59" y1="59" x2="65" y2="53" strokeWidth={sw * 1.9} strokeLinecap="square" />
      <line x1="67" y1="67" x2="73" y2="61" strokeWidth={sw * 1.9} strokeLinecap="square" />
      <line x1="75" y1="75" x2="80" y2="70" strokeWidth={sw * 1.7} strokeLinecap="square" />
      {/* Tip stop (small perpendicular at blade end) */}
      <line x1="85" y1="85" x2="89" y2="81" strokeWidth={sw * 1.4} strokeLinecap="square" />
    </svg>
  );
};

/**
 * Strip markdown artefacts and split "Label — Body" into parts.
 */
function parseObjectiveText(raw: string): { label: string; content: string } {
  let text = raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^[✅☑✓•\-]\s*/u, '')
    .trim();

  const parts = text.split(/\s[—\-]\s/);
  if (parts.length >= 2) {
    return { label: parts[0].trim(), content: parts.slice(1).join(' — ').trim() };
  }
  return { label: text, content: '' };
}

// ── Component ──────────────────────────────────────────────────────────────────
export const LearningObjectivesSlide: React.FC<LearningObjectivesSlideProps> = ({
  title,
  objectives,
  accentColor,
  theme,
}) => {
  const p      = PANELS[theme] || PANELS.dark;
  const accent = accentColor || ACCENT;

  // Strip "Key Takeaways — " prefix so h2 shows only the meaningful slide title
  const cleanTitle = title.replace(/^Key\s+Takeaways\s*[—\-]\s*/i, '').trim();

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ backgroundColor: p.rightBg }}>

      {/* ── Left decorative panel ─────────────────────────────────────────────── */}
      <div
        className="shrink-0 relative flex flex-col items-center justify-between py-10"
        style={{ width: '22%', backgroundColor: p.leftBg, borderRight: `4px solid ${accent}` }}
      >
        {/* Giant watermark key */}
        <div
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        >
          <ClassicKeyIcon size={190} color={p.bodyText} opacity={0.07} />
        </div>

        {/* Top: classic key icon */}
        <div className="relative z-10">
          <ClassicKeyIcon size={56} color={accent} opacity={0.85} />
        </div>

        {/* Centre: "Takeaways" vertical text */}
        <div
          className="relative z-10 font-black uppercase opacity-55 text-center px-2"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            color: p.bodyText,
            letterSpacing: '0.18em',
            fontSize: '2.4rem',
            maxHeight: '72%',
            overflow: 'hidden',
          }}
        >
          Takeaways
        </div>

        {/* Bottom spacer for visual balance */}
        <div className="relative z-10 h-14" />
      </div>

      {/* ── Right content panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-10 py-10 overflow-hidden">

        {/* Super-label + title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-3 shrink-0"
        >
          <p className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: accent }}>
            Key Takeaways
          </p>
          <h2 className="font-extrabold text-5xl leading-tight" style={{ color: p.titleText }}>
            {cleanTitle || 'Key Takeaways'}
          </h2>
        </motion.div>

        {/* Accent divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-0.5 mb-6 rounded shrink-0 origin-left"
          style={{ backgroundColor: `${accent}50` }}
        />

        {/* Takeaway items */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {objectives.map((obj, i) => {
            const rawLabel   = obj.label || obj.title || '';
            const rawContent = obj.content || obj.description || '';
            const parsed = rawLabel
              ? { label: parseObjectiveText(rawLabel).label, content: rawContent }
              : parseObjectiveText(rawContent);

            return (
              <motion.div
                key={obj.id || i}
                className="flex items-start gap-4 px-5 py-4 rounded-xl"
                style={{ border: `1.5px solid ${p.rowBorder}`, backgroundColor: 'transparent' }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, delay: i * 0.08 + 0.15 }}
              >
                {/* Numbered circle */}
                <span
                  className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
                  style={{ backgroundColor: `${accent}28`, color: accent }}
                >
                  {i + 1}
                </span>

                {/* Label + body */}
                <div className="flex flex-col justify-center min-w-0 gap-0.5">
                  {parsed.label && (
                    <p className="font-bold text-base uppercase tracking-wide leading-snug" style={{ color: p.titleText }}>
                      {parsed.label}
                    </p>
                  )}
                  {parsed.content && (
                    <p className="text-base leading-relaxed" style={{ color: p.labelText }}>
                      {parsed.content}
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
