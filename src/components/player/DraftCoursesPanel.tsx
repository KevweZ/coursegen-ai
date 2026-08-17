/**
 * DraftCoursesPanel — slide-in drawer for managing saved course drafts.
 * Shown to authenticated (Pro) users only.
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Trash2, FolderOpen, Clock, Layers, Save, AlertCircle, CheckCircle2, Lock, Pencil, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CourseDraft } from '../../lib/useDraftCourses';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'unified';
  drafts: CourseDraft[];
  slotsUsed: number;
  slotsTotal: number;
  canSave: boolean;
  isAuthenticated: boolean;
  currentCourseTitle?: string;
  activeDraftId?: string | null;
  isSaving?: boolean;
  onSave: () => void;
  /** Overwrite the draft currently open in the player (when one is active). */
  onUpdateCurrent?: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onReplace: (id: string) => void;
  onRename?: (id: string, title: string) => void | Promise<void>;
  saveMessage?: string | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function SlotBar({ used, total, theme }: { used: number; total: number; theme: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i < used
                ? 'bg-indigo-500'
                : theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-bold tabular-nums', theme === 'light' ? 'text-slate-500' : 'text-slate-400')}>
        {used}/{total}
      </span>
    </div>
  );
}

export const DraftCoursesPanel: React.FC<Props> = ({
  isOpen, onClose, theme, drafts, slotsUsed, slotsTotal, canSave,
  isAuthenticated, currentCourseTitle, activeDraftId, isSaving, onSave, onUpdateCurrent,
  onLoad, onDelete, onReplace, onRename, saveMessage,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const bg = theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : theme === 'unified' ? 'bg-indigo-950 border-indigo-500/30 text-white' : 'bg-slate-900 border-slate-700 text-white';
  const cardBg = theme === 'light' ? 'bg-slate-50 border-slate-200 hover:border-indigo-300' : theme === 'unified' ? 'bg-indigo-900/40 border-indigo-500/20 hover:border-purple-400/50' : 'bg-slate-800/60 border-slate-700 hover:border-indigo-500/50';
  const subText = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  const savingBusy = !!isSaving;

  // Instant unmount when closed — AnimatePresence exit left a frozen blur over the player
  if (!isOpen) return null;

  const startRename = (draft: CourseDraft) => {
    setConfirmDelete(null);
    setRenamingId(draft.id);
    setRenameValue(draft.courseTitle || '');
  };

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || !onRename) {
      setRenamingId(null);
      return;
    }
    await onRename(id, trimmed);
    setRenamingId(null);
  };

  const messageLooksSuccess = !!(
    saveMessage &&
    (saveMessage.startsWith('✓') || /saved|renamed|updated/i.test(saveMessage)) &&
    !/fail|error|cannot|can’t|quota|full/i.test(saveMessage)
  );
  const messageLooksProgress = !!(saveMessage && /saving|updating|overwriting/i.test(saveMessage));

  const content = (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[600]"
            onClick={savingBusy ? undefined : onClose}
            aria-hidden
          />

          <div
            className={cn(
              'fixed right-0 top-0 bottom-0 w-[380px] max-w-[95vw] z-[601] flex flex-col border-l shadow-2xl',
              bg
            )}
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between px-5 py-4 border-b', theme === 'light' ? 'border-slate-200' : 'border-slate-700/60')}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-black text-sm tracking-tight">Saved Drafts</h2>
                  <p className={cn('text-xs', subText)}>Synced to your account</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={savingBusy}
                className="p-1.5 rounded-lg hover:bg-slate-700/30 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

              {/* Not signed in */}
              {!isAuthenticated && (
                <div className={cn('rounded-xl border p-5 text-center space-y-2', theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-600/30')}>
                  <Lock className="w-8 h-8 mx-auto text-amber-400" />
                  <p className="font-bold text-sm">Pro feature</p>
                  <p className={cn('text-xs', subText)}>Sign in to save and restore course drafts.</p>
                </div>
              )}

              {/* Slot indicator */}
              {isAuthenticated && (
                <div className={cn('rounded-xl border p-4 space-y-3', theme === 'light' ? 'bg-indigo-50/60 border-indigo-200' : 'bg-indigo-900/20 border-indigo-500/20')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Draft Slots</span>
                    <span className={cn('text-xs', subText)}>{slotsTotal} max · shared Design + Development</span>
                  </div>
                  <SlotBar used={slotsUsed} total={slotsTotal} theme={theme} />
                </div>
              )}

              {/* Save current course */}
              {isAuthenticated && (
                <div className={cn('rounded-xl border p-4 space-y-3', cardBg)}>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-400">Current Course</p>
                  <p className="text-sm font-semibold truncate">{currentCourseTitle || 'Untitled Course'}</p>

                  {onUpdateCurrent && (
                    <button
                      onClick={onUpdateCurrent}
                      disabled={savingBusy}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all',
                        savingBusy
                          ? 'bg-indigo-600/50 text-white/80 cursor-wait'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50'
                      )}
                    >
                      {savingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Update current draft
                    </button>
                  )}

                  <button
                    onClick={onSave}
                    disabled={!canSave || savingBusy}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all',
                      canSave && !savingBusy
                        ? (onUpdateCurrent
                          ? (theme === 'light' ? 'bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50' : 'bg-slate-800/80 border border-indigo-500/40 text-indigo-200 hover:bg-slate-800')
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50')
                        : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                    )}
                  >
                    {savingBusy && !onUpdateCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {canSave ? 'Save as new draft' : 'All slots used — delete one first'}
                  </button>

                  {onUpdateCurrent && canSave && (
                    <p className={cn('text-[11px] leading-snug', subText)}>
                      “Save as new draft” keeps your current draft and adds another copy (e.g. with (1) in the name if titles match).
                    </p>
                  )}

                  {/* In-panel save status — stays next to the buttons */}
                  <AnimatePresence mode="wait">
                    {(savingBusy || saveMessage) && (
                      <motion.div
                        key={savingBusy ? 'saving' : (saveMessage || 'done')}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium',
                          savingBusy || messageLooksProgress
                            ? (theme === 'light' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-indigo-900/40 border-indigo-500/30 text-indigo-200')
                            : messageLooksSuccess
                              ? (theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-300')
                              : (theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-900/30 border-amber-500/30 text-amber-300')
                        )}
                      >
                        {savingBusy || messageLooksProgress
                          ? <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-spin" />
                          : messageLooksSuccess
                            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                        <span>{savingBusy ? (saveMessage || 'Saving…') : saveMessage}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Draft list */}
              {isAuthenticated && drafts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-400 px-1">Your Drafts</p>
                  {drafts.map((draft, idx) => {
                    const isActive = activeDraftId === draft.id;
                    return (
                    <motion.div
                      key={draft.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'rounded-xl border p-4 space-y-3 transition-colors',
                        cardBg,
                        isActive && (theme === 'light' ? 'ring-2 ring-indigo-400/60 border-indigo-300' : 'ring-2 ring-indigo-500/50 border-indigo-500/40')
                      )}
                    >
                      {/* Draft info */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          {renamingId === draft.id ? (
                            <form
                              className="flex-1 flex items-center gap-1.5 min-w-0"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void commitRename(draft.id);
                              }}
                            >
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                                className={cn(
                                  'flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-sm font-bold outline-none',
                                  theme === 'light'
                                    ? 'bg-white border-indigo-300 text-slate-900 focus:border-indigo-500'
                                    : 'bg-slate-950 border-indigo-500/50 text-white focus:border-indigo-400'
                                )}
                                aria-label="Draft name"
                              />
                              <button
                                type="submit"
                                className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingId(null)}
                                className={cn('px-2 py-1.5 rounded-lg text-[10px] font-bold', theme === 'light' ? 'bg-slate-100 text-slate-600' : 'bg-slate-700/50 text-slate-300')}
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-bold text-sm leading-snug">{draft.courseTitle}</p>
                                {isActive && (
                                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide bg-indigo-500/20 text-indigo-300">
                                    Open now
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={cn(
                                  'text-[10px] px-2 py-0.5 rounded-full font-black uppercase',
                                  draft.phase === 'design'
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-indigo-500/15 text-indigo-400'
                                )}>
                                  {draft.phase === 'design' ? 'Design' : 'Development'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className={cn('flex items-center gap-3 text-xs', subText)}>
                          <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{draft.moduleCount} modules</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{draft.slideCount} slides</span>
                        </div>
                        <p className={cn('flex items-center gap-1 text-[11px]', subText)}>
                          <Clock className="w-3 h-3" /> {formatDate(draft.savedAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      {confirmDelete === draft.id ? (
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs flex-1', subText)}>Delete this draft?</span>
                          <button
                            onClick={() => { onDelete(draft.id); setConfirmDelete(null); }}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                          >Delete</button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-colors', theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300')}
                          >Cancel</button>
                        </div>
                      ) : renamingId === draft.id ? null : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onLoad(draft.id)}
                            disabled={savingBusy}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <FolderOpen className="w-3.5 h-3.5" /> Load
                          </button>
                          <button
                            onClick={() => onReplace(draft.id)}
                            disabled={savingBusy}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50',
                              theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700/50 hover:bg-slate-600 text-slate-200'
                            )}
                          >
                            {savingBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Overwrite
                          </button>
                          {onRename && (
                            <button
                              onClick={() => startRename(draft)}
                              disabled={savingBusy}
                              className={cn(
                                'p-2 rounded-lg transition-colors disabled:opacity-50',
                                theme === 'light' ? 'text-slate-500 hover:bg-slate-200 hover:text-indigo-600' : 'text-slate-400 hover:bg-slate-700/50 hover:text-indigo-300'
                              )}
                              title="Rename draft"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(draft.id)}
                            disabled={savingBusy}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {isAuthenticated && drafts.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <p className="text-4xl">📁</p>
                  <p className={cn('text-sm font-semibold', subText)}>No drafts saved yet</p>
                  <p className={cn('text-xs', subText)}>Save a course above to store it here for later.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={cn('px-5 py-3 border-t text-xs', subText, theme === 'light' ? 'border-slate-200' : 'border-slate-700/60')}>
              Drafts save to your NexCourse account so they appear on other devices when you’re signed in.
            </div>
          </div>
        </>
  );

  return ReactDOM.createPortal(content, document.body);
};
