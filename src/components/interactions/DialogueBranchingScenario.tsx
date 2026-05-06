/**
 * DialogueBranchingScenario — Character dialogue-based branching scenario.
 * Silhouette characters + speech/thought bubbles + choice cards + transitions.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Choice { id: string; text: string; nextNodeId: string; isCorrectPath: boolean; }
interface BranchNode {
  id: string; type: 'scenario' | 'ending'; title: string; content: string;
  isDeadEnd?: boolean; feedback?: string; choices?: Choice[];
}
interface Props {
  nodes: Record<string, BranchNode>;
  startNodeId: string;
  theme?: 'light' | 'dark' | 'unified';
  accentColor?: string;
}

// ── SVG Silhouettes ────────────────────────────────────────────────────────────
const LearnerSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 100 200" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <circle cx="50" cy="28" r="19" />
    <rect x="44" y="45" width="12" height="10" rx="3" />
    <path d="M20 68 Q20 56 50 56 Q80 56 80 68 L84 128 L16 128 Z" />
    <path d="M50 56 L42 76 L50 84 L58 76 Z" opacity="0.55" />
    <path d="M20 74 Q6 96 9 124 L19 122 Q18 100 30 82 Z" />
    <path d="M80 74 Q94 96 91 124 L81 122 Q82 100 70 82 Z" />
    <rect x="24" y="126" width="20" height="68" rx="5" />
    <rect x="56" y="126" width="20" height="68" rx="5" />
    <ellipse cx="34" cy="196" rx="14" ry="5" />
    <ellipse cx="66" cy="196" rx="14" ry="5" />
  </svg>
);

const NpcSVG = ({ color, female }: { color: string; female?: boolean }) => (
  <svg viewBox="0 0 100 200" fill={color} xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}>
    <circle cx="50" cy="27" r="20" />
    {female && <path d="M30 18 Q30 4 50 2 Q70 4 70 18 Q64 12 50 13 Q36 12 30 18Z" />}
    <rect x="43" y="45" width="14" height="11" rx="3" />
    {female
      ? <><path d="M19 68 Q19 54 50 54 Q81 54 81 68 L85 115 Q68 128 50 128 Q32 128 15 115 Z" />
          <path d="M15 112 Q12 145 18 165 L82 165 Q88 145 85 112 Q68 128 50 128 Q32 128 15 112Z" />
          <rect x="26" y="163" width="18" height="32" rx="4" /><rect x="56" y="163" width="18" height="32" rx="4" />
          <ellipse cx="35" cy="197" rx="13" ry="5" /><ellipse cx="65" cy="197" rx="13" ry="5" /></>
      : <><path d="M17 70 Q17 56 50 56 Q83 56 83 70 L88 130 L12 130 Z" />
          <path d="M50 56 L43 74 L50 82 L57 74 Z" opacity="0.5" />
          <path d="M17 76 Q2 100 6 128 L16 126 Q14 103 27 85 Z" />
          <path d="M83 76 Q98 100 94 128 L84 126 Q86 103 73 85 Z" />
          <rect x="23" y="128" width="22" height="66" rx="5" /><rect x="55" y="128" width="22" height="66" rx="5" />
          <ellipse cx="34" cy="196" rx="14" ry="5" /><ellipse cx="66" cy="196" rx="14" ry="5" /></>
    }
  </svg>
);

// ── Bubbles ────────────────────────────────────────────────────────────────────
const ThoughtBubble = ({ text, accent }: { text: string; accent: string }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
    className="relative mb-2" style={{ maxWidth: 180 }}>
    <div className="rounded-3xl px-4 py-3 text-xs leading-relaxed italic font-medium text-slate-700 shadow-lg"
      style={{ background: 'rgba(255,255,255,0.95)', border: `2px solid ${accent}55` }}>
      {text}
    </div>
    <div className="absolute -bottom-2 left-8 flex gap-1 items-end">
      <div className="w-3 h-3 rounded-full bg-white/90" style={{ border: `1.5px solid ${accent}44` }} />
      <div className="w-2 h-2 rounded-full bg-white/70" style={{ border: `1.5px solid ${accent}33` }} />
    </div>
  </motion.div>
);

const SpeechBubble = ({ text, accent }: { text: string; accent: string }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
    className="relative mb-2" style={{ maxWidth: 220 }}>
    <div className="rounded-2xl px-4 py-3 text-xs leading-relaxed text-slate-800 shadow-xl"
      style={{ background: 'rgba(255,255,255,0.97)', border: `2px solid ${accent}88` }}>
      {text}
    </div>
    {/* Tail pointing down-left toward NPC */}
    <div className="absolute -bottom-3 left-8"
      style={{ width: 0, height: 0,
        borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
        borderTop: `14px solid ${accent}88` }} />
  </motion.div>
);

