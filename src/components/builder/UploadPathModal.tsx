import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Sparkles, ListChecks, X, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

export type UploadPathChoice = 'quick' | 'customize';

interface Props {
  fileName: string;
  onConfirm: (choice: UploadPathChoice) => void;
  onCancel: () => void;
  /** Open saved Course Settings (defaults) without losing the pending upload. */
  onViewCourseSettings?: () => void;
}

export function UploadPathModal({ fileName, onConfirm, onCancel, onViewCourseSettings }: Props) {
  const [choice, setChoice] = useState<UploadPathChoice>('quick');

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <FileUp className="w-5 h-5 text-purple-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white">How would you like to build?</h3>
              <p className="text-sm text-slate-400 mt-0.5 truncate" title={fileName}>{fileName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cancel upload"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Both options use your <strong className="text-slate-300">Course Settings</strong> (player, interactions, audio, and multimedia preferences).
            {onViewCourseSettings ? ' Review or edit them anytime before you continue.' : null}
          </p>

          <button
            type="button"
            onClick={() => setChoice('quick')}
            className={cn(
              'w-full text-left p-4 rounded-xl border-2 transition-all',
              choice === 'quick'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                choice === 'quick' ? 'border-purple-400' : 'border-slate-600'
              )}>
                {choice === 'quick' && <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  <span className="font-bold text-white">Build now</span>
                </div>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Analyze the document and generate the course without stopping. Uses your saved Course Settings.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setChoice('customize')}
            className={cn(
              'w-full text-left p-4 rounded-xl border-2 transition-all',
              choice === 'customize'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                choice === 'customize' ? 'border-indigo-400' : 'border-slate-600'
              )}>
                {choice === 'customize' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-indigo-300" />
                  <span className="font-bold text-white">Review before build</span>
                </div>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  After analysis, review and edit the topic, description, objectives, and course structure — then generate when you are ready.
                </p>
              </div>
            </div>
          </button>

          {onViewCourseSettings && (
            <button
              type="button"
              onClick={onViewCourseSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-sm font-bold text-slate-300 hover:border-indigo-500/50 hover:text-indigo-200 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              View Course Settings
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(choice)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
