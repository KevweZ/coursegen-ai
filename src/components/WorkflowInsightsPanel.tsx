/**
 * WorkflowInsightsPanel.tsx
 *
 * Autoskill integration UI.
 * Provides two paths:
 *   1. Screenpipe connected → auto-fetch recent screen activity
 *   2. Screenpipe unavailable → manual activity description input
 *
 * Both paths call /api/workflow-insights which uses Claude to suggest
 * eLearning course topics matched to the detected workflow.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, CheckCircle2, XCircle, Clock, ChevronDown,
  Lightbulb, BookOpen, ArrowRight, RefreshCw, AlertCircle,
  Sparkles, Terminal, ExternalLink, Loader2,
} from 'lucide-react';
import {
  checkScreenpipeHealth,
  fetchRecentActivity,
  clusterActivities,
  parseManualActivity,
  analyzeWorkflow,
  ScreenpipeStatus,
  CourseSuggestion,
  ActivityCluster,
} from '../services/workflowService';

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Called when user selects a topic and wants to generate a course */
  onGenerateCourse: (topic: string) => void;
  authHeader?: string;
}

const TIME_OPTIONS = [
  { label: 'Last 1 hour',   value: 1  },
  { label: 'Last 4 hours',  value: 4  },
  { label: 'Last 8 hours',  value: 8  },
  { label: 'Today',         value: 12 },
];

const SKILL_COLORS: Record<string, string> = {
  'markdown-mermaid-writing': 'bg-indigo-500/20 text-indigo-300',
  'scientific-writing':       'bg-purple-500/20 text-purple-300',
  'generate-image':           'bg-amber-500/20 text-amber-300',
  'infographics':             'bg-emerald-500/20 text-emerald-300',
  'pptx':                     'bg-sky-500/20 text-sky-300',
  'liteparse':                'bg-rose-500/20 text-rose-300',
};

function skillColor(skill: string): string {
  return SKILL_COLORS[skill] ?? 'bg-slate-700/60 text-slate-300';
}

// ─────────────────────────────────────────────────────────────────────────────

