import React, { useState } from 'react';
import {
  ArrowRight, Loader2, FileUp, Target, Layers, Lock, Grid3X3,
  Gamepad2, Volume2, Eye, Plus, Trash2, Wand2, AlertCircle, Ear, CheckCircle2,
  BookOpen, ListChecks, Navigation, SlidersHorizontal, Save, Settings2, ImageIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getRecommendedGames } from '../../lib/gameEngine';
import { ScenarioBuilderPanel } from '../ScenarioBuilderPanel';
import { OutlinePreview } from './OutlinePreview';
import type { ScenarioConfig } from '../../types/scenario';
import type { CourseOutlineDraft } from '../../services/aiService';
import type { ExamConfig, NavigationMode, TerminalObjectiveGroup } from '../../types/course';
import { imageModeFlags, imageModeFromFlags, type CourseImageMode } from '../../services/imageService';
import { canUseAllVoices } from '../../lib/planEntitlements';

export type SettingsMode = 'defaults' | 'session';
export type SettingsTab =
  | 'topic'
  | 'objectives'
  | 'quizzes'
  | 'navigation'
  | 'interactions'
  | 'games'
  | 'audio'
  | 'design';

const OBJECTIVE_EXAMPLES: Record<string, { label: string; example: string }> = {
  AB: {
    label: 'AB — Behavior + Outcome',
    example: 'The learner will identify the three stages of effective workplace feedback.',
  },
  ABC: {
    label: 'ABC — Condition + Behavior + Outcome',
    example: 'Given a workplace scenario, the learner will select the communication strategy that best supports collaboration.',
  },
  ABCD: {
    label: 'ABCD — Condition + Behavior + Outcome + Degree',
    example: 'Given a workplace scenario, the learner will select the best communication strategy with at least 80% accuracy.',
  },
};

export interface CourseSettingsPageProps {
  mode: SettingsMode;
  isSandboxMode?: boolean;
  /** Dense layout for admin Design (Mobile) demo inside landscape phone chrome */
  compactMobile?: boolean;
  isGenerating?: boolean;
  isHydrating?: boolean;
  isSuggesting?: boolean;
  isGeneratingOutline?: boolean;
  progress?: number;
  error?: string | null;
  renderProgressState?: () => React.ReactNode;

  // Topic
  courseTitle: string;
  setCourseTitle: (v: string) => void;
  courseDescription: string;
  setCourseDescription: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;

  // Objectives
  objectiveFormat: string;
  learningObjectives: (string | TerminalObjectiveGroup)[];
  setLearningObjectives: (v: (string | TerminalObjectiveGroup)[]) => void;
  onFormatChange: (fmt: string) => void;
  onSuggestObjectives: () => void;

  // Assessments (Mastery Quiz + Knowledge Checks)
  examConfig: ExamConfig;
  setExamConfig: React.Dispatch<React.SetStateAction<ExamConfig>>;

  // Navigation
  navigationMode: NavigationMode;
  setNavigationMode: (m: NavigationMode) => void;
  requireInteractionsComplete: boolean;
  setRequireInteractionsComplete: (v: boolean) => void;

  // Interactions
  preset: 'quick' | 'standard' | 'comprehensive';
  onPresetChange: (p: 'quick' | 'standard' | 'comprehensive') => void;
  slideCount: number;
  setSlideCount: (n: number) => void;
  includeModuleTitleSlides: boolean;
  setIncludeModuleTitleSlides: (v: boolean) => void;
  includeModuleOverviewSlides: boolean;
  setIncludeModuleOverviewSlides: (v: boolean) => void;
  includeSummarySlides: boolean;
  setIncludeSummarySlides: (v: boolean) => void;
  interactionTypes: string[];
  setInteractionTypes: (v: string[]) => void;
  scenarioConfig: ScenarioConfig;
  setScenarioConfig: (c: ScenarioConfig) => void;
  onPreviewOption: (label: string) => void;

