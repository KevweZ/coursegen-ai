import React, { useState } from 'react';
import { PriceIsRightPayload, PriceIsRightItem } from '../../../types/game';
import { CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

interface Props { payload: PriceIsRightPayload; }

export function PriceIsRightGame({ payload }: Props) {
  const { gamePayload } = payload;
  const items: PriceIsRightItem[] = gamePayload.items || [];

  const [itemIndex, setItemIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<'over' | 'within' | null>(null);
  const [score, setScore] = useState(0);
  const [playerGuess, setPlayerGuess] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const currentItem = items[itemIndex];
  if (!currentItem && !done) return <div className="p-8 text-center text-slate-400">No items configured.</div>;

  function handleSubmit() {
    const guess = parseFloat(inputValue.replace(/[^0-9.]/g, ''));
    if (isNaN(guess)) return;

    setPlayerGuess(guess);
    const correct = currentItem.correctValue;
    const tol = currentItem.toleranceRange ?? 0;

    // Classic "closest without going over": must be >= (correct - tol) and <= correct
    const isWithin = guess <= correct && guess >= correct - tol;
    const isOver = guess > correct;

    if (isWithin) {
      setResult('within');
      setScore(prev => prev + Math.max(1, Math.round((1 - Math.abs(guess - correct) / correct) * 100)));
    } else {
      setResult(isOver ? 'over' : 'within'); // 'within' also shows value even if low
      if (!isOver) {
        // Still show answer, just no points (too low)
        setResult('within');
      } else {
        setResult('over');
      }
    }
    setSubmitted(true);
  }

  function next() {
    if (itemIndex < items.length - 1) {
      setItemIndex(prev => prev + 1);
      setInputValue('');
      setSubmitted(false);
      setResult(null);
      setPlayerGuess(null);
    } else {
      setDone(true);
    }
  }

  function formatVal(v: number) {
    return v >= 1000 ? `$${v.toLocaleString()}` : v % 1 === 0 ? v.toString() : v.toFixed(2);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <TrendingUp className="w-16 h-16 text-indigo-400" />
        <h2 className="text-3xl font-black text-white">All Done!</h2>
        <div className="text-5xl font-black text-indigo-400">{score}<span className="text-2xl text-indigo-600"> pts</span></div>
        <p className="text-slate-400">Nice estimation skills!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress + Score */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-400 font-bold">Item {itemIndex + 1} of {items.length}</span>
        <div className="text-right">
          <div className="text-2xl font-black text-indigo-400">{score}</div>
          <div className="text-xs text-slate-500 font-bold">POINTS</div>
        </div>
      </div>

      {/* Item card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-3">
        <div className="text-xs font-bold text-indigo-400 tracking-widest uppercase">Estimate the Value</div>
        <h3 className="text-2xl font-black text-white">{currentItem.name}</h3>
        <p className="text-slate-400 leading-relaxed">{currentItem.description}</p>
      </div>

      {/* Tolerance hint */}
      {currentItem.toleranceRange && !submitted && (
        <p className="text-xs text-slate-500 italic text-center">
          💡 Your guess must be within {formatVal(currentItem.toleranceRange)} of the correct value without going over.
        </p>
      )}

      {/* Input */}
      {!submitted ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input
                type="number"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your estimate..."
                className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none text-lg font-bold"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!inputValue}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg transition-colors"
            >
              Lock It In
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Result */}
          <div className={`p-4 rounded-xl border font-bold text-center space-y-1 ${result === 'over' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'}`}>
            {result === 'over' ? (
              <>
                <div className="flex items-center justify-center gap-2"><XCircle className="w-5 h-5" /> OVER! You went too high.</div>
                <div className="text-sm opacity-80">Your guess: {formatVal(playerGuess!)} | Correct: {formatVal(currentItem.correctValue)}</div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2">
                  {playerGuess !== null && playerGuess >= currentItem.correctValue - (currentItem.toleranceRange ?? 0) && playerGuess <= currentItem.correctValue
                    ? <><CheckCircle2 className="w-5 h-5" /> Close enough! Points awarded!</>
                    : <><XCircle className="w-5 h-5" /> Too low — no points.</>}
                </div>
                <div className="text-sm opacity-80">Your guess: {formatVal(playerGuess!)} | Correct: {formatVal(currentItem.correctValue)}</div>
              </>
            )}
          </div>

          {/* Explanation */}
          {currentItem.explanation && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-300 text-sm">
              <span className="font-bold text-indigo-300">Why it matters: </span>{currentItem.explanation}
            </div>
          )}

          <button onClick={next} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">
            {itemIndex < items.length - 1 ? 'Next Item →' : 'See Final Score'}
          </button>
        </div>
      )}
    </div>
  );
}
