import React from 'react';
import { CheckCircle2, Lock, GraduationCap, LayoutGrid } from 'lucide-react';
import { shortenCourseTitle, shortenModuleTitle } from '../../lib/splitCourseTitle';

type Theme = 'light' | 'dark' | 'unified';

export interface HubModuleRow {
  number: number;
  title: string;
  complete: boolean;
}

interface Props {
  courseTitle: string;
  coverImage?: string | null;
  modules: HubModuleRow[];
  theme: Theme;
  accentColor?: string;
  quizEnabled: boolean;
  quizUnlocked: boolean;
  onSelectModule: (moduleNumber: number) => void;
  onSelectQuiz?: () => void;
}

const LEFT_BG: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#0f172a',
  unified: '#1e1b4b',
};

const INK: Record<Theme, string> = {
  light: '#0f172a',
  dark: '#f8fafc',
  unified: '#e2e8f0',
};

const MUTED: Record<Theme, string> = {
  light: '#64748b',
  dark: '#94a3b8',
  unified: '#a5b4fc',
};

export const HubMenuSlide: React.FC<Props> = ({
  courseTitle,
  coverImage,
  modules,
  theme,
  accentColor = '#4f46e5',
  quizEnabled,
  quizUnlocked,
  onSelectModule,
  onSelectQuiz,
}) => {
  const leftBg = LEFT_BG[theme];
  const ink = INK[theme];
  const muted = MUTED[theme];
  const doneCount = modules.filter(m => m.complete).length;

  return (
    <div className="w-full h-full flex flex-row overflow-hidden">
      <div
        className="flex flex-col justify-center px-10 sm:px-12 py-8 min-h-0"
        style={{ width: '52%', flexShrink: 0, backgroundColor: leftBg }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: accentColor }}>
          Main Menu
        </p>
        <h1 className="font-extrabold leading-tight tracking-tight text-[clamp(1.6rem,3.4vw,2.4rem)] mb-2" style={{ color: ink }}>
          {shortenCourseTitle(courseTitle || 'Course')}
        </h1>
        <p className="text-sm mb-6" style={{ color: muted }}>
          {doneCount} of {modules.length} module{modules.length === 1 ? '' : 's'} complete
          {quizEnabled && !quizUnlocked ? ' · Finish every module to unlock the quiz' : ''}
        </p>

        <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[58%]">
          {modules.map((mod) => (
            <button
              key={mod.number}
              type="button"
              onClick={() => onSelectModule(mod.number)}
              className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
              style={{
                borderColor: mod.complete ? `${accentColor}55` : theme === 'light' ? '#e2e8f0' : 'rgba(148,163,184,0.25)',
                background: mod.complete ? `${accentColor}14` : theme === 'light' ? '#f8fafc' : 'rgba(15,23,42,0.45)',
              }}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{
                  background: mod.complete ? accentColor : theme === 'light' ? '#e2e8f0' : 'rgba(148,163,184,0.2)',
                  color: mod.complete ? '#fff' : ink,
                }}
              >
                {mod.complete ? <CheckCircle2 className="w-4 h-4" /> : mod.number}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider" style={{ color: muted }}>
                  Module {mod.number}
                </span>
                <span className="block text-sm font-bold truncate" style={{ color: ink }}>
                  {shortenModuleTitle(mod.title)}
                </span>
              </span>
            </button>
          ))}
        </div>

        {quizEnabled && (
          <button
            type="button"
            disabled={!quizUnlocked}
            onClick={() => quizUnlocked && onSelectQuiz?.()}
            title={quizUnlocked ? 'Mastery Quiz' : 'Complete every module to unlock the quiz'}
            className="mt-4 w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              borderColor: quizUnlocked ? `${accentColor}66` : theme === 'light' ? '#e2e8f0' : 'rgba(148,163,184,0.2)',
              background: quizUnlocked ? `${accentColor}18` : theme === 'light' ? '#f1f5f9' : 'rgba(15,23,42,0.35)',
            }}
          >
            {quizUnlocked
              ? <GraduationCap className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
              : <Lock className="w-5 h-5 shrink-0" style={{ color: muted }} />}
            <span className="flex-1">
              <span className="block text-sm font-bold" style={{ color: ink }}>Mastery Quiz</span>
              <span className="block text-xs" style={{ color: muted }}>
                {quizUnlocked ? 'All modules complete — start the quiz' : 'Locked until every module is complete'}
              </span>
            </span>
          </button>
        )}
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        style={{
          background: coverImage
            ? undefined
            : `linear-gradient(135deg, ${accentColor}55 0%, #0f172a 55%, #1e293b 100%)`,
        }}
      >
        {coverImage ? (
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
            <LayoutGrid className="w-12 h-12 opacity-70" />
            <p className="text-sm font-semibold">Choose a module to continue</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HubMenuSlide;