  // Games
  gameTemplateIds: string[];
  setGameTemplateIds: (v: string[]) => void;

  // Audio
  voiceOverEnabled: boolean;
  setVoiceOverEnabled: (v: boolean) => void;
  ttsVoice: string;
  setTtsVoice: (v: string) => void;
  /** Entitlement plan — Creator/free = Alloy only; Team = all 6 voices */
  subscriptionPlan?: string | null;
  imageMode: CourseImageMode;
  setImageMode: (m: CourseImageMode) => void;
  /** When Hotspot is selected but Multimedia AI/source are off */
  hotspotGenerateBackdrop?: boolean;
  setHotspotGenerateBackdrop?: (v: boolean) => void;
  /** When Tabs (Vertical) is selected — Blocks vs Classic layout */
  verticalTabSkin?: 'default' | 'blocks';
  setVerticalTabSkin?: (v: 'default' | 'blocks') => void;
  previewingVoice: string | null;
  onPreviewVoice: (id: string) => void;

  // Design
  outlineDraft: CourseOutlineDraft | null;
  onOutlineChange: (o: CourseOutlineDraft) => void;
  onRegenerateOutline: () => void;

  // Actions
  onBack: () => void;
  onReplaceDocument?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveSettings?: () => void;
  /** Save Design-phase draft (shared slot pool with Development drafts) */
  onSaveDesignDraft?: () => void;
  designDraftSavedFlash?: boolean;
  onGenerateCourse?: () => void;
  onOpenPlayerProperties?: () => void;
  settingsSavedFlash?: boolean;
}

