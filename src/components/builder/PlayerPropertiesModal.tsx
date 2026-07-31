/**
 * PlayerPropertiesModal — Storyline-style Player Properties dialog.
 * Left panel: settings. Right panel: live player preview reacting to all settings.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Monitor, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Play, Volume2, Captions, Maximize2, Layout, Eye, Move,
  Check, Sparkles, Menu, Settings2, Lock, Unlock, ArrowRight, AlertTriangle,
} from 'lucide-react';
import type { NavigationMode, ExamPresentationMode } from '../../types/course';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TOCPosition = 'sidebar-left' | 'sidebar-right' | 'dropdown-top' | 'dropdown-bottom' | 'hidden';
export type PlayerTheme  = 'dark' | 'light' | 'unified';
export type PlayerStyle  = 'modern' | 'classic';

export interface PlayerConfig {
  playerStyle: PlayerStyle;
  theme: PlayerTheme;
  tocPosition: TOCPosition;
  tocStartsCollapsed: boolean;
  tocNumbering: 'icons' | 'numbered';
  showTitle: boolean;
  courseTitle: string;
  showPlayPause: boolean;
  showVolume: boolean;
  showCaptions: boolean;
  showPlaybackSpeed: boolean;
  showProgressBar: boolean;
  showSlideCounter: boolean;
  showPrevNext: boolean;
  allowFullscreen: boolean;
  logoUrl: string | null;
  playerResolution: '16:9' | '4:3' | 'full';
  navigationMode: NavigationMode;
  examPresentationMode: ExamPresentationMode;
  /** 'module' = per-module color from palette; 'global' = single user-picked color */
  accentMode: 'module' | 'global';
  /** Hex color used when accentMode === 'global' */
  globalAccentColor: string;
}

export const defaultPlayerConfig: PlayerConfig = {
  playerStyle: 'modern',
  theme: 'dark',
  tocPosition: 'sidebar-left', // Desktop default. Mobile always uses dropdown (see App useMobileTocDropdown).
  tocStartsCollapsed: false,
  tocNumbering: 'numbered',
  showTitle: true,
  courseTitle: 'My Course',
  showPlayPause: true,
  showVolume: true,
  showCaptions: true,
  showPlaybackSpeed: false,
  showProgressBar: true,
  showSlideCounter: true,
  showPrevNext: true,
  allowFullscreen: true,
  logoUrl: null,
  // '16:9' uses the fixed-design-size + CSS transform scale-to-fit technique
  // (see useScaleToFit.ts), which is layout-safe and cannot overflow/crop its
  // container. 'full' mode has its own independent overflow issues, so new
  // courses default to '16:9' to match the known-good Demo Course setup.
  playerResolution: '16:9',
  navigationMode: 'free',
  examPresentationMode: 'one-at-a-time',
  accentMode: 'module',
  globalAccentColor: '#4f46e5',
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  config: PlayerConfig;
  onChange: (config: PlayerConfig) => void;
  onClose: () => void;
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none',
          checked ? 'bg-indigo-600' : 'bg-slate-600'
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0'
        )} />
      </button>
      {label && <span className="text-sm text-slate-300 group-hover:text-white transition-colors select-none">{label}</span>}
    </label>
  );
}

