/**
 * CourseNavSidebar — Course player table of contents.
 * Supports fixed sidebar (desktop) and clickable dropdown overlay (mobile).
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, ChevronDown, Lock, GraduationCap, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NavigationMode } from '../../types/course';
import { stripSlideTypePrefix } from '../../lib/stripSlideTypePrefix';

interface Slide { id: string; title: string; type: string; }
interface Module { id: string; title: string; slides: Slide[]; }

interface Props {
  modules: Module[];
  currentSlideIndex: number;
  allSlides: Slide[];
  onNavigate: (index: number) => void;
  theme: 'dark' | 'light' | 'unified';
  tocNumbering?: 'icons' | 'numbered';
  navigationMode?: NavigationMode;
  examPhase?: 'idle' | 'active' | 'complete';
  examIntroIndex?: number;
  highestVisitedIndex?: number;
  defaultCollapsed?: boolean;
  /** Fixed left rail vs compact clickable dropdown (mobile / max content space) */
  variant?: 'sidebar' | 'dropdown';
  /** Slide ids with unresolved QC issues */
  qcPendingSlideIds?: Set<string>;
  /** Slide ids that had QC issues which were confirmed/declined */
  qcResolvedSlideIds?: Set<string>;
}

const SLIDE_TYPE_ICON: Record<string, string> = {
  cover: '🎬', title: '🎯', content: '📄', quiz: '❓', 'key-takeaways': '✅',
  accordion: '📂', flashcards: '🃏', timeline: '📅', sorting: '↕️',
  matching: '🔗', hotspot: '📍', branching: '🌿', interaction: '⚙️',
  summary: '📋', 'game-template': '🎮', intro: '🎬', outro: '🏁',
  'exam-intro': '🎓', 'mastery-exam': '📝', 'exam-results': '🏆',
  'player-tour': '🗺️', 'course-objectives': '🎯',
};

