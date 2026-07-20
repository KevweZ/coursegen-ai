import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Target, CheckCircle2 } from 'lucide-react';
import type { TerminalObjectiveGroup } from '../../types/course';

type Theme = 'light' | 'dark' | 'unified';

interface Props {
  objectives: (string | TerminalObjectiveGroup)[];
  theme: Theme;
  moduleNumber?: number;
}

function normalize(obj: string | TerminalObjectiveGroup): TerminalObjectiveGroup {
  if (typeof obj === 'string') return { terminalObjective: obj, enablingObjectives: [] };
  return { terminalObjective: obj.terminalObjective, enablingObjectives: obj.enablingObjectives || [] };
}

const ACCENT_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#9333ea', '#e11d48', '#0d9488'];

// A single, full-width canvas — no solid decorative side panel to fight the
// light theme for contrast. The accent color shows up only in small,
// deliberate touches (icon chip, row borders, numbered badges).
const PANELS: Record<Theme, { bg: string; headerText: string; bodyText: string; subText: string; rowBorder: string; expandBg: string; iconChipBg: string }> = {
  dark: {
    bg: '#0f172a', headerText: '#f1f5f9', bodyText: '#e2e8f0', subText: '#94a3b8',
    rowBorder: 'rgba(255,255,255,0.08)', expandBg: 'rgba(255,255,255,0.04)', iconChipBg: 'rgba(255,255,255,0.06)',
  },
  light: {
    bg: '#ffffff', headerText: '#0f172a', bodyText: '#1e293b', subText: '#475569',
    rowBorder: '#e2e8f0', expandBg: '#f8fafc', iconChipBg: '#f8fafc',
  },
  unified: {
    bg: '#1e1b4b', headerText: '#f1f5f9', bodyText: '#e0e7ff', subText: '#a5b4fc',
    rowBorder: 'rgba(167,139,250,0.15)', expandBg: 'rgba(167,139,250,0.06)', iconChipBg: 'rgba(167,139,250,0.08)',
  },
};

export const CourseObjectivesSlide: React.FC<Props> = ({ objectives, theme, moduleNumber }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const p = PANELS[theme] || PANELS.light;
  const normalized = objectives.map(normalize);
  const accent = ACCENT_COLORS[0];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden px-9 py-8" style={{ backgroundColor: p.bg }}>

      {/* ── Header: icon chip + title ────────────────────────────────────── */}
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
          <Target className="w-7 h-7" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: accent }}>
            {moduleNumber != null && moduleNumber > 0 ? `Module ${moduleNumber}` : 'Course'}
          </p>
          <h2 className="font-extrabold text-3xl leading-tight" style={{ color: p.headerText }}>
            Course Objectives
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

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {normalized.map((obj, i) => {
          const color    = ACCENT_COLORS[i % ACCENT_COLORS.length];
          const isOpen   = expanded === i;
          const hasEO    = obj.enablingObjectives.length > 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, delay: i * 0.07 }}
            >
              {/* Terminal objective row */}
              <button
                onClick={() => hasEO && setExpanded(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  border: `1.5px solid ${isOpen ? color : p.rowBorder}`,
                  backgroundColor: isOpen ? `${color}12` : p.iconChipBg,
                  cursor: hasEO ? 'pointer' : 'default',
                }}
              >
                {/* Numbered circle */}
                <span
                  className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-black text-lg"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {i + 1}
                </span>

                <span className="flex-1 font-semibold text-lg leading-snug" style={{ color: p.bodyText }}>
                  {obj.terminalObjective}
                </span>

                {hasEO && (
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                    style={{ color: p.subText }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                )}
              </button>

              {/* Enabling objectives — expand/collapse */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="eos"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="ml-12 mr-2 mb-1 px-4 py-3 rounded-b-xl space-y-2"
                      style={{ backgroundColor: p.expandBg, borderLeft: `2px solid ${color}` }}
                    >
                      {obj.enablingObjectives.map((eo, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                          <p className="text-base leading-relaxed" style={{ color: p.subText }}>{eo}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseObjectivesSlide;
