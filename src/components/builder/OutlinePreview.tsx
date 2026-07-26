import React, { useState } from 'react';
import { CourseOutlineDraft } from '../../services/aiService';
import { GripVertical, Layers, Presentation, Flag, Zap, Library, Target, Gamepad2, CheckCircle, ChevronRight, Loader2, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  initialOutline: CourseOutlineDraft;
  onApprove: (finalOutline: CourseOutlineDraft) => void;
  onCancel: () => void;
  isHydrating: boolean;
  error?: string | null;
  progress?: number;
  sandboxMode?: boolean;
  /** When true, hide full-page chrome/CTAs — used inside Course Settings Design tab */
  embedded?: boolean;
  onOutlineChange?: (outline: CourseOutlineDraft) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function OutlinePreview({
  initialOutline,
  onApprove,
  onCancel,
  isHydrating,
  error,
  progress = 10,
  sandboxMode = false,
  embedded = false,
  onOutlineChange,
  onRegenerate,
  isRegenerating = false,
}: Props) {
  const [outline, setOutline] = useState<CourseOutlineDraft>(initialOutline);

  React.useEffect(() => {
    setOutline(initialOutline);
  }, [initialOutline]);

  const updateOutline = (next: CourseOutlineDraft) => {
    setOutline(next);
    onOutlineChange?.(next);
  };
  const [draggedItem, setDraggedItem] = useState<{ mIndex: number, sIndex: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ mIndex: number, sIndex: number } | null>(null);

  const getSlideIcon = (type: string) => {
    switch(type) {
      case 'content': return <Presentation className="w-4 h-4" />;
      case 'intro': return <Flag className="w-4 h-4" />;
      case 'outro': return <CheckCircle className="w-4 h-4" />;
      case 'quiz': 
      case 'interaction': return <Zap className="w-4 h-4 text-purple-400" />;
      case 'accordion':
      case 'flashcards':
      case 'timeline':
      case 'sorting':
      case 'matching':
      case 'drag-drop-activity':
      case 'branching': return <Library className="w-4 h-4 text-indigo-400" />;
      case 'game-template': return <Gamepad2 className="w-4 h-4 text-emerald-400" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const handleDragStart = (e: React.DragEvent, mIndex: number, sIndex: number) => {
    setDraggedItem({ mIndex, sIndex });
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires dataTransfer data
    e.dataTransfer.setData('text/plain', `${mIndex}-${sIndex}`);
  };

  const handleDragOver = (e: React.DragEvent, mIndex: number, sIndex: number) => {
    e.preventDefault();
    setDragOverItem({ mIndex, sIndex });
  };

  const handleDrop = (e: React.DragEvent, targetMIndex: number, targetSIndex: number) => {
    e.preventDefault();
    setDragOverItem(null);
    if (!draggedItem) return;
    if (draggedItem.mIndex === targetMIndex && draggedItem.sIndex === targetSIndex) return;

    const newOutline = { ...outline };
    const modules = [...newOutline.modules.map(m => ({ ...m, slides: [...m.slides] }))];

    const slideToMove = modules[draggedItem.mIndex].slides[draggedItem.sIndex];
    modules[draggedItem.mIndex].slides.splice(draggedItem.sIndex, 1);
    
    // Insert at specific target
    modules[targetMIndex].slides.splice(targetSIndex, 0, slideToMove);
    newOutline.modules = modules;
    updateOutline(newOutline);
    setDraggedItem(null);
  };

  return (
    <div className={cn(
      'w-full animate-in fade-in slide-in-from-bottom-8 duration-700',
      embedded ? 'space-y-6' : 'max-w-4xl mx-auto space-y-8'
    )}>
      
      {/* Header Panel — full page only */}
      {!embedded && (
      <div className={cn("bg-slate-900/80 backdrop-blur-xl border rounded-3xl p-8 shadow-2xl relative overflow-hidden group", sandboxMode ? 'border-purple-700/40' : 'border-slate-700/80')}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 border", sandboxMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30')}>
              {sandboxMode ? <Sparkles className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {sandboxMode ? '🧪 Sandbox — Dummy Course Outline' : 'Step 1: Structural Approval'}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2 leading-tight">Review Course Outline</h1>
            <p className="text-sm font-medium text-gray-400 max-w-xl">
              {sandboxMode
                ? 'This is the sandbox dummy course outline. Drag and drop to reorder slides, then click Preview to see the result — no AI generation occurs.'
                : 'Drag and drop the items below to rearrange your course layout. When you are ready, click Generate Content to create your full course.'
              }
            </p>
          </div>
          
          <div className="flex flex-col gap-3 shrink-0">
            <button 
              onClick={() => onApprove(outline)}
              className={cn(
                "border text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl",
                sandboxMode
                  ? 'bg-purple-600 border-purple-500/50 hover:bg-purple-500 shadow-purple-500/25'
                  : 'bg-indigo-600 border-indigo-500/50 hover:bg-indigo-500 shadow-indigo-500/25 disabled:opacity-50'
              )}
              disabled={!sandboxMode && isHydrating}
            >
              {!sandboxMode && isHydrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              {sandboxMode ? 'Preview Sandbox Course' : (isHydrating ? 'Generating Course...' : 'Generate Course')}
            </button>
            <button 
              onClick={onCancel}
              disabled={!sandboxMode && isHydrating}
              className="text-gray-400 hover:text-white px-8 py-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors text-sm font-bold disabled:opacity-50"
            >
              {sandboxMode ? 'Back to Course Settings' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
      )}

      {embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Course Structure</h3>
            <p className="text-sm text-slate-400">Drag slides to reorder. Regenerate after changing interaction settings.</p>
          </div>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating || isHydrating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm font-bold hover:border-indigo-500/50 hover:text-white transition-all disabled:opacity-50"
            >
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
              Regenerate Structure
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 backdrop-blur-md">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Generation Loading Overlay */}
      {isHydrating && (
         <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
           <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-8" />
           <h2 className="text-3xl font-bold text-white mb-4">Crafting Final Course</h2>
           <p className="text-slate-400 max-w-md text-center mb-8">Rendering slides, assembling games, and compiling SCORM packaging...</p>
           <div className="w-full max-w-md h-3 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${Math.min(100, progress)}%` }}></div>
           </div>
           <span className="text-emerald-400 font-bold mt-4">{Math.round(Math.min(100, Math.max(10, progress)))}% Compiled</span>
         </div>
      )}

      {/* DnD Nodes Map */}
      <div className="space-y-6">
        {outline.modules.map((module, mIndex) => (
          <div key={module.id} className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 text-gray-400">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module {mIndex + 1}: <span className="text-indigo-300">{module.title}</span>
              </h2>
            </div>
            
            <div className="space-y-2">
              {module.slides.map((slide, sIndex) => {
                const isDragging = draggedItem?.mIndex === mIndex && draggedItem?.sIndex === sIndex;
                const isOver = dragOverItem?.mIndex === mIndex && dragOverItem?.sIndex === sIndex;
                const isGame = slide.type === 'game-template';
                
                return (
                  <div 
                    key={slide.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, mIndex, sIndex)}
                    onDragOver={(e) => handleDragOver(e, mIndex, sIndex)}
                    onDrop={(e) => handleDrop(e, mIndex, sIndex)}
                    onDragEnd={() => setDragOverItem(null)}
                    className={cn(
                      "group flex items-center rounded-xl transition-all cursor-grab active:cursor-grabbing border relative",
                      isDragging ? "opacity-30 border-dashed" : "opacity-100",
                      isOver ? "border-indigo-400 pb-12 bg-indigo-500/10" : "border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600",
                      isGame ? "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50" : ""
                    )}
                  >
                    <div className="p-4 text-gray-500 group-hover:text-indigo-300 cursor-grab shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    
                    <div className={cn(
                      "w-8 h-8 rounded bg-slate-900 flex items-center justify-center shrink-0 border",
                      isGame ? "border-emerald-500/50" : "border-slate-700"
                    )}>
                      {getSlideIcon(slide.type)}
                    </div>
                    
                    <div className="ml-4 truncate flex-1 py-4">
                      <p className={cn("text-sm font-bold truncate pr-4", isGame ? "text-emerald-300" : "text-gray-200")}>
                        {slide.title}
                      </p>
                    </div>

                    <div className="px-4 py-4 shrink-0 flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-slate-900 border",
                        isGame ? "text-emerald-400 border-emerald-500/30" : "text-indigo-400 border-indigo-500/20"
                      )}>
                        {isGame ? (slide.gameType || 'Game Review') : slide.type}
                      </span>
                    </div>

                    {isOver && (
                      <div className="absolute bottom-2 left-10 right-10 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                    )}
                  </div>
                )
              })}
              
              {/* Drop Target for Empty Module or End of Module */}
              <div 
                className={cn(
                  "h-12 border-2 border-dashed rounded-xl flex items-center justify-center transition-all",
                  dragOverItem?.mIndex === mIndex && dragOverItem?.sIndex === module.slides.length 
                    ? "border-indigo-400 bg-indigo-500/10" 
                    : "border-slate-800/50 bg-transparent text-transparent"
                )}
                onDragOver={(e) => handleDragOver(e, mIndex, module.slides.length)}
                onDrop={(e) => handleDrop(e, mIndex, module.slides.length)}
                onDragEnd={() => setDragOverItem(null)}
              >
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
