/**
 * ViewDraftsModal — browse Design vs Development drafts from the profile menu.
 */
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Clock, Layers, BookOpen, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CourseDraft } from '../../lib/useDraftCourses';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  drafts: CourseDraft[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export const ViewDraftsModal: React.FC<Props> = ({
  isOpen, onClose, drafts, onLoad, onDelete,
}) => {
  const [tab, setTab] = useState<'preview' | 'design'>('preview');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(
    () => drafts.filter(d => d.phase === tab).sort((a, b) => +new Date(b.savedAt) - +new Date(a.savedAt)),
    [drafts, tab]
  );

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[700]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="fixed inset-0 z-[701] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="font-black text-white text-sm tracking-tight">View Drafts</h2>
                    <p className="text-[11px] text-slate-500">Open a saved Design or Development draft</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex border-b border-slate-800">
                {([
                  { id: 'preview' as const, label: 'Course Development', icon: BookOpen },
                  { id: 'design' as const, label: 'Course Design', icon: Layers },
                ]).map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); setConfirmDelete(null); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-all',
                      tab === t.id
                        ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    )}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    <span className="ml-1 text-[10px] opacity-70">
                      ({drafts.filter(d => d.phase === t.id).length})
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar min-h-[220px]">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No {tab === 'preview' ? 'Development' : 'Design'} drafts saved yet.
                  </div>
                ) : (
                  filtered.map(d => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-slate-700/80 bg-slate-800/50 px-4 py-3 flex items-start gap-3 hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{d.courseTitle || 'Untitled course'}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(d.savedAt)}
                          </span>
                          {d.moduleCount > 0 && (
                            <span>{d.moduleCount} module{d.moduleCount !== 1 ? 's' : ''}</span>
                          )}
                          {d.slideCount > 0 && (
                            <span>{d.slideCount} slide{d.slideCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {confirmDelete === d.id ? (
                          <>
                            <button
                              onClick={() => { onDelete(d.id); setConfirmDelete(null); }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-600 text-white"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-600"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { onLoad(d.id); onClose(); }}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => setConfirmDelete(d.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Delete draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default ViewDraftsModal;
