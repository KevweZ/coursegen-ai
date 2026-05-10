import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

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

const ACCENT = '#818cf8'; // default indigo accent (overridden by accentColor prop)

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
  const p       = PANELS[theme] || PANELS.dark;
  const accent  = accentColor || ACCENT;

  // Strip "Key Takeaways — " / "Key Takeaways - " prefix so the h2 shows only
  // the meaningful slide title (e.g. "Player Architecture" not "Key Takeaways — Player Architecture")
  const cleanTitle = title.replace(/^Key\s+Takeaways\s*[—\-]\s*/i, '').trim();

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ backgroundColor: p.rightBg }}>

      {/* ── Left decorative panel (mirrors ModuleOverviewSlide style) ────────── */}
      <div
        className="shrink-0 relative flex flex-col items-center justify-between py-10"
        style={{ width: '22%', backgroundColor: p.leftBg, borderRight: `4px solid ${accent}` }}
      >
        {/* Giant watermark — lightbulb shape built with giant opacity text */}
        <div
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
          style={{ color: p.numText }}
        >
          <Lightbulb
            style={{ width: '11rem', height: '11rem', opacity: 0.13 }}
            strokeWidth={1.2}
          />
        </div>

        {/* Top: icon + "KEY" label */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <Lightbulb
            className="opacity-70"
            style={{ width: '2.5rem', height: '2.5rem', color: accent }}
          />
          <p
            className="text-[11px] font-black uppercase tracking-[0.22em] opacity-60 text-center"
            style={{ color: p.bodyText }}
          >
            Key
          </p>
        </div>

        {/* Centre: "KEY TAKEAWAYS" vertical text */}
        <div
          className="relative z-10 font-black uppercase opacity-55 text-center px-2"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            color: p.bodyText,
            letterSpacing: '0.2em',
            fontSize: '0.72rem',
            maxHeight: '55%',
            overflow: 'hidden',
          }}
        >
          Takeaways
        </div>

        {/* Bottom: small accent pill showing item count */}
        <div
          className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg"
          style={{ border: `2px solid ${accent}`, color: accent }}
        >
          {objectives.length}
        </div>
      </div>

      {/* ── Right content panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-10 py-10 overflow-hidden">

        {/* Super-label above title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-3 shrink-0"
        >
          <p
            className="text-sm font-black uppercase tracking-widest mb-1"
            style={{ color: accent }}
          >
            Key Takeaways
          </p>
          <h2
            className="font-extrabold text-5xl leading-tight"
            style={{ color: p.titleText }}
          >
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
                style={{
                  border: `1.5px solid ${p.rowBorder}`,
                  backgroundColor: 'transparent',
                }}
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
                    <p
                      className="font-bold text-base uppercase tracking-wide leading-snug"
                      style={{ color: p.titleText }}
                    >
                      {parsed.label}
                    </p>
                  )}
                  {parsed.content && (
                    <p
                      className="text-base leading-relaxed"
                      style={{ color: p.labelText }}
                    >
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
