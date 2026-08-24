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
  /** Apply confirmed fixes. When `dismissRemaining` is true, unselected pending items are cleared (legacy behavior). */
  onApply:      (confirmedIssueIds: string[], options?: { dismissRemaining?: boolean }) => void;
  onRunScan:    () => void;
  onGoToSlide:  (moduleIndex: number, slideIndex: number, field?: string) => void;
  /** Instantly convert empty interaction to simple content slide */
  onSimplify:   (moduleIndex: number, slideIndex: number) => void;
  /** AI regeneration of a single slide's interaction data */
  onRegenerate: (moduleIndex: number, slideIndex: number, slideId: string) => Promise<void>;
  /** When opened from a slide QA badge, highlight/scroll to that slide's issues */
  focusSlideId?: string | null;
}

const SEVERITY_CONFIG = {
  error:   { label: 'Must fix', color: 'text-red-400',   bg: 'bg-slate-900/80', border: 'border-slate-700 border-l-4 border-l-red-500',   icon: XCircle },
  warning: { label: 'Review',   color: 'text-amber-400', bg: 'bg-slate-900/80', border: 'border-slate-700 border-l-4 border-l-amber-500', icon: AlertCircle },
  info:    { label: 'Note',     color: 'text-slate-400', bg: 'bg-slate-900/80', border: 'border-slate-700 border-l-4 border-l-sky-600/70', icon: Info },
};

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'All',
  error: 'Must fix',
  warning: 'Review',
  info: 'Notes',
};

