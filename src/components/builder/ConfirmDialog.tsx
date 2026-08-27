import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel?: string;
  cancelLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  cancelLabel = 'Cancel',
  onPrimary,
  onSecondary,
  onCancel,
  busy = false,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={busy ? undefined : onCancel}
          />
          <motion.div
            role="dialog"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h3 id="confirm-dialog-title" className="text-lg font-bold text-white">{title}</h3>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{body}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 p-4 border-t border-slate-800 bg-slate-900/80">
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              {secondaryLabel && onSecondary && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSecondary}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-600 text-slate-200 hover:border-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {secondaryLabel}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={onPrimary}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {primaryLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
