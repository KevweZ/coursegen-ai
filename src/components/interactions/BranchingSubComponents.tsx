/**
 * Branching Scenario — Shared sub-components
 */
import React from 'react';
import { motion } from 'framer-motion';
import { SilhouetteCharacter } from './silhouettes';
import type { SilhouetteId } from './silhouettes';

// ── Character card (silhouette + solid colour backdrop) ───────────────────────
interface CharacterCardProps {
  silhouetteId: SilhouetteId;
  color: string;          // backdrop card colour
  flip?: boolean;         // mirror the silhouette for NPC
  size?: 'sm' | 'md';
}
export const CharacterCard: React.FC<CharacterCardProps> = ({ silhouetteId, color, flip, size = 'md' }) => {
  const h = size === 'sm' ? 140 : 180;
  const w = size === 'sm' ? 72  : 92;
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-2xl overflow-hidden flex items-end justify-center"
        style={{ width: w, height: h, backgroundColor: color, boxShadow: `0 8px 32px ${color}66` }}
      >
        <div style={{ width: w * 0.78, height: h * 0.92, transform: flip ? 'scaleX(-1)' : undefined }}>
          <SilhouetteCharacter id={silhouetteId} color="rgba(0,0,0,0.82)" />
        </div>
      </div>
    </div>
  );
};

// ── Chat bubble (left or right speaker) ─────────────────────────────────────
interface ChatBubbleProps {
  text: string;
  side: 'left' | 'right';
  color: string;          // bubble accent colour
  avatarId: SilhouetteId;
  emoji?: string;
}
export const ChatBubble: React.FC<ChatBubbleProps> = ({ text, side, color, avatarId, emoji }) => {
  const isLeft = side === 'left';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: isLeft ? -8 : 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-end gap-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {/* Mini avatar */}
      <div
        className="shrink-0 rounded-full overflow-hidden flex items-end justify-center"
        style={{ width: 32, height: 32, backgroundColor: color }}
      >
        <div style={{ width: 26, height: 28 }}>
          <SilhouetteCharacter id={avatarId} color="rgba(0,0,0,0.75)" />
        </div>
      </div>

      {/* Bubble */}
      <div
        className="max-w-[200px] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed font-medium text-white relative"
        style={{
          backgroundColor: isLeft ? 'rgba(30,41,59,0.92)' : color,
          borderBottomLeftRadius:  isLeft ? 4 : undefined,
          borderBottomRightRadius: isLeft ? undefined : 4,
          backdropFilter: 'blur(6px)',
          border: `1px solid ${color}55`,
        }}
      >
        {text}
        {emoji && <span className="block text-base mt-1">{emoji}</span>}
      </div>
    </motion.div>
  );
};

// ── Choice row ────────────────────────────────────────────────────────────────
interface ChoiceRowProps {
  label: string;
  text: string;
  accent: string;
  state: 'idle' | 'selected-correct' | 'selected-wrong' | 'dimmed';
  onClick: () => void;
}
export const ChoiceRow: React.FC<ChoiceRowProps> = ({ label, text, accent, state, onClick }) => {
  const bg =
    state === 'selected-correct' ? 'rgba(16,185,129,0.18)' :
    state === 'selected-wrong'   ? 'rgba(239,68,68,0.14)'  :
    state === 'dimmed'           ? 'rgba(255,255,255,0.03)' :
                                   'rgba(255,255,255,0.08)';
  const border =
    state === 'selected-correct' ? '#10b981' :
    state === 'selected-wrong'   ? '#ef4444'  :
    state === 'dimmed'           ? 'rgba(255,255,255,0.08)' :
                                   `${accent}55`;
  const labelBg =
    state === 'selected-correct' ? '#10b981' :
    state === 'selected-wrong'   ? '#ef4444'  :
                                   accent;
  const labelText =
    state === 'selected-correct' ? '✓' :
    state === 'selected-wrong'   ? '✗' :
                                   label;

  return (
    <motion.button
      onClick={onClick}
      disabled={state !== 'idle'}
      whileHover={state === 'idle' ? { x: 4 } : {}}
      whileTap={state === 'idle' ? { scale: 0.98 } : {}}
      className="w-full flex items-center gap-3 rounded-xl px-4 text-left transition-colors text-white"
      style={{ background: bg, border: `1.5px solid ${border}`, height: 52, opacity: state === 'dimmed' ? 0.45 : 1 }}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black text-white"
        style={{ background: labelBg }}
      >
        {labelText}
      </span>
      <span className="flex-1 text-sm font-medium leading-snug">{text}</span>
    </motion.button>
  );
};
