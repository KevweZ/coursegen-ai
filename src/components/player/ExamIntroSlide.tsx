import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, AlertTriangle, CheckSquare, ToggleLeft, List, Loader2 } from 'lucide-react';
import type { ExamConfig } from '../../types/course';

interface Props {
  examConfig: ExamConfig;
  courseTitle?: string;
  onBegin: () => void;
  /** True while quiz questions are being generated after the learner clicks Begin */
  isGenerating?: boolean;
  /** Shown when generation/navigation fails so the learner isn't left wondering */
  errorMessage?: string | null;
}

const typeLabelMap: Record<string, string> = {
  mc: 'Multiple Choice',
  ma: 'Multiple Answer',
  tf: 'True / False',
};

export const ExamIntroSlide: React.FC<Props> = ({
  examConfig,
  courseTitle,
  onBegin,
  isGenerating = false,
  errorMessage = null,
}) => {
  const totalQuestions =
    examConfig.questionMode === 'total'
      ? examConfig.questionCount
      : examConfig.questionCount;

  const estimatedMinutes = Math.ceil(totalQuestions * 1.5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center p-8 bg-white"
    >
      <div className="w-full max-w-xl space-y-6">
        {/* Header — dark/neutral aesthetic (no indigo) */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-slate-800" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Mastery Quiz</h1>
          {courseTitle && (
            <p className="text-slate-500 text-sm">{courseTitle}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Questions', value: String(totalQuestions) },
            { label: 'Passing Score', value: `${examConfig.passingScore}%` },
            { label: 'Est. Time', value: `~${estimatedMinutes} min` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-slate-900">{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Question types */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question Types</p>
          <div className="flex flex-wrap gap-2">
            {(examConfig.questionTypes || ['mc', 'ma', 'tf']).map(t => (
              <span key={t} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1 rounded-full">
                {t === 'mc' && <List className="w-3 h-3" />}
                {t === 'ma' && <CheckSquare className="w-3 h-3" />}
                {t === 'tf' && <ToggleLeft className="w-3 h-3" />}
                {typeLabelMap[t]}
              </span>
            ))}
          </div>
        </div>

        {/* Lock warning */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Once you begin, you will <strong className="font-semibold">not</strong> be able to return to course slides until the quiz is complete.
            {examConfig.allowRetake
              ? ' You may retake the quiz if you do not pass.'
              : ' This quiz does not allow retakes — you must restart the full course to try again.'}
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Begin button — dark slate, not indigo */}
        <motion.button
          type="button"
          whileHover={isGenerating ? undefined : { scale: 1.02 }}
          whileTap={isGenerating ? undefined : { scale: 0.98 }}
          onClick={() => { if (!isGenerating) onBegin(); }}
          disabled={isGenerating}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-wait text-white font-extrabold text-lg rounded-2xl transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-3"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating quiz questions…
            </>
          ) : (
            <>
              <GraduationCap className="w-5 h-5" />
              Begin Mastery Quiz
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