export const WorkflowInsightsPanel: React.FC<Props> = ({ onGenerateCourse, authHeader }) => {
  const [status,        setStatus]        = useState<ScreenpipeStatus>('checking');
  const [lookbackHours, setLookbackHours] = useState(4);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [clusters,      setClusters]      = useState<ActivityCluster[]>([]);
  const [suggestions,   setSuggestions]   = useState<CourseSuggestion[]>([]);
  const [error,         setError]         = useState<string | null>(null);
  const [manualInput,   setManualInput]   = useState('');
  const [showSetup,     setShowSetup]     = useState(false);
  const [analyzed,      setAnalyzed]      = useState(false);

  // ── Check screenpipe on mount ──────────────────────────────────────────────
  useEffect(() => {
    checkScreenpipeHealth().then(ok => {
      setStatus(ok ? 'connected' : 'unavailable');
    });
  }, []);

  // ── Run analysis ───────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    setSuggestions([]);

    try {
      let detected: ActivityCluster[];

      if (status === 'connected') {
        const events = await fetchRecentActivity(lookbackHours);
        detected = clusterActivities(events);
        if (detected.length === 0) {
          setError('No activity found in the selected time window. Try a longer period.');
          return;
        }
      } else {
        if (!manualInput.trim()) {
          setError('Please describe what you have been working on.');
          return;
        }
        detected = parseManualActivity(manualInput);
      }

      setClusters(detected);

      const result = await analyzeWorkflow(detected, lookbackHours, authHeader);
      setSuggestions(result.suggestions ?? []);
      setAnalyzed(true);
    } catch (err: any) {
      setError(err?.message ?? 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [status, lookbackHours, manualInput, authHeader]);

  // ── Confidence badge ───────────────────────────────────────────────────────
  const ConfidenceBadge = ({ value }: { value: number }) => {
    const pct = Math.round(value * 100);
    const color =
      pct >= 75 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' :
      pct >= 50 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' :
                  'text-slate-400 bg-slate-700/40 border-slate-600/40';
    return (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${color}`}>
        {pct}% match
      </span>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-base">Workflow Insights</h3>
            <p className="text-slate-500 text-xs">Powered by autoskill · screenpipe</p>
          </div>
        </div>

        {/* Screenpipe status */}
        <div className="flex items-center gap-1.5">
          {status === 'checking' && (
            <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />Checking…
            </span>
          )}
          {status === 'connected' && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />screenpipe connected
            </span>
          )}
          {status === 'unavailable' && (
            <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
              <XCircle className="w-3 h-3" />screenpipe offline
            </span>
          )}
        </div>
      </div>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 space-y-4">
        {status === 'connected' ? (
          /* Screenpipe auto-mode */
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Time Window
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLookbackHours(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    lookbackHours === opt.value
                      ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Clock className="w-3 h-3" />{opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600">
              Only app names and window titles are analyzed — OCR content stays on your machine.
            </p>
          </div>
        ) : (
          /* Manual mode */
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              What have you been working on?
            </label>
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder={`e.g. "Researching workplace safety regulations for a construction company. Reviewing OSHA guidelines, incident reports, and training materials for site supervisors."`}
              rows={4}
              className="w-full bg-slate-800/80 border border-slate-700 focus:border-violet-500 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
            />
            {/* Setup guide toggle */}
            <button
              onClick={() => setShowSetup(s => !s)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Terminal className="w-3 h-3" />
              Connect screenpipe for automatic detection
              <ChevronDown className={`w-3 h-3 transition-transform ${showSetup ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSetup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3 text-xs">
                    <p className="text-slate-400 font-bold">Quick setup (Windows):</p>
                    <div className="space-y-2">
                      {[
                        '1. Install screenpipe from screenpipe.so',
                        '2. Run: screenpipe record --disable-audio --use-pii-removal',
                        '3. Refresh this page — status will turn green',
                      ].map((step, i) => (
                        <p key={i} className="text-slate-500 font-mono">{step}</p>
                      ))}
                    </div>
                    <a
                      href="https://github.com/mediar-ai/screenpipe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />screenpipe GitHub
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || status === 'checking'}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20 text-sm"
        >
          {isAnalyzing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Analyzing your workflow…</>
          ) : (
            <><Sparkles className="w-4 h-4" />Analyze & Suggest Courses</>
          )}
        </button>
      </div>

      {/* ── Activity clusters preview ───────────────────────────────────────── */}
      <AnimatePresence>
        {clusters.length > 0 && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Detected Activity ({clusters.length} app{clusters.length !== 1 ? 's' : ''})
            </p>
            <div className="flex flex-wrap gap-2">
              {clusters.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/50 rounded-lg"
                >
                  <span className="text-slate-300 text-xs font-bold">{c.app}</span>
                  <span className="text-slate-600 text-xs">{c.totalMinutes}m</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Course Suggestions ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Suggested Courses ({suggestions.length})
              </p>
              <button
                onClick={runAnalysis}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />Re-analyze
              </button>
            </div>

            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-slate-900/80 border border-slate-700/60 hover:border-violet-500/40 rounded-2xl p-4 space-y-3 transition-all group"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-extrabold text-sm leading-tight">{s.topic}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{s.targetAudience}</p>
                      </div>
                    </div>
                    <ConfidenceBadge value={s.confidence} />
                  </div>

                  {/* Description */}
                  <p className="text-slate-400 text-xs leading-relaxed">{s.description}</p>

                  {/* Why this was suggested */}
                  <div className="flex items-start gap-1.5">
                    <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-amber-300/80 text-xs italic">{s.why}</p>
                  </div>

                  {/* Skills & action */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-1.5 flex-wrap">
                      {(s.relatedSkills ?? []).slice(0, 4).map(skill => (
                        <span key={skill} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${skillColor(skill)}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => onGenerateCourse(s.topic)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                    >
                      Generate Course <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state after analysis ─────────────────────────────────────── */}
      {analyzed && suggestions.length === 0 && !isAnalyzing && !error && (
        <div className="text-center py-6 space-y-2">
          <p className="text-slate-400 text-sm font-bold">No course suggestions found</p>
          <p className="text-slate-600 text-xs">Try a longer time window or describe your work in more detail.</p>
        </div>
      )}
    </div>
  );
};

export default WorkflowInsightsPanel;
