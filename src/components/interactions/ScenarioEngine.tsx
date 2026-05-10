import React, { useReducer, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckSquare, Square, RotateCcw, Award, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type {
  ScenarioData, ScenarioNode, ScenarioOption,
  ScenarioEngineState, ScoreKey,
} from '../../types/scenario';
import {
  INITIAL_SCORES, evaluateRouting, evaluateEnding, applyDeltas,
} from '../../types/scenario';

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START' }
  | { type: 'SELECT_SINGLE'; optionId: string }
  | { type: 'TOGGLE_MULTI'; optionId: string }
  | { type: 'CONFIRM_MULTI' }
  | { type: 'CONTINUE'; data: ScenarioData }
  | { type: 'RESTART' };

function reducer(state: ScenarioEngineState, action: Action): ScenarioEngineState {
  switch (action.type) {
    case 'START':
      return { ...state, phase: 'playing' };

    case 'SELECT_SINGLE': {
      return {
        ...state,
        phase: 'consequence',
        selectedOptions: {
          ...state.selectedOptions,
          [state.currentNodeId]: [action.optionId],
        },
      };
    }

    case 'TOGGLE_MULTI': {
      const id = action.optionId;
      const current = state.pendingMultiSelections;
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...state, pendingMultiSelections: next };
    }

    case 'CONFIRM_MULTI': {
      return {
        ...state,
        phase: 'consequence',
        selectedOptions: {
          ...state.selectedOptions,
          [state.currentNodeId]: state.pendingMultiSelections,
        },
      };
    }

    case 'CONTINUE': {
      const { data } = action;
      const node = data.nodes[state.currentNodeId];
      const chosenIds = state.selectedOptions[state.currentNodeId] ?? [];

      // Apply score deltas for chosen options
      let newScores = { ...state.scores };
      chosenIds.forEach(id => {
        const opt = node.options.find(o => o.id === id);
        if (opt) newScores = applyDeltas(newScores, opt.scoreDeltas);
      });

      // Determine next node
      const firstChosen = node.options.find(o => o.id === chosenIds[0]);
      let nextId: string;

      if (firstChosen?.nextNodeId) {
        nextId = firstChosen.nextNodeId;
      } else {
        nextId = evaluateRouting(node.routing, newScores, chosenIds);
      }

      const completed = [...state.completedNodeIds, state.currentNodeId];

      if (nextId === 'ending') {
        const ending = evaluateEnding(data.endings, newScores);
        return {
          ...state, scores: newScores, completedNodeIds: completed,
          phase: 'ended', endingId: ending.id, pendingMultiSelections: [],
        };
      }

      return {
        ...state, scores: newScores, completedNodeIds: completed,
        currentNodeId: nextId, phase: 'playing', pendingMultiSelections: [],
      };
    }

    case 'RESTART':
      return {
        phase: 'intro', currentNodeId: '', completedNodeIds: [],
        selectedOptions: {}, scores: { ...INITIAL_SCORES },
        pendingMultiSelections: [], endingId: null,
      };

    default:
      return state;
  }
}

