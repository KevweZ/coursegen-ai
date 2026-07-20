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

// A single, full-width white (or theme-appropriate) canvas — the module's
// accent color now lives only in small, deliberate touches (icon chip,
// divider, badges) instead of a solid decorative panel that has to fight
// the light theme for contrast.
const PANELS: Record<Theme, {
  bg: string; titleText: string; bodyText: string; subText: string;
  descText: string; rowBorder: string; expandBg: string; iconChipBg: string;
}> = {
  dark: {
    bg: '#0f172a', titleText: '#f1f5f9',
    bodyText: '#e2e8f0', subText: '#94a3b8',
    descText: '#cbd5e1', rowBorder: 'rgba(255,255,255,0.08)', expandBg: 'rgba(255,255,255,0.04)',
    iconChipBg: 'rgba(255,255,255,0.06)',
  },
  light: {
    bg: '#ffffff', titleText: '#0f172a',
    bodyText: '#1e293b', subText: '#475569',
    descText: '#334155', rowBorder: '#e2e8f0', expandBg: '#f8fafc',
    iconChipBg: '#f8fafc',
  },
  unified: {
    bg: '#1e1b4b', titleText: '#f1f5f9',
    bodyText: '#e0e7ff', subText: '#a5b4fc',
    descText: '#c4b5fd', rowBorder: 'rgba(167,139,250,0.15)', expandBg: 'rgba(167,139,250,0.06)',
    iconChipBg: 'rgba(167,139,250,0.08)',
  },
};

export const ModuleOverviewSlide: React.FC<Props> = ({
  moduleNumber, moduleTitle, description, objectives, theme,
}) => {
  const [expanded, setExpanded] = useState<number | null>(0); // open first by default
  const p = PANELS[theme] || PANELS.light;
  const accent = MODULE_COLORS[(moduleNumber - 1) % MODULE_COLORS.length];
  const normalized = objectives.map(normalize).filter(o => o.terminalObjective);

  // Strip "Module N — " prefix from moduleTitle for clean display
  const cleanTitle = moduleTitle.replace(/^Module\s+\d+\s*[—\-]\s*/i, '');

  return (
    <div className="w-full h-full flex flex-col overflow-hidden px-9 py-8" style={{ backgroundColor: p.bg }}>

      {/* ── Header: icon chip + module label + title ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 mb-1 shrink-0"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}15`, border: `1.5px solid ${accent}35` }}
        >
          <BookOpen className="w-7 h-7" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: accent }}>
            Module {moduleNumber}
          </p>
          <h2 className="font-extrabold text-3xl leading-tight" style={{ color: p.titleText }}>Overview</h2>
        </div>
      </motion.div>

      {/* Clean module title, shown as a supporting line under the header */}
      {cleanTitle && (
        <p className="text-lg font-semibold mb-4 shrink-0" style={{ color: p.subText }}>{cleanTitle}</p>
      )}

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="h-[3px] mb-5 rounded shrink-0 origin-left"
        style={{ background: `linear-gradient(to right, ${accent}, ${accent}20)` }}
      />

      {/* Module description */}
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-lg leading-relaxed mb-6 shrink-0"
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
                      backgroundColor: isOpen ? `${accent}12` : p.iconChipBg,
                      cursor: hasEO ? 'pointer' : 'default',
                      boxShadow: isOpen ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <span
                      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-black text-base"
                      style={{ backgroundColor: `${accent}22`, color: accent }}
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
        </>
      )}
    </div>
  );
};

export default ModuleOverviewSlide;