/** Map QC field keys to plain English for beta testers. */
function humanizeField(field?: string): string {
  if (!field?.trim()) return 'Content';
  const key = field.trim();
  const lower = key.toLowerCase().replace(/[_\s]+/g, '');
  if (lower === 'voiceovertext' || lower === 'narration') return 'Narration script';
  if (lower === 'content') return 'Slide text';
  if (lower === 'title') return 'Slide title';
  if (lower === 'data.items' || lower === 'items' || key === 'data.items') return 'Interaction items';
  if (lower === 'data.tabs' || lower === 'tabs' || key === 'data.tabs') return 'Tabs';
  // Prettify camelCase / snake_case / dotted paths into words
  return key
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'from-emerald-600/90 to-teal-600/80'
               : score >= 60 ? 'from-amber-600/90 to-orange-600/80'
               : 'from-red-600/90 to-rose-600/80';
  return (
    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-md shrink-0`}>
      <span className="text-white font-bold text-lg leading-none">{score}</span>
    </div>
  );
}

function IssueCard({
  issue, confirmed, declined, onConfirm, onDecline, onGoToSlide, onSimplify, onRegenerate, highlighted,
}: {
  issue: QCIssue;
  confirmed: boolean;
  declined: boolean;
  onConfirm:    () => void;
  onDecline:    () => void;
  onGoToSlide:  () => void;
  onSimplify:   () => void;
  onRegenerate: () => Promise<void>;
  highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(!!issue.suggestion && issue.suggestion !== issue.originalText);
  const [regenerating, setRegenerating] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;
  const actions = issue.fixActions ?? [];
  const canRegenerate = actions.includes('regenerate') || issue.type === 'interaction_empty';
  const canSimplify = actions.includes('simplify') || issue.type === 'interaction_empty';
  const canConfirmFix =
    !canRegenerate &&
    !!issue.suggestion &&
    issue.suggestion !== issue.originalText &&
    (actions.includes('fix_color') || issue.type === 'color_contrast' || issue.autoFixable ||
      ['spelling', 'grammar', 'clarity', 'consistency', 'title_length', 'content_length'].includes(issue.type));

  const confirmLabel = confirmed
    ? 'Applied'
    : issue.type === 'color_contrast'
    ? 'Apply Dark Color'
    : 'Confirm Fix';

  return (
    <div
      data-slide-id={issue.slideId}
      className={`rounded-xl border overflow-hidden transition-all ${declined ? 'opacity-40' : ''} ${
        highlighted
          ? 'border-indigo-400 border-l-4 border-l-indigo-400 bg-slate-900/80 ring-1 ring-indigo-400/40'
          : `${cfg.border} ${cfg.bg}`
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
            {(issue as any).slideRef && (
              <>
                <span className="text-[10px] text-slate-600">·</span>
                <span className="text-[10px] font-medium text-slate-300 bg-slate-800/80 border border-slate-600/50 px-1.5 py-0.5 rounded">
                  {(issue as any).slideRef}
                </span>
              </>
            )}
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-slate-500 truncate">{issue.moduleTitle}</span>
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-slate-500 truncate">{issue.slideTitle}</span>
          </div>
          <p className="text-sm text-slate-200 mt-1 leading-snug">{issue.message}</p>
          <p className="mt-1.5 inline-flex items-center text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 rounded">
            Where: {humanizeField(issue.field)}
          </p>
          {/* Always-visible fix preview so Confirm Fix is meaningful without expanding */}
          {canConfirmFix && issue.suggestion && !confirmed && (
            <p className="mt-2 text-[11px] text-emerald-300/90 leading-snug">
              <span className="font-semibold text-emerald-400">Suggested fix: </span>
              <span className="text-emerald-200/90">{issue.suggestion.length > 140 ? `${issue.suggestion.slice(0, 140)}…` : issue.suggestion}</span>
            </p>
          )}
        </div>
        {(issue.originalText || issue.suggestion) && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
            title={expanded ? 'Hide details' : 'Show full before/after'}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Diff view */}
      <AnimatePresence>
        {expanded && (issue.originalText || issue.suggestion) && (
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
        <button
          onClick={onGoToSlide}
          title="Go to this slide in the course preview"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all"
        >
          <ExternalLink className="w-3 h-3" /> View Slide
        </button>

        {canRegenerate ? (
          <div className="flex gap-2">
            {canSimplify && (
              <button
                onClick={onSimplify}
                title="Replace with a simple content slide — no AI credits needed"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
              >
                <FileText className="w-3 h-3" /> Use Simple Layout
              </button>
            )}
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
        ) : canConfirmFix ? (
          <div className="flex gap-2">
            <button
              onClick={onDecline}
              disabled={declined}
              title="Skip this suggested change — leave the content as-is"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                ${declined
                  ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                  : 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
            >
              <XCircle className="w-3 h-3" /> Decline
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmed}
              title={issue.suggestion ? `Apply: ${issue.suggestion.slice(0, 80)}` : 'Apply the suggested fix'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                ${confirmed
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-default'
                  : issue.type === 'color_contrast'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30'}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {confirmLabel}
            </button>
          </div>
        ) : (
          <button
            onClick={onDecline}
            disabled={declined}
            title="Acknowledge and hide this warning — no automatic fix is available"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
              ${declined
                ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                : 'border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
          >
            <XCircle className="w-3 h-3" /> {declined ? 'Dismissed' : 'Dismiss'}
          </button>
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
  focusSlideId = null,
}: Props) {
  const [filter, setFilter] = useState<FilterTab>('all');
  /** When Apply runs: if true, also dismiss remaining pending (close/clear like before). Default off. */
  const [dismissRemaining, setDismissRemaining] = useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Reset checkbox each time the modal opens or a new scan lands
  React.useEffect(() => {
    if (open) setDismissRemaining(false);
  }, [open, report?.runAt]);

  const pendingCount = useMemo(() =>
    report ? report.issues.filter(i => !confirmed.has(i.id) && !declined.has(i.id)).length : 0,
    [report, confirmed, declined]
  );

  const filteredIssues = useMemo(() => {
    if (!report) return [];
    const list = report.issues.filter(i => filter === 'all' || i.severity === filter);
    if (!focusSlideId) return list;
    // Focused slide's issues first so the learner sees them immediately
    return [...list].sort((a, b) => {
      const aF = a.slideId === focusSlideId ? 0 : 1;
      const bF = b.slideId === focusSlideId ? 0 : 1;
      return aF - bF;
    });
  }, [report, filter, focusSlideId]);

  const confirmable = useMemo(() =>
    filteredIssues.filter(i => i.suggestion && i.suggestion !== i.originalText && !confirmed.has(i.id)),
    [filteredIssues, confirmed]
  );

  React.useEffect(() => {
    if (!open || !focusSlideId || !listRef.current) return;
    const t = window.setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-slide-id="${CSS.escape(focusSlideId)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, focusSlideId, filteredIssues]);

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
              <h2 className="text-base font-bold text-white">Quality Check</h2>
              <p className="text-xs text-slate-400">
                {loading
                  ? 'Scanning course content…'
                  : report
                  ? pendingCount > 0
                    ? `${pendingCount} pending item${pendingCount !== 1 ? 's' : ''} · ${report.totalIssues} total found`
                    : `${report.totalIssues} issue${report.totalIssues !== 1 ? 's' : ''} found — all reviewed`
                  : 'Ready to scan'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Open a finding, then View slide to jump there. Confirm applies a suggested text fix; Regenerate rebuilds the slide with AI.
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
                      title="Dismiss or decline every listed item (skip applying fixes)"
                      className="text-xs text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded hover:bg-slate-800 transition-all"
                    >
                      Dismiss all
                    </button>
                    <button
                      onClick={() => onConfirmAll(confirmable.map(i => i.id))}
                      disabled={confirmable.length === 0}
                      title={confirmable.length ? `Queue ${confirmable.length} suggested text fix(es)` : 'No auto-fixable items in this list'}
                      className="text-xs text-indigo-300 hover:text-indigo-100 font-bold px-2 py-1 rounded hover:bg-indigo-500/10 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCheck className="w-3 h-3" /> Fix All
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        filter === tab
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab === 'all' ? `All (${report.totalIssues})` : FILTER_LABELS[tab]}
                    </button>
                  ))}
                </div>
              )}

              {/* Issue list */}
              <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
                {focusSlideId && filteredIssues.some(i => i.slideId === focusSlideId) && (
                  <div className="mb-2 px-3 py-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-xs text-indigo-200 font-semibold">
                    Highlighted rows are for the slide you were viewing
                    {filteredIssues.find(i => i.slideId === focusSlideId)?.slideRef
                      ? ` (${filteredIssues.find(i => i.slideId === focusSlideId)!.slideRef})`
                      : ''}
                    .
                  </div>
                )}
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-600/50" />
                    <p className="font-medium">No {filter !== 'all' ? FILTER_LABELS[filter].toLowerCase() : ''} issues found</p>
                  </div>
                ) : (
                  filteredIssues.map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      confirmed={confirmed.has(issue.id)}
                      declined={declined.has(issue.id)}
                      highlighted={!!focusSlideId && issue.slideId === focusSlideId}
                      onConfirm={() => onConfirm(issue.id)}
                      onDecline={() => onDecline(issue.id)}
                      onGoToSlide={() => onGoToSlide(issue.moduleIndex, issue.slideIndex, issue.field)}
                      onSimplify={() => onSimplify(issue.moduleIndex, issue.slideIndex)}
                      onRegenerate={() => onRegenerate(issue.moduleIndex, issue.slideIndex, issue.slideId)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-slate-500">
                      {confirmed.size} fix{confirmed.size !== 1 ? 'es' : ''} confirmed · {declined.size} dismissed
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
                        onClick={() => onApply([...confirmed], { dismissRemaining })}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600/90 to-indigo-500/80 text-white text-sm font-semibold transition-all hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-500/15 flex items-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Apply {confirmed.size} Fix{confirmed.size !== 1 ? 'es' : ''}
                      </button>
                    )}
                  </div>
                </div>
                {confirmed.size > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer select-none self-end">
                    <input
                      type="checkbox"
                      checked={dismissRemaining}
                      onChange={e => setDismissRemaining(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-500 bg-slate-900 focus:ring-indigo-500/40"
                    />
                    <span className="text-[11px] text-slate-400">
                      Also dismiss remaining pending items
                    </span>
                  </label>
                )}
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
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600/90 to-indigo-500/80 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-500/15"
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
