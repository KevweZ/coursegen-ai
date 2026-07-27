import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, XCircle, AlertCircle, Info,
  CheckCheck, Shield, ChevronDown, ChevronRight,
  Sparkles, BarChart3, RefreshCw, ExternalLink, Wand2, Loader2, FileText
} from 'lucide-react';
import { QCReport, QCIssue } from '../services/qcService';

type FilterTab = 'all' | 'error' | 'warning' | 'info';

interface Props {
  open: boolean;
  report: QCReport | null;
  loading: boolean;
  loadingPhase: 'structural' | 'ai' | 'done' | null;
  confirmed: Set<string>;
  declined: Set<string>;
  onConfirm:    (id: string) => void;
  onDecline:    (id: string) => void;
  onConfirmAll: (ids: string[]) => void;
  onDeclineAll: (ids: string[]) => void;
  onClose:      () => void;
  onApply:      (confirmedIssueIds: string[]) => void;
  onRunScan:    () => void;
  onGoToSlide:  (moduleIndex: number, slideIndex: number) => void;
  /** Instantly convert empty interaction to simple content slide */
  onSimplify:   (moduleIndex: number, slideIndex: number) => void;
  /** AI regeneration of a single slide's interaction data */
  onRegenerate: (moduleIndex: number, slideIndex: number, slideId: string) => Promise<void>;
}

