import React, { useRef, useState } from 'react';
import { CheckCircle2, Images, Lock, Unlock, Upload, X } from 'lucide-react';
import { courseTitlePlain, shortenModuleTitle } from '../../lib/splitCourseTitle';
import { preventWidow } from '../../lib/preventWidow';
import { themeBackgroundImages } from '../../lib/backgrounds';
import { EnlargeableImage, type InFlowPromoteInfo } from './EnlargeableImage';

type Theme = 'light' | 'dark' | 'unified';

export interface HubModuleRow {
  number: number;
  title: string;
  complete: boolean;
}

interface Props {
  courseTitle: string;
  titleIsAuthored?: boolean;
  imageUrl?: string | null;
  visualTheme?: string;
  modules: HubModuleRow[];
  theme: Theme;
  accentColor?: string;
  quizEnabled: boolean;
  quizUnlocked: boolean;
  onSelectModule: (moduleNumber: number) => void;
  onSelectQuiz?: () => void;
  isPreviewMode?: boolean;
  hubPanelHidden?: boolean;
  hasFloatingHub?: boolean;
  onImageUpload?: (url: string) => void;
  onRemove?: () => void;
  onCrop?: (dataUrl: string) => void;
  onPromoteToFloat?: (info: InFlowPromoteInfo) => void;
  onPickBackdrop?: (url: string) => void;
}