// ── Scene Background ───────────────────────────────────────────────────────────
const detectEnvironment = (text: string) => {
  const t = text.toLowerCase();
  if (/hospital|patient|clinic|medical|nurse|doctor/.test(t)) return 'medical';
  if (/customer|store|retail|shop|client/.test(t)) return 'retail';
  if (/classroom|student|teacher|school|training/.test(t)) return 'classroom';
  return 'office';
};
const ENV_GRADIENTS: Record<string, string> = {
  office: 'linear-gradient(160deg, #1e3a5f 0%, #0f172a 60%, #1a2744 100%)',
  medical: 'linear-gradient(160deg, #0c3547 0%, #081c2e 60%, #0a2d3f 100%)',
  retail: 'linear-gradient(160deg, #2d1b0e 0%, #1a0f06 60%, #2c1a0a 100%)',
  classroom: 'linear-gradient(160deg, #1a2e1a 0%, #0d1a0d 60%, #152815 100%)',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const DialogueBranchingScenario: React.FC<Props> = ({
  nodes, startNodeId, theme = 'dark', accentColor = '#4f46e5',
}) => {
  const [currentId, setCurrentId] = useState(startNodeId);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [animKey, setAnimKey] = useState(0);

  const node = nodes[currentId];
  if (!node) return null;

  const isLight = theme === 'light';
  const env = detectEnvironment(node.title + ' ' + node.content);
  const bgGradient = ENV_GRADIENTS[env];
  const isEnding = node.type === 'ending';
  const isDeadEnd = node.isDeadEnd;
  const npcFemale = node.id.charCodeAt(node.id.length - 1) % 2 === 0;

  const LEARNER_COLOR = '#94a3b8';
  const NPC_COLOR = isDeadEnd ? '#64748b' : '#1e293b';

  const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

  const handleChoice = (choice: Choice) => {
    if (selected) return;
    setSelected(choice);
  };

  const handleContinue = () => {
    if (!selected) return;
    const nextId = selected.nextNodeId;
    if (nextId && nodes[nextId]) {
      setHistory(h => [...h, currentId]);
      setCurrentId(nextId);
      setSelected(null);
      setAnimKey(k => k + 1);
    }
  };

  const handleRestart = () => {
    setCurrentId(startNodeId);
    setSelected(null);
    setHistory([]);
    setAnimKey(k => k + 1);
  };

  const handleBack = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentId(prev);
    setSelected(null);
    setAnimKey(k => k + 1);
  };

  // Feedback state
  const feedbackState = selected
    ? selected.isCorrectPath ? 'correct' : (isDeadEnd ? 'deadend' : 'wrong')
    : null;

  return (
    <div className="w-full flex flex-col gap-3 select-none" style={{ fontFamily: 'inherit' }}>

      {/* ── Scene panel ── */}
      <AnimatePresence mode="wait">
        <motion.div key={animKey} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}
          className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
          style={{ background: bgGradient, minHeight: 220 }}>

          {/* Floor line */}
          <div className="absolute bottom-14 left-0 right-0 h-px opacity-20"
            style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }} />

          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 60% 40% at 50% 80%, ${accentColor}18 0%, transparent 70%)` }} />

          {/* Scene tag */}
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
            <div className="h-1.5 w-6 rounded-full" style={{ background: accentColor }} />
            <span className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: accentColor }}>{env.toUpperCase()} SCENARIO</span>
            {history.length > 0 && (
              <button onClick={handleBack}
                className="ml-2 text-[10px] text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                ← Back
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div className="absolute top-3 right-4 flex items-center gap-1.5 z-10">
            {Object.keys(nodes).slice(0, 6).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: i <= history.length ? accentColor : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>

          {/* Characters + bubbles */}
          <div className="relative flex items-end justify-between px-8 pt-12 pb-2 gap-4">

            {/* Left: Learner + thought bubble */}
            <div className="flex flex-col items-start" style={{ flex: '0 0 38%' }}>
              <AnimatePresence mode="wait">
                <ThoughtBubble key={`thought-${animKey}`}
                  text={selected ? 'I chose...' : 'What should I do here?'}
                  accent={accentColor} />
              </AnimatePresence>
              <div style={{ height: 130, width: 72 }}>
                <LearnerSVG color={LEARNER_COLOR} />
              </div>
              <span className="text-[10px] font-bold mt-1 tracking-wide"
                style={{ color: `${accentColor}aa` }}>YOU</span>
            </div>

            {/* Right: NPC + speech bubble */}
            <div className="flex flex-col items-end" style={{ flex: '0 0 52%' }}>
              <AnimatePresence mode="wait">
                <SpeechBubble key={`speech-${animKey}`}
                  text={selected?.isCorrectPath === false && node.feedback
                    ? node.feedback
                    : node.content.slice(0, 160) + (node.content.length > 160 ? '…' : '')}
                  accent={accentColor} />
              </AnimatePresence>
              <div style={{ height: 150, width: 86 }}>
                <NpcSVG color={selected ? (selected.isCorrectPath ? '#1e3a5f' : '#7f1d1d') : NPC_COLOR}
                  female={npcFemale} />
              </div>
              <span className="text-[10px] font-bold mt-1 tracking-wide text-slate-400">
                {isDeadEnd ? 'CAUTION' : isEnding ? 'OUTCOME' : 'CONTACT'}
              </span>
            </div>
          </div>

          {/* Feedback banner */}
          <AnimatePresence>
            {feedbackState && (
              <motion.div key="feedback"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-4 mb-3 rounded-xl px-4 py-2.5 flex items-start gap-3"
                style={{
                  background: feedbackState === 'correct' ? 'rgba(16,185,129,0.15)' :
                    feedbackState === 'deadend' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${feedbackState === 'correct' ? '#10b981' : feedbackState === 'deadend' ? '#f59e0b' : '#ef4444'}44`,
                }}>
                {feedbackState === 'correct'
                  ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                  : feedbackState === 'deadend'
                  ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                  : <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />}
                <p className="text-xs leading-relaxed text-slate-200">
                  {node.feedback || (feedbackState === 'correct'
                    ? 'Good choice! That was the right approach.'
                    : 'That approach might have unintended consequences. Consider trying again.')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* ── Choices or Ending ── */}
      <AnimatePresence mode="wait">
        <motion.div key={`choices-${animKey}`}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>

          {isEnding || !node.choices?.length ? (
            /* Ending state */
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-2xl px-6 py-4 text-center max-w-md"
                style={{ background: isDeadEnd ? 'rgba(245,158,11,0.1)' : `${accentColor}18`,
                  border: `1px solid ${isDeadEnd ? '#f59e0b' : accentColor}44` }}>
                <p className="text-sm font-bold mb-1" style={{ color: isDeadEnd ? '#fbbf24' : accentColor }}>
                  {isDeadEnd ? '⚠ Dead End' : '✓ Scenario Complete'}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {node.feedback || node.content}
                </p>
              </div>
              <button onClick={handleRestart}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: accentColor, color: 'white', boxShadow: `0 4px 16px ${accentColor}44` }}>
                <RotateCcw className="w-4 h-4" /> Try Again from Start
              </button>
            </div>
          ) : (
            /* Choice grid */
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-black uppercase tracking-widest mb-1"
                style={{ color: `${accentColor}99` }}>
                What do you do?
              </p>
              <div className={`grid gap-2 ${node.choices.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {node.choices.map((choice, i) => {
                  const isSelected = selected?.id === choice.id;
                  const isWrong = selected && !isSelected;
                  const showResult = isSelected;

                  return (
                    <motion.button key={choice.id}
                      onClick={() => handleChoice(choice)}
                      disabled={!!selected}
                      whileHover={!selected ? { scale: 1.015 } : {}}
                      whileTap={!selected ? { scale: 0.98 } : {}}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 text-sm"
                      style={{
                        background: showResult
                          ? choice.isCorrectPath ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.14)'
                          : isWrong ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
                        border: showResult
                          ? `1.5px solid ${choice.isCorrectPath ? '#10b981' : '#ef4444'}`
                          : isWrong ? '1.5px solid rgba(255,255,255,0.06)' : `1.5px solid ${accentColor}44`,
                        opacity: isWrong ? 0.5 : 1,
                        cursor: selected ? 'default' : 'pointer',
                        color: isLight ? '#1e293b' : 'white',
                      }}>
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
                        style={{
                          background: showResult
                            ? choice.isCorrectPath ? '#10b981' : '#ef4444'
                            : accentColor,
                          color: 'white',
                        }}>
                        {showResult
                          ? choice.isCorrectPath ? '✓' : '✗'
                          : CHOICE_LABELS[i]}
                      </span>
                      <span className="flex-1 leading-snug text-sm font-medium">{choice.text}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Continue button after selection */}
              <AnimatePresence>
                {selected && selected.nextNodeId && nodes[selected.nextNodeId] && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end mt-1">
                    <button onClick={handleContinue}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                      style={{ background: accentColor, color: 'white', boxShadow: `0 4px 16px ${accentColor}44` }}>
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
                {selected && (!selected.nextNodeId || !nodes[selected.nextNodeId]) && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end mt-1">
                    <button onClick={handleRestart}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DialogueBranchingScenario;
