/**
 * DialogueBranchingScenario v2
 * 4-phase architecture: intro → dialogue → choice → outcome
 * Uses photographic environments + SVG silhouette character cards + chat bubbles
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';
import { detectSilhouetteForContext } from './silhouettes';
import type { SilhouetteId } from './silhouettes';
import { CharacterCard, ChatBubble, ChoiceRow } from './BranchingSubComponents';

// ── Types ────────────────────────────────────────────────────────────────────
interface Choice { id: string; text: string; nextNodeId: string; isCorrectPath: boolean; }
interface DialogueBeat { speaker: 'left' | 'right'; text: string; emoji?: string; }
interface CharacterConfig { silhouetteId: SilhouetteId; name: string; color: string; }
interface BranchNode {
  id: string; type: 'scenario' | 'ending'; title: string; content: string;
  isDeadEnd?: boolean; feedback?: string; choices?: Choice[];
  dialogueBeats?: DialogueBeat[];
  characters?: { left?: Partial<CharacterConfig>; right?: Partial<CharacterConfig> };
}
interface Props {
  nodes: Record<string, BranchNode>;
  startNodeId: string;
  theme?: 'light' | 'dark' | 'unified';
  accentColor?: string;
}

// ── Environment backgrounds ──────────────────────────────────────────────────
const BASE = '/eLearning Template Backgrounds/Custom Scenarios';
const ENV_IMAGES: Record<string, { src: string; label: string; overlayOpacity: number }> = {
  office:       { src: `${BASE}/211556671_l.jpg`, label: 'Office',        overlayOpacity: 0.50 },
  meeting:      { src: `${BASE}/118745672_l.jpg`, label: 'Meeting Room',  overlayOpacity: 0.52 },
  medical:      { src: `${BASE}/246942383_l.jpg`, label: 'Medical',       overlayOpacity: 0.45 },
  hospital:     { src: `${BASE}/160008003_l.jpg`, label: 'Hospital',      overlayOpacity: 0.48 },
  retail:       { src: `${BASE}/139337393_l.jpg`, label: 'Retail Store',  overlayOpacity: 0.50 },
  restaurant:   { src: `${BASE}/247540229_l.jpg`, label: 'Restaurant',    overlayOpacity: 0.48 },
  diner:        { src: `${BASE}/280442550_l.jpg`, label: 'Diner',         overlayOpacity: 0.45 },
  warehouse:    { src: `${BASE}/115088300_l.jpg`, label: 'Warehouse',     overlayOpacity: 0.52 },
  factory:      { src: `${BASE}/139263622_l.jpg`, label: 'Factory',       overlayOpacity: 0.52 },
  construction: { src: `${BASE}/243803779_l.jpg`, label: 'Construction',  overlayOpacity: 0.45 },
  energy:       { src: `${BASE}/20109536_l.jpg`,  label: 'Energy Site',   overlayOpacity: 0.52 },
  serverroom:   { src: `${BASE}/148700167_l.jpg`, label: 'Server Room',   overlayOpacity: 0.50 },
  outdoor:      { src: `${BASE}/154325570_l.jpg`, label: 'Outdoor',       overlayOpacity: 0.45 },
  farm:         { src: `${BASE}/199836032_l.jpg`, label: 'Farm',          overlayOpacity: 0.45 },
  default:      { src: `${BASE}/174849752_l.jpg`, label: 'Café',          overlayOpacity: 0.50 },
};
const detectEnv = (text: string) => {
  const t = text.toLowerCase();
  if (/hospital|patient|clinic|medical|nurse|doctor/.test(t)) return 'medical';
  if (/server|data.?center|it.?room|network/.test(t))         return 'serverroom';
  if (/warehouse|logistics|supply|inventory/.test(t))         return 'warehouse';
  if (/factory|manufactur|assembly|production/.test(t))       return 'factory';
  if (/construction|building.?site|scaffold/.test(t))         return 'construction';
  if (/oil|rig|offshore|petroleum|gas.?field/.test(t))        return 'energy';
  if (/farm|agri|wheat|harvest|crop/.test(t))                 return 'farm';
  if (/outdoor|park|nature|open.?air/.test(t))                return 'outdoor';
  if (/restaurant|dining|chef|kitchen|waiter/.test(t))        return 'restaurant';
  if (/diner|café|café|coffee|bistro/.test(t))                return 'diner';
  if (/retail|store|shop|sales.?floor/.test(t))               return 'retail';
  if (/meeting|board.?room|conference/.test(t))               return 'meeting';
  if (/office|desk|corporate|workspace/.test(t))              return 'office';
  return 'default';
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];
const LEFT_DEFAULT_COLOR  = '#4f46e5';
const RIGHT_DEFAULT_COLOR = '#0891b2';

function resolveCharacters(node: BranchNode, context: string, accent: string): { left: CharacterConfig; right: CharacterConfig } {
  const leftId  = (node.characters?.left?.silhouetteId  ?? detectSilhouetteForContext(context, false)) as SilhouetteId;
  const rightId = (node.characters?.right?.silhouetteId ?? detectSilhouetteForContext(context, true))  as SilhouetteId;
  return {
    left:  { silhouetteId: leftId,  name: node.characters?.left?.name  ?? 'You',     color: node.characters?.left?.color  ?? accent },
    right: { silhouetteId: rightId, name: node.characters?.right?.name ?? 'Contact', color: node.characters?.right?.color ?? RIGHT_DEFAULT_COLOR },
  };
}

// Synthesise dialogue beats from node content when none are authored
function synthBeats(node: BranchNode): DialogueBeat[] {
  if (node.dialogueBeats?.length) return node.dialogueBeats;
  return [{ speaker: 'right', text: node.content.slice(0, 180) + (node.content.length > 180 ? '…' : '') }];
}

// ── Main component ───────────────────────────────────────────────────────────
type Phase = 'dialogue' | 'choice' | 'outcome';

export const DialogueBranchingScenario: React.FC<Props> = ({
  nodes, startNodeId, theme = 'dark', accentColor = '#4f46e5',
}) => {
  const [nodeId,    setNodeId]    = useState(startNodeId);
  const [phase,     setPhase]     = useState<Phase>('dialogue');
  const [beatIdx,   setBeatIdx]   = useState(0);
  const [selected,  setSelected]  = useState<Choice | null>(null);
  const [history,   setHistory]   = useState<string[]>([]);
  const [animKey,   setAnimKey]   = useState(0);

  const node = nodes[nodeId];
  if (!node) return null;

  const env     = detectEnv(node.title + ' ' + node.content);
  const envData = ENV_IMAGES[env] ?? ENV_IMAGES['default'];
  const chars   = resolveCharacters(node, node.title + ' ' + node.content, accentColor);
  const beats   = synthBeats(node);
  const isEnding = node.type === 'ending' || (!node.choices?.length);

  // Overlay is heavier during choice phase
  const overlayOpacity = phase === 'choice' ? Math.min(envData.overlayOpacity + 0.18, 0.72) : envData.overlayOpacity;

  const advanceBeat = useCallback(() => {
    if (beatIdx < beats.length - 1) { setBeatIdx(b => b + 1); return; }
    if (isEnding) { setPhase('outcome'); return; }
    setPhase('choice');
  }, [beatIdx, beats.length, isEnding]);

  const handleChoice = (choice: Choice) => {
    if (selected) return;
    setSelected(choice);
    setPhase('outcome');
  };

  const handleContinueOutcome = () => {
    if (!selected?.nextNodeId || !nodes[selected.nextNodeId]) return;
    setHistory(h => [...h, nodeId]);
    setNodeId(selected.nextNodeId);
    setSelected(null);
    setPhase('dialogue');
    setBeatIdx(0);
    setAnimKey(k => k + 1);
  };

  const handleRestart = () => {
    setNodeId(startNodeId); setSelected(null);
    setHistory([]); setPhase('dialogue');
    setBeatIdx(0); setAnimKey(k => k + 1);
  };

  const handleBack = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setNodeId(prev); setSelected(null);
    setPhase('dialogue'); setBeatIdx(0);
    setAnimKey(k => k + 1);
  };

  // Feedback colours
  const isCorrect = selected?.isCorrectPath;
  const feedbackColor = isCorrect ? '#10b981' : node.isDeadEnd ? '#f59e0b' : '#ef4444';
  const feedbackIcon  = isCorrect
    ? <CheckCircle  className="w-4 h-4 shrink-0" style={{ color: feedbackColor }} />
    : node.isDeadEnd
    ? <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: feedbackColor }} />
    : <XCircle      className="w-4 h-4 shrink-0" style={{ color: feedbackColor }} />;
  const feedbackText = node.feedback || (isCorrect ? 'Good choice! That was the right approach.' : 'That path leads to a negative outcome. Try again.');

  return (
    <div className="w-full select-none" style={{ fontFamily: 'inherit' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
          style={{ backgroundImage: `url('${envData.src}')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 360 }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 pointer-events-none transition-all duration-500"
            style={{ background: `rgba(0,0,0,${overlayOpacity})` }} />

          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 70% 50% at 50% 90%, ${accentColor}15, transparent 70%)` }} />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-20">
            {/* Scene tag + back */}
            <div className="flex items-center gap-2">
              <div className="rounded-full px-2.5 py-0.5 flex items-center gap-1.5"
                style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}55`, backdropFilter: 'blur(4px)' }}>
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{envData.label}</span>
              </div>
              {history.length > 0 && (
                <button onClick={handleBack}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  ← Back
                </button>
              )}
            </div>
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {Object.keys(nodes).slice(0, 7).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i < history.length ? accentColor : i === history.length ? `${accentColor}88` : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
          </div>

          {/* ── PHASE: DIALOGUE ─────────────────────────────────────────────── */}
          {phase === 'dialogue' && (
            <div className="flex flex-col" style={{ minHeight: 360 }}>
              {/* Characters row */}
              <div className="flex items-end justify-between px-6 pt-14 pb-0 gap-4">
                {/* Left character */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                  <CharacterCard silhouetteId={chars.left.silhouetteId} color={chars.left.color} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center mt-1.5"
                    style={{ color: `${chars.left.color}cc` }}>{chars.left.name}</p>
                </motion.div>

                {/* Chat bubbles — middle */}
                <div className="flex-1 flex flex-col gap-2.5 pb-2 px-2 max-w-xs mx-auto" style={{ minHeight: 180 }}>
                  <AnimatePresence>
                    {beats.slice(0, beatIdx + 1).map((beat, i) => (
                      <ChatBubble
                        key={i}
                        text={beat.text}
                        side={beat.speaker}
                        color={beat.speaker === 'left' ? chars.left.color : chars.right.color}
                        avatarId={beat.speaker === 'left' ? chars.left.silhouetteId : chars.right.silhouetteId}
                        emoji={beat.emoji}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Right character */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="flex flex-col items-center">
                  <CharacterCard silhouetteId={chars.right.silhouetteId} color={chars.right.color} flip />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center mt-1.5"
                    style={{ color: `${chars.right.color}cc` }}>{chars.right.name}</p>
                </motion.div>
              </div>

              {/* Continue / next beat button */}
              <div className="flex justify-center pb-5 pt-3">
                <motion.button
                  onClick={advanceBeat}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white"
                  style={{ background: accentColor, boxShadow: `0 4px 20px ${accentColor}55` }}
                >
                  {beatIdx < beats.length - 1 ? 'Next' : isEnding ? 'Finish' : 'Choose'}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}

          {/* ── PHASE: CHOICE ───────────────────────────────────────────────── */}
          {phase === 'choice' && node.choices?.length > 0 && (
            <div className="flex items-start gap-4 px-5 pt-14 pb-5" style={{ minHeight: 360 }}>
              {/* Choices column */}
              <div className="flex-1 flex flex-col gap-3">
                {/* Question header */}
                <div className="rounded-xl px-4 py-3 mb-1"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: `1px solid ${accentColor}44` }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                    What do you do?
                  </p>
                  <p className="text-sm font-bold text-white leading-snug">{node.title}</p>
                </div>
                {/* Choice rows */}
                {node.choices.map((choice, i) => (
                  <ChoiceRow
                    key={choice.id}
                    label={CHOICE_LABELS[i] ?? String(i + 1)}
                    text={choice.text}
                    accent={accentColor}
                    state="idle"
                    onClick={() => handleChoice(choice)}
                  />
                ))}
              </div>

              {/* Protagonist (thinking pose) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-center shrink-0"
              >
                <CharacterCard silhouetteId={chars.left.silhouetteId} color={chars.left.color} size="sm" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center mt-1.5"
                  style={{ color: `${chars.left.color}cc` }}>{chars.left.name}</p>
              </motion.div>
            </div>
          )}

          {/* ── PHASE: OUTCOME ──────────────────────────────────────────────── */}
          {phase === 'outcome' && (
            <div className="flex flex-col" style={{ minHeight: 360 }}>
              {/* Feedback badge */}
              <div className="flex justify-center pt-14 pb-2">
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-full px-4 py-2"
                  style={{ background: `${feedbackColor}22`, border: `1.5px solid ${feedbackColor}66`, backdropFilter: 'blur(6px)' }}
                >
                  {feedbackIcon}
                  <span className="text-xs font-bold" style={{ color: feedbackColor }}>
                    {isCorrect ? 'Correct path!' : node.isDeadEnd ? 'Dead end' : 'Incorrect'}
                  </span>
                </motion.div>
              </div>

              {/* Characters row with NPC speaking consequence */}
              <div className="flex items-end justify-between px-6 pb-0 gap-4">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                  <CharacterCard silhouetteId={chars.left.silhouetteId} color={chars.left.color} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center mt-1.5"
                    style={{ color: `${chars.left.color}cc` }}>{chars.left.name}</p>
                </motion.div>

                {/* Feedback chat bubble */}
                <div className="flex-1 flex flex-col gap-2.5 pb-2 px-2 max-w-xs mx-auto">
                  <ChatBubble
                    text={feedbackText}
                    side="right"
                    color={chars.right.color}
                    avatarId={chars.right.silhouetteId}
                    emoji={isCorrect ? '✅' : node.isDeadEnd ? '⚠️' : '❌'}
                  />
                </div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center">
                  <CharacterCard silhouetteId={chars.right.silhouetteId} color={chars.right.color} flip />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center mt-1.5"
                    style={{ color: `${chars.right.color}cc` }}>{chars.right.name}</p>
                </motion.div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center gap-3 pb-5 pt-4">
                {selected?.nextNodeId && nodes[selected.nextNodeId] && !isEnding ? (
                  <motion.button
                    onClick={handleContinueOutcome}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white"
                    style={{ background: accentColor, boxShadow: `0 4px 20px ${accentColor}55` }}
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleRestart}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                  >
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </motion.button>
                )}
                {(node.isDeadEnd || !isCorrect) && selected?.nextNodeId && nodes[selected.nextNodeId] && (
                  <motion.button
                    onClick={handleRestart}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-slate-300"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restart
                  </motion.button>
                )}
              </div>
            </div>
          )}

          {/* Ending screen (no choices) */}
          {isEnding && phase === 'outcome' && !selected && (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="rounded-2xl px-6 py-5 text-center max-w-sm mx-auto"
                style={{ background: node.isDeadEnd ? 'rgba(245,158,11,0.12)' : `${accentColor}18`,
                  border: `1.5px solid ${node.isDeadEnd ? '#f59e0b' : accentColor}44`, backdropFilter: 'blur(8px)' }}>
                <p className="text-base font-black mb-2" style={{ color: node.isDeadEnd ? '#fbbf24' : accentColor }}>
                  {node.isDeadEnd ? '⚠ Dead End' : '✓ Scenario Complete'}
                </p>
                <p className="text-sm text-slate-200 leading-relaxed">{node.feedback || node.content}</p>
              </div>
              <button onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: accentColor, boxShadow: `0 4px 20px ${accentColor}44` }}>
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DialogueBranchingScenario;