export function CourseNavSidebar({
  modules, currentSlideIndex, allSlides, onNavigate, theme,
  tocNumbering = 'icons',
  navigationMode = 'free',
  examPhase = 'idle',
  examIntroIndex,
  highestVisitedIndex = 0,
  defaultCollapsed = false,
  variant = 'sidebar',
  qcPendingSlideIds,
  qcResolvedSlideIds,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(modules.map(m => m.id)));

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  // Close dropdown when the active slide changes (e.g. Prev/Next)
  useEffect(() => {
    setDropdownOpen(false);
  }, [currentSlideIndex]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getSlideGlobalIndex = (slide: Slide) => allSlides.findIndex(s => s.id === slide.id);

  const isContentLocked = (idx: number): boolean => {
    if (examPhase === 'active') return true;
    switch (navigationMode) {
      case 'free': return false;
      case 'linear': return true;
      case 'restricted': return idx > highestVisitedIndex;
      default: return false;
    }
  };

  const navigateAndClose = (idx: number) => {
    onNavigate(idx);
    setDropdownOpen(false);
  };

  const contentSlideCount = examIntroIndex ?? allSlides.length;
  const hasExam = examIntroIndex !== undefined && examIntroIndex < allSlides.length;
  const examIntroSlide = hasExam ? allSlides[examIntroIndex!] : null;
  const examQSlide     = hasExam ? allSlides[examIntroIndex! + 1] : null;
  const examResultsSlide = hasExam ? allSlides[examIntroIndex! + 2] : null;

  const bg = theme === 'light'
    ? 'bg-white/95 border-slate-200 text-slate-800'
    : theme === 'unified'
    ? 'bg-indigo-950/95 border-indigo-500/20 text-indigo-100'
    : 'bg-slate-900/95 border-slate-800 text-white';

  const headerBg = theme === 'light'
    ? 'bg-slate-50 border-slate-200'
    : theme === 'unified'
    ? 'bg-indigo-900/60 border-indigo-500/20'
    : 'bg-slate-800/80 border-slate-700';

  const activeRow = theme === 'light'
    ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500'
    : theme === 'unified'
    ? 'bg-indigo-700/40 text-white border-l-2 border-purple-400'
    : 'bg-indigo-600/20 text-white border-l-2 border-indigo-400';

  const inactiveRow = theme === 'light'
    ? 'text-slate-600 hover:bg-slate-50 border-l-2 border-transparent hover:border-indigo-200'
    : theme === 'unified'
    ? 'text-indigo-200 hover:bg-indigo-800/40 border-l-2 border-transparent hover:border-purple-400/50'
    : 'text-slate-400 hover:bg-slate-800 border-l-2 border-transparent hover:border-slate-600';

  const lockedRow = 'text-slate-600 border-l-2 border-transparent cursor-not-allowed opacity-60';

  const modHeader = theme === 'light'
    ? 'text-slate-500'
    : theme === 'unified'
    ? 'text-purple-300'
    : 'text-slate-500';

  const renderList = (go: (idx: number) => void) => (
    <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
      {allSlides.length > 0 && allSlides[0]?.type === 'cover' && (() => {
        const isActive = currentSlideIndex === 0;
        return (
          <button
            key="__cover__"
            onClick={() => go(0)}
            className={cn(
              'w-full flex items-center gap-2.5 pl-4 pr-4 py-2.5 text-left transition-all mb-1',
              isActive ? activeRow : inactiveRow
            )}
            title="Course Introduction"
          >
            <span className="text-base shrink-0">🎬</span>
            <span className="text-sm leading-snug font-medium">Course Introduction</span>
          </button>
        );
      })()}
      {allSlides[1]?.type === 'player-tour' && (() => {
        const idx = 1;
        const isActive = currentSlideIndex === idx;
        return (
          <button
            key="__player-tour__"
            onClick={() => go(idx)}
            className={cn(
              'w-full flex items-center gap-2.5 pl-4 pr-4 py-2.5 text-left transition-all mb-1',
              isActive ? activeRow : inactiveRow
            )}
            title="Player Navigation Guide"
          >
            <span className="text-base shrink-0">🗺️</span>
            <span className="text-sm leading-snug font-medium">Player Tour</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-semibold opacity-60" style={{ backgroundColor: 'rgba(79,70,229,0.25)', color: '#818cf8' }}>Skip</span>
          </button>
        );
      })()}
      {allSlides[2]?.type === 'course-objectives' && (() => {
        const idx = 2;
        const isActive = currentSlideIndex === idx;
        return (
          <button
            key="__course-objectives__"
            onClick={() => go(idx)}
            className={cn(
              'w-full flex items-center gap-2.5 pl-4 pr-4 py-2.5 text-left transition-all mb-1',
              isActive ? activeRow : inactiveRow
            )}
            title="Course Objectives"
          >
            <span className="text-base shrink-0">🎯</span>
            <span className="text-sm leading-snug font-medium">Course Objectives</span>
          </button>
        );
      })()}

      {modules.map((mod, mi) => (
        <div key={mod.id} className="mb-1">
          <button onClick={() => toggleModule(mod.id)}
            className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors', modHeader, 'hover:bg-slate-800/30')}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', expandedModules.has(mod.id) ? '' : '-rotate-90')} />
            <span className="text-xs font-black uppercase tracking-wider leading-tight">{mod.title}</span>
          </button>

          {expandedModules.has(mod.id) && (() => {
            const overviewSlide = allSlides.find(s => s.id === `__module-overview-${mi + 1}__`);
            const slidesToShow: Slide[] = overviewSlide ? [overviewSlide, ...mod.slides] : mod.slides;
            return slidesToShow.map((slide, si) => {
              const globalIdx = getSlideGlobalIndex(slide);
              const isActive = globalIdx === currentSlideIndex;
              const locked = isContentLocked(globalIdx);
              let tooltip = '';
              if (locked && examPhase === 'active') tooltip = 'Complete the quiz to return to course content';
              else if (locked && navigationMode === 'linear') tooltip = 'Complete slides in order';
              else if (locked && navigationMode === 'restricted') tooltip = 'Complete previous slides first';
              return (
                <button
                  key={slide.id}
                  onClick={() => !locked && go(globalIdx)}
                  disabled={locked}
                  title={locked ? tooltip : stripSlideTypePrefix(slide.title)}
                  className={cn(
                    'w-full flex items-center gap-2.5 pl-7 pr-4 py-2.5 text-left transition-all',
                    isActive ? activeRow : locked ? lockedRow : inactiveRow
                  )}
                >
                  {tocNumbering === 'numbered'
                    ? <span className="text-xs font-black shrink-0 w-8 text-right pr-1 opacity-70">{mi + 1}.{si + 1}</span>
                    : locked
                    ? <Lock className="w-3 h-3 shrink-0 opacity-50" />
                    : <span className="text-base shrink-0">{SLIDE_TYPE_ICON[slide.type] || '📄'}</span>
                  }
                  <span className="text-sm leading-snug line-clamp-2 font-medium flex-1">{stripSlideTypePrefix(slide.title)}</span>
                  {qcPendingSlideIds?.has(slide.id) && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" title="Has QA issues" />
                  )}
                  {!qcPendingSlideIds?.has(slide.id) && qcResolvedSlideIds?.has(slide.id) && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="QA issues resolved" />
                  )}
                </button>
              );
            });
          })()}
        </div>
      ))}

      {hasExam && (
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <div className={cn('flex items-center gap-2 px-4 py-2.5', modHeader)}>
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">Mastery Quiz</span>
          </div>

          {examIntroSlide && (() => {
            const idx = examIntroIndex!;
            const isActive = idx === currentSlideIndex;
            return (
              <button key="exam-intro" onClick={() => go(idx)}
                className={cn('w-full flex items-center gap-2.5 pl-7 pr-4 py-2.5 text-left transition-all', isActive ? activeRow : inactiveRow)}
              >
                <span className="text-base shrink-0">🎓</span>
                <span className="text-sm leading-snug font-medium">Mastery Quiz Intro</span>
              </button>
            );
          })()}

          {examQSlide && (() => {
            const idx = examIntroIndex! + 1;
            const isActive = idx === currentSlideIndex;
            const locked = examPhase === 'idle';
            return (
              <button key="mastery-exam" disabled={locked} onClick={() => !locked && go(idx)}
                className={cn('w-full flex items-center gap-2.5 pl-7 pr-4 py-2.5 text-left transition-all', isActive ? activeRow : locked ? lockedRow : inactiveRow)}
                title={locked ? 'Click "Begin Quiz" on the intro slide to start' : 'Quiz Questions'}
              >
                {locked ? <Lock className="w-3 h-3 shrink-0 opacity-50"/> : <span className="text-base shrink-0">📝</span>}
                <span className="text-sm leading-snug font-medium">Quiz Questions</span>
              </button>
            );
          })()}

          {examResultsSlide && (() => {
            const idx = examIntroIndex! + 2;
            const isActive = idx === currentSlideIndex;
            const locked = examPhase !== 'complete';
            return (
              <button key="exam-results" disabled={locked} onClick={() => !locked && go(idx)}
                className={cn('w-full flex items-center gap-2.5 pl-7 pr-4 py-2.5 text-left transition-all', isActive ? activeRow : locked ? lockedRow : inactiveRow)}
                title={locked ? 'Complete the quiz to see results' : 'Quiz Results'}
              >
                {locked ? <Lock className="w-3 h-3 shrink-0 opacity-50"/> : <span className="text-base shrink-0">🏆</span>}
                <span className="text-sm leading-snug font-medium">Quiz Results</span>
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );

  // ── Dropdown variant (mobile / max content space) ─────────────────────────
  if (variant === 'dropdown') {
    return (
      <div className="absolute top-2 left-2 z-[120] pointer-events-none">
        <div className="relative pointer-events-auto">
          <button
            type="button"
            onClick={() => setDropdownOpen(o => !o)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-lg text-xs font-bold backdrop-blur-md transition-colors',
              theme === 'light'
                ? 'bg-white/95 border-slate-200 text-slate-700 hover:bg-white'
                : 'bg-slate-900/95 border-slate-700 text-slate-100 hover:bg-slate-800'
            )}
            title="Table of Contents"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {dropdownOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            <span>Menu</span>
            <ChevronDown className={cn('w-3 h-3 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[119] cursor-default bg-black/20"
                aria-label="Close menu"
                onClick={() => setDropdownOpen(false)}
              />
              <div
                className={cn(
                  'absolute top-full left-0 mt-1.5 z-[120] w-[min(20rem,78vw)] max-h-[min(70vh,360px)] flex flex-col rounded-xl border shadow-2xl overflow-hidden',
                  bg
                )}
              >
                <div className={cn('flex items-center justify-between px-3 py-2 border-b shrink-0', headerBg)}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Contents</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded-full">{contentSlideCount}</span>
                </div>
                {renderList(navigateAndClose)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Collapsed sidebar rail ────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className={cn('h-full flex flex-col border-r shrink-0 transition-all duration-200', bg)} style={{ width: '2.5rem' }}>
        <div className={cn('flex items-center justify-center p-2 border-b', headerBg)}>
          <button onClick={() => setCollapsed(false)} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors" title="Expand navigation">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center pt-3 gap-2 text-lg">
          {allSlides.slice(0, contentSlideCount).map((slide, idx) => {
            const locked = isContentLocked(idx);
            const isActive = idx === currentSlideIndex;
            return (
              <button key={slide.id} onClick={() => !locked && onNavigate(idx)} disabled={locked} title={slide.title}
                className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all',
                  isActive ? 'bg-indigo-500 text-white shadow-lg' : locked ? 'text-slate-700 cursor-not-allowed' : 'hover:bg-slate-700/50'
                )}
              >{idx + 1}</button>
            );
          })}
          {hasExam && (
            <div className="w-full flex flex-col items-center gap-1 mt-2 pt-2 border-t border-slate-800">
              <div className="text-base" title="Mastery Quiz">🎓</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Expanded sidebar ──────────────────────────────────────────────────────
  return (
    <div className={cn('h-full flex flex-col border-r shrink-0 transition-all duration-200', bg)} style={{ width: '17.5rem', minWidth: '17.5rem' }}>
      <div className={cn('flex items-center justify-between px-4 py-3 border-b', headerBg)}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-sm font-black uppercase tracking-widest">Table of Contents</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{contentSlideCount} Slides</span>
          <button onClick={() => setCollapsed(true)} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors ml-1" title="Collapse">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
      {renderList(onNavigate)}
    </div>
  );
}