// ─── Live Player Preview ──────────────────────────────────────────────────────
function LivePlayerPreview({ config }: { config: PlayerConfig }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLight = config.theme === 'light';
  const isUnified = config.theme === 'unified';

  const barBg   = isLight ? 'bg-gray-100 border-gray-300'    : isUnified ? 'bg-indigo-950 border-indigo-700' : 'bg-gray-900 border-gray-700';
  const sideBg  = isLight ? 'bg-gray-50 border-gray-200'     : isUnified ? 'bg-indigo-950 border-indigo-800' : 'bg-gray-950 border-gray-800';
  const slideBg = isLight ? 'bg-white'                        : isUnified ? 'bg-indigo-900/60'               : 'bg-slate-800';
  const textCol = isLight ? 'text-gray-700'                   : 'text-gray-300';
  const accent  = 'text-indigo-400';

  const sampleSlides = ['Introduction', 'Module 1: Basics', 'Module 2: Practice', 'Check', 'Summary'];
  // sampleModuleSlides defined inside return — needed for SidebarCol only

  const TOCMenu = ({ direction = 'down' }: { direction?: 'up' | 'down' }) => (
    menuOpen ? (
      <div className={cn(
        'absolute z-10 w-36 rounded-lg shadow-xl border text-xs overflow-hidden',
        direction === 'up' ? 'bottom-6 left-0' : 'top-6 left-0',
        sideBg
      )}>
        {sampleSlides.map(s => (
          <div key={s} className={cn('px-3 py-1.5 hover:bg-indigo-600/20 cursor-pointer truncate', textCol)}>{s}</div>
        ))}
      </div>
    ) : null
  );

  const TopBar = () => (
    <div className={cn('flex items-center gap-2 px-3 py-2 border-b text-xs font-medium flex-shrink-0', barBg, textCol)}>
      {config.tocPosition === 'sidebar-left' && <span className={cn('font-black', accent)}>☰</span>}

      {config.showTitle && (
        <span className={cn('font-bold flex-1 truncate text-xs', isLight ? 'text-gray-800' : 'text-white')}>
          {config.courseTitle || 'Course Title'}
        </span>
      )}
      {!config.showTitle && <span className="flex-1" />}

      {config.tocPosition === 'dropdown-top' && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs border', isLight ? 'border-gray-300' : 'border-gray-700')}
          >
            <Menu className="w-3 h-3" /> Menu <ChevronDown className="w-2.5 h-2.5" />
          </button>
          <TOCMenu direction="down" />
        </div>
      )}
      {config.tocPosition === 'sidebar-right' && <span className={cn('font-black', accent)}>☰</span>}
    </div>
  );

  const BottomBar = () => (
    <div className={cn('flex items-center gap-1.5 px-2 py-1.5 border-t flex-shrink-0 relative', barBg, textCol)}>
      {config.tocPosition === 'dropdown-bottom' && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border mr-1', isLight ? 'border-gray-300' : 'border-gray-700')}
          >
            <Menu className="w-2.5 h-2.5" /> TOC
          </button>
          <TOCMenu direction="up" />
        </div>
      )}

      {config.showPlayPause && (
        <button className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Play className="w-2.5 h-2.5 text-white fill-white translate-x-[0.5px]" />
        </button>
      )}
      {config.showProgressBar && (
        <div className="flex-1 h-1.5 bg-gray-600/40 rounded-full overflow-hidden">
          <div className="h-full w-2/5 bg-indigo-500 rounded-full" />
        </div>
      )}
      {config.showSlideCounter && (
        <span className="text-[10px] font-mono flex-shrink-0">2/5</span>
      )}
      {config.showVolume     && <Volume2   className="w-3 h-3 flex-shrink-0 opacity-70" />}
      {config.showCaptions   && <Captions  className="w-3 h-3 flex-shrink-0 opacity-70" />}
      {config.showPlaybackSpeed && <span className="text-[9px] font-bold opacity-70 flex-shrink-0">1×</span>}
      {config.allowFullscreen   && <Maximize2 className="w-3 h-3 flex-shrink-0 opacity-70" />}
      {config.showPrevNext && (
        <>
          <ChevronLeft  className="w-3 h-3 opacity-70 flex-shrink-0" />
          <ChevronRight className="w-3 h-3 opacity-70 flex-shrink-0" />
        </>
      )}
    </div>
  );

  const sampleModuleSlides = [
    { label: 'Introduction', num: '1.1' },
    { label: 'Module 1: Basics', num: '1.2' },
    { label: 'Module 2: Practice', num: '2.1' },
    { label: 'Check', num: '2.2' },
    { label: 'Summary', num: '3.1' },
  ];
  const SidebarCol = ({ side }: { side: 'left' | 'right' }) => (
    <div
      className={cn('flex flex-col flex-shrink-0 overflow-hidden', sideBg, side === 'left' ? 'border-r' : 'border-l')}
      style={{ width: 110 }}
    >
      <div className={cn('px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-widest border-b', isLight ? 'text-gray-500 border-gray-200' : 'text-slate-500 border-slate-800')}>
        Menu
      </div>
      {sampleModuleSlides.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'px-2 py-1 text-[10px] truncate border-l-2 transition-all flex items-center gap-1',
            i === 1
              ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-500/10'
              : cn('border-transparent', isLight ? 'text-gray-600' : 'text-slate-400')
          )}
        >
          {config.tocNumbering === 'numbered'
            ? <span className="font-black shrink-0 opacity-60">{s.num}</span>
            : null
          }
          <span className="truncate">{s.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn(
      'flex flex-col rounded-xl overflow-hidden border shadow-2xl text-xs transition-all duration-300',
      isLight ? 'bg-white border-gray-200' : 'bg-slate-900 border-slate-700',
      // Preview frame reflects ratio
      config.playerResolution === 'full' ? 'w-full h-full' :
      config.playerResolution === '4:3'  ? 'w-[80%] mx-auto' : 'w-full',
    )}
    style={config.playerResolution === '4:3' ? { aspectRatio: '4/3' } : config.playerResolution === '16:9' ? { aspectRatio: '16/9' } : undefined}
    >
      <TopBar />
      <div className="flex flex-1 min-h-0">
        {config.tocPosition === 'sidebar-left' && !config.tocStartsCollapsed && <SidebarCol side="left" />}

        {/* Slide Canvas */}
        <div className={cn('flex-1 flex flex-col items-center justify-center relative', slideBg)}>
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-indigo-500 via-transparent to-purple-500 pointer-events-none" />
          <div className="relative z-10 text-center space-y-1 p-4">
            <div className={cn('text-[10px] uppercase tracking-widest font-bold opacity-50', isLight ? 'text-gray-500' : 'text-slate-400')}>
              SLIDE CONTENT
            </div>
            <div className={cn('text-sm font-black leading-tight', isLight ? 'text-gray-900' : 'text-white')}>
              {config.courseTitle || 'Your Course'}
            </div>
            <div className={cn('h-px w-12 mx-auto my-1 opacity-30', isLight ? 'bg-gray-400' : 'bg-slate-500')} />
            <div className={cn('text-[10px] opacity-60', isLight ? 'text-gray-600' : 'text-slate-400')}>
              AI content appears here
            </div>
            <div className="flex gap-1 justify-center mt-2">
              {[1, 2, 3].map(n => (
                <div key={n} className={cn('h-1 rounded-full', n === 2 ? 'w-6 bg-indigo-500' : 'w-3 bg-indigo-500/30')} />
              ))}
            </div>
          </div>
        </div>

        {config.tocPosition === 'sidebar-right' && !config.tocStartsCollapsed && <SidebarCol side="right" />}
      </div>
      <BottomBar />
    </div>
  );
}