// ── Markdown inline renderer ─────────────────────────────────────────────────
// Converts **bold** markers to <strong> elements. Preserves line breaks.
function renderMd(text: string): React.ReactNode {
  return text.split('\n').map((line, li) => (
    <React.Fragment key={li}>
      {li > 0 && '\n'}
      {line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </React.Fragment>
  ));
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SituationBlock: React.FC<{ text: string; theme: string }> = ({ text, theme }) => (
  <div className={cn(
    'rounded-xl border-l-4 border-indigo-500 px-5 py-4 text-base leading-relaxed whitespace-pre-line',
    theme === 'light' ? 'bg-slate-50 text-slate-700' : 'bg-slate-800/50 text-slate-300',
  )}>
    {renderMd(text)}
  </div>
);

const OptionCard: React.FC<{
  option: ScenarioOption;
  state: 'idle' | 'selected' | 'dimmed';
  onSelect: () => void;
  theme: string;
}> = ({ option, state, onSelect, theme }) => {
  const isLight = theme === 'light';
  return (
    <motion.div layout className="overflow-hidden rounded-xl">
      <button
        onClick={state === 'idle' ? onSelect : undefined}
        disabled={state !== 'idle'}
        className={cn(
          'w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200',
          state === 'idle' && 'cursor-pointer hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/10',
          state === 'selected' && 'border-indigo-500 shadow-lg shadow-indigo-500/20',
          state === 'dimmed' && 'opacity-40 cursor-default',
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-800/60 border-slate-700 text-slate-200',
        )}
      >
        <p className="text-base font-medium leading-relaxed">{option.text}</p>
      </button>

      <AnimatePresence>
        {state === 'selected' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={cn(
              'mx-0.5 rounded-b-xl border border-t-0 px-5 py-4 space-y-2',
              isLight
                ? 'bg-amber-50 border-amber-200'
                : 'bg-amber-900/20 border-amber-700/40',
            )}>
              <p className={cn('text-[10px] font-black uppercase tracking-widest', isLight ? 'text-amber-600' : 'text-amber-400')}>
                What happened next
              </p>
              <p className={cn('text-base leading-relaxed', isLight ? 'text-amber-900' : 'text-amber-200')}>
                {option.consequence}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MultiOptionCard: React.FC<{
  option: ScenarioOption;
  checked: boolean;
  confirmed: boolean;
  onToggle: () => void;
  theme: string;
  limit: number;
  selectedCount: number;
}> = ({ option, checked, confirmed, onToggle, theme, limit, selectedCount }) => {
  const isLight = theme === 'light';
  const disabled = confirmed || (!checked && selectedCount >= limit);

  return (
    <motion.div layout className="overflow-hidden rounded-xl">
      <button
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={cn(
          'w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3',
          !disabled && 'cursor-pointer hover:border-indigo-400',
          checked && !confirmed && 'border-indigo-500 shadow-md shadow-indigo-500/20',
          confirmed && checked && 'border-indigo-500',
          confirmed && !checked && 'opacity-40',
          !checked && !confirmed && 'opacity-80',
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-800/60 border-slate-700 text-slate-200',
        )}
      >
        {checked
          ? <CheckSquare className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
          : <Square className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />}
        <p className="text-base font-medium leading-relaxed">{option.text}</p>
      </button>

      <AnimatePresence>
        {confirmed && checked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={cn(
              'mx-0.5 rounded-b-xl border border-t-0 px-5 py-4 space-y-2',
              isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-700/40',
            )}>
              <p className={cn('text-[10px] font-black uppercase tracking-widest', isLight ? 'text-amber-600' : 'text-amber-400')}>
                What happened next
              </p>
              <p className={cn('text-base leading-relaxed', isLight ? 'text-amber-900' : 'text-amber-200')}>
                {option.consequence}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Ending Screen ─────────────────────────────────────────────────────────────

const EndingScreen: React.FC<{
  data: ScenarioData;
  endingId: string;
  scores: Record<ScoreKey, number>;
  theme: string;
  onRestart: () => void;
}> = ({ data, endingId, scores, theme, onRestart }) => {
  const ending = data.endings.find(e => e.id === endingId) ?? data.endings[data.endings.length - 1];
  const isLight = theme === 'light';
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  const typeConfig = {
    success:  { icon: Award,         color: 'emerald', label: 'Successful Resolution' },
    partial:  { icon: TrendingUp,    color: 'amber',   label: 'Partial Success' },
    negative: { icon: AlertTriangle, color: 'red',     label: 'Needs Development' },
  }[ending.type];
  const Icon = typeConfig.icon;

  const scoreLabels: { key: ScoreKey; label: string }[] = [
    { key: 'trust',                label: 'Trust' },
    { key: 'accountability',       label: 'Accountability' },
    { key: 'stakeholderConfidence',label: 'Stakeholder Confidence' },
    { key: 'morale',               label: 'Morale' },
    { key: 'risk',                 label: 'Risk Management' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Ending type badge */}
      <div className={cn(
        'flex items-center gap-3 rounded-xl p-5',
        ending.type === 'success'  && (isLight ? 'bg-emerald-50 border border-emerald-200' : 'bg-emerald-900/20 border border-emerald-700/30'),
        ending.type === 'partial'  && (isLight ? 'bg-amber-50 border border-amber-200' : 'bg-amber-900/20 border border-amber-700/30'),
        ending.type === 'negative' && (isLight ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-700/30'),
      )}>
        <Icon className={cn('w-8 h-8 shrink-0',
          ending.type === 'success' ? 'text-emerald-500' : ending.type === 'partial' ? 'text-amber-500' : 'text-red-500'
        )} />
        <div>
          <p className={cn('text-xs font-black uppercase tracking-wider',
            ending.type === 'success' ? 'text-emerald-500' : ending.type === 'partial' ? 'text-amber-500' : 'text-red-500'
          )}>{typeConfig.label}</p>
          <h3 className={cn('font-black text-lg', isLight ? 'text-slate-900' : 'text-white')}>{ending.title}</h3>
        </div>
      </div>

      {/* Narrative */}
      <p className={cn('text-base leading-relaxed', isLight ? 'text-slate-700' : 'text-slate-300')}>
        {ending.narrative}
      </p>

      {/* Outcomes */}
      <div className={cn('rounded-xl border p-4 space-y-2', isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700')}>
        <p className={cn('text-xs font-black uppercase tracking-wider text-indigo-400')}>Outcomes</p>
        <ul className="space-y-1">
          {ending.outcomes.map((o, i) => (
            <li key={i} className={cn('flex items-start gap-2 text-base', isLight ? 'text-slate-700' : 'text-slate-300')}>
              <span className="text-indigo-400 mt-0.5">·</span>{o}
            </li>
          ))}
        </ul>
      </div>

      {/* Score breakdown */}
      <div className={cn('rounded-xl border p-4 space-y-3', isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700')}>
        <p className="text-xs font-black uppercase tracking-wider text-indigo-400">Decision Profile</p>
        {scoreLabels.map(({ key, label }) => {
          const val = scores[key] ?? 0;
          const pct = Math.max(0, Math.min(100, ((val + 10) / 20) * 100));
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between">
                <span className={cn('text-xs font-medium', isLight ? 'text-slate-600' : 'text-slate-400')}>{label}</span>
                <span className={cn('text-xs font-bold tabular-nums', val >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {val >= 0 ? '+' : ''}{val}
                </span>
              </div>
              <div className={cn('h-1.5 rounded-full', isLight ? 'bg-slate-200' : 'bg-slate-700')}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', val >= 3 ? 'bg-emerald-500' : val >= 0 ? 'bg-amber-500' : 'bg-red-500')}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Coaching feedback */}
      <div className={cn('rounded-xl border-l-4 border-indigo-500 px-5 py-4', isLight ? 'bg-indigo-50' : 'bg-indigo-900/20')}>
        <p className="text-xs font-black uppercase tracking-wider text-indigo-400 mb-2">Coaching Insight</p>
        <p className={cn('text-base leading-relaxed', isLight ? 'text-slate-700' : 'text-slate-300')}>{ending.competencyFeedback}</p>
      </div>

      {/* Restart */}
      <button
        onClick={onRestart}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Replay Scenario
      </button>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  data: ScenarioData;
  theme: 'light' | 'dark' | 'unified';
  onComplete?: () => void;
}

export const ScenarioEngine: React.FC<Props> = ({ data, theme, onComplete }) => {
  const isLight = theme === 'light';

  const [state, dispatch] = useReducer(reducer, {
    phase: 'intro',
    currentNodeId: data.startNodeId,
    completedNodeIds: [],
    selectedOptions: {},
    scores: { ...INITIAL_SCORES },
    pendingMultiSelections: [],
    endingId: null,
  });

  // Notify parent when scenario is completed so the Next button can unlock
  useEffect(() => {
    if (state.phase === 'ended') onComplete?.();
  }, [state.phase, onComplete]);

  const node: ScenarioNode | undefined = data.nodes[state.currentNodeId];
  const chosenIds = state.selectedOptions[state.currentNodeId] ?? [];
  const isConsequence = state.phase === 'consequence';
  const totalNodes = Object.keys(data.nodes).length;
  const progress = state.completedNodeIds.length;

  const handleContinue = useCallback(() => {
    dispatch({ type: 'CONTINUE', data });
  }, [data]);

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (state.phase === 'intro') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 w-full">
        <div className={cn('rounded-xl border p-6 space-y-4', isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700')}>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-400 mb-1">Your Role</p>
            <p className={cn('font-bold text-base', isLight ? 'text-slate-900' : 'text-white')}>{data.role}</p>
          </div>
          <div className={cn('border-t pt-4', isLight ? 'border-slate-200' : 'border-slate-700')}>
            <p className={cn('text-base leading-relaxed whitespace-pre-line', isLight ? 'text-slate-700' : 'text-slate-300')}>
              {renderMd(data.introduction)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => dispatch({ type: 'START' })}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25"
          >
            Begin Scenario <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex gap-4 text-xs text-slate-400">
            <span>⏱ {data.metadata.estimatedTime}</span>
            <span>◆ {data.metadata.difficulty}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Ended ─────────────────────────────────────────────────────────────────
  if (state.phase === 'ended' && state.endingId) {
    return (
      <EndingScreen
        data={data} endingId={state.endingId} scores={state.scores}
        theme={theme} onRestart={() => { dispatch({ type: 'RESTART' }); }}
      />
    );
  }

  // ── Playing / Consequence ─────────────────────────────────────────────────
  if (!node) return null;

  const phaseLabel = node.label ?? `Phase ${node.phase}`;

  return (
    <motion.div
      key={state.currentNodeId}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-5 w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full',
          isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-900/40 text-indigo-300'
        )}>
          {phaseLabel}
        </span>
        <div className="flex items-center gap-2">
          <div className={cn('h-1.5 rounded-full overflow-hidden w-24', isLight ? 'bg-slate-200' : 'bg-slate-700')}>
            <motion.div
              animate={{ width: `${(progress / totalNodes) * 100}%` }}
              className="h-full rounded-full bg-indigo-500"
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs text-slate-400">{progress}/{totalNodes}</span>
        </div>
      </div>

      {/* Situation */}
      <SituationBlock text={node.situation} theme={theme} />

      {/* Question */}
      <p className={cn('font-black text-lg leading-snug', isLight ? 'text-slate-900' : 'text-white')}>
        {node.question}
        {node.type === 'multi' && (
          <span className="ml-2 text-xs font-normal text-indigo-400">(Select {node.multiSelectCount})</span>
        )}
      </p>

      {/* Options */}
      <div className="space-y-3">
        {node.type === 'single'
          ? node.options.map(opt => (
            <OptionCard
              key={opt.id}
              option={opt}
              state={
                isConsequence
                  ? chosenIds.includes(opt.id) ? 'selected' : 'dimmed'
                  : 'idle'
              }
              onSelect={() => dispatch({ type: 'SELECT_SINGLE', optionId: opt.id })}
              theme={theme}
            />
          ))
          : node.options.map(opt => (
            <MultiOptionCard
              key={opt.id}
              option={opt}
              checked={state.pendingMultiSelections.includes(opt.id) || chosenIds.includes(opt.id)}
              confirmed={isConsequence}
              onToggle={() => dispatch({ type: 'TOGGLE_MULTI', optionId: opt.id })}
              theme={theme}
              limit={node.multiSelectCount ?? 2}
              selectedCount={state.pendingMultiSelections.length}
            />
          ))
        }
      </div>

      {/* Multi confirm button */}
      {node.type === 'multi' && !isConsequence && (
        <button
          onClick={() => dispatch({ type: 'CONFIRM_MULTI' })}
          disabled={state.pendingMultiSelections.length !== (node.multiSelectCount ?? 2)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all',
            state.pendingMultiSelections.length === (node.multiSelectCount ?? 2)
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
              : isLight ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          )}
        >
          Confirm Selection
        </button>
      )}

      {/* Continue button after consequence */}
      <AnimatePresence>
        {isConsequence && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
