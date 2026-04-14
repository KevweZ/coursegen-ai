import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, AlertTriangle, CheckSquare, ToggleLeft, List } from 'lucide-react';
import type { ExamConfig } from '../../types/course';

interface Props {
  examConfig: ExamConfig;
  courseTitle?: string;
  onBegin: () => void;
}

const typeLabelMap: Record<string, string> = {
  mc: 'Multiple Choice',
  ma: 'Multiple Answer',
  tf: 'True / False',
};

export const ExamIntroSlide: React.FC<Props> = ({ examConfig, courseTitle, onBegin }) => {
  const totalQuestions =
    examConfig.questionMode === 'total'
      ? examConfig.questionCount
      : examConfig.questionCount; // will be multiplied by module count when injected

  const estimatedMinutes = Math.ceil(totalQuestions * 1.5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900"
    >
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]">
              <GraduationCap className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Mastery Quiz</h1>
          {courseTitle && (
            <p className="text-slate-400 text-sm">{courseTitle}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Questions', value: String(totalQuestions) },
            { label: 'Passing Score', value: `${examConfig.passingScore}%` },
            { label: 'Est. Time', value: `~${estimatedMinutes} min` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-white">{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Question types */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Types</p>
          <div className="flex flex-wrap gap-2">
            {examConfig.questionTypes.map(t => (
              <span key={t} className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                {t === 'mc' && <List className="w-3 h-3" />}
                {t === 'ma' && <CheckSquare className="w-3 h-3" />}
                {t === 'tf' && <ToggleLeft className="w-3 h-3" />}
                {typeLabelMap[t]}
              </span>
            ))}
          </div>
        </div>

        {/* Lock warning */}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Once you begin, you will <strong>not</strong> be able to return to course slides until the quiz is complete.
            {examConfig.allowRetake
              ? ' You may retake the quiz if you do not pass.'
              : ' This quiz does not allow retakes — you must restart the full course to try again.'}
          </p>
        </div>

        {/* Begin button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBegin}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-lg rounded-2xl transition-colors shadow-[0_0_30px_-8px_rgba(99,102,241,0.7)] flex items-center justify-center gap-3"
        >
          <GraduationCap className="w-5 h-5" />
          Begin Mastery Quiz
        </motion.button>
      </div>
    </motion.div>
  );
};
