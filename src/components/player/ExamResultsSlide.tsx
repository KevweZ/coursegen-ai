import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw, RotateCw, ArrowRight } from 'lucide-react';

interface Props {
  score: number;                // 0–100
  passed: boolean;
  passingScore: number;
  totalQuestions: number;
  correctCount: number;
  allowRetake: boolean;
  onContinue: () => void;       // passed: go to closing/thank-you slide
  onRetake: () => void;         // failed: reset exam, return to intro slide
  onReturnToCourse: () => void; // unlock content slides (kept for internal use)
  onRestartCourse: () => void;  // restart from slide 0
}

export const ExamResultsSlide: React.FC<Props> = ({
  score, passed, passingScore, totalQuestions, correctCount,
  allowRetake, onContinue, onRetake, onRestartCourse,
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      setTimeout(() => {
        if (barRef.current) barRef.current.style.width = `${score}%`;
      }, 300);
    }
  }, [score]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col items-center justify-center p-8 bg-white"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.15, stiffness: 200 }}
          className="flex justify-center"
        >
          {passed ? (
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-300 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          )}
        </motion.div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className={`text-3xl font-extrabold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
            {passed ? 'Congratulations!' : 'Not Quite Yet'}
          </h1>
          <p className="text-slate-500 text-sm">
            {passed
              ? 'You have successfully passed the Mastery Quiz.'
              : `You did not meet the passing score of ${passingScore}%.`}
          </p>
        </div>

        {/* Score display */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 font-medium">Your Score</span>
            <span className={`text-2xl font-extrabold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>{score}%</span>
          </div>
          {/* Score bar */}
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              ref={barRef}
              className={`h-full rounded-full transition-all duration-1000 ease-out ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: '0%' }}
            />
          </div>
          {/* Passing marker */}
          <div className="relative h-0">
            <div
              className="absolute top-0 w-0.5 h-3 bg-slate-400/50 -translate-y-3"
              style={{ left: `${passingScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>{correctCount} / {totalQuestions} correct</span>
            <span>Passing: {passingScore}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {passed ? (
            /* PASSED — single green CTA that goes to the closing/thank-you slide */
            <motion.button
              onClick={onContinue}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:scale-[1.01]"
            >
              Finish Course
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <>
              {allowRetake ? (
                <button
                  onClick={onRetake}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Mastery Quiz
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  This assessment does not allow retakes. You must restart the full course to take the quiz again.
                </div>
              )}
              <button
                onClick={onRestartCourse}
                className="w-full py-3 border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                Restart Course
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
