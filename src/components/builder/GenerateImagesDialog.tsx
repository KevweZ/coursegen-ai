import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronDown, Image as ImageIcon, Loader2, X } from 'lucide-react';
import {
  MAX_CONTENT_AI_IMAGES,
  contentImageJobKey,
  contentImageJobSlotLabel,
  summarizeImageSelection,
  type ContentImageJobGroup,
  type ContentImageJobStatus,
} from '../../lib/contentImageJobs';

export type GenerateImagesDialogMode = 'pick' | 'stop';

type CoverStatus = ContentImageJobStatus | undefined;

interface Props {
  open: boolean;
  mode: GenerateImagesDialogMode;
  groups: ContentImageJobGroup[];
  selectedSlideIds: string[];
  onToggleSlide: (slideId: string) => void;
  onToggleAll: (on: boolean) => void;
  coverOption?: { selected: boolean; status?: CoverStatus } | null;
  onToggleCover?: () => void;
  jobStatus?: Record<string, ContentImageJobStatus>;
  selectedPictureCount: number;
  onPrimary: () => void;
  onCancel: () => void;
}

function statusIcon(status: ContentImageJobStatus | undefined, picking: boolean) {
  if (picking) return null;
  if (status === 'done') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-label="Ready" />;
  if (status === 'generating') return <Loader2 className="w-3.5 h-3.5 text-violet-400 shrink-0 animate-spin" aria-label="Generating" />;
  if (status === 'skipped') return <span className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" aria-label="Skipped" />;
  return <span className="w-3.5 h-3.5 rounded-full border border-slate-500 shrink-0" aria-label="Waiting" />;
}

function groupStatus(group: ContentImageJobGroup, jobStatus?: Record<string, ContentImageJobStatus>) {
  const statuses = group.jobs.map((j) => jobStatus?.[contentImageJobKey(j)] || 'pending');
  const done = statuses.filter((s) => s === 'done').length;
  const generating = statuses.some((s) => s === 'generating');
  const skipped = statuses.filter((s) => s === 'skipped').length;
  return { done, total: group.jobs.length, generating, skipped };
}

