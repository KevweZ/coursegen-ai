import React, { useState } from 'react';
import { JeopardyPayload } from '../../../types/game';
import { cn } from '../../../lib/utils';

interface Props {
  payload: JeopardyPayload;
}

export function JeopardyGame({ payload }: Props) {
  const categories = payload.gamePayload?.categories || (payload as any).categories;
  
  const [score, setScore] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<null | any>(null);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluated, setEvaluated] = useState<{ isCorrect: boolean, feedback: string } | null>(null);
  
  const handleCellClick = (question: any) => {
    if (answeredIds.has(question.id)) return;
    setActiveQuestion(question);
    setUserAnswer("");
    setEvaluated(null);
  };

  const handleSubmit = () => {
    if (userAnswer.toLowerCase().trim() === activeQuestion.correctAnswer.toLowerCase().trim()) {
       setEvaluated({ isCorrect: true, feedback: 'Correct! The answer is: ' + activeQuestion.correctAnswer });
       setScore(prev => prev + activeQuestion.value);
    } else {
       setEvaluated({ isCorrect: false, feedback: 'Incorrect. The correct answer is: ' + activeQuestion.correctAnswer });
       if (payload.gamePayload.deductPointsOnWrong) {
         setScore(prev => prev - activeQuestion.value);
       }
    }
  };

  const handleClose = () => {
    setAnsweredIds(prev => new Set(prev).add(activeQuestion.id));
    setActiveQuestion(null);
    setUserAnswer("");
    setEvaluated(null);
  };

  return (
    <div className="h-full flex flex-col relative w-full">
      {/* Score Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-black text-indigo-400 uppercase tracking-widest drop-shadow-md">Jeopardy</h3>
        <div className="text-3xl font-black text-white bg-indigo-900 border-2 border-indigo-400 px-8 py-2 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          ${score.toLocaleString()}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
        {/* Headers */}
        {categories.map(cat => (
          <div key={cat.id} className="bg-indigo-900/80 border-2 border-indigo-400 text-indigo-100 font-bold text-xs md:text-sm text-center uppercase tracking-wide flex items-center justify-center p-2 rounded-t-lg shadow-inner shadow-indigo-400/20 min-h-[4rem] line-clamp-2">
            {cat.name}
          </div>
        ))}
        
        {/* Interleaved Cells */}
        {Array.from({ length: Math.max(...categories.map(c => c.questions.length)) }).map((_, rowIdx) => (
          <React.Fragment key={rowIdx}>
            {categories.map((cat, colIdx) => {
              const question = cat.questions[rowIdx];
              if (!question) return <div key={`${colIdx}-${rowIdx}`} className="bg-slate-800/50 rounded-lg"></div>;
              
              const isAnswered = answeredIds.has(question.id);
              
              return (
                <button
                  key={question.id}
                  disabled={isAnswered}
                  onClick={() => handleCellClick(question)}
                  className={cn(
                    "flex items-center justify-center text-xl md:text-2xl font-black transition-all rounded-lg overflow-hidden p-2",
                    isAnswered 
                      ? "bg-slate-800 text-slate-700 opacity-50 cursor-not-allowed border border-slate-700" 
                      : "bg-indigo-600 border-2 border-indigo-400 text-yellow-400 hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] z-10 shadow-lg cursor-pointer"
                  )}
                >
                  {!isAnswered && `$${question.value}`}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Active Question Modal */}
      {activeQuestion && (
        <div className="absolute inset-0 bg-indigo-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 rounded-2xl border-4 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.3)] animate-in zoom-in-95 duration-200">
          <div className="max-w-3xl w-full flex flex-col items-center gap-4 md:gap-6 text-center bg-indigo-900/40 p-6 md:p-10 rounded-3xl border border-indigo-500/20 max-h-full md:max-h-[90%] overflow-y-auto">
            {activeQuestion.isDailyDouble && (
              <h2 className="text-xl md:text-3xl font-black text-yellow-400 uppercase tracking-widest animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                Daily Double
              </h2>
            )}
            <h1 className="text-xl md:text-2xl font-bold text-white leading-relaxed drop-shadow-lg break-words w-full">
              {activeQuestion.prompt}
            </h1>
            
            <div className="w-full max-w-lg mt-2 space-y-4">
              <input 
                type="text" 
                placeholder="Type your answer..." 
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                disabled={evaluated !== null}
                className="w-full bg-indigo-950/50 border-2 border-indigo-500/50 rounded-xl px-4 py-3 md:py-4 text-white text-base md:text-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all text-center disabled:opacity-50"
              />
            </div>

            {evaluated && (
              <div className={cn(
                "w-full max-w-lg mt-2 p-4 md:p-6 rounded-xl font-bold border-2 text-base md:text-lg animate-in slide-in-from-bottom-4",
                evaluated.isCorrect 
                  ? "bg-[#064e3b] text-[#34d399] border-[#059669] shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                  : "bg-[#7f1d1d] text-[#f87171] border-[#ef4444] shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              )}>
                {evaluated.feedback}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-lg">
              {!evaluated ? (
                <button 
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                  className="flex-1 py-3 px-6 text-base md:text-lg font-bold rounded-xl bg-indigo-600 border-2 border-indigo-400 text-white hover:bg-indigo-500 hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              ) : null}
              
              <button 
                onClick={handleClose}
                className="flex-1 py-3 px-6 text-base md:text-lg font-bold rounded-xl border-2 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
