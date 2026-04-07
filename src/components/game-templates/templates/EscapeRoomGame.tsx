import React, { useState } from 'react';
import { EscapeRoomPayload } from '../../../types/game';
import { Lock, Unlock, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

interface Props { payload: EscapeRoomPayload; }

export function EscapeRoomGame({ payload }: Props) {
  const { gamePayload } = payload;
  const stages = gamePayload.stages || [];

  const [stageIndex, setStageIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [failed, setFailed] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentStage = stages[stageIndex];
  if (!currentStage) return <div className="p-8 text-center text-slate-400">No stages configured.</div>;

  const lock = currentStage.lock;

  // Choice options: extract all wrong choices + the correct answer, shuffle them
  const [choiceOptions] = useState(() => {
    if (lock.type !== 'choice') return [];
    // Simulate options: correctAnswer + 3 "wrong-ish" alternatives derived from the hint context
    // Since AI generates correctAnswer as text, we show it among alternatives
    // The alternatives in a choice lock come from the lock.prompt context
    // For now: correct + placeholders derived from stage context
    const correct = lock.correctAnswer as string;
    const wrongs = [
      `${correct.split(' ')[0]} (incorrect)`,
      'Skip this step',
      'None of the above',
    ].filter(w => w !== correct);
    return [correct, ...wrongs].sort(() => Math.random() - 0.5);
  });

  function handleSubmit() {
    let answer: string;
    if (lock.type === 'choice') {
      answer = selectedOption || '';
    } else {
      answer = inputValue.trim();
    }

    const correctAns = Array.isArray(lock.correctAnswer)
      ? lock.correctAnswer
      : [lock.correctAnswer];

    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const isMatch = correctAns.some(ca => normalise(answer) === normalise(ca));

    setSubmitted(true);
    setIsCorrect(isMatch);

    if (isMatch) {
      setTimeout(() => {
        if (stageIndex < stages.length - 1) {
          setStageIndex(prev => prev + 1);
          setSubmitted(false);
          setInputValue('');
          setSelectedOption(null);
          setIsCorrect(false);
        } else {
          setCompleted(true);
        }
      }, 1800);
    } else {
      setFailed(true);
      setTimeout(() => {
        setSubmitted(false);
        setFailed(false);
        setInputValue('');
        setSelectedOption(null);
      }, 2000);
    }
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-3xl font-black text-white">Mission Complete!</h2>
        <p className="text-slate-400 max-w-md">{gamePayload.successOutro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex gap-2 items-center mb-4">
        {stages.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
              i < stageIndex ? 'bg-emerald-500 border-emerald-400 text-white' :
              i === stageIndex ? 'bg-indigo-500 border-indigo-400 text-white' :
              'border-slate-700 text-slate-600'
            }`}>
              {i < stageIndex ? '✓' : i + 1}
            </div>
            {i < stages.length - 1 && (
              <div className={`flex-1 h-0.5 transition-colors ${i < stageIndex ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Scenario intro (first stage only) */}
      {stageIndex === 0 && gamePayload.scenarioIntro && (
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 text-indigo-300 text-sm italic">
          📖 {gamePayload.scenarioIntro}
        </div>
      )}

      {/* Stage title */}
      <div className="flex items-center gap-3">
        {submitted && isCorrect ? <Unlock className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-amber-400" />}
        <div>
          <h3 className="text-xl font-black text-white">{currentStage.title}</h3>
          <p className="text-slate-400 text-sm">Stage {stageIndex + 1} of {stages.length}</p>
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-slate-300 leading-relaxed">
        {currentStage.narrativeText}
      </div>

      {/* Clues */}
      {currentStage.clues?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">🔍 Clues Discovered</p>
          {currentStage.clues.map((clue, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-900/20 border border-amber-500/20 rounded-lg p-3 text-amber-300 text-sm">
              <span className="font-bold shrink-0">#{i + 1}</span> {clue}
            </div>
          ))}
        </div>
      )}

      {/* Lock */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <p className="text-white font-bold">{lock.prompt}</p>

        {lock.type === 'choice' ? (
          <div className="grid grid-cols-1 gap-2">
            {choiceOptions.map((option) => (
              <button
                key={option}
                disabled={submitted}
                onClick={() => setSelectedOption(option)}
                className={`text-left p-3 rounded-lg border font-medium text-sm transition-all ${
                  selectedOption === option
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
            placeholder="Enter the unlock code or answer..."
            disabled={submitted}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
          />
        )}

        {lock.hint && !submitted && (
          <p className="text-slate-500 text-xs italic">💡 Hint: {lock.hint}</p>
        )}

        {/* Feedback */}
        {submitted && (
          <div className={`p-3 rounded-lg font-bold text-sm flex items-center gap-2 ${isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
            {isCorrect ? <><Unlock className="w-4 h-4" /> Lock opened! Moving to next stage...</> : <><XCircle className="w-4 h-4" /> Incorrect — try again.</>}
          </div>
        )}

        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={lock.type === 'choice' ? !selectedOption : !inputValue.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" /> Attempt to Unlock
          </button>
        )}
      </div>
    </div>
  );
}