export function GenerateImagesDialog({
  open,
  mode,
  groups,
  selectedSlideIds,
  onToggleSlide,
  onToggleAll,
  coverOption,
  onToggleCover,
  jobStatus,
  selectedPictureCount,
  onPrimary,
  onCancel,
}: Props) {
  const picking = mode === 'pick';
  const selected = new Set(selectedSlideIds);
  const allOn = groups.length > 0 && groups.every((g) => selected.has(g.slideId));
  const empty = groups.length === 0 && !coverOption;
  const selectedSlideCount =
    groups.filter((g) => selected.has(g.slideId)).length
    + (coverOption?.selected ? 1 : 0);
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!open || !el) {
      setCanScrollMore(false);
      return;
    }
    const update = () => {
      setCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [open, groups, coverOption, mode]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-labelledby="generate-images-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-3xl max-h-[min(92dvh,42rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex-1 min-h-0 flex flex-col sm:flex-row sm:items-stretch">
            <div className="sm:w-[17rem] sm:shrink-0 max-sm:max-h-[42%] p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-slate-800 flex flex-col gap-3 min-h-0 overflow-y-auto">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  picking ? 'bg-violet-500/20' : 'bg-amber-500/20'
                }`}>
                  {picking
                    ? <ImageIcon className="w-5 h-5 text-violet-300" />
                    : <AlertCircle className="w-5 h-5 text-amber-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="generate-images-title" className="text-lg font-bold text-white leading-tight">
                    {picking ? 'Generate AI images?' : 'Stop generating images?'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-1 -mr-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {picking
                  ? 'Pictures will be added to the slides on the right, in course order. Uncheck any you want to skip. Content, process steps, tabs, and click-reveal can get pictures. Module titles, overviews, objectives, and quizzes are skipped. Up to 14 pictures per run. Each picture uses 1 AI credit.'
                  : 'Pictures already on slides will stay. No further images will be generated. Green means that picture is already on the slide — Save the draft to keep it.'}
              </p>
              {picking && (
                <p className="text-xs text-slate-500 leading-relaxed">
                  {empty
                    ? 'No empty content pictures to fill. Use Upload Image for a specific slide, or Generate AI image for this slide on a content/tab slide.'
                    : summarizeImageSelection({
                        pictureCount: selectedPictureCount,
                        slideCount: selectedSlideCount,
                        maxPictures: MAX_CONTENT_AI_IMAGES,
                      })}
                </p>
              )}
            </div>

            <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-slate-950/40">
              {picking && groups.length > 0 && (
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Slides</span>
                  <button
                    type="button"
                    onClick={() => onToggleAll(!allOn)}
                    className="text-[11px] font-bold text-violet-300 hover:text-white"
                  >
                    {allOn ? 'Uncheck all' : 'Check all'}
                  </button>
                </div>
              )}
              <div className="relative min-h-0 flex-1">
              <div
                ref={listRef}
                className="h-full overflow-y-scroll overscroll-contain p-3 space-y-1.5"
              >
                {coverOption && (
                  <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                    coverOption.status === 'done'
                      ? 'border-emerald-700/60 bg-emerald-950/30'
                      : coverOption.selected || !picking
                        ? 'border-slate-700 bg-slate-900/80'
                        : 'border-slate-800 bg-slate-900/40 opacity-60'
                  }`}>
                    {picking ? (
                      <input
                        type="checkbox"
                        className="mt-1 accent-violet-500"
                        checked={coverOption.selected}
                        onChange={() => onToggleCover?.()}
                      />
                    ) : (
                      statusIcon(coverOption.status || 'pending', false)
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">Course cover</span>
                      <span className="block text-[11px] text-slate-500">Title slide</span>
                    </span>
                  </div>
                )}
                {groups.map((group) => {
                  const on = selected.has(group.slideId);
                  const st = groupStatus(group, jobStatus);
                  const doneAll = !picking && st.done === st.total && st.total > 0;
                  const rowGreen = doneAll || (!picking && st.done > 0 && !st.generating && st.skipped + st.done === st.total);
                  const RowTag = picking ? 'label' : 'div';
                  return (
                    <RowTag
                      key={group.slideId}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                        rowGreen
                          ? 'border-emerald-700/60 bg-emerald-950/30'
                          : on || !picking
                            ? 'border-slate-700 bg-slate-900/80'
                            : 'border-slate-800 bg-slate-900/40 opacity-60'
                      } ${picking ? 'cursor-pointer' : ''}`}
                    >
                      {picking ? (
                        <input
                          type="checkbox"
                          className="mt-1 accent-violet-500"
                          checked={on}
                          onChange={() => onToggleSlide(group.slideId)}
                        />
                      ) : (
                        statusIcon(
                          doneAll ? 'done' : st.generating ? 'generating' : st.done > 0 ? 'done' : 'pending',
                          false,
                        )
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          {group.tocRef && (
                            <span className="text-[11px] font-bold text-violet-300 shrink-0">{group.tocRef}</span>
                          )}
                          <span className="text-sm font-semibold text-white truncate">{group.slideTitle}</span>
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                          {group.jobs.map((job) => {
                            const key = contentImageJobKey(job);
                            const js = jobStatus?.[key];
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  js === 'done'
                                    ? 'text-emerald-400'
                                    : js === 'generating'
                                      ? 'text-violet-300'
                                      : js === 'skipped'
                                        ? 'text-slate-500 line-through'
                                        : 'text-slate-500'
                                }`}
                              >
                                {statusIcon(js, picking)}
                                {contentImageJobSlotLabel(job)}
                              </span>
                            );
                          })}
                        </span>
                        {!picking && (
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {st.done} of {st.total} picture{st.total === 1 ? '' : 's'} ready
                          </span>
                        )}
                      </span>
                    </RowTag>
                  );
                })}
                {empty && (
                  <p className="text-sm text-slate-500 px-2 py-6 text-center">
                    Nothing to generate on this course yet.
                  </p>
                )}
              </div>
              {canScrollMore && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950 to-transparent flex items-end justify-center pb-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                    <ChevronDown className="w-3.5 h-3.5" />
                    Scroll for more slides
                  </span>
                </div>
              )}
              </div>
            </div>
            </div>
            <div className="generate-images-footer shrink-0 border-t border-slate-800 px-4 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-slate-900">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {picking ? 'Cancel' : 'Keep going'}
              </button>
              <button
                type="button"
                disabled={picking && selectedPictureCount === 0}
                onClick={onPrimary}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40 ${
                  picking
                    ? 'bg-violet-600 hover:bg-violet-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {picking ? 'Generate' : 'Stop'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
