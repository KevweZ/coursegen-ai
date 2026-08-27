import React, { useState } from 'react';
import {
  ArrowRight, Loader2, FileUp, Target, Layers, Grid3X3,
  Plus, Trash2, Wand2, AlertCircle, BookOpen, Save, Settings2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { OutlinePreview } from './OutlinePreview';
import { ConfirmDialog } from './ConfirmDialog';
import type { CourseOutlineDraft } from '../../services/aiService';
import type { TerminalObjectiveGroup } from '../../types/course';

export type ReviewTab = 'foundation' | 'structure';

const OBJECTIVE_EXAMPLES: Record<string, string> = {
  AB: 'The learner will identify the three stages of effective workplace feedback.',
  ABC: 'Given a workplace scenario, the learner will select the communication strategy that best supports collaboration.',
  ABCD: 'Given a workplace scenario, the learner will select the best communication strategy with at least 80% accuracy.',
};

export interface CourseReviewPageProps {
  compactMobile?: boolean;
  isSandboxMode?: boolean;
  isGenerating?: boolean;
  isHydrating?: boolean;
  isSuggesting?: boolean;
  isGeneratingOutline?: boolean;
  progress?: number;
  error?: string | null;
  renderProgressState?: () => React.ReactNode;

  courseTitle: string;
  setCourseTitle: (v: string) => void;
  courseDescription: string;
  setCourseDescription: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;

  objectiveFormat: string;
  learningObjectives: (string | TerminalObjectiveGroup)[];
  setLearningObjectives: (v: (string | TerminalObjectiveGroup)[]) => void;
  onFormatChange: (fmt: string) => void;
  onSuggestObjectives: () => void;

  includeModuleTitleSlides: boolean;
  setIncludeModuleTitleSlides: (v: boolean) => void;
  includeModuleOverviewSlides: boolean;
  setIncludeModuleOverviewSlides: (v: boolean) => void;
  includeSummarySlides: boolean;
  setIncludeSummarySlides: (v: boolean) => void;

  outlineDraft: CourseOutlineDraft | null;
  onOutlineChange: (o: CourseOutlineDraft) => void;
  onRegenerateOutline: () => void | Promise<void>;

  structureStale: boolean;
  /** Course Settings interaction whitelist for structure-row dropdowns */
  interactionTypes: string[];

  onBack: () => void;
  onReplaceDocument?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateCourse?: () => void;
  onOpenPlayerProperties?: () => void;
  onSaveDesignDraft?: () => void;
  designDraftSavedFlash?: boolean;
}

export function CourseReviewPage(props: CourseReviewPageProps) {
  const {
    compactMobile = false,
    isSandboxMode,
    isGenerating,
    isHydrating,
    isSuggesting,
    isGeneratingOutline,
    progress,
    error,
    renderProgressState,
    structureStale,
  } = props;

  const [activeTab, setActiveTab] = useState<ReviewTab>('foundation');
  const [confirmKind, setConfirmKind] = useState<null | 'switch-structure' | 'generate'>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  if ((isGenerating || isHydrating) && renderProgressState) {
    return (
      <div className={cn('w-full relative z-10', compactMobile ? 'min-h-0 h-full' : 'min-h-[calc(100vh-80px)]')}>
        <div className={cn('mx-auto space-y-8 relative z-10', compactMobile ? 'max-w-none pb-8 pt-4 px-3' : 'max-w-4xl pb-32 pt-16 px-6')}>
          {renderProgressState()}
        </div>
      </div>
    );
  }

  const goToStructure = () => setActiveTab('structure');

  const requestTab = (tab: ReviewTab) => {
    if (tab === activeTab) return;
    if (tab === 'structure' && structureStale && props.outlineDraft) {
      setConfirmKind('switch-structure');
      return;
    }
    setActiveTab(tab);
  };

  const requestGenerate = () => {
    if (structureStale && props.outlineDraft) {
      setConfirmKind('generate');
      return;
    }
    props.onGenerateCourse?.();
  };

  const updateStructureThen = async (after: 'switch' | 'stay') => {
    setConfirmBusy(true);
    try {
      await props.onRegenerateOutline();
      if (after === 'switch') goToStructure();
    } finally {
      setConfirmBusy(false);
      setConfirmKind(null);
    }
  };

  const tabs: { id: ReviewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'foundation', label: 'Course foundation', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'structure', label: 'Course structure', icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={cn('w-full relative z-10', compactMobile ? 'min-h-0 h-full' : 'min-h-[calc(100vh-80px)]')}>
      <div className={cn(
        'mx-auto space-y-4 relative z-10',
        compactMobile ? 'max-w-none pb-6 pt-3 px-3 text-[13px] leading-snug' : 'max-w-5xl space-y-6 pb-32 pt-12 px-6'
      )}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={props.onBack}
            >
              <div className={cn(
                'rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors shrink-0',
                compactMobile ? 'w-8 h-8' : 'w-10 h-10'
              )}>
                <ArrowRight className={cn('text-slate-400 rotate-180 group-hover:text-indigo-400', compactMobile ? 'w-4 h-4' : 'w-5 h-5')} />
              </div>
              <div>
                <h2 className={cn('font-extrabold text-white', compactMobile ? 'text-lg' : 'text-3xl')}>Review course</h2>
                <p className={cn('text-slate-400 mt-0.5', compactMobile ? 'text-[11px]' : 'text-sm')}>
                  {isSandboxMode
                    ? (compactMobile ? 'Mobile design demo — foundation and structure.' : 'Sandbox — review foundation and structure without AI generation.')
                    : 'Confirm the foundation and structure, then generate.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {props.onReplaceDocument && (
                <label className={cn(
                  'flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl cursor-pointer transition-all shrink-0',
                  compactMobile ? 'px-2.5 py-1.5 text-[11px]' : 'px-4 py-2 text-sm'
                )}>
                  <FileUp className={cn('text-indigo-400', compactMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                  Replace Document
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.pptx,.txt"
                    onChange={props.onReplaceDocument}
                  />
                </label>
              )}
              {props.onOpenPlayerProperties && (
                <button
                  type="button"
                  onClick={props.onOpenPlayerProperties}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 font-bold hover:border-indigo-500/50 hover:text-white transition-all',
                    compactMobile ? 'px-2.5 py-1.5 text-[11px]' : 'px-4 py-2 text-sm'
                  )}
                >
                  <Settings2 className={cn('text-indigo-400', compactMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                  Player Properties
                </button>
              )}
              {props.onSaveDesignDraft && (
                <button
                  type="button"
                  onClick={props.onSaveDesignDraft}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 font-bold transition-all',
                    compactMobile ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2.5 text-sm'
                  )}
                >
                  <Save className={cn(compactMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                  {props.designDraftSavedFlash ? 'Draft Saved!' : 'Save Draft'}
                </button>
              )}
              {props.onGenerateCourse && (
                <button
                  type="button"
                  onClick={requestGenerate}
                  disabled={!props.outlineDraft || !!isGeneratingOutline || !!isHydrating}
                  className={cn(
                    'flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-[0_0_30px_-8px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50',
                    compactMobile ? 'px-3 py-1.5 text-[11px]' : 'px-5 py-2.5 text-sm'
                  )}
                >
                  {isHydrating || isGeneratingOutline ? (
                    <Loader2 className={cn('animate-spin', compactMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                  ) : (
                    <ArrowRight className={cn(compactMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                  )}
                  {isSandboxMode ? 'Preview Course' : 'Generate Course'}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-px scrollbar-thin">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => requestTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-all font-bold',
                  compactMobile ? 'px-2.5 py-2 text-[11px]' : 'px-3.5 py-2.5 text-sm',
                  activeTab === tab.id
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'structure' && structureStale && props.outlineDraft && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" title="Foundation changed — structure may be out of date" />
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {activeTab === 'foundation' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col shadow-xl">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Topic & description</h3>
                  <p className="text-slate-400 text-sm">Review or refine the title and description from your document.</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course Title</label>
                  <input
                    value={props.courseTitle}
                    onChange={e => props.setCourseTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all placeholder-slate-600 font-bold"
                    placeholder="Course Title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    rows={5}
                    value={props.courseDescription || props.prompt}
                    onChange={e => {
                      props.setCourseDescription(e.target.value);
                      props.setPrompt(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all placeholder-slate-600 font-medium whitespace-pre-wrap"
                    placeholder="Course description or prompt focus..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm shadow-xl">
              <div className="p-6 border-b border-slate-800 flex flex-col gap-4 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Learning Objectives</h3>
                    <p className="text-slate-400 text-sm">What learners will achieve upon completion. Changing the format rewrites every objective below.</p>
                  </div>
                </div>
                <div className="relative z-10 flex flex-wrap items-center gap-2">
                  {(['AB', 'ABC', 'ABCD'] as const).map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => props.onFormatChange(fmt)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-bold border transition-all',
                        props.objectiveFormat === fmt
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                      )}
                    >
                      {isSuggesting && props.objectiveFormat === fmt ? (
                        <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />{fmt}</span>
                      ) : fmt}
                    </button>
                  ))}
                </div>
                <p className="relative z-10 text-xs text-slate-500 italic">
                  Example ({props.objectiveFormat}): “{OBJECTIVE_EXAMPLES[props.objectiveFormat] || OBJECTIVE_EXAMPLES.AB}”
                </p>
              </div>

              {(props.courseTitle || props.courseDescription || props.prompt) && (
                <div className="px-6 pb-4 pt-2 bg-slate-900/50 border-b border-slate-800">
                  <button
                    type="button"
                    onClick={props.onSuggestObjectives}
                    disabled={!!isSuggesting || (!props.prompt && !props.courseDescription && !props.courseTitle)}
                    className="flex items-center justify-center gap-2 px-6 py-3 w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl font-bold transition-colors border border-purple-500/30 disabled:opacity-50"
                  >
                    {isSuggesting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Refining Objectives...</>
                    ) : (
                      <><Wand2 className="w-5 h-5" />Refine Objectives</>
                    )}
                  </button>
                </div>
              )}

              <div className="p-6 space-y-4">
                {props.learningObjectives.map((obj, i) => {
                  if (typeof obj === 'string') {
                    return (
                      <div key={i} className="flex gap-3 items-start group">
                        <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        <textarea
                          rows={2}
                          value={obj}
                          onChange={(e) => {
                            const next = [...props.learningObjectives];
                            next[i] = e.target.value;
                            props.setLearningObjectives(next);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-600 font-medium resize-none"
                          placeholder="e.g., Understand the core principles of..."
                        />
                        <button
                          type="button"
                          onClick={() => props.setLearningObjectives(props.learningObjectives.filter((_, idx) => idx !== i))}
                          className="p-2.5 mt-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  }
                  const tObj = obj as TerminalObjectiveGroup;
                  return (
                    <div key={i} className="bg-slate-950/50 border border-indigo-500/20 rounded-xl p-4 space-y-3 relative group">
                      <div className="flex gap-3 items-start">
                        <div className="mt-2.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Terminal Objective</p>
                          <textarea
                            rows={4}
                            value={tObj.terminalObjective}
                            onChange={(e) => {
                              const next = [...props.learningObjectives];
                              next[i] = { ...tObj, terminalObjective: e.target.value };
                              props.setLearningObjectives(next);
                            }}
                            className="w-full bg-indigo-950/30 border border-indigo-500/30 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none font-bold resize-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => props.setLearningObjectives(props.learningObjectives.filter((_, idx) => idx !== i))}
                          className="p-2 mt-6 text-slate-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 absolute top-0 right-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="pl-6 space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Enabling Objectives</p>
                        {tObj.enablingObjectives.map((enablingObj, eIdx) => (
                          <div key={eIdx} className="flex gap-2 items-start group/enabling">
                            <div className="mt-2 text-slate-600 shrink-0">↳</div>
                            <textarea
                              rows={3}
                              value={enablingObj}
                              onChange={(e) => {
                                const next = [...props.learningObjectives];
                                const newEnabling = [...tObj.enablingObjectives];
                                newEnabling[eIdx] = e.target.value;
                                next[i] = { ...tObj, enablingObjectives: newEnabling };
                                props.setLearningObjectives(next);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:border-slate-500 outline-none text-sm resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...props.learningObjectives];
                                next[i] = {
                                  ...tObj,
                                  enablingObjectives: tObj.enablingObjectives.filter((_, idx) => idx !== eIdx),
                                };
                                props.setLearningObjectives(next);
                              }}
                              className="p-1.5 mt-0.5 text-slate-600 hover:text-red-400 opacity-0 group-hover/enabling:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...props.learningObjectives];
                            next[i] = { ...tObj, enablingObjectives: [...tObj.enablingObjectives, ''] };
                            props.setLearningObjectives(next);
                          }}
                          className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 font-bold px-2 py-1 text-xs ml-5"
                        >
                          <Plus className="w-3 h-3" /> Add Enabling Objective
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => props.setLearningObjectives([...props.learningObjectives, ''])}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-300 font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Custom String
                  </button>
                  <button
                    type="button"
                    onClick={() => props.setLearningObjectives([...props.learningObjectives, { terminalObjective: '', enablingObjectives: [''] }])}
                    className="flex items-center gap-2 text-indigo-400 font-bold px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Terminal Framework
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 px-1">
              Assessments, interactions, and audio still come from your saved Course Settings. Edits here update this course only — you’ll be asked before the outline is regenerated.
            </p>
          </div>
        )}

        {activeTab === 'structure' && (
          <div className="space-y-4">
            {structureStale && props.outlineDraft && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3">
                <p className="text-sm text-amber-100">
                  Course foundation changed since this outline was generated. Update the structure to match?
                </p>
                <button
                  type="button"
                  onClick={() => void updateStructureThen('stay')}
                  disabled={!!isGeneratingOutline}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0 disabled:opacity-50"
                >
                  {isGeneratingOutline ? 'Updating…' : 'Update structure'}
                </button>
              </div>
            )}

            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Grid3X3 className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Structure components</h3>
                  <p className="text-slate-400 text-sm">Automated slides injected into each module. Changing these marks the outline as out of date.</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Module Title Slides', state: props.includeModuleTitleSlides, set: props.setIncludeModuleTitleSlides },
                  { label: 'Module Overview Slides', state: props.includeModuleOverviewSlides, set: props.setIncludeModuleOverviewSlides },
                  { label: 'Knowledge Checks', state: true, set: () => {}, locked: true },
                  { label: 'Summary/Recap Slides', state: props.includeSummarySlides, set: props.setIncludeSummarySlides },
                ].map((opt, i) => (
                  <label key={i} className={`flex items-center justify-between cursor-pointer group ${opt.locked ? 'opacity-80' : ''}`}>
                    <span className="text-slate-300 font-medium group-hover:text-white">{opt.label}</span>
                    <div
                      className={`w-12 h-6 rounded-full relative ${opt.state ? 'bg-pink-500' : 'bg-slate-700'}`}
                      onClick={() => !opt.locked && opt.set(!opt.state)}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${opt.state ? 'translate-x-6' : ''}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {isGeneratingOutline && !props.outlineDraft && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <p className="text-slate-300 font-bold">Generating course structure…</p>
                {typeof progress === 'number' && progress > 0 && (
                  <p className="text-sm text-slate-500">{Math.round(progress)}%</p>
                )}
              </div>
            )}
            {props.outlineDraft && (
              <OutlinePreview
                initialOutline={props.outlineDraft}
                embedded
                isHydrating={!!isHydrating}
                progress={progress}
                sandboxMode={isSandboxMode}
                onApprove={() => requestGenerate()}
                onCancel={props.onBack}
                onOutlineChange={props.onOutlineChange}
                onRegenerate={props.onRegenerateOutline}
                isRegenerating={!!isGeneratingOutline}
                allowedInteractionTypes={props.interactionTypes}
                error={error}
              />
            )}
            {!isGeneratingOutline && !props.outlineDraft && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                <Layers className="w-10 h-10 text-slate-600" />
                <p className="text-slate-400 font-medium">No course structure yet.</p>
                <button
                  type="button"
                  onClick={() => void props.onRegenerateOutline()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
                >
                  Generate Structure
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmKind === 'switch-structure'}
        title="Update course structure?"
        body="You changed the course foundation (topic, description, or objectives). Update the outline to match before opening Course structure?"
        primaryLabel="Update structure"
        secondaryLabel="Keep current outline"
        onPrimary={() => void updateStructureThen('switch')}
        onSecondary={() => { setConfirmKind(null); goToStructure(); }}
        onCancel={() => setConfirmKind(null)}
        busy={confirmBusy}
      />
      <ConfirmDialog
        open={confirmKind === 'generate'}
        title="Structure may be out of date"
        body="The outline may not match your latest topic or objectives. Update it first, or generate with the current outline."
        primaryLabel="Update structure first"
        secondaryLabel="Generate with current outline"
        onPrimary={() => void updateStructureThen('stay')}
        onSecondary={() => { setConfirmKind(null); props.onGenerateCourse?.(); }}
        onCancel={() => setConfirmKind(null)}
        busy={confirmBusy}
      />
    </div>
  );
}