// ─── TOC Option Button ────────────────────────────────────────────────────────
function TOCOption({
  value, label, description, icon, selected, onClick
}: {
  value: TOCPosition; label: string; description: string;
  icon: React.ReactNode; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all text-left',
        selected
          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
          : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-500 hover:text-slate-200'
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="font-bold leading-tight">{label}</span>
        <span className={cn('text-[10px] leading-tight truncate', selected ? 'text-indigo-400/70' : 'text-slate-600')}>{description}</span>
      </div>
      {selected && <Check className="w-3 h-3 ml-auto flex-shrink-0 text-indigo-400" />}
    </button>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function PlayerPropertiesModal({ config, onChange, onClose }: Props) {
  const [local, setLocal] = useState<PlayerConfig>({ ...config });

  const update = (patch: Partial<PlayerConfig>) => setLocal(prev => ({ ...prev, ...patch }));
  const handleSave = () => { onChange(local); onClose(); };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 mt-5 first:mt-0">{children}</div>
  );

  const tocOptions: { value: TOCPosition; label: string; description: string; icon: React.ReactNode }[] = [
    { value: 'sidebar-left',    label: 'Sidebar — Left',    description: 'Fixed panel on the left',     icon: <Layout className="w-3.5 h-3.5" /> },
    { value: 'sidebar-right',   label: 'Sidebar — Right',   description: 'Fixed panel on the right',    icon: <Layout className="w-3.5 h-3.5 scale-x-[-1]" /> },
    { value: 'dropdown-top',    label: 'Dropdown — Top',    description: 'Menu button in top bar',      icon: <ChevronDown className="w-3.5 h-3.5" /> },
    { value: 'dropdown-bottom', label: 'Dropdown — Bottom', description: 'Menu button in bottom bar',   icon: <ChevronUp className="w-3.5 h-3.5" /> },
    { value: 'hidden',          label: 'Hidden',            description: 'No navigation menu shown',    icon: <X className="w-3.5 h-3.5" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-start justify-center pt-16 px-4 pb-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Monitor className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-base">Player Properties</h2>
              <p className="text-slate-400 text-xs">Customize the learner experience before generating your course</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ─ LEFT: Settings Panel ─ */}
          <div className="w-72 border-r border-slate-800 overflow-y-auto p-5 shrink-0">



            <SectionTitle>Theme</SectionTitle>
            <select
              value={local.theme}
              onChange={e => update({ theme: e.target.value as PlayerTheme })}
              className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer mb-1"
            >
              <option value="dark">🌑 Dark</option>
              <option value="light">☀️ Light</option>
              <option value="unified">💜 Unified (Indigo)</option>
            </select>

            <SectionTitle>Table of Contents</SectionTitle>
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                Desktop default is a fixed left sidebar. On mobile (and Mobile preview), the player always uses a clickable Menu dropdown so the TOC never steals slide width.
              </p>
              {tocOptions.map(opt => (
                <TOCOption
                  key={opt.value}
                  {...opt}
                  selected={local.tocPosition === opt.value}
                  onClick={() => update({ tocPosition: opt.value })}
                />
              ))}
            </div>
            <div className="mt-2.5 mb-1">
              <Toggle
                checked={local.tocStartsCollapsed}
                onChange={() => update({ tocStartsCollapsed: !local.tocStartsCollapsed })}
                label="TOC starts collapsed"
              />
            </div>

            <div className="mt-3">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Slide Numbering Style</div>
              <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => update({ tocNumbering: 'icons' })}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-colors',
                    local.tocNumbering === 'icons'
                      ? 'bg-indigo-600/30 text-indigo-300 border-r border-indigo-600/40'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-r border-slate-700'
                  )}
                >
                  <span>🎯</span> Icons
                </button>
                <button
                  type="button"
                  onClick={() => update({ tocNumbering: 'numbered' })}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-colors',
                    local.tocNumbering === 'numbered'
                      ? 'bg-indigo-600/30 text-indigo-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  <span className="font-black text-[10px] tabular-nums">1.1 1.2</span> Numbered
                </button>
              </div>
              <p className="text-[9px] text-slate-600 mt-1">Controls what appears next to each slide title in the Table of Contents</p>
            </div>

            <SectionTitle>Title & Branding</SectionTitle>
            <Toggle
              checked={local.showTitle}
              onChange={() => update({ showTitle: !local.showTitle })}
              label="Show course title in header"
            />
            {local.showTitle && (
              <input
                type="text"
                value={local.courseTitle}
                onChange={e => update({ courseTitle: e.target.value })}
                placeholder="Course title..."
                className="mt-2 w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            )}

            {/* Aspect ratio is always Full — fills the available canvas. */}

            <SectionTitle>Player Controls</SectionTitle>
            <div className="space-y-2">
              {([
                { key: 'showPlayPause',     label: 'Play / Pause' },
                { key: 'showProgressBar',   label: 'Progress bar' },
                { key: 'showSlideCounter',  label: 'Slide counter' },
                { key: 'showVolume',        label: 'Volume control' },
                { key: 'showCaptions',      label: 'Captions toggle' },
                { key: 'showPlaybackSpeed', label: 'Playback speed' },
                { key: 'showPrevNext',      label: 'Prev / Next buttons' },
                { key: 'allowFullscreen',   label: 'Fullscreen button' },
              ] as { key: keyof PlayerConfig; label: string }[]).map(({ key, label }) => (
                <Toggle
                  key={key}
                  checked={local[key] as boolean}
                  onChange={() => update({ [key]: !local[key] })}
                  label={label}
                />
              ))}
            </div>

            <SectionTitle>Slide Accent Colors</SectionTitle>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                A colored accent strip is shown on each slide. By default it matches the module's color. You can override this with a single global color.
              </p>
              <Toggle
                checked={local.accentMode === 'module'}
                onChange={() => update({ accentMode: local.accentMode === 'module' ? 'global' : 'module' })}
                label="Use module accent colors"
              />
              {local.accentMode === 'global' && (
                <div className="flex items-center gap-3 pl-1">
                  <label className="text-xs text-slate-300 shrink-0">Global accent color</label>
                  <input
                    type="color"
                    value={local.globalAccentColor || '#4f46e5'}
                    onChange={e => update({ globalAccentColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    title="Pick global accent color"
                  />
                  <span className="text-xs text-slate-500 font-mono">{local.globalAccentColor || '#4f46e5'}</span>
                </div>
              )}
              {local.accentMode === 'module' && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {['#4f46e5','#0891b2','#16a34a','#d97706','#9333ea','#e11d48','#0d9488','#b45309'].map((c, i) => (
                    <div
                      key={c}
                      className="w-5 h-5 rounded-full border-2 border-white/20"
                      style={{ backgroundColor: c }}
                      title={`Module ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <SectionTitle>Navigation Mode</SectionTitle>
            <div className="space-y-2">
              {([
                { mode: 'free' as NavigationMode,       label: 'Free Roam',   desc: 'Navigate to any slide at any time' },
                { mode: 'linear' as NavigationMode,     label: 'Linear',      desc: 'Next button only — no menu skipping' },
                { mode: 'restricted' as NavigationMode, label: 'Restricted',  desc: 'Next to advance; menu allows revisiting viewed slides only' },
              ]).map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => update({ navigationMode: mode })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    local.navigationMode === mode
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                  </div>
                  {local.navigationMode === mode && <Check className="w-3.5 h-3.5 text-indigo-400"/>}
                </button>
              ))}
            </div>

            <SectionTitle>Exam Presentation</SectionTitle>
            <div className="space-y-2">
              {([
                { mode: 'one-at-a-time' as ExamPresentationMode, label: 'One at a Time', desc: 'One question per screen with progress bar (default)' },
                { mode: 'scroll-all' as ExamPresentationMode,    label: 'All at Once',   desc: 'Scrollable single-page exam view' },
              ]).map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (mode !== local.examPresentationMode) {
                      if (window.confirm('Changing the exam presentation format will require the Mastery Quiz to regenerate.\n\nThis will cost 1 credit in a future update.\n\nProceed?')) {
                        update({ examPresentationMode: mode });
                      }
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    local.examPresentationMode === mode
                      ? 'bg-purple-600/20 border-purple-500/50 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                  </div>
                  {local.examPresentationMode === mode && <Check className="w-3.5 h-3.5 text-purple-400"/>}
                </button>
              ))}
              <p className="text-[10px] text-amber-400/70 flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0"/>
                Changing presentation mode will prompt a regeneration confirmation.
              </p>
            </div>
          </div>

          {/* ─ RIGHT: Live Preview ─ */}
          <div className="flex-1 flex flex-col bg-slate-950 p-5 gap-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-white font-extrabold text-sm">Live Player Preview</span>
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-800 border border-slate-700 px-2 py-1 rounded-full">
                Updates in real-time
              </span>
            </div>

            {/* Simulated browser chrome */}
            <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" style={{ height: 380 }}>
              <div className="bg-slate-800 px-3 py-2 flex items-center gap-2 border-b border-slate-700 flex-shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 bg-slate-700 rounded-md h-4 flex items-center px-2">
                  <span className="text-[9px] text-slate-400">nexcourse.ai/player</span>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <LivePlayerPreview config={local} />
              </div>
            </div>

            {/* Config summary chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: local.theme + ' theme', color: 'text-slate-300 bg-slate-700/50 border-slate-600' },
                { label: 'Full viewport · responsive', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
                { label: local.tocPosition.replace(/-/g, ' '), color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
                ...(local.tocStartsCollapsed ? [{ label: 'TOC collapsed', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' }] : []),
              ].map(chip => (
                <span key={chip.label} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize', chip.color)}>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/40 flex items-center justify-between shrink-0">
          <button
            onClick={() => setLocal({ ...defaultPlayerConfig })}
            className="text-xs text-slate-400 hover:text-white transition-colors font-bold"
          >
            Reset to defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white font-bold text-sm transition-all hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Properties
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
