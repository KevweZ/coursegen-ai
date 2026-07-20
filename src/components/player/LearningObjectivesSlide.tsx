import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

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
  moduleNumber?: number;
}

// A single, full-width canvas — no solid decorative side panel to fight the
// light theme for contrast. The accent color shows up only in small,
// deliberate touches (icon chip, divider, numbered badges).
const PANELS: Record<Theme, {
  bg: string; titleText: string; bodyText: string; subText: string;
  labelText: string; rowBorder: string; iconChipBg: string;
}> = {
  dark: {
    bg: '#0f172a', titleText: '#f1f5f9', bodyText: '#e2e8f0',
    subText: '#94a3b8', labelText: '#cbd5e1',
    rowBorder: 'rgba(255,255,255,0.09)', iconChipBg: 'rgba(255,255,255,0.06)',
  },
  light: {
    bg: '#ffffff', titleText: '#0f172a', bodyText: '#1e293b',
    subText: '#475569', labelText: '#334155',
    rowBorder: '#e2e8f0', iconChipBg: '#f8fafc',
  },
  unified: {
    bg: '#1e1b4b', titleText: '#f1f5f9', bodyText: '#e0e7ff',
    subText: '#a5b4fc', labelText: '#c4b5fd',
    rowBorder: 'rgba(167,139,250,0.15)', iconChipBg: 'rgba(167,139,250,0.08)',
  },
};

const ACCENT = '#818cf8';

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
  moduleNumber,
}) => {
  const p      = PANELS[theme] || PANELS.light;
  const accent = accentColor || ACCENT;

  // Strip "Key Takeaways — " prefix so h2 shows only the meaningful slide title
  const cleanTitle = title.replace(/^Key\s+Takeaways\s*[—\-]\s*/i, '').trim();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden px-9 py-8" style={{ backgroundColor: p.bg }}>

      {/* ── Header: icon chip + module label + title ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 mb-4 shrink-0"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}15`, border: `1.5px solid ${accent}35` }}
        >
          <CheckCircle2 className="w-7 h-7" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: accent }}>
            {moduleNumber != null && moduleNumber > 0 ? `Module ${moduleNumber} · Key Takeaways` : 'Key Takeaways'}
          </p>
          <h2 className="font-extrabold text-3xl leading-tight" style={{ color: p.titleText }}>
            {cleanTitle || 'Key Takeaways'}
          </h2>
        </div>
      </motion.div>

      {/* Accent divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="h-[3px] mb-6 rounded shrink-0 origin-left"
        style={{ background: `linear-gradient(to right, ${accent}, ${accent}20)` }}
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
              style={{ border: `1.5px solid ${p.rowBorder}`, backgroundColor: p.iconChipBg }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, delay: i * 0.08 + 0.15 }}
            >
              {/* Numbered circle */}
              <span
                className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
                style={{ backgroundColor: `${accent}22`, color: accent }}
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
  );
};

export default LearningObjectivesSlide;
