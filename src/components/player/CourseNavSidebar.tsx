/**
 * CourseNavSidebar — Collapsible left panel for the course player.
 * Shows all modules and slides, highlights the active slide,
 * and lets the user jump to any slide by clicking.
 */
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Slide { id: string; title: string; type: string; }
interface Module { id: string; title: string; slides: Slide[]; }

interface Props {
  modules: Module[];
  currentSlideIndex: number;
  allSlides: Slide[];
  onNavigate: (index: number) => void;
  theme: 'dark' | 'light' | 'unified';
}

const SLIDE_TYPE_ICON: Record<string, string> = {
  title: '🎯', content: '📄', quiz: '❓', 'key-takeaways': '✅',
  accordion: '📂', flashcards: '🃏', timeline: '📅', sorting: '↕️',
  matching: '🔗', hotspot: '📍', branching: '🌿', interaction: '⚙️',
  summary: '📋', 'game-template': '🎮', intro: '🎬', outro: '🏁',
};

export function CourseNavSidebar({ modules, currentSlideIndex, allSlides, onNavigate, theme }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(modules.map(m => m.id)));

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getSlideGlobalIndex = (slide: Slide) => allSlides.findIndex(s => s.id === slide.id);

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

  const modHeader = theme === 'light'
    ? 'text-slate-500'
    : theme === 'unified'
    ? 'text-purple-300'
    : 'text-slate-500';

  if (collapsed) {
    return (
      <div className={cn('h-full flex flex-col border-r shrink-0 transition-all duration-200', bg)} style={{ width: '2.5rem' }}>
        <div className={cn('flex items-center justify-center p-2 border-b', headerBg)}>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
            title="Expand navigation"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center pt-3 gap-2 text-lg">
          {modules.map((mod, mi) =>
            mod.slides.map((slide, si) => {
              const globalIdx = getSlideGlobalIndex(slide);
              const isActive = globalIdx === currentSlideIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => onNavigate(globalIdx)}
                  title={slide.title}
                  className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all', isActive ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-slate-700/50')}
                >
                  {globalIdx + 1}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col border-r shrink-0 transition-all duration-200', bg)} style={{ width: '14rem', minWidth: '14rem' }}>
      {/* Header */}
      <div className={cn('flex items-center justify-between px-3 py-3 border-b', headerBg)}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest">Course Outline</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded-full">{allSlides.length} Slides</span>
          <button onClick={() => setCollapsed(true)} className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors ml-1" title="Collapse">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Module + Slide List */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {modules.map((mod) => (
          <div key={mod.id} className="mb-1">
            {/* Module heading */}
            <button
              onClick={() => toggleModule(mod.id)}
              className={cn('w-full flex items-center gap-1.5 px-3 py-2 text-left transition-colors', modHeader, 'hover:bg-slate-800/30')}
            >
              <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', expandedModules.has(mod.id) ? '' : '-rotate-90')} />
              <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{mod.title}</span>
            </button>

            {/* Slides */}
            {expandedModules.has(mod.id) && mod.slides.map(slide => {
              const globalIdx = getSlideGlobalIndex(slide);
              const isActive = globalIdx === currentSlideIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => onNavigate(globalIdx)}
                  className={cn(
                    'w-full flex items-center gap-2 pl-6 pr-3 py-2 text-left transition-all text-xs',
                    isActive ? activeRow : inactiveRow
                  )}
                >
                  <span className="text-sm shrink-0">{SLIDE_TYPE_ICON[slide.type] || '📄'}</span>
                  <span className="leading-tight line-clamp-2 font-medium">{slide.title}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
