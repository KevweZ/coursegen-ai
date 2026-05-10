import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, BookOpen } from 'lucide-react';
import type { TerminalObjectiveGroup } from '../../types/course';

type Theme = 'light' | 'dark' | 'unified';

interface Props {
  moduleNumber: number;
  moduleTitle: string;
  description?: string;
  objectives: (string | TerminalObjectiveGroup)[];
  theme: Theme;
}

function normalize(obj: string | TerminalObjectiveGroup): TerminalObjectiveGroup {
  if (typeof obj === 'string') return { terminalObjective: obj, enablingObjectives: [] };
  return { terminalObjective: obj.terminalObjective, enablingObjectives: obj.enablingObjectives || [] };
}

// Distinct accent per module number (cycles)
export const MODULE_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#9333ea', '#e11d48', '#0d9488', '#b45309'];

const PANELS: Record<Theme, {
  leftBg: string; rightBg: string;
  numText: string; titleText: string;
  bodyText: string; subText: string;
  descText: string; rowBorder: string; expandBg: string;
}> = {
  dark: {
    leftBg: '#1e1b4b', rightBg: '#0f172a',
    numText: 'rgba(255,255,255,0.08)', titleText: '#818cf8',
    bodyText: '#e2e8f0', subText: '#94a3b8',
    descText: '#cbd5e1', rowBorder: 'rgba(255,255,255,0.08)', expandBg: 'rgba(255,255,255,0.04)',
  },
  light: {
    leftBg: '#1e3a8a', rightBg: '#f8fafc',
    numText: 'rgba(255,255,255,0.08)', titleText: '#1e3a8a',
    bodyText: '#1e293b', subText: '#475569',
    descText: '#334155', rowBorder: 'rgba(0,0,0,0.08)', expandBg: 'rgba(0,0,0,0.03)',
  },
  unified: {
    leftBg: '#2e1065', rightBg: '#1e1b4b',
    numText: 'rgba(255,255,255,0.08)', titleText: '#a78bfa',
    bodyText: '#e0e7ff', subText: '#a5b4fc',
    descText: '#c4b5fd', rowBorder: 'rgba(167,139,250,0.15)', expandBg: 'rgba(167,139,250,0.06)',
  },
};

export const ModuleOverviewSlide: React.FC<Props> = ({
  moduleNumber, moduleTitle, description, objectives, theme,
}) => {
  const [expanded, setExpanded] = useState<number | null>(0); // open first by default
  const p = PANELS[theme] || PANELS.dark;
  const accent = MODULE_COLORS[(moduleNumber - 1) % MODULE_COLORS.length];
  const normalized = objectives.map(normalize).filter(o => o.terminalObjective);

  // Strip "Module N — " prefix from moduleTitle for clean display
  const cleanTitle = moduleTitle.replace(/^Module\s+\d+\s*[—\-]\s*/i, '');

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ backgroundColor: p.rightBg }}>

      {/* ── Left decorative panel ──────────────────────────────────────────── */}
      <div
        className="shrink-0 relative flex flex-col items-center justify-between py-10"
        style={{ width: '22%', backgroundColor: p.leftBg, borderRight: `4px solid ${accent}` }}
      >
        {/* Giant background module number */}
        <div
          className="absolute inset-0 flex items-center justify-center font-black select-none pointer-events-none"
          style={{ fontSize: '14rem', color: p.numText, lineHeight: 1 }}
        >
          {moduleNumber}
        </div>

        {/* Top: module label */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <BookOpen className="w-10 h-10 opacity-60" style={{ color: accent }} />
          <p className="text-sm font-black uppercase tracking-[0.2em] opacity-60" style={{ color: p.bodyText }}>Module</p>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl"
            style={{ border: `2px solid ${accent}`, color: accent }}
          >
            {moduleNumber}
          </div>
        </div>

        {/* Bottom: topic name vertical */}
        <div
          className="relative z-10 text-sm font-bold uppercase tracking-[0.18em] opacity-50 text-center px-2"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            color: p.bodyText,
            maxHeight: '60%',
            overflow: 'hidden',
          }}
        >
          {cleanTitle || 'Overview'}
        </div>
      </div>

      {/* ── Right content panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-10 py-10 overflow-hidden">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-3 shrink-0"
        >
          <p className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: accent }}>Module {moduleNumber}</p>
          <h2 className="font-extrabold text-5xl leading-tight" style={{ color: p.titleText }}>Overview</h2>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-0.5 mb-5 rounded shrink-0 origin-left"
          style={{ backgroundColor: `${accent}50` }}
        />

        {/* Module description */}
        {description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-base leading-relaxed mb-6 shrink-0"
            style={{ color: p.descText }}
          >
            {description}
          </motion.p>
        )}

        {/* Objectives section */}
        {normalized.length > 0 && (
          <>
            <p className="text-sm font-black uppercase tracking-widest mb-4 shrink-0" style={{ color: accent }}>
              Module Objectives
            </p>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {normalized.map((obj, i) => {
                const isOpen   = expanded === i;
                const hasEO    = obj.enablingObjectives.length > 0;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.07 + 0.2 }}
                  >
                    <button
                      onClick={() => hasEO && setExpanded(isOpen ? null : i)}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all"
                      style={{
                        border: `1.5px solid ${isOpen ? accent : p.rowBorder}`,
                        backgroundColor: isOpen ? `${accent}18` : 'transparent',
                        cursor: hasEO ? 'pointer' : 'default',
                      }}
                    >
                      <span
                        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
                        style={{ backgroundColor: `${accent}30`, color: accent }}
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
                          <ChevronDown className="w-5 h-5" />
                        </motion.span>
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="eos"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="ml-14 mr-2 mb-2 px-5 py-4 rounded-b-xl space-y-2.5"
                            style={{ backgroundColor: p.expandBg, borderLeft: `2px solid ${accent}` }}
                          >
                            {obj.enablingObjectives.map((eo, j) => (
                              <div key={j} className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} />
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
          </>
        )}
      </div>
    </div>
  );
};

export default ModuleOverviewSlide;
