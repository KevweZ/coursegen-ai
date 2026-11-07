import React, { useRef, useState } from 'react';
import { CheckCircle2, Images, LayoutGrid, Lock, GraduationCap, Upload, X } from 'lucide-react';
import { courseTitlePlain, shortenModuleTitle } from '../../lib/splitCourseTitle';
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
  const leftBg = LEFT_BG[theme];
  const ink = INK[theme];
  const muted = MUTED[theme];
  const doneCount = modules.filter(m => m.complete).length;
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canAuthor = isPreviewMode && !!(onRemove || onCrop || onPromoteToFloat || onPickBackdrop || onImageUpload);
  const displayImage = hubPanelHidden ? null : (imageUrl || null);
  const backdrops = themeBackgroundImages(visualTheme);
  const neutral = visualTheme && visualTheme !== 'Neutral' ? themeBackgroundImages('Neutral') : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onImageUpload?.(url);
    setPickerOpen(false);
  };

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
          {courseTitlePlain(courseTitle || 'Course', titleIsAuthored)}
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
          background: displayImage
            ? undefined
            : `linear-gradient(135deg, ${accentColor}55 0%, #0f172a 55%, #1e293b 100%)`,
        }}
      >
        {displayImage ? (
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
        ) : hasFloatingHub ? null : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 px-6 text-center">
            <LayoutGrid className="w-12 h-12 opacity-70" />
            <p className="text-sm font-semibold">Choose a module to continue</p>
            {canAuthor && (
              <p className="text-white/50 text-xs max-w-[14rem]">
                Swap a theme backdrop, or upload your own photo
              </p>
            )}
          </div>
        )}

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
