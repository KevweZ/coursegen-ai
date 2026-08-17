/**
 * ViewDraftsModal — browse Design vs Development drafts from the profile menu.
 * Intentionally no AnimatePresence exit on the full-screen backdrop: delayed
 * unmount left a frozen blur over the course preview after Open.
 */
import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, FolderOpen, Clock, Layers, BookOpen, Trash2, RefreshCw, Loader2, Pencil } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CourseDraft } from '../../lib/useDraftCourses';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  drafts: CourseDraft[];
  isReady?: boolean;
  cloudEnabled?: boolean;
  slotsUsed?: number;
  slotsTotal?: number;
  onRefresh?: () => void | Promise<void>;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void | Promise<void>;
}

type TabId = 'all' | 'preview' | 'design';

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export const ViewDraftsModal: React.FC<Props> = ({
  isOpen, onClose, drafts, isReady = true, cloudEnabled = false, slotsUsed, slotsTotal,
  onRefresh, onLoad, onDelete, onRename,
}) => {
  const [tab, setTab] = useState<TabId>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(null);
    const hasPreview = drafts.some(d => d.phase === 'preview');
    const hasDesign = drafts.some(d => d.phase === 'design');
    if (hasPreview && !hasDesign) setTab('preview');
    else if (hasDesign && !hasPreview) setTab('design');
    else setTab('all');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (tab === 'all') return drafts;
    return drafts.filter(d => d.phase === tab);
  }, [drafts, tab]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/55 z-[700]"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-[701] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[88vh]"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="View Drafts"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="font-black text-white text-lg tracking-tight">View Drafts</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Open a saved Design or Development draft
                  {typeof slotsUsed === 'number' && typeof slotsTotal === 'number' && (
                    <span className="text-slate-500"> · {slotsUsed}/{slotsTotal} slots used</span>
                  )}
                  <span className={cloudEnabled ? 'text-emerald-400/90' : 'text-amber-400/90'}>
                    {' '}· {cloudEnabled ? 'Account sync on' : 'Local only — cloud drafts unavailable'}
                  </span>
                  <span className="block text-slate-500 text-xs mt-1">
                    Tip: on the device that has the draft, tap the refresh icon to upload it to your account before checking another device.
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onRefresh && (
                <button
                  onClick={() => { void handleRefresh(); }}
                  disabled={refreshing}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
                  title="Sync drafts to your account"
                >
                  {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex border-b border-slate-800 px-2">
            {([
              { id: 'all' as const, label: 'All drafts', icon: FolderOpen },
              { id: 'preview' as const, label: 'Course Development', icon: BookOpen },
              { id: 'design' as const, label: 'Course Design', icon: Layers },
            ]).map(t => {
              const count = t.id === 'all'
                ? drafts.length
                : drafts.filter(d => d.phase === t.id).length;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setConfirmDelete(null); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-bold border-b-2 transition-all',
                    tab === t.id
                      ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  )}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.id === 'all' ? 'All' : t.id === 'preview' ? 'Dev' : 'Design'}</span>
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar min-h-[320px]">
            {!isReady || refreshing ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm font-medium">Loading drafts…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-slate-300 font-bold text-base">
                  No {tab === 'all' ? '' : tab === 'preview' ? 'Development ' : 'Design '}drafts saved yet
                </p>
                <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                  From Course Development, click <strong className="text-slate-400">Save</strong> to store a draft.
                  From Course Settings / Design, use <strong className="text-slate-400">Save Design Draft</strong>.
                  Drafts sync to your NexCourse cloud account (with a local browser cache).
                </p>
              </div>
            ) : (
              filtered.map(d => (
                <div
                  key={d.id}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/50 px-5 py-4 flex items-start gap-4 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renamingId === d.id ? (
                        <form
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const trimmed = renameValue.trim();
                            if (trimmed && onRename) void onRename(d.id, trimmed);
                            setRenamingId(null);
                          }}
                        >
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="flex-1 min-w-0 rounded-lg border border-indigo-500/50 bg-slate-950 px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-indigo-400"
                            aria-label="Draft name"
                          />
                          <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-600"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <p className="text-base font-bold text-white truncate">{d.courseTitle || 'Untitled course'}</p>
                          <span className={cn(
                            'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                            d.phase === 'preview'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          )}>
                            {d.phase === 'preview' ? 'Development' : 'Design'}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
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
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {confirmDelete === d.id ? (
                      <>
                        <button
                          onClick={() => { onDelete(d.id); setConfirmDelete(null); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : renamingId === d.id ? null : (
                      <>
                        <button
                          onClick={() => onLoad(d.id)}
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                        >
                          Open
                        </button>
                        {onRename && (
                          <button
                            onClick={() => {
                              setConfirmDelete(null);
                              setRenamingId(d.id);
                              setRenameValue(d.courseTitle || '');
                            }}
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10"
                            title="Rename draft"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(d.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ViewDraftsModal;
