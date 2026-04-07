import React, { useState } from 'react';
import { FamilyFeudPayload, FamilyFeudAnswer } from '../../../types/game';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Props { payload: FamilyFeudPayload; }

export function FamilyFeudGame({ payload }: Props) {
  const { gamePayload } = payload;
  const rounds = gamePayload.rounds || [];
  const maxStrikes = gamePayload.maxStrikesPerRound || 3;

  const [roundIndex, setRoundIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [strikes, setStrikes] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [totalScore, setTotalScore] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{ type: 'hit' | 'miss' | 'dup'; text: string } | null>(null);
  const [roundComplete, setRoundComplete] = useState(false);

  const currentRound = rounds[roundIndex];
  if (!currentRound) return <div className="p-8 text-center text-slate-400">No rounds available.</div>;

  const answers: FamilyFeudAnswer[] = currentRound.answers || [];
  const allRevealed = answers.every(a => revealedIds.has(a.id));

  function normalise(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  }

  function handleGuess() {
    const guess = normalise(inputValue);
    if (!guess) return;

    // Check already revealed
    const alreadyRevealedMatch = answers.find(a =>
      revealedIds.has(a.id) && (normalise(a.text) === guess || (a.synonyms || []).some(syn => normalise(syn) === guess))
    );
    if (alreadyRevealedMatch) {
      setLastFeedback({ type: 'dup', text: 'Already found that one!' });
      setInputValue('');
      return;
    }

    // Check unrevealed answers
    const match = answers.find(a =>
      !revealedIds.has(a.id) && (normalise(a.text) === guess || (a.synonyms || []).some(syn => normalise(syn) === guess))
    );

    if (match) {
      const newRevealed = new Set(revealedIds);
      newRevealed.add(match.id);
      setRevealedIds(newRevealed);
      setTotalScore(prev => prev + match.points);
      setLastFeedback({ type: 'hit', text: `✓ "${match.text}" — ${match.points} points!` });
      const nowAllRevealed = answers.every(a => newRevealed.has(a.id));
      if (nowAllRevealed) setRoundComplete(true);
    } else {
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      setLastFeedback({ type: 'miss', text: `✗ Strike ${newStrikes}/${maxStrikes}` });
      if (newStrikes >= maxStrikes) setRoundComplete(true);
    }
    setInputValue('');
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      setRoundIndex(prev => prev + 1);
      setStrikes(0);
      setRevealedIds(new Set());
      setLastFeedback(null);
      setRoundComplete(false);
      setInputValue('');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-400 text-sm font-bold">ROUND {roundIndex + 1} of {rounds.length}</p>
          <h3 className="text-xl font-black text-white mt-1">{currentRound.prompt}</h3>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-indigo-400">{totalScore}</div>
          <div className="text-xs text-slate-500 font-bold">TOTAL POINTS</div>
        </div>
      </div>

      {/* Strikes */}
      <div className="flex gap-2">
        {Array.from({ length: maxStrikes }).map((_, i) => (
          <div key={i} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all ${i < strikes ? 'bg-red-500 border-red-400 text-white' : 'border-slate-700 text-slate-600'}`}>
            {i < strikes ? '✗' : (i + 1)}
          </div>
        ))}
        <span className="ml-2 text-sm text-slate-500 self-center">STRIKES ({strikes}/{maxStrikes})</span>
      </div>

      {/* Answer Board */}
      <div className="grid grid-cols-2 gap-2">
        {answers.map((answer, i) => {
          const isRevealed = revealedIds.has(answer.id);
          return (
            <div key={answer.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${isRevealed ? 'bg-indigo-900/50 border-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black w-5 text-center ${isRevealed ? 'text-indigo-400' : 'text-slate-600'}`}>{i + 1}</span>
                <span className={`font-bold text-sm ${isRevealed ? 'text-white' : 'text-slate-600'}`}>
                  {isRevealed ? answer.text : '_ _ _ _ _'}
                </span>
              </div>
              {isRevealed && <span className="text-indigo-300 font-black text-sm">{answer.points} pts</span>}
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      {lastFeedback && (
        <div className={`p-3 rounded-lg font-bold text-sm flex items-center gap-2 ${
          lastFeedback.type === 'hit' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
          lastFeedback.type === 'miss' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
          'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
        }`}>
          {lastFeedback.type === 'hit' ? <CheckCircle2 className="w-4 h-4" /> : lastFeedback.type === 'miss' ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {lastFeedback.text}
        </div>
      )}

      {/* Input or Round Complete */}
      {!roundComplete ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGuess()}
            placeholder="Type your answer and press Enter..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
          />
          <button onClick={handleGuess} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">
            Guess
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center space-y-4">
          <div className="text-2xl font-black text-white">{allRevealed ? '🎉 Round Complete!' : `Round Over — ${strikes} Strikes`}</div>
          {answers.filter(a => !revealedIds.has(a.id)).length > 0 && (
            <div className="text-sm text-slate-400">
              Missed: {answers.filter(a => !revealedIds.has(a.id)).map(a => `"${a.text}"`).join(', ')}
            </div>
          )}
          {roundIndex < rounds.length - 1 ? (
            <button onClick={nextRound} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">
              Next Round →
            </button>
          ) : (
            <div className="text-indigo-300 font-black text-xl">Final Score: {totalScore} Points 🏆</div>
          )}
        </div>
      )}
    </div>
  );
}
