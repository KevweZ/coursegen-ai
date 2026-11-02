import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, X } from 'lucide-react';
import type { InsertPlacement } from '../../lib/courseSlideEdits';

export type AddContentScope = 'slide' | 'slides' | 'module';
export type AddContentAuthoring = 'generate' | 'specify';

export const ADD_CONTENT_TYPE_OPTIONS = [
  { id: 'content', label: 'Plain content' },
  { id: 'tabbed-horizontal', label: 'Process' },
  { id: 'tabbed-vertical', label: 'Tabs' },
  { id: 'click-reveal', label: 'Click & Reveal' },
  { id: 'choice-cards', label: 'Choice cards' },
  { id: 'quiz', label: 'Knowledge check' },
] as const;

export type AddContentForm = {
  scope: AddContentScope;
  brief: string;
  titleHint: string;
  newObjective: string;
  placement: InsertPlacement;
  slideCount: number;
  autoSlideCount: boolean;
  authoring: AddContentAuthoring;
  ostText: string;
  narrationText: string;
  preferredTypes: string[];
};

interface Props {
  open: boolean;
  busy?: boolean;
  currentSlideTitle?: string;
  currentIsChrome?: boolean;
  afterInsertLabel?: string;
  onClose: () => void;
  onGenerate: (form: AddContentForm) => void;
}

const SCOPE_HELP: Record<AddContentScope, string> = {
  slide: 'Turn the pasted source into one slide. The rest of the course is unchanged.',
  slides: 'Chunk the pasted source into a short sequence, then splice it in.',
  module: 'Turn the pasted source into a new module. Existing modules are not rebuilt.',
};

