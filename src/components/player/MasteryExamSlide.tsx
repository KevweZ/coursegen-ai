import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import type { ExamQuestion, ExamConfig, ExamSessionState } from '../../types/course';
import { examShowsQuestionMap } from '../../lib/examQuestionMap';

interface Props {
  questions: ExamQuestion[];
  examConfig: ExamConfig;
  sessionState: ExamSessionState;
  onAnswer: (questionId: string, answer: number | number[]) => void;
  onSubmit: (finalState: ExamSessionState) => void;
}

function isAnswered(q: ExamQuestion, answer: number | number[] | null | undefined): boolean {
  if (answer === null || answer === undefined) return false;
  if (q.type === 'ma') return Array.isArray(answer) && answer.length > 0;
  return true;
}

const QuestionMapPanel: React.FC<{
  questions: ExamQuestion[];
  answers: Record<string, number | number[] | null>;
  currentQuestionId?: string;
  onJump: (questionId: string, index: number) => void;
}> = ({ questions, answers, currentQuestionId, onJump }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
      Question Overview
    </p>
    <div className="grid grid-cols-4 gap-1.5 max-h-[min(52vh,420px)] overflow-y-auto pr-0.5 custom-scrollbar">
      {questions.map((q, idx) => {
        const done = isAnswered(q, answers[q.id]);
        const current = currentQuestionId === q.id;
        return (
          <button
            key={q.id}
            type="button"
            title={done ? `Question ${idx + 1} — answered` : `Question ${idx + 1} — unanswered`}
            onClick={() => onJump(q.id, idx)}
            className={`h-8 rounded-full text-[11px] font-bold transition-colors ${
              current
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                : done
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
        <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0" />
        Current
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
        <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
        Answered
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
        <span className="w-3 h-3 rounded-full bg-slate-200 shrink-0" />
        Unanswered
      </div>
    </div>
  </div>
);

// ─── Single question renderer ─────────────────────────────────────────────────

const QuestionCard: React.FC<{
  q: ExamQuestion;
  answer: number | number[] | null;
  submitted: boolean;
  onAnswer: (a: number | number[]) => void;
  idx: number;
  total: number;
  /** Hide one-at-a-time progress chrome in scroll-all layout */
  compactHeader?: boolean;
}> = ({ q, answer, submitted, onAnswer, idx, total, compactHeader = false }) => {
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

  return (
    <div className="space-y-5 w-full">
      {!compactHeader && (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Question {idx + 1} of {total}
          </p>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />
          </div>
        </>
      )}

      {compactHeader && (
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          Question {idx + 1} of {total}
        </p>
      )}

      <p className="font-bold text-base leading-snug text-slate-800">{q.question}</p>

      <div className="space-y-3 w-full max-w-4xl">
        {(q.options || []).map((opt, oIdx) => {
          const state = optionState(oIdx);
          const isSelected = Array.isArray(answer) ? answer.includes(oIdx) : answer === oIdx;
          let bg = 'bg-white border-gray-200 text-gray-800 hover:border-indigo-400';
          if (submitted) {
            if (state === 'correct') bg = 'bg-emerald-50 border-emerald-400 text-emerald-900';
            else if (state === 'wrong') bg = 'bg-red-50 border-red-400 text-red-900';
          } else if (isSelected) {
            bg = 'bg-indigo-50 border-indigo-400 text-indigo-900';
          }
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
              className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all font-medium ${bg}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                submitted && state === 'correct' ? 'border-emerald-500 bg-emerald-500'
                : submitted && state === 'wrong' ? 'border-red-500 bg-red-500'
                : isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
              }`}>
                {submitted && state === 'correct' ? (
                  <span className="text-white text-[10px] font-black">✓</span>
                ) : submitted && state === 'wrong' ? (
                  <span className="text-white text-[10px] font-black">✗</span>
                ) : isSelected ? (
                  <div className="w-2 h-2 bg-white rounded-full" />
                ) : null}
              </div>
              <span className="flex-1 leading-snug text-base">{opt}</span>
            </button>
          );
        })}
      </div>

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
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const currentQ = questions[currentQuestionIdx];
  const currentAnswer = currentQ ? (answers[currentQ.id] ?? null) : null;
  const isLast = currentQuestionIdx === questions.length - 1;
  const allAnswered = questions.every(q => isAnswered(q, answers[q.id]));

  const handleNext = useCallback(() => {
    if (!submitted) {
      const newState: ExamSessionState = {
        ...sessionState,
        currentQuestionIdx: currentQuestionIdx + 1,
      };
      onSubmit(newState);
    }
  }, [sessionState, currentQuestionIdx, onSubmit, submitted]);

  const handleSubmitExam = useCallback(() => {
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

  const showMap = examShowsQuestionMap(examConfig);

  const jumpToQuestion = useCallback((qId: string) => {
    const el = questionRefs.current[qId];
    const root = scrollRootRef.current;
    if (!el || !root) return;
    const elTop = el.getBoundingClientRect().top;
    const rootTop = root.getBoundingClientRect().top;
    root.scrollTo({ top: root.scrollTop + (elTop - rootTop) - 8, behavior: 'smooth' });
  }, []);

  const jumpOneAtATime = useCallback((index: number) => {
    if (submitted) return;
    onSubmit({ ...sessionState, currentQuestionIdx: index });
  }, [onSubmit, sessionState, submitted]);

  // ── Scroll-all mode ─────────────────────────────────────────────────────────
  if (examConfig.presentationMode === 'scroll-all') {
    const answeredCount = questions.filter(q => isAnswered(q, answers[q.id])).length;
    const overviewPanel = (
      <QuestionMapPanel
        questions={questions}
        answers={answers}
        onJump={(qId) => jumpToQuestion(qId)}
      />
    );

    return (
      <div className="h-full min-h-0 flex flex-col bg-white relative overflow-hidden">
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Only this column scrolls — overview stays locked on the right */}
          <div ref={scrollRootRef} className="flex-1 min-w-0 min-h-0 overflow-y-auto p-4 sm:p-6 pb-8">
            <div className="space-y-5 w-full">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {answeredCount} of {questions.length} answered
                </p>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${(answeredCount / Math.max(1, questions.length)) * 100}%` }}
                  />
                </div>
              </div>
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  id={`exam-q-${q.id}`}
                  ref={(node) => { questionRefs.current[q.id] = node; }}
                  className="scroll-mt-4"
                >
                  <QuestionCard
                    q={q}
                    idx={idx}
                    total={questions.length}
                    answer={answers[q.id] ?? null}
                    submitted={submitted}
                    onAnswer={(a) => onAnswer(q.id, a)}
                    compactHeader
                  />
                </div>
              ))}
            </div>
          </div>

          {showMap && (
          <aside className="hidden md:flex w-[168px] shrink-0 flex-col border-l border-slate-200 bg-slate-50/90 p-3 overflow-hidden">
            <div className="sticky top-0 shrink-0">
              {overviewPanel}
            </div>
          </aside>
          )}
        </div>

        {showMap && (
        <div className="md:hidden border-t border-slate-200 bg-white px-3 py-2 flex gap-1.5 overflow-x-auto shrink-0">
          {questions.map((q, idx) => {
            const done = isAnswered(q, answers[q.id]);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => jumpToQuestion(q.id)}
                className={`w-8 h-8 shrink-0 rounded-full text-[11px] font-bold ${
                  done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        )}

        {/* Submit bar — inside slide frame (not viewport-fixed) so it isn't cropped */}
        <div className="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm p-3 flex justify-center">
          <button
            disabled={!allAnswered || submitted}
            onClick={() => setConfirming(true)}
            className="px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold rounded-xl transition-colors"
          >
            Submit Quiz
          </button>
        </div>

        {/* Viewport-centered confirm — not middle of the tall scroll document */}
        {confirming && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250] p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
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
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          <div className="space-y-5 w-full">
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
        {showMap && (
          <aside className="hidden md:flex w-[168px] shrink-0 flex-col border-l border-slate-200 bg-slate-50/90 p-3 overflow-hidden">
            <QuestionMapPanel
              questions={questions}
              answers={answers}
              currentQuestionId={currentQ?.id}
              onJump={(_id, idx) => jumpOneAtATime(idx)}
            />
          </aside>
        )}
      </div>

      {showMap && (
        <div className="md:hidden border-t border-slate-200 bg-white px-3 py-2 flex gap-1.5 overflow-x-auto shrink-0">
          {questions.map((q, idx) => {
            const done = isAnswered(q, answers[q.id]);
            const current = currentQ?.id === q.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => jumpOneAtATime(idx)}
                className={`w-8 h-8 shrink-0 rounded-full text-[11px] font-bold ${
                  current ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}

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
