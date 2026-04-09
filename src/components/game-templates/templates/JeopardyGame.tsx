import React, { useState, useMemo } from 'react';
import { JeopardyPayload } from '../../../types/game';
import { cn } from '../../../lib/utils';
import { CheckCircle2, XCircle, Target, Star } from 'lucide-react';

interface Props {
  payload: JeopardyPayload;
}

// Derive difficulty label + color from a question's value relative to the overall max value
function getDifficulty(value: number, maxValue: number): { label: string; stars: number; color: string; ring: string } {
  const pct = value / maxValue;
  if (pct <= 0.25) return { label: 'Beginner', stars: 1, color: 'text-emerald-400', ring: 'border-emerald-500' };
  if (pct <= 0.50) return { label: 'Intermediate', stars: 2, color: 'text-yellow-400', ring: 'border-yellow-500' };
  if (pct <= 0.75) return { label: 'Advanced', stars: 3, color: 'text-orange-400', ring: 'border-orange-500' };
  return { label: 'Expert', stars: 4, color: 'text-red-400', ring: 'border-red-500' };
}

export function JeopardyGame({ payload }: Props) {
  const categories = payload.gamePayload?.categories || (payload as any).categories;

  // Pre-compute scoring constants
  const allQuestions = useMemo(() =>
    categories.flatMap((c: any) => c.questions), [categories]);
  const maxScore = useMemo(() =>
    allQuestions.reduce((sum: number, q: any) => sum + q.value, 0), [allQuestions]);
  const targetScore = Math.round(maxScore * 0.8);
  const maxValue = useMemo(() =>
    Math.max(...allQuestions.map((q: any) => q.value)), [allQuestions]);

  const [score, setScore] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<null | any>(null);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [evaluated, setEvaluated] = useState<{ isCorrect: boolean; feedback: string } | null>(null);

  // Shuffle options once per active question
  const shuffledOptions = useMemo(() => {
    if (!activeQuestion?.options) return [];
    return [...activeQuestion.options].sort(() => Math.random() - 0.5);
  }, [activeQuestion]);

  const handleCellClick = (question: any) => {
    if (answeredIds.has(question.id)) return;
    setActiveQuestion(question);
    setUserAnswer('');
    setSelectedOption(null);
    setEvaluated(null);
  };

  const handleSubmit = () => {
    const answer = activeQuestion.options ? (selectedOption ?? '') : userAnswer;
    const isCorrect = answer.toLowerCase().trim() === activeQuestion.correctAnswer.toLowerCase().trim();
    if (isCorrect) {
      setEvaluated({ isCorrect: true, feedback: `✓ Correct! +$${activeQuestion.value}` });
      setScore(prev => prev + activeQuestion.value);
    } else {
      setEvaluated({ isCorrect: false, feedback: `✗ Incorrect. The answer was: "${activeQuestion.correctAnswer}"` });
      if (payload.gamePayload.deductPointsOnWrong) setScore(prev => prev - activeQuestion.value);
    }
  };

  const handleClose = () => {
    setAnsweredIds(prev => new Set(prev).add(activeQuestion.id));
    setActiveQuestion(null);
    setUserAnswer('');
    setSelectedOption(null);
    setEvaluated(null);
  };

  const isMultiChoice = !!activeQuestion?.options?.length;
  const canSubmit = isMultiChoice ? !!selectedOption : !!userAnswer.trim();

  // Progress toward target
  const progressPct = Math.min(100, Math.round((score / targetScore) * 100));
  const goalReached = score >= targetScore;
  const allAnswered = answeredIds.size === allQuestions.length;

  return (
    <div className="h-full flex flex-col relative w-full gap-4">

      {/* ── Score + Target Header ── */}
      <div className="flex items-stretch gap-3">
        {/* Current Score */}
        <div className="flex-1 bg-indigo-900/60 border-2 border-indigo-500/60 rounded-xl px-4 py-3 flex flex-col items-center justify-center shadow-lg">
          <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-0.5">Your Score</span>
          <span className="text-3xl font-black text-white">${score.toLocaleString()}</span>
        </div>

        {/* Target Score */}
        <div className={cn(
          'flex-1 rounded-xl px-4 py-3 flex flex-col items-center justify-center shadow-lg border-2 transition-colors',
          goalReached
            ? 'bg-emerald-900/60 border-emerald-500/60'
            : 'bg-slate-800/80 border-slate-600/60'
        )}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Target className={cn('w-3.5 h-3.5', goalReached ? 'text-emerald-400' : 'text-amber-400')} />
            <span className={cn('text-xs font-black uppercase tracking-widest', goalReached ? 'text-emerald-400' : 'text-amber-400')}>
              Target Score
            </span>
          </div>
          <span className={cn('text-3xl font-black', goalReached ? 'text-emerald-300' : 'text-white')}>
            ${targetScore.toLocaleString()}
          </span>
          {goalReached && (
            <span className="text-emerald-400 text-xs font-bold mt-0.5">🏆 Goal Reached!</span>
          )}
        </div>

        {/* Max possible */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-3 flex flex-col items-center justify-center min-w-[80px]">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Max</span>
          <span className="text-lg font-black text-slate-400">${maxScore.toLocaleString()}</span>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
        <div
          className={cn('h-full rounded-full transition-all duration-700', goalReached ? 'bg-emerald-500' : 'bg-indigo-500')}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-slate-500 -mt-3">
        <span>$0</span>
        <span className="text-amber-500">Target: ${targetScore.toLocaleString()} ({progressPct}%)</span>
        <span>${maxScore.toLocaleString()}</span>
      </div>

      {/* Difficulty legend */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] font-bold text-slate-500 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
        <span className="uppercase tracking-widest shrink-0">⭐ Difficulty:</span>
        <span className="text-emerald-400">★☆☆☆ Beginner</span>
        <span className="text-yellow-400">★★☆☆ Intermediate</span>
        <span className="text-orange-400">★★★☆ Advanced</span>
        <span className="text-red-400">★★★★ Expert</span>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
        {/* Category Headers */}
        {categories.map((cat: any) => (
          <div key={cat.id} className="bg-indigo-900/80 border-2 border-indigo-400 text-indigo-100 font-bold text-xs md:text-sm text-center uppercase tracking-wide flex items-center justify-center p-2 rounded-t-lg shadow-inner shadow-indigo-400/20 min-h-[4rem] line-clamp-2">
            {cat.name}
          </div>
        ))}

        {/* Question Cells */}
        {Array.from({ length: Math.max(...categories.map((c: any) => c.questions.length)) }).map((_, rowIdx) => (
          <React.Fragment key={rowIdx}>
            {categories.map((cat: any, colIdx: number) => {
              const question = cat.questions[rowIdx];
              if (!question) return <div key={`${colIdx}-${rowIdx}`} className="bg-slate-800/50 rounded-lg" />;
              const isAnswered = answeredIds.has(question.id);
              const diff = getDifficulty(question.value, maxValue);
              return (
                <button
                  key={question.id}
                  disabled={isAnswered}
                  onClick={() => handleCellClick(question)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 transition-all rounded-lg overflow-hidden p-2 relative',
                    isAnswered
                      ? 'bg-slate-800 text-slate-700 opacity-40 cursor-not-allowed border border-slate-700'
                      : 'bg-indigo-600 border-2 border-indigo-400 text-yellow-400 hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] z-10 shadow-lg cursor-pointer'
                  )}
                >
                  {!isAnswered && (
                    <>
                      <span className="text-xl md:text-2xl font-black">${question.value}</span>
                      <span className={cn('text-[9px] font-black uppercase tracking-wider', diff.color)}>
                        {'★'.repeat(diff.stars)}{'☆'.repeat(4 - diff.stars)}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* ── Game Over Banner ── */}
      {allAnswered && !activeQuestion && (
        <div className={cn(
          'rounded-xl p-4 text-center font-black text-lg border-2',
          goalReached
            ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300'
            : 'bg-red-900/30 border-red-500/50 text-red-300'
        )}>
          {goalReached
            ? `🏆 Excellent! You scored $${score.toLocaleString()} — target reached!`
            : `Game Over — $${score.toLocaleString()} / $${targetScore.toLocaleString()} target. Keep practicing!`}
        </div>
      )}

      {/* ── Active Question Modal ── */}
      {activeQuestion && (() => {
        const diff = getDifficulty(activeQuestion.value, maxValue);
        return (
          <div className="absolute inset-0 bg-indigo-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 rounded-2xl border-4 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.3)] animate-in zoom-in-95 duration-200">
            <div className="max-w-3xl w-full flex flex-col items-center gap-5 text-center bg-indigo-900/40 p-6 md:p-10 rounded-3xl border border-indigo-500/20 max-h-[90%] overflow-y-auto">
              
              {activeQuestion.isDailyDouble && (
                <h2 className="text-xl md:text-3xl font-black text-yellow-400 uppercase tracking-widest animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                  Daily Double
                </h2>
              )}

              {/* Value + Difficulty badges side by side */}
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/30 border border-indigo-500/40 rounded-xl px-4 py-1.5 text-indigo-200 text-sm font-black">
                  ${activeQuestion.value}
                </div>
                <div className={cn('border rounded-xl px-4 py-1.5 text-sm font-black flex items-center gap-1.5 bg-slate-900/60', diff.ring, diff.color)}>
                  <Star className="w-3.5 h-3.5" />
                  {diff.label}
                </div>
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-white leading-relaxed drop-shadow-lg break-words w-full">
                {activeQuestion.prompt}
              </h1>

              {/* Multiple choice or free-text */}
              {isMultiChoice ? (
                <div className="w-full grid grid-cols-1 gap-3 mt-2">
                  {shuffledOptions.map((opt: string) => {
                    let cls = 'border-slate-600 bg-slate-800/60 text-gray-200 hover:bg-slate-700 hover:border-indigo-400';
                    if (evaluated) {
                      if (opt === activeQuestion.correctAnswer) cls = 'border-emerald-500 bg-emerald-500/20 text-emerald-200';
                      else if (opt === selectedOption) cls = 'border-red-500 bg-red-500/20 text-red-200';
                      else cls = 'border-slate-700 bg-slate-800/40 text-slate-500 opacity-50';
                    } else if (selectedOption === opt) {
                      cls = 'border-yellow-400 bg-yellow-400/20 text-yellow-200';
                    }
                    return (
                      <button
                        key={opt}
                        disabled={!!evaluated}
                        onClick={() => setSelectedOption(opt)}
                        className={cn('w-full text-left px-5 py-4 rounded-xl border-2 font-semibold text-sm md:text-base transition-all flex items-center gap-3', cls)}
                      >
                        {evaluated && opt === activeQuestion.correctAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {evaluated && opt === selectedOption && opt !== activeQuestion.correctAnswer && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full max-w-lg mt-2">
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !evaluated && canSubmit && handleSubmit()}
                    disabled={!!evaluated}
                    className="w-full bg-indigo-950/50 border-2 border-indigo-500/50 rounded-xl px-4 py-3 md:py-4 text-white text-base focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all text-center disabled:opacity-50"
                  />
                </div>
              )}

              {/* Feedback */}
              {evaluated && (
                <div className={cn(
                  'w-full max-w-lg p-4 rounded-xl font-bold border-2 text-base animate-in slide-in-from-bottom-4',
                  evaluated.isCorrect
                    ? 'bg-[#064e3b] text-[#34d399] border-[#059669] shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-[#7f1d1d] text-[#f87171] border-[#ef4444] shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                )}>
                  {evaluated.feedback}
                  {evaluated.isCorrect && score >= targetScore && (
                    <div className="mt-2 text-emerald-300 text-sm">🏆 You've hit the target score!</div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-lg">
                {!evaluated && (
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 py-3 px-6 text-base font-bold rounded-xl bg-indigo-600 border-2 border-indigo-400 text-white hover:bg-indigo-500 hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 px-6 text-base font-bold rounded-xl border-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-md"
                >
                  {evaluated ? 'Continue' : 'Skip'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