export function CourseSettingsPage(props: CourseSettingsPageProps) {
  const {
    mode,
    isSandboxMode,
    compactMobile = false,
    isGenerating,
    isHydrating,
    isSuggesting,
    isGeneratingOutline,
    progress,
    error,
    renderProgressState,
  } = props;

  const isDefaults = mode === 'defaults';
  const showTopic = !isDefaults;
  const showDesign = !isDefaults;

  const allTabs: { id: SettingsTab; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { id: 'topic', label: 'Topic', icon: <BookOpen className="w-3.5 h-3.5" />, hidden: !showTopic },
    { id: 'objectives', label: 'Objectives', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'quizzes', label: 'Assessments', icon: <ListChecks className="w-3.5 h-3.5" /> },
    { id: 'navigation', label: 'Navigation', icon: <Navigation className="w-3.5 h-3.5" /> },
    { id: 'interactions', label: 'Interactions', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'games', label: 'Game Modes', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: 'audio', label: 'Audio & Multimedia', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { id: 'design', label: 'Design', icon: <Layers className="w-3.5 h-3.5" />, hidden: !showDesign },
  ];
  // Game Modes tab intentionally hidden (generation unreliable); keep games UI code below for future re-enable.
  const tabs = allTabs.filter(t => !t.hidden && t.id !== 'games');

  const [activeTab, setActiveTab] = useState<SettingsTab>(showTopic ? 'topic' : 'objectives');

  // Keep active tab valid when mode changes
  React.useEffect(() => {
    if (!tabs.some(t => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? 'objectives');
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if ((isGenerating || isHydrating) && renderProgressState) {
    return (
      <div className={cn('w-full relative z-10', compactMobile ? 'min-h-0 h-full' : 'min-h-[calc(100vh-80px)]')}>
        <div className={cn('mx-auto space-y-8 relative z-10', compactMobile ? 'max-w-none pb-8 pt-4 px-3' : 'max-w-4xl pb-32 pt-16 px-6')}>
          {renderProgressState()}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full relative z-10', compactMobile ? 'min-h-0 h-full' : 'min-h-[calc(100vh-80px)]')}>
      <div className={cn(
        'mx-auto space-y-4 relative z-10',
        compactMobile ? 'max-w-none pb-6 pt-3 px-3 text-[13px] leading-snug' : 'max-w-5xl space-y-6 pb-32 pt-12 px-6'
      )}>
        {/* Header + primary CTA */}
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
                <h2 className={cn('font-extrabold text-white', compactMobile ? 'text-lg' : 'text-3xl')}>Course Settings</h2>
                <p className={cn('text-slate-400 mt-0.5', compactMobile ? 'text-[11px]' : 'text-sm')}>
                  {isDefaults
                    ? 'Account defaults for Build now and Review before build (assessments, interactions, audio).'
                    : isSandboxMode
                    ? (compactMobile ? 'Mobile design demo — settings fit the landscape player.' : 'Sandbox — configure and preview without AI generation.')
                    : 'Review AI-filled settings, then generate your course.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isDefaults && props.onReplaceDocument && (
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
              {isDefaults && props.onSaveSettings && (
                <button
                  type="button"
                  onClick={props.onSaveSettings}
                  className={cn(
                    'flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all',
                    compactMobile ? 'px-3 py-1.5 text-[11px]' : 'px-5 py-2.5 text-sm'
                  )}
                >
                  <Save className={cn(compactMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                  {props.settingsSavedFlash ? 'Saved!' : 'Save Settings'}
                </button>
              )}
              {!isDefaults && props.onSaveDesignDraft && (
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
              {!isDefaults && props.onGenerateCourse && (
                <button
                  type="button"
                  onClick={props.onGenerateCourse}
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

          {/* Overhead tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-px scrollbar-thin">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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

        <div className="space-y-6">
          {activeTab === 'topic' && showTopic && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col shadow-xl">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Course Topic</h3>
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description / Prompt</label>
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
          )}

          {activeTab === 'objectives' && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-sm shadow-xl">
              <div className="p-6 border-b border-slate-800 flex flex-col gap-4 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Learning Objectives</h3>
                    <p className="text-slate-400 text-sm">
                      {isDefaults
                        ? 'Choose the objective format used for quick builds.'
                        : 'What learners will achieve upon completion.'}
                    </p>
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
              </div>

              {isDefaults ? (
                <div className="p-6 space-y-4">
                  {(['AB', 'ABC', 'ABCD'] as const).map(fmt => {
                    const ex = OBJECTIVE_EXAMPLES[fmt];
                    const active = props.objectiveFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => props.onFormatChange(fmt)}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border transition-all',
                          active
                            ? 'border-indigo-500/50 bg-indigo-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        )}
                      >
                        <p className={cn('text-sm font-bold', active ? 'text-indigo-300' : 'text-white')}>{ex.label}</p>
                        <p className="text-sm text-slate-400 mt-2 italic leading-relaxed">“{ex.example}”</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
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
                </>
              )}

              {/* Structure Components — lives under Objectives (not Interactions) */}
              <div className="border-t border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center"><Grid3X3 className="w-5 h-5 text-pink-400" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Structure Components</h3>
                    <p className="text-slate-400 text-sm">Choose which automated slides to include in each module.</p>
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
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 w-full space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center"><Target className="w-5 h-5 text-indigo-400" /></div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Mastery Quiz</h3>
                      <p className="text-xs text-slate-500">Final assessment appended after course content</p>
                    </div>
                  </div>
                  <div
                    onClick={() => props.setExamConfig(c => ({ ...c, enabled: !c.enabled }))}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${props.examConfig.enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${props.examConfig.enabled ? 'translate-x-6' : ''}`} />
                  </div>
                </div>
                {props.examConfig.enabled && (
                  <div className="space-y-5 pt-3 border-t border-slate-800">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-slate-300">Passing Score</span>
                        <span className="text-indigo-400 font-extrabold">{props.examConfig.passingScore}%</span>
                      </div>
                      <input
                        type="range" min="50" max="100"
                        value={props.examConfig.passingScore}
                        onChange={e => props.setExamConfig(c => ({ ...c, passingScore: Number(e.target.value) }))}
                        className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300 mb-2">Question Count Mode</p>
                      <div className="flex gap-2">
                        {(['total', 'per-module'] as const).map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => props.setExamConfig(c => ({ ...c, questionMode: m }))}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${props.examConfig.questionMode === m ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                          >
                            {m === 'total' ? 'Total' : 'Per Module'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300 mb-2">
                        {props.examConfig.questionMode === 'total' ? 'Total Questions' : 'Questions per Module'}
                      </p>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => props.setExamConfig(c => ({ ...c, questionCount: Math.max(1, c.questionCount - 1) }))} className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-extrabold text-xl">-</button>
                        <span className="text-white font-extrabold text-xl w-8 text-center">{props.examConfig.questionCount}</span>
                        <button type="button" onClick={() => props.setExamConfig(c => ({ ...c, questionCount: c.questionCount + 1 }))} className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-extrabold text-xl">+</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300 mb-1">Question Types</p>
                      <p className="text-xs text-slate-500 mb-2">Formats used in the Mastery Quiz only.</p>
                      <div className="flex gap-2 flex-wrap">
                        {([
                          ['mc', 'Multiple Choice'],
                          ['ma', 'Multiple Answer'],
                          ['tf', 'True / False'],
                          ['sorting', 'Sorting'],
                          ['matching', 'Matching'],
                          ['drop-targets', 'Drop Targets'],
                        ] as [string, string][]).map(([type, label]) => {
                          const active = props.examConfig.questionTypes.includes(type as any);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => props.setExamConfig(c => ({
                                ...c,
                                questionTypes: active
                                  ? (c.questionTypes.filter(t => t !== type) as any)
                                  : [...c.questionTypes, type as any],
                              }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300 mb-2">Presentation Mode</p>
                      <div className="flex gap-2">
                        {([['one-at-a-time', 'One at a Time'], ['scroll-all', 'All at Once']] as [string, string][]).map(([m, label]) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => props.setExamConfig(c => ({ ...c, presentationMode: m as any }))}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${props.examConfig.presentationMode === m ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-sm font-bold text-slate-300">Allow Retake on Fail</p>
                        <p className="text-xs text-slate-600">Disabled = learner must restart full course</p>
                      </div>
                      <div
                        onClick={() => props.setExamConfig(c => ({ ...c, allowRetake: !c.allowRetake }))}
                        className={`w-12 h-6 rounded-full relative cursor-pointer ${props.examConfig.allowRetake ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${props.examConfig.allowRetake ? 'translate-x-6' : ''}`} />
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 w-full space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center"><ListChecks className="w-5 h-5 text-pink-400" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Knowledge Checks</h3>
                    <p className="text-xs text-slate-500">In-module practice assessments (separate from Mastery Quiz)</p>
                  </div>
                </div>
                <div className="space-y-5 pt-3 border-t border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-300 mb-2">Knowledge Check Count Mode</p>
                    <p className="text-xs text-slate-500 mb-2">How many Knowledge Checks to generate across the course.</p>
                    <div className="flex gap-2 mb-3">
                      {(['total', 'per-module'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => props.setExamConfig(c => ({ ...c, knowledgeCheckMode: m }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${(props.examConfig.knowledgeCheckMode || 'per-module') === m ? 'bg-pink-600/30 border-pink-500/50 text-pink-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                        >
                          {m === 'total' ? 'Total' : 'Per Module'}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-slate-300 mb-2">
                      {(props.examConfig.knowledgeCheckMode || 'per-module') === 'total' ? 'Total Knowledge Checks' : 'Knowledge Checks per Module'}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => props.setExamConfig(c => ({
                          ...c,
                          knowledgeCheckCount: Math.max(1, (c.knowledgeCheckCount ?? 1) - 1),
                        }))}
                        className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-extrabold text-xl"
                      >-</button>
                      <span className="text-white font-extrabold text-xl w-8 text-center">{props.examConfig.knowledgeCheckCount ?? 1}</span>
                      <button
                        type="button"
                        onClick={() => props.setExamConfig(c => ({
                          ...c,
                          knowledgeCheckCount: (c.knowledgeCheckCount ?? 1) + 1,
                        }))}
                        className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-extrabold text-xl"
                      >+</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-300 mb-1">Question Types</p>
                    <p className="text-xs text-slate-500 mb-2">Formats used for in-module Knowledge Checks only. Sorting, matching, and similar activities appear as Knowledge Check slides — never as regular content.</p>
                    <div className="flex gap-2 flex-wrap">
                      {([
                        ['mc', 'Multiple Choice'],
                        ['ma', 'Multiple Answer'],
                        ['tf', 'True / False'],
                        ['sorting', 'Sorting'],
                        ['matching', 'Matching'],
                        ['drop-targets', 'Drop Targets'],
                      ] as [string, string][]).map(([type, label]) => {
                        const kcTypes = props.examConfig.knowledgeCheckQuestionTypes
                          ?? props.examConfig.questionTypes
                          ?? ['mc', 'ma', 'tf'];
                        const active = kcTypes.includes(type as any);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => props.setExamConfig(c => {
                              const current = c.knowledgeCheckQuestionTypes ?? c.questionTypes ?? ['mc', 'ma', 'tf'];
                              return {
                                ...c,
                                knowledgeCheckQuestionTypes: active
                                  ? (current.filter(t => t !== type) as any)
                                  : [...current, type as any],
                              };
                            })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? 'bg-pink-600/30 border-pink-500/40 text-pink-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'navigation' && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><Lock className="w-5 h-5 text-amber-400" /></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Navigation Mode</h3>
                  <p className="text-xs text-slate-500">Controls how learners move through course slides</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {([
                  { mode: 'free' as NavigationMode, label: 'Free Roam', desc: 'Click any slide at any time' },
                  { mode: 'linear' as NavigationMode, label: 'Linear', desc: 'Next button only - no menu skipping' },
                  { mode: 'restricted' as NavigationMode, label: 'Restricted', desc: 'Next to advance; revisit viewed slides via menu' },
                ]).map(({ mode: m, label, desc }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => props.setNavigationMode(m)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${props.navigationMode === m ? 'bg-amber-500/10 border-amber-500/30 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    {props.navigationMode === m && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                ))}
              </div>

              {(() => {
                const gated = props.navigationMode === 'linear' || props.navigationMode === 'restricted';
                return (
                  <label
                    className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                      gated
                        ? 'border-amber-500/25 bg-amber-500/5 cursor-pointer'
                        : 'border-slate-800 bg-slate-950/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-amber-500"
                      disabled={!gated}
                      checked={gated && props.requireInteractionsComplete}
                      onChange={(e) => gated && props.setRequireInteractionsComplete(e.target.checked)}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-200">Require interactions before Next</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        When Linear or Restricted is selected, prevent learners from advancing until every interactive element on the current slide has been opened or completed.
                      </p>
                    </div>
                  </label>
                );
              })()}
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-blue-400" /></div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Interactive Elements</h3>
                      <p className="text-slate-400 text-sm">Select activity types to include in your course.</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-xs text-blue-400 font-bold tracking-widest uppercase mb-6">CLICK TO SELECT • EYE ICON TO PREVIEW</p>
                  <div className={cn('grid gap-3', compactMobile ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-4')}>
                    {[
                      { id: 'hotspot', label: 'Hotspot' },
                      { id: 'flashcards', label: 'Flashcards' },
                      { id: 'timeline', label: 'Timeline' },
                      { id: 'scenario', label: 'Scenario' },
                      { id: 'tabbed-horizontal', label: 'Tabs (Horizontal)' },
                      { id: 'tabbed-vertical', label: 'Tabs (Vertical)' },
                      { id: 'folder-explorer', label: 'Folder Explorer' },
                      { id: 'carousel-panel', label: 'Carousel Panel' },
                      { id: 'click-reveal', label: 'Click & Reveal' },
                    ].map(({ id, label }) => {
                      const isSelected = props.interactionTypes.includes(id);
                      return (
                        <div key={id} className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${isSelected ? 'border-blue-500 bg-blue-500/10 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}>
                          <div
                            className={`absolute top-2 right-2 cursor-pointer z-20 bg-slate-900 rounded-full p-1 ${isSelected ? 'text-blue-300' : 'text-slate-400'}`}
                            onClick={(e) => { e.stopPropagation(); props.onPreviewOption(label); }}
                          >
                            <Eye className="w-4 h-4" />
                          </div>
                          <button
                            type="button"
                            className="absolute inset-0 z-10 w-full h-full"
                            onClick={() => {
                              if (isSelected) props.setInteractionTypes(props.interactionTypes.filter(t => t !== id));
                              else props.setInteractionTypes([...props.interactionTypes, id]);
                            }}
                          />
                          <span className={`font-bold text-sm text-center relative z-0 mt-3 ${isSelected ? 'text-blue-200' : ''}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {props.interactionTypes.includes('scenario') && (
                <ScenarioBuilderPanel config={props.scenarioConfig} onChange={props.setScenarioConfig} />
              )}

              {props.interactionTypes.includes('hotspot') && (() => {
                const { ai: aiOn, source: srcOn } = imageModeFlags(props.imageMode);
                if (aiOn || srcOn) return null;
                return (
                  <div className="bg-slate-900/80 rounded-2xl border border-amber-500/30 p-5 space-y-3">
                    <p className="text-sm text-amber-200/90 leading-relaxed">
                      Hotspot slides need a backdrop image. Multimedia images are off — enable a backdrop for hotspot slides only.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!props.hotspotGenerateBackdrop}
                        onChange={(e) => props.setHotspotGenerateBackdrop?.(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500/40 bg-slate-900"
                      />
                      <div>
                        <p className="text-sm font-bold text-white">Generate a backdrop image for hotspot slides only</p>
                        <p className="text-xs text-slate-500 mt-0.5">Uses AI for hotspot backdrops without turning on global course images.</p>
                      </div>
                    </label>
                  </div>
                );
              })()}

              {props.interactionTypes.includes('tabbed-vertical') && (
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={props.verticalTabSkin === 'blocks'}
                      onChange={(e) => props.setVerticalTabSkin?.(e.target.checked ? 'blocks' : 'default')}
                      className="mt-1 w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500/40 bg-slate-900"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">Blocks layout for vertical tabs</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Full-bleed colored stack with a dark content well. You can still switch Classic or Blocks on a single slide in Edit.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {props.interactionTypes.length > 4 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-300">Many interaction types selected</p>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      {`You've selected ${props.interactionTypes.length} interactive elements. More than 4 types increases outline complexity and the chance of empty or malformed interactions. Prefer 3–4 for more reliable generation.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {false && activeTab === 'games' && (
            <div className="space-y-6">
              {/* Game Modes UI retained but hidden — generation currently unreliable */}
            </div>
          )}
          {false && activeTab === 'games_RETIRED' && (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-orange-400" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Gamification Templates</h3>
                    <p className="text-slate-400 text-sm">Select game activities to include in your course.</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getRecommendedGames(props.preset).map((gt: any) => {
                    const isSelected = props.gameTemplateIds.includes(gt.id);
                    const NICKNAMES: Record<string, { emoji: string; aka: string }> = {
                      'jeopardy': { emoji: '📺', aka: 'aka Jeopardy!' },
                      'knowledge-board': { emoji: '📺', aka: 'aka Jeopardy!' },
                      'millionaire': { emoji: '💰', aka: "aka Who Wants to Be a Millionaire" },
                      'millionaire-challenge': { emoji: '💰', aka: "aka Who Wants to Be a Millionaire" },
                      'family-feud': { emoji: '👨‍👩‍👧', aka: 'aka Family Feud' },
                      'ranked-survey': { emoji: '👨‍👩‍👧', aka: 'aka Family Feud' },
                      'escape-room': { emoji: '🔒', aka: 'aka Digital Escape Room' },
                      'digital-escape-room': { emoji: '🔒', aka: 'aka Digital Escape Room' },
                      'spin-wheel': { emoji: '🎡', aka: 'aka Spin the Wheel' },
                      'spin-the-wheel': { emoji: '🎡', aka: 'aka Spin the Wheel' },
                      'price-is-right': { emoji: '🏷️', aka: "aka The Price is Right" },
                      'price-estimator': { emoji: '🏷️', aka: "aka The Price is Right" },
                    };
                    const nick = NICKNAMES[gt.id] || { emoji: '🎮', aka: '' };
                    return (
                      <div key={gt.id} className={`relative flex flex-col items-center text-center gap-1.5 p-4 rounded-xl border-2 ${isSelected ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}`}>
                        <div
                          className="absolute top-2 right-2 text-slate-400 hover:text-orange-300 cursor-pointer z-20 bg-slate-900 rounded-full p-1"
                          onClick={(e) => { e.stopPropagation(); props.onPreviewOption(gt.name); }}
                        >
                          <Eye className="w-4 h-4" />
                        </div>
                        <button
                          type="button"
                          className="absolute inset-0 z-10 w-full h-full"
                          onClick={() => {
                            if (isSelected) props.setGameTemplateIds(props.gameTemplateIds.filter(id => id !== gt.id));
                            else props.setGameTemplateIds([...props.gameTemplateIds, gt.id]);
                          }}
                        />
                        <span className="text-2xl relative z-0">{nick.emoji}</span>
                        <span className="font-bold text-sm relative z-0">{gt.name}</span>
                        {nick.aka && <span className="text-[10px] opacity-50 italic">{nick.aka}</span>}
                      </div>
                    );
                  })}
                </div>
                {props.gameTemplateIds.length > 1 && (
                  <div className="mt-5 flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-300">Multiple game modes selected</p>
                      <p className="text-xs text-amber-400/80 mt-0.5">
                        {`You've selected ${props.gameTemplateIds.length} games. Each adds a separate game-template slide and AI payload — more than one raises the chance of incomplete game data. One game mode is most reliable.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audio' && (() => {
            const { ai: aiImagesOn, source: sourceImagesOn } = imageModeFlags(props.imageMode);
            const setMultimediaFlags = (ai: boolean, source: boolean) => {
              props.setImageMode(imageModeFromFlags(ai, source));
            };
            return (
            <div className="space-y-6">
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Audio</h3>
                  <p className="text-slate-400 text-sm">Voice-over narration for the generated course.</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-slate-200 font-bold block text-sm">Voice-Over Narration</span>
                    <span className="text-slate-500 text-xs">AI reads slide narration aloud</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => props.setVoiceOverEnabled(!props.voiceOverEnabled)}
                  className={`w-12 h-6 rounded-full relative flex-shrink-0 ${props.voiceOverEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${props.voiceOverEnabled ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              {props.voiceOverEnabled && (
                <div className="mt-5 space-y-3">
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">AI Narrator Voice</div>
                  {!canUseAllVoices(props.subscriptionPlan) && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Creator includes <span className="text-emerald-400 font-semibold">Alloy</span>.
                      Upgrade to <span className="text-amber-400 font-semibold">Team</span> for all 6 voices.
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      { id: 'alloy', label: 'Alloy', sub: 'Neutral · Balanced' },
                      { id: 'echo', label: 'Echo', sub: 'Male · Measured' },
                      { id: 'fable', label: 'Fable', sub: 'Male · Warm' },
                      { id: 'onyx', label: 'Onyx', sub: 'Male · Deep' },
                      { id: 'nova', label: 'Nova', sub: 'Female · Bright' },
                      { id: 'shimmer', label: 'Shimmer', sub: 'Female · Soft' },
                    ] as const).map(v => {
                      const locked = v.id !== 'alloy' && !canUseAllVoices(props.subscriptionPlan);
                      return (
                      <div key={v.id} className="relative">
                        <button
                          type="button"
                          onClick={() => { if (!locked) props.setTtsVoice(v.id); }}
                          disabled={locked}
                          title={locked ? 'Team plan required' : undefined}
                          className={cn(
                            'w-full flex flex-col items-start px-3 pt-2.5 pb-2 rounded-xl border text-left transition-all',
                            locked && 'opacity-40 cursor-not-allowed',
                            props.ttsVoice === v.id
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
                          )}
                        >
                          <span className="text-xs font-bold pr-5">{v.label}{locked ? ' · Team' : ''}</span>
                          <span className="text-[10px] opacity-70 mt-0.5">{v.sub}</span>
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); if (!locked) props.onPreviewVoice(v.id); }}
                          disabled={!!props.previewingVoice || locked}
                          title={locked ? 'Team plan required' : `Preview ${v.label}`}
                          className={cn(
                            'absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center',
                            props.previewingVoice === v.id ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                          )}
                        >
                          {props.previewingVoice === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ear className="w-3 h-3" />}
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Multimedia</h3>
                  <p className="text-slate-400 text-sm">
                    Images for the Course Introduction slide and content slides (not quizzes or objectives).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn(
                  'flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all',
                  aiImagesOn ? 'bg-sky-500/10 border-sky-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                )}>
                  <input
                    type="checkbox"
                    checked={aiImagesOn}
                    onChange={(e) => setMultimediaFlags(e.target.checked, sourceImagesOn)}
                    className="mt-1 w-4 h-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500/40 bg-slate-900"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">AI-generated images</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Topic cover on Course Introduction, plus simple visuals on content slides and tabs when a picture adds value (e.g. a stop sign under “Red Signs”).
                    </p>
                  </div>
                </label>

                <label className={cn(
                  'flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all',
                  sourceImagesOn ? 'bg-sky-500/10 border-sky-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                )}>
                  <input
                    type="checkbox"
                    checked={sourceImagesOn}
                    onChange={(e) => setMultimediaFlags(aiImagesOn, e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500/40 bg-slate-900"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">Images from uploaded file</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Extract embedded photos/diagrams from your PPTX or PDF and place them on content slides.
                    </p>
                  </div>
                </label>
              </div>

              {!aiImagesOn && !sourceImagesOn && (
                <p className="mt-3 text-xs text-slate-500">
                  Both unchecked = no images (Course Introduction stays text/gradient until you upload one).
                </p>
              )}
              {aiImagesOn && sourceImagesOn && (
                <p className="mt-3 text-xs text-sky-300/80 leading-relaxed">
                  Source images are used first where available; AI fills gaps on content slides and tabs that still need a visual.
                </p>
              )}
              {aiImagesOn && (
                <div className="mt-4 flex items-start gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/90 leading-relaxed">
                    AI images can misrepresent technical details. Prefer source-file images for labeled diagrams and equipment; use AI for recognizable real-world subjects.
                  </p>
                </div>
              )}
            </div>
            </div>
            );
          })()}

          {activeTab === 'design' && showDesign && (
            <div className="space-y-4">
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
                  onApprove={() => props.onGenerateCourse?.()}
                  onCancel={props.onBack}
                  onOutlineChange={props.onOutlineChange}
                  onRegenerate={props.onRegenerateOutline}
                  isRegenerating={!!isGeneratingOutline}
                  error={error}
                />
              )}
              {!isGeneratingOutline && !props.outlineDraft && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <Layers className="w-10 h-10 text-slate-600" />
                  <p className="text-slate-400 font-medium">No course structure yet.</p>
                  <button
                    type="button"
                    onClick={props.onRegenerateOutline}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
                  >
                    Generate Structure
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