const PAGE_BG: Record<Theme, string> = {
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
  titleIsAuthored = false,
  imageUrl,
  visualTheme,
  modules,
  theme,
  accentColor = '#4f46e5',
  quizEnabled,
  quizUnlocked,
  onSelectModule,
  onSelectQuiz,
  isPreviewMode = false,
  hubPanelHidden = false,
  hasFloatingHub = false,
  onImageUpload,
  onRemove,
  onCrop,
  onPromoteToFloat,
  onPickBackdrop,
}) => {
  const ink = INK[theme];
  const muted = MUTED[theme];
  const pageBg = PAGE_BG[theme];
  const doneCount = modules.filter(m => m.complete).length;
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canAuthor = isPreviewMode && !!(onRemove || onCrop || onPromoteToFloat || onPickBackdrop || onImageUpload);
  const displayImage = hubPanelHidden ? null : (imageUrl || null);
  const backdrops = themeBackgroundImages(visualTheme);
  const neutral = visualTheme && visualTheme !== 'Neutral' ? themeBackgroundImages('Neutral') : [];
  const title = preventWidow(courseTitlePlain(courseTitle || 'Course', titleIsAuthored));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onImageUpload?.(url);
    setPickerOpen(false);
  };

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: pageBg }}>
      {displayImage ? (
        <div className="absolute inset-0">
          <EnlargeableImage
            src={displayImage}
            alt="Main Menu backdrop"
            wrapperClassName="w-full h-full"
            className="w-full h-full object-cover"
            onRemove={canAuthor ? onRemove : undefined}
            onCrop={canAuthor ? onCrop : undefined}
            onPromoteToFloat={canAuthor ? onPromoteToFloat : undefined}
            onSwap={canAuthor && onPickBackdrop ? () => setPickerOpen(true) : undefined}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: theme === 'light' ? 'rgba(248,250,252,0.28)' : 'rgba(15,23,42,0.38)' }}
          />
        </div>
      ) : hasFloatingHub ? null : (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div
            className="absolute -right-16 top-[-20%] w-[52%] h-[140%] rounded-full opacity-30"
            style={{ background: `radial-gradient(circle, ${accentColor}55 0%, transparent 68%)` }}
          />
          <div
            className="absolute left-[8%] bottom-[-18%] w-[28%] h-[55%] rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)` }}
          />
          <div
            className="absolute top-10 right-10 w-28 h-28 border-t-4 border-r-4 rounded-tr-3xl opacity-50"
            style={{ borderColor: accentColor }}
          />
          <div
            className="absolute bottom-10 left-10 w-20 h-20 border-b-4 border-l-4 rounded-bl-3xl opacity-40"
            style={{ borderColor: accentColor }}
          />
        </div>
      )}

      <div
        className={`relative z-[1] h-full flex ${displayImage ? 'items-center justify-center px-8 py-8 pointer-events-none' : 'flex-row items-stretch px-10 sm:px-12 py-8 gap-8'}`}
      >
        <div
          className={displayImage
            ? 'hub-menu-stage pointer-events-auto w-full max-w-[1040px] max-h-full overflow-hidden rounded-[1.75rem] border shadow-sm px-8 py-7 flex flex-row items-stretch gap-8'
            : 'contents'}
          style={displayImage ? {
            background: theme === 'light' ? '#ffffff' : theme === 'unified' ? '#1e1b4b' : '#0f172a',
            borderColor: theme === 'light' ? '#e2e8f0' : 'rgba(148,163,184,0.28)',
          } : undefined}
        >
        <div className="flex flex-col justify-center min-h-0 min-w-0" style={{ width: quizEnabled ? '62%' : '100%' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: accentColor }}>
            Main Menu
          </p>
          <h1
            className="font-extrabold leading-tight tracking-tight text-[clamp(1.55rem,2.6vw,2.35rem)] mb-2 whitespace-nowrap overflow-hidden text-ellipsis slide-title-balanced"
            style={{ color: ink }}
          >
            {title}
          </h1>
          <p className="text-sm mb-6" style={{ color: muted }}>
            {doneCount} of {modules.length} module{modules.length === 1 ? '' : 's'} complete
            {quizEnabled && !quizUnlocked ? ' · Finish every module to unlock the quiz' : ''}
          </p>

          <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {modules.map((mod) => (
              <button
                key={mod.number}
                type="button"
                onClick={() => onSelectModule(mod.number)}
                className="w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-colors"
                style={{
                  borderColor: mod.complete ? `${accentColor}55` : theme === 'light' ? '#e2e8f0' : 'rgba(148,163,184,0.25)',
                  background: mod.complete ? `${accentColor}14` : theme === 'light' ? 'rgba(248,250,252,0.92)' : 'rgba(15,23,42,0.55)',
                }}
              >
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                  style={{
                    background: mod.complete ? accentColor : theme === 'light' ? '#e2e8f0' : 'rgba(148,163,184,0.2)',
                    color: mod.complete ? '#fff' : ink,
                  }}
                >
                  {mod.complete ? <CheckCircle2 className="w-5 h-5" /> : mod.number}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-black uppercase tracking-wider" style={{ color: muted }}>
                    Module {mod.number}
                  </span>
                  <span className="block text-base font-bold leading-snug" style={{ color: ink }}>
                    {shortenModuleTitle(mod.title)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {quizEnabled && (
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <button
              type="button"
              disabled={!quizUnlocked}
              onClick={() => quizUnlocked && onSelectQuiz?.()}
              title={quizUnlocked ? 'Mastery Quiz' : 'Complete every module to unlock the quiz'}
              className="flex flex-col items-center justify-center gap-4 px-6 py-8 disabled:cursor-not-allowed"
            >
              <span
                className="w-40 h-40 rounded-[2rem] flex items-center justify-center border-2 shadow-sm transition-colors"
                style={{
                  borderColor: quizUnlocked ? accentColor : theme === 'light' ? '#cbd5e1' : 'rgba(148,163,184,0.35)',
                  background: quizUnlocked ? `${accentColor}18` : theme === 'light' ? 'rgba(241,245,249,0.92)' : 'rgba(15,23,42,0.55)',
                  color: quizUnlocked ? accentColor : muted,
                }}
              >
                {quizUnlocked
                  ? <Unlock className="w-20 h-20" strokeWidth={1.6} />
                  : <Lock className="w-20 h-20" strokeWidth={1.6} />}
              </span>
              <span className="text-center">
                <span className="block text-lg font-extrabold" style={{ color: ink }}>Mastery Quiz</span>
                <span className="block text-sm mt-1" style={{ color: muted }}>
                  {quizUnlocked ? 'Unlocked — start the quiz' : 'Locked until every module is complete'}
                </span>
              </span>
            </button>
          </div>
        )}
        </div>
      </div>

      {canAuthor && !displayImage && (
        <div className="absolute top-2 right-2 z-[3] flex items-center gap-1">
          {onPickBackdrop && (
            <button
              type="button"
              title="Swap backdrop"
              aria-label="Swap backdrop"
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1 h-7 px-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow"
            >
              <Images className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-semibold pr-0.5">Swap</span>
            </button>
          )}
          {onImageUpload && (
            <button
              type="button"
              title="Upload image"
              aria-label="Upload image"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white shadow"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
          {onRemove && !hubPanelHidden && (
            <button
              type="button"
              title="Remove menu panel"
              aria-label="Remove menu panel"
              onClick={onRemove}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 hover:bg-red-400 text-white shadow"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {pickerOpen && canAuthor && onPickBackdrop && (
        <div className="absolute inset-0 z-[4] flex flex-col bg-slate-950/80 backdrop-blur-[2px] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/80">
              Theme backdrops
            </p>
            <button
              type="button"
              aria-label="Close backdrop picker"
              onClick={() => setPickerOpen(false)}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            <BackdropGrid
              urls={backdrops}
              selected={displayImage}
              onPick={(url) => {
                onPickBackdrop(url);
                setPickerOpen(false);
              }}
            />
            {neutral.length > 0 && (
              <>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/55 pt-1">Neutral</p>
                <BackdropGrid
                  urls={neutral}
                  selected={displayImage}
                  onPick={(url) => {
                    onPickBackdrop(url);
                    setPickerOpen(false);
                  }}
                />
              </>
            )}
          </div>
          {onImageUpload && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex items-center justify-center gap-2 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload your own
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

function BackdropGrid({
  urls,
  selected,
  onPick,
}: {
  urls: string[];
  selected?: string | null;
  onPick: (url: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {urls.map((url) => {
        const active = url === selected;
        return (
          <button
            key={url}
            type="button"
            title="Use this backdrop"
            onClick={() => onPick(url)}
            className={`relative overflow-hidden rounded-md aspect-[4/3] ring-2 ${
              active ? 'ring-emerald-400' : 'ring-transparent hover:ring-white/40'
            }`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}

export default HubMenuSlide;