const SEVERITY_CONFIG = {
  error:   { label: 'Error',   color: 'text-red-400',    bg: 'bg-red-500/10',   border: 'border-red-500/30',   icon: XCircle },
  warning: { label: 'Warning', color: 'text-amber-400',  bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertCircle },
  info:    { label: 'Info',    color: 'text-blue-400',   bg: 'bg-blue-500/10',  border: 'border-blue-500/30',  icon: Info },
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'from-emerald-500 to-teal-500'
               : score >= 60 ? 'from-amber-500 to-orange-500'
               : 'from-red-500 to-pink-500';
  return (
    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shrink-0`}>
      <span className="text-white font-black text-lg leading-none">{score}</span>
    </div>
  );
}

function IssueCard({
  issue, confirmed, declined, onConfirm, onDecline, onGoToSlide, onSimplify, onRegenerate,
}: {
  issue: QCIssue;
  confirmed: boolean;
  declined: boolean;
  onConfirm:    () => void;
  onDecline:    () => void;
  onGoToSlide:  () => void;
  onSimplify:   () => void;
  onRegenerate: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;
  const isEmptyInteraction = issue.type === 'interaction_empty';

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all ${declined ? 'opacity-40' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
            {(issue as any).slideRef && (
              <>
                <span className="text-[10px] text-slate-500">·</span>
                <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                  {(issue as any).slideRef}
                </span>
              </>
            )}
            <span className="text-[10px] text-slate-500">·</span>
            <span className="text-[10px] text-slate-400 truncate">{issue.moduleTitle}</span>
            <span className="text-[10px] text-slate-500">·</span>
            <span className="text-[10px] text-slate-400 truncate">{issue.slideTitle}</span>
          </div>
          <p className="text-sm text-slate-200 font-medium mt-0.5">{issue.message}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{issue.field}</p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Diff view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              <div className="rounded-lg overflow-hidden border border-slate-700/50 text-xs font-mono">
                {issue.originalText && (
                  <div className="bg-red-900/20 border-b border-slate-700/30 px-3 py-2 text-red-300 leading-relaxed">
                    <span className="text-red-500 font-black mr-2">−</span>
                    {issue.originalText}
                  </div>
                )}
                {issue.suggestion && (
                  <div className="bg-emerald-900/20 px-3 py-2 text-emerald-300 leading-relaxed">
                    <span className="text-emerald-500 font-black mr-2">+</span>
                    {issue.suggestion}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3">
        {/* Left: go to slide */}
        <button
          onClick={onGoToSlide}
          title="Go to this slide in the course preview"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all"
        >
          <ExternalLink className="w-3 h-3" /> View Slide
        </button>

        {/* Right: special actions for empty interactions */}
        {isEmptyInteraction ? (
          <div className="flex gap-2">
            <button
              onClick={onSimplify}
              title="Replace with a simple content slide — no AI credits needed"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              <FileText className="w-3 h-3" /> Use Simple Layout
            </button>
            <button
              onClick={async () => {
                setRegenerating(true);
                try { await onRegenerate(); } finally { setRegenerating(false); }
              }}
              disabled={regenerating}
              title="Ask AI to regenerate this interaction's content"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-60 disabled:cursor-wait transition-all"
            >
              {regenerating
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Regenerating…</>
                : <><Wand2 className="w-3 h-3" /> Regenerate</>}
            </button>
          </div>
        ) : (
          /* Right: standard decline / confirm for all other types */
          <div className="flex gap-2">
            <button
              onClick={onDecline}
              disabled={declined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                ${declined
                  ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                  : 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
            >
              <XCircle className="w-3 h-3" /> Decline
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmed || issue.suggestion === issue.originalText || !issue.suggestion}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                ${confirmed
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-default'
                  : issue.type === 'color_contrast'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30'}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {confirmed ? 'Applied' : issue.type === 'color_contrast' ? 'Apply Dark Color' : 'Confirm Fix'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function QCTrackChangesModal({
  open, report, loading, loadingPhase,
  confirmed, declined,
  onConfirm, onDecline, onConfirmAll, onDeclineAll,
  onClose, onApply, onRunScan, onGoToSlide,
  onSimplify, onRegenerate,
}: Props) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const pendingCount = useMemo(() =>
    report ? report.issues.filter(i => !confirmed.has(i.id) && !declined.has(i.id)).length : 0,
    [report, confirmed, declined]
  );

  const filteredIssues = useMemo(() => {
    if (!report) return [];
    return report.issues.filter(i => filter === 'all' || i.severity === filter);
  }, [report, filter]);

  const confirmable = useMemo(() =>
    filteredIssues.filter(i => i.suggestion && i.suggestion !== i.originalText && !confirmed.has(i.id)),
    [filteredIssues, confirmed]
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
        {/* Backdrop — clicking dismisses but preserves report */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-slate-950 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-white">Quality Check</h2>
              <p className="text-xs text-slate-400">
                {loading
                  ? 'Scanning course content…'
                  : report
                  ? pendingCount > 0
                    ? `${pendingCount} pending item${pendingCount !== 1 ? 's' : ''} · ${report.totalIssues} total found`
                    : `${report.totalIssues} issue${report.totalIssues !== 1 ? 's' : ''} found — all reviewed`
                  : 'Ready to scan'}
              </p>
            </div>
            {report && !loading && <ScoreBadge score={report.score} />}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16 px-8">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-lg animate-pulse" />
                <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" />
                <Shield className="w-7 h-7 text-indigo-400 absolute inset-0 m-auto" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">
                  {loadingPhase === 'structural' ? 'Checking structure & formatting…'
                  : loadingPhase === 'ai'         ? 'AI scanning for spelling & grammar…'
                  : 'Finalising report…'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {loadingPhase === 'ai' ? 'This may take a few seconds.' : 'Running instant checks…'}
                </p>
              </div>
              <div className="flex gap-2">
                {(['structural', 'ai', 'done'] as const).map((phase, i) => (
                  <div key={phase} className={`h-1.5 w-16 rounded-full transition-all ${
                    phase === loadingPhase ? 'bg-indigo-500 animate-pulse'
                    : (loadingPhase === 'ai' && i === 0) || (loadingPhase === 'done' && i <= 1) || loadingPhase === 'done'
                    ? 'bg-indigo-500/60' : 'bg-slate-700'
                  }`} />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && report && (
            <>
              {/* Summary row */}
              <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/40 shrink-0">
                <div className="flex gap-4 text-sm flex-wrap">
                  {report.errors > 0 && (
                    <span className="flex items-center gap-1.5 text-red-400 font-bold">
                      <XCircle className="w-3.5 h-3.5" />{report.errors} error{report.errors !== 1 ? 's' : ''}
                    </span>
                  )}
                  {report.warnings > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />{report.warnings} warning{report.warnings !== 1 ? 's' : ''}
                    </span>
                  )}
                  {report.info > 0 && (
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <Info className="w-3.5 h-3.5" />{report.info} info
                    </span>
                  )}
                  {report.totalIssues === 0 && (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />No issues found — course looks great!
                    </span>
                  )}
                  {(report as any).aiScanFailed && (
                    <span className="flex items-center gap-1.5 text-amber-500/80 text-[11px] font-medium">
                      <AlertCircle className="w-3 h-3" />Structural check only (AI scan unavailable)
                    </span>
                  )}
                </div>

                {/* Bulk actions */}
                {filteredIssues.length > 0 && (
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => onDeclineAll(filteredIssues.map(i => i.id))}
                      className="text-xs text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded hover:bg-slate-800 transition-all"
                    >
                      Decline all
                    </button>
                    <button
                      onClick={() => onConfirmAll(confirmable.map(i => i.id))}
                      className="text-xs text-indigo-300 hover:text-indigo-100 font-bold px-2 py-1 rounded hover:bg-indigo-500/10 transition-all flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Confirm all
                    </button>
                  </div>
                )}
              </div>

              {/* Filter tabs */}
              {report.totalIssues > 0 && (
                <div className="flex gap-1 px-6 pt-3 shrink-0">
                  {(['all', 'error', 'warning', 'info'] as FilterTab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${
                        filter === tab
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab === 'all' ? `All (${report.totalIssues})` : tab}
                    </button>
                  ))}
                </div>
              )}

              {/* Issue list */}
              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-600/50" />
                    <p className="font-medium">No {filter !== 'all' ? filter : ''} issues found</p>
                  </div>
                ) : (
                  filteredIssues.map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      confirmed={confirmed.has(issue.id)}
                      declined={declined.has(issue.id)}
                      onConfirm={() => onConfirm(issue.id)}
                      onDecline={() => onDecline(issue.id)}
                      onGoToSlide={() => onGoToSlide(issue.moduleIndex, issue.slideIndex)}
                      onSimplify={() => onSimplify(issue.moduleIndex, issue.slideIndex)}
                      onRegenerate={() => onRegenerate(issue.moduleIndex, issue.slideIndex, issue.slideId)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-slate-500">
                    {confirmed.size} fix{confirmed.size !== 1 ? 'es' : ''} confirmed · {declined.size} declined
                    {pendingCount > 0 && <span className="text-amber-400 ml-1">· {pendingCount} pending</span>}
                  </p>
                  {pendingCount === 0 && report.totalIssues > 0 && (
                    <button
                      onClick={onRunScan}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-300 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Run new scan
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 text-sm font-bold transition-all hover:bg-slate-800">
                    Close
                  </button>
                  {confirmed.size > 0 && (
                    <button
                      onClick={() => onApply([...confirmed])}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold transition-all hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Apply {confirmed.size} Fix{confirmed.size !== 1 ? 'es' : ''}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* No report yet — idle state */}
          {!loading && !report && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-16 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Ready to scan</p>
                <p className="text-slate-400 text-sm mt-1">Click below to check your course for spelling, grammar, and formatting issues.</p>
              </div>
              <button
                onClick={onRunScan}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                <Shield className="w-4 h-4" /> Run QC Scan
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
