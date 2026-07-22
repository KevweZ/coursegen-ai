import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import type { ExamQuestion, ExamConfig, ExamSessionState } from '../../types/course';

interface Props {
  questions: ExamQuestion[];
  examConfig: ExamConfig;
  sessionState: ExamSessionState;
  onAnswer: (questionId: string, answer: number | number[]) => void;
  onSubmit: (finalState: ExamSessionState) => void;
}

// ─── Single question renderer ─────────────────────────────────────────────────

const QuestionCard: React.FC<{
  q: ExamQuestion;
  answer: number | number[] | null;
  submitted: boolean;
  onAnswer: (a: number | number[]) => void;
  idx: number;
  total: number;
}> = ({ q, answer, submitted, onAnswer, idx, total }) => {
  const isCorrect = (a: number | number[] | null): boolean => {
    if (a === null) return false;
    if (q.type === 'ma') {
      const correct = q.correctAnswer as number[];
      const given = a as number[];
      return correct.length === given.length && correct.every(c => given.includes(c));
    }
    return a === q.correctAnswer;
  };

  const optionState = (optIdx: number) => {
    if (!submitted) return 'default';
    const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(optIdx) : q.correctAnswer === optIdx;
    const selected = Array.isArray(answer) ? answer.includes(optIdx) : answer === optIdx;
    if (correct) return 'correct';
    if (selected && !correct) return 'wrong';
    return 'default';
  };

  const stateClasses: Record<string, string> = {
    correct: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    wrong:   'border-red-500 bg-red-50 text-red-800',
    default: 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100',
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator (one-at-a-time) */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
        <span>Question {idx + 1} of {total}</span>
        <span className={q.type === 'ma' ? 'text-slate-600' : q.type === 'tf' ? 'text-slate-600' : 'text-slate-600'}>
          {q.type === 'mc' ? 'Multiple Choice' : q.type === 'ma' ? 'Multiple Answer — select all that apply' : 'True / False'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-700 rounded-full transition-all duration-500"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-slate-900 text-lg font-bold leading-snug">{q.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, oIdx) => {
          const state = optionState(oIdx);
          const isSelected = Array.isArray(answer) ? answer.includes(oIdx) : answer === oIdx;
          return (
            <button
              key={oIdx}
              disabled={submitted}
              onClick={() => {
                if (submitted) return;
                if (q.type === 'ma') {
                  const current = (answer as number[] | null) ?? [];
                  const updated = current.includes(oIdx)
                    ? current.filter(i => i !== oIdx)
                    : [...current, oIdx];
                  onAnswer(updated);
                } else {
                  onAnswer(oIdx);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                submitted ? stateClasses[state] : isSelected
                  ? 'border-slate-700 bg-slate-100 text-slate-900'
                  : stateClasses['default']
              }`}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-black ${
                submitted && state === 'correct' ? 'border-emerald-500 bg-emerald-500 text-white'
                : submitted && state === 'wrong' ? 'border-red-500 bg-red-500 text-white'
                : isSelected ? 'border-slate-700 bg-slate-1000 text-white'
                : 'border-slate-300 text-slate-500'
              }`}>
                {submitted && state === 'correct' ? '✓' : submitted && state === 'wrong' ? '✗' : String.fromCharCode(65 + oIdx)}
              </span>
              <span className="text-sm">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Post-submit explanation */}
      {submitted && q.explanation && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${isCorrect(answer) ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {isCorrect(answer) ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5"/> : <XCircle className="w-4 h-4 shrink-0 mt-0.5"/>}
          <p>{q.explanation}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const MasteryExamSlide: React.FC<Props> = ({
  questions, examConfig, sessionState, onAnswer, onSubmit,
}) => {
  const { answers, currentQuestionIdx, submitted } = sessionState;
  const [confirming, setConfirming] = useState(false);

  const currentQ = questions[currentQuestionIdx];
  const currentAnswer = currentQ ? (answers[currentQ.id] ?? null) : null;
  const isLast = currentQuestionIdx === questions.length - 1;
  const allAnswered = questions.every(q => {
    const a = answers[q.id];
    if (a === null || a === undefined) return false;
    if (q.type === 'ma') return (a as number[]).length > 0;
    return true;
  });

  const handleNext = useCallback(() => {
    if (!submitted) {
      // In one-at-a-time mode: lock current answer, advance
      const newState: ExamSessionState = {
        ...sessionState,
        currentQuestionIdx: currentQuestionIdx + 1,
      };
      onSubmit(newState); // just advances index, not the whole exam
    }
  }, [sessionState, currentQuestionIdx, onSubmit, submitted]);

  const handleSubmitExam = useCallback(() => {
    // Calculate score
    let correct = 0;
    questions.forEach(q => {
      const a = answers[q.id];
      if (q.type === 'ma') {
        const ca = q.correctAnswer as number[];
        const ga = (a as number[] | null) ?? [];
        if (ca.length === ga.length && ca.every(c => ga.includes(c))) correct++;
      } else {
        if (a === q.correctAnswer) correct++;
      }
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= examConfig.passingScore;
    onSubmit({ ...sessionState, submitted: true, score, passed });
  }, [questions, answers, examConfig.passingScore, sessionState, onSubmit]);

  // ── Scroll-all mode ─────────────────────────────────────────────────────────
  if (examConfig.presentationMode === 'scroll-all') {
    const answeredCount = questions.filter(q => {
      const a = answers[q.id];
      return a !== null && a !== undefined && (Array.isArray(a) ? a.length > 0 : true);
    }).length;

    return (
      <div className="h-full overflow-y-auto p-6 bg-white">
        <div className="max-w-2xl mx-auto space-y-8 pb-32">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900">Mastery Quiz</h2>
            <p className="text-sm text-slate-500">{answeredCount} of {questions.length} answered</p>
          </div>
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <QuestionCard
                q={q} idx={idx} total={questions.length}
                answer={answers[q.id] ?? null}
                submitted={submitted}
                onAnswer={(a) => onAnswer(q.id, a)}
              />
            </div>
          ))}
        </div>
        {/* Fixed submit bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 flex justify-center">
          <button
            disabled={!allAnswered || submitted}
            onClick={() => setConfirming(true)}
            className="px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold rounded-xl transition-colors"
          >
            Submit Quiz
          </button>
        </div>
        {confirming && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-xl">
              <h3 className="text-slate-900 font-extrabold text-lg">Submit Quiz?</h3>
              <p className="text-slate-500 text-sm">You answered {answeredCount} of {questions.length} questions. Once submitted, you cannot change your answers.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirming(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 font-bold text-sm transition-all">Cancel</button>
                <button onClick={() => { setConfirming(false); handleSubmitExam(); }} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all">Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── One-at-a-time mode ───────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {currentQ && (
                <QuestionCard
                  q={currentQ}
                  idx={currentQuestionIdx}
                  total={questions.length}
                  answer={currentAnswer}
                  submitted={isLast && submitted}
                  onAnswer={(a) => onAnswer(currentQ.id, a)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="border-t border-slate-200 p-4 flex justify-end bg-white">
        {isLast ? (
          <button
            disabled={currentAnswer === null || (Array.isArray(currentAnswer) && currentAnswer.length === 0) || submitted}
            onClick={() => setConfirming(true)}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold rounded-xl transition-colors"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            disabled={currentAnswer === null || (Array.isArray(currentAnswer) && currentAnswer.length === 0)}
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
          >
            Next Question
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Submit confirmation */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-xl">
            <h3 className="text-slate-900 font-extrabold text-lg">Submit Quiz?</h3>
            <p className="text-slate-500 text-sm">Once submitted, you cannot change your answers.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 font-bold text-sm transition-all">Cancel</button>
              <button onClick={() => { setConfirming(false); handleSubmitExam(); }} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
