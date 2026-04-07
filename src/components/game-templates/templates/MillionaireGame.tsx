import React, { useState } from 'react';
import { MillionairePayload } from '../../../types/game';
import { CheckCircle2, XCircle, HelpCircle, User, Users } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  payload: MillionairePayload;
}

export function MillionaireGame({ payload }: Props) {
  const { questions, lifelines } = payload.gamePayload;
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const question = questions[currentQIndex];
  
  // Safe Havens exist if isSafeHaven is tagged on any previous questions
  const currentSafeHavenValue = questions
    .slice(0, currentQIndex)
    .reverse()
    .find(q => q.isSafeHaven)?.value || 0;

  const handleSelectOption = (opt: string) => {
    if (isRevealed || gameOver) return;
    setSelectedOption(opt);
    setIsRevealed(true);
    
    if (opt === question.correctAnswer) {
      setScore(question.value);
      setTimeout(() => {
        if (currentQIndex < questions.length - 1) {
          setCurrentQIndex(currentQIndex + 1);
          setSelectedOption(null);
          setIsRevealed(false);
        } else {
          setGameOver(true);
        }
      }, 2000);
    } else {
      setTimeout(() => {
        setScore(currentSafeHavenValue);
        setGameOver(true);
      }, 2000);
    }
  };

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white space-y-6 py-12 p-6 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-indigo-400">Game Over!</h2>
        <p className="text-xl md:text-2xl font-bold">You walk away with: <span className="text-yellow-400">{score.toLocaleString()} Points</span></p>
        {currentSafeHavenValue > 0 && score === currentSafeHavenValue && (
          <p className="text-lg md:text-xl text-green-400 mt-4 bg-green-900/30 p-4 border border-green-500/30 rounded-xl">You fell back to your Safe Haven!</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        
        {/* Question Bubble */}
        <div className="w-full bg-slate-800 border-2 border-indigo-500/50 rounded-3xl py-6 px-6 md:py-8 md:px-10 text-center shadow-xl relative mt-8 md:mt-12">
          {question.isSafeHaven && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 px-4 py-1 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-md">
              Safe Haven
            </div>
          )}
          <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed">{question.prompt}</h3>
        </div>
        
        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {question.options.map((opt, idx) => {
            const isSelected = selectedOption === opt;
            const isCorrect = opt === question.correctAnswer;
            
            let stateClass = "border-slate-600 bg-slate-800 text-gray-200 hover:bg-slate-700 hover:border-indigo-400";
            if (isRevealed) {
              if (isCorrect) {
                stateClass = "border-green-500 bg-green-500/20 text-green-300 shadow-lg shadow-green-500/20";
              } else if (isSelected) {
                stateClass = "border-red-500 bg-red-500/20 text-red-300 shadow-lg shadow-red-500/20";
              } else {
                stateClass = "border-slate-700 bg-slate-800/50 text-gray-500 opacity-50";
              }
            } else if (isSelected) {
              stateClass = "border-yellow-500 bg-yellow-500/20 text-yellow-300 shadow-lg shadow-yellow-500/20";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(opt)}
                disabled={isRevealed}
                className={cn(
                  "relative w-full py-3 md:py-4 px-4 md:px-6 rounded-2xl border-2 text-left font-bold text-sm md:text-base transition-all duration-300 min-h-[4rem]",
                  stateClass
                )}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <span className="text-indigo-400 font-black shrink-0">{['A', 'B', 'C', 'D'][idx]}:</span>
                  <span className="leading-tight">{opt}</span>
                  {isRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 ml-auto text-green-400 shrink-0" />}
                  {isRevealed && !isCorrect && isSelected && <XCircle className="w-5 h-5 md:w-6 md:h-6 ml-auto text-red-400 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
        
      </div>

      {/* Sidebar: Ladder and Lifelines */}
      <div className="w-64 bg-slate-800/80 rounded-2xl p-4 flex flex-col border border-slate-700 shadow-inner">
        
        {/* Lifelines */}
        <div className="flex justify-between mb-8 border-b border-slate-700 pb-4">
          <button className="w-12 h-12 rounded-full border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-md">
            <span className="font-bold text-sm">50:50</span>
          </button>
          <button className="w-12 h-12 rounded-full border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-md">
            <User className="w-5 h-5" />
          </button>
          <button className="w-12 h-12 rounded-full border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-md">
            <Users className="w-5 h-5" />
          </button>
        </div>

        {/* The Ladder */}
        <div className="flex-1 flex flex-col-reverse gap-1 overflow-y-auto pr-2 mt-4">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQIndex;
            const isPassed = idx < currentQIndex;
            return (
              <div 
                key={q.id}
                className={cn(
                  "flex items-center justify-between px-3 py-1.5 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all",
                  isCurrent ? "bg-orange-500 text-white shadow-md scale-[1.02] md:scale-105" : 
                  isPassed ? "text-indigo-300" : "text-slate-500",
                  q.isSafeHaven && !isCurrent ? "text-yellow-400 bg-yellow-400/10" : ""
                )}
              >
                <span>{idx + 1}</span>
                <span>{q.value.toLocaleString()} {q.isSafeHaven ? '✦' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
