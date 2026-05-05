import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Target, CheckCircle2 } from 'lucide-react';
import type { TerminalObjectiveGroup } from '../../types/course';

type Theme = 'light' | 'dark' | 'unified';

interface Props {
  objectives: (string | TerminalObjectiveGroup)[];
  theme: Theme;
}

function normalize(obj: string | TerminalObjectiveGroup): TerminalObjectiveGroup {
  if (typeof obj === 'string') return { terminalObjective: obj, enablingObjectives: [] };
  return { terminalObjective: obj.terminalObjective, enablingObjectives: obj.enablingObjectives || [] };
}

const ACCENT_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#9333ea', '#e11d48', '#0d9488'];

const PANELS: Record<Theme, { leftBg: string; rightBg: string; headerText: string; bodyText: string; subText: string; rowBorder: string; expandBg: string }> = {
  dark: {
    leftBg: '#1e1b4b', rightBg: '#0f172a',
    headerText: '#818cf8', bodyText: '#e2e8f0', subText: '#94a3b8',
    rowBorder: 'rgba(255,255,255,0.08)', expandBg: 'rgba(255,255,255,0.04)',
  },
  light: {
    leftBg: '#1e3a8a', rightBg: '#f8fafc',
    headerText: '#1e3a8a', bodyText: '#1e293b', subText: '#475569',
    rowBorder: 'rgba(0,0,0,0.08)', expandBg: 'rgba(0,0,0,0.03)',
  },
  unified: {
    leftBg: '#2e1065', rightBg: '#1e1b4b',
    headerText: '#a78bfa', bodyText: '#e0e7ff', subText: '#a5b4fc',
    rowBorder: 'rgba(167,139,250,0.15)', expandBg: 'rgba(167,139,250,0.06)',
  },
};

export const CourseObjectivesSlide: React.FC<Props> = ({ objectives, theme }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const p = PANELS[theme] || PANELS.dark;
  const normalized = objectives.map(normalize);

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ backgroundColor: p.rightBg }}>

      {/* ── Left decorative panel ──────────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col items-center justify-center gap-4 py-8"
        style={{ width: '22%', backgroundColor: p.leftBg, borderRight: `4px solid ${ACCENT_COLORS[0]}` }}
      >
        <Target className="w-10 h-10 opacity-60" style={{ color: ACCENT_COLORS[0] }} />
        <div
          className="text-xs font-black uppercase tracking-[0.25em] opacity-70"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            color: p.headerText,
            letterSpacing: '0.3em',
          }}
        >
          Course Objectives
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg"
          style={{ border: `2px solid ${ACCENT_COLORS[0]}`, color: p.headerText }}
        >
          {normalized.length}
        </div>
      </div>

      {/* ── Right: accordion objective list ───────────────────────────────── */}
      <div className="flex-1 flex flex-col px-8 py-8 overflow-hidden">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-extrabold text-4xl mb-6"
          style={{ color: p.headerText }}
        >
          Course Objectives
        </motion.h2>

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
                    backgroundColor: isOpen ? `${color}18` : 'transparent',
                    cursor: hasEO ? 'pointer' : 'default',
                  }}
                >
                  {/* Numbered circle */}
                  <span
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
                    style={{ backgroundColor: `${color}30`, color }}
                  >
                    {i + 1}
                  </span>

                  <span className="flex-1 font-semibold text-base leading-snug" style={{ color: p.bodyText }}>
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
                            <p className="text-sm leading-relaxed" style={{ color: p.subText }}>{eo}</p>
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
    </div>
  );
};

export default CourseObjectivesSlide;