export function AddContentModal({
  open,
  busy = false,
  currentSlideTitle,
  currentIsChrome = false,
  afterInsertLabel,
  onClose,
  onGenerate,
}: Props) {
  const [scope, setScope] = useState<AddContentScope>('slide');
  const [brief, setBrief] = useState('');
  const [titleHint, setTitleHint] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [placement, setPlacement] = useState<InsertPlacement>('after');
  const [slideCount, setSlideCount] = useState(3);
  const [autoSlideCount, setAutoSlideCount] = useState(true);
  const [authoring, setAuthoring] = useState<AddContentAuthoring>('generate');
  const [ostText, setOstText] = useState('');
  const [narrationText, setNarrationText] = useState('');
  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setScope('slide');
    setBrief('');
    setTitleHint('');
    setNewObjective('');
    setPlacement(currentIsChrome ? 'end-module' : 'after');
    setSlideCount(3);
    setAutoSlideCount(true);
    setAuthoring('generate');
    setOstText('');
    setNarrationText('');
    setPreferredTypes([]);
  }, [open, currentIsChrome]);

  useEffect(() => {
    if (scope === 'module') setPlacement('new-module');
    if (scope !== 'slide') setAuthoring('generate');
  }, [scope]);

  const specify = scope === 'slide' && authoring === 'specify';
  const canSubmit = specify
    ? (ostText.trim().length >= 4 || narrationText.trim().length >= 8) && !busy
    : brief.trim().length >= 8 && !busy;
  const effectivePlacement: InsertPlacement = scope === 'module' ? 'new-module' : placement;

  const toggleType = (id: string) => {
    setPreferredTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={busy ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="add-content-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <h3 id="add-content-title" className="text-lg font-bold text-white">Add content</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Paste the source to teach. Only new slides are generated — existing slides stay as they are.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[min(70vh,32rem)] overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['slide', 'One slide'],
                  ['slides', 'Few slides'],
                  ['module', 'New module'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => setScope(id)}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                      scope === id
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{SCOPE_HELP[scope]}</p>

              {scope === 'slide' && (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['generate', 'App writes the slide'],
                    ['specify', 'I will write OST + audio'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      disabled={busy}
                      onClick={() => setAuthoring(id)}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                        authoring === id
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {specify ? (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">On-screen text</span>
                    <textarea
                      value={ostText}
                      onChange={e => setOstText(e.target.value)}
                      disabled={busy}
                      rows={6}
                      placeholder="The bullets or sentences learners see on the slide."
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 px-3 py-2.5 focus:outline-none focus:border-indigo-500 resize-y min-h-[7rem]"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Audio narration</span>
                    <textarea
                      value={narrationText}
                      onChange={e => setNarrationText(e.target.value)}
                      disabled={busy}
                      rows={5}
                      placeholder="Spoken script for this slide. Leave blank for a silent slide."
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 px-3 py-2.5 focus:outline-none focus:border-indigo-500 resize-y min-h-[6rem]"
                    />
                  </label>
                </>
              ) : (
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Source content</span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Paste the actual text to teach (from the source document, SME notes, or a slide range) — facts, steps, specs, and terms. Do not write a topic summary here; the app turns this source into eLearning slides.
                </p>
                <textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  disabled={busy}
                  rows={7}
                  placeholder="Paste the source here. Example: copy the procedure, table, or SME paragraphs you want added — not “add a section about X.”"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 px-3 py-2.5 focus:outline-none focus:border-indigo-500 resize-y min-h-[8rem]"
                />
              </label>
              )}

              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {scope === 'module' ? 'Module title (optional)' : 'Slide title (optional)'}
                </span>
                <input
                  value={titleHint}
                  onChange={e => setTitleHint(e.target.value)}
                  disabled={busy}
                  placeholder={scope === 'module' ? 'Short name for the new module' : 'Short name for the new slide'}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </label>

              {scope === 'module' && (
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">New objective (optional)</span>
                  <input
                    value={newObjective}
                    onChange={e => setNewObjective(e.target.value)}
                    disabled={busy}
                    placeholder="The learner will…"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </label>
              )}

              {!specify && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {scope === 'slide' ? 'Interaction type (optional)' : 'Interaction types to choose from (optional)'}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {scope === 'slide'
                      ? 'Leave empty and the app picks. Select one or more to steer this slide.'
                      : 'Leave empty and the app uses Course Settings. Select types it may choose from.'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ADD_CONTENT_TYPE_OPTIONS.map(opt => {
                      const on = preferredTypes.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={busy}
                          onClick={() => toggleType(opt.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            on
                              ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                              : 'border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {scope !== 'slide' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">How many slides</span>
                  <label className="flex items-start gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoSlideCount}
                      disabled={busy}
                      onChange={e => setAutoSlideCount(e.target.checked)}
                      className="mt-0.5 accent-indigo-500"
                    />
                    <span>
                      Let the app decide from the source
                      <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                        Chunk into the number of interactions the content needs (one idea per slide).
                      </span>
                    </span>
                  </label>
                  {!autoSlideCount && (
                    <label className="flex items-center justify-between gap-3 pl-6">
                      <span className="text-[11px] text-slate-500">Exact count</span>
                      <select
                        value={slideCount}
                        onChange={e => setSlideCount(Number(e.target.value))}
                        disabled={busy}
                        className="rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100 px-2 py-1.5"
                      >
                        {(scope === 'module' ? [3, 4, 5, 6, 7, 8] : [2, 3, 4, 5, 6]).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}

              {scope !== 'module' && (
                <fieldset className="space-y-2">
                  <legend className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Insert</legend>
                  {([
                    ['after', afterInsertLabel || (currentIsChrome ? 'Start of this module' : `After “${(currentSlideTitle || 'this slide').slice(0, 42)}”`)],
                    ['end-module', 'End of this module'],
                    ['new-module', 'As a new module'],
                  ] as const).map(([id, label]) => (
                    <label key={id} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name="add-placement"
                        checked={effectivePlacement === id}
                        disabled={busy}
                        onChange={() => setPlacement(id)}
                        className="accent-indigo-500"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-slate-900/80">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => onGenerate({
                  scope,
                  brief: brief.trim(),
                  titleHint: titleHint.trim(),
                  newObjective: newObjective.trim(),
                  placement: effectivePlacement,
                  slideCount,
                  autoSlideCount: scope !== 'slide' && autoSlideCount,
                  authoring: specify ? 'specify' : 'generate',
                  ostText: ostText.trim(),
                  narrationText: narrationText.trim(),
                  preferredTypes,
                })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {busy ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
