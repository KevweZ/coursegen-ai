/**
 * Per-item on-screen text editors for clickable interactions
 * (timeline, flashcards, carousel, folder, hotspot, quiz options).
 */
import React from 'react';
import { coerceOstText, sanitizeOstText } from '../../lib/formatTabIntroOst';
import { CAROUSEL_CARD_HEX, carouselCardHex } from '../../lib/colorContrast';

interface Props {
  slide: any;
  onPatch: (next: any) => void;
}

function patchData(slide: any, data: Record<string, unknown>, onPatch: (next: any) => void) {
  onPatch({ ...slide, data: { ...(slide.data || {}), ...data } });
}

const fieldClass =
  'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500';
const areaClass =
  'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none';
const labelClass = 'text-[10px] font-extrabold text-slate-500 uppercase tracking-widest';

const QUIZ_TYPES = new Set([
  'quiz',
  'multiple-choice',
  'multiple-answers',
  'multiple-answer',
  'true-false',
]);

export function EditSlideItemFields({ slide, onPatch }: Props) {
  const type = String(slide?.type || '');

  if (type === 'timeline') {
    const events: any[] = slide.data?.events || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Timeline milestones</label>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          These fields are the title and body shown when a learner clicks each node.
        </p>
        {events.length === 0 ? (
          <p className="text-xs text-slate-500">No milestones yet — use Regenerate to rebuild this interaction.</p>
        ) : events.map((ev, i) => (
          <div key={ev.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={ev.year || ''}
                onChange={(e) => {
                  const next = [...events];
                  next[i] = { ...next[i], year: e.target.value };
                  patchData(slide, { events: next }, onPatch);
                }}
                className={fieldClass}
                placeholder="Label (e.g. Week 1–2)"
              />
              <input
                value={ev.title || ''}
                onChange={(e) => {
                  const next = [...events];
                  next[i] = { ...next[i], title: e.target.value };
                  patchData(slide, { events: next }, onPatch);
                }}
                className={fieldClass}
                placeholder="Milestone title"
              />
            </div>
            <textarea
              rows={3}
              value={coerceOstText(ev.content)}
              onChange={(e) => {
                const next = [...events];
                next[i] = { ...next[i], content: e.target.value };
                patchData(slide, { events: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Detail shown when this milestone is opened…"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'flashcards') {
    const cards: any[] = slide.data?.cards || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Flashcards</label>
        {cards.length === 0 ? (
          <p className="text-xs text-slate-500">No cards yet — use Regenerate to rebuild this interaction.</p>
        ) : cards.map((c, i) => (
          <div key={c.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <textarea
              rows={2}
              value={coerceOstText(c.front)}
              onChange={(e) => {
                const next = [...cards];
                next[i] = { ...next[i], front: e.target.value };
                patchData(slide, { cards: next }, onPatch);
              }}
              className={areaClass}
              placeholder={`Card ${i + 1} front`}
            />
            <textarea
              rows={2}
              value={coerceOstText(c.back)}
              onChange={(e) => {
                const next = [...cards];
                next[i] = { ...next[i], back: e.target.value };
                patchData(slide, { cards: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Back (answer)"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'carousel-panel') {
    const listKey = Array.isArray(slide.data?.cards) ? 'cards' : 'items';
    const cards: any[] = slide.data?.[listKey] || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Carousel cards</label>
        {cards.length === 0 ? (
          <p className="text-xs text-slate-500">No cards yet — use Regenerate to rebuild this interaction.</p>
        ) : cards.map((c, i) => (
          <div key={c.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <input
              value={c.label || c.title || ''}
              onChange={(e) => {
                const next = [...cards];
                next[i] = { ...next[i], label: e.target.value, title: e.target.value };
                patchData(slide, { [listKey]: next }, onPatch);
              }}
              className={fieldClass}
              placeholder={`Card ${i + 1} title`}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Card color</span>
              {CAROUSEL_CARD_HEX.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const next = [...cards];
                    next[i] = { ...next[i], color: preset };
                    patchData(slide, { [listKey]: next }, onPatch);
                  }}
                  className={`w-5 h-5 rounded-full border-2 ${carouselCardHex(c, i).toLowerCase() === preset ? 'border-white' : 'border-transparent'}`}
                  style={{ background: preset }}
                />
              ))}
              <input
                type="color"
                value={carouselCardHex(c, i)}
                onChange={(e) => {
                  const next = [...cards];
                  next[i] = { ...next[i], color: e.target.value };
                  patchData(slide, { [listKey]: next }, onPatch);
                }}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                title="Custom color — card text auto-contrasts"
              />
            </div>
            <textarea
              rows={2}
              value={coerceOstText(c.description)}
              onChange={(e) => {
                const next = [...cards];
                next[i] = { ...next[i], description: e.target.value };
                patchData(slide, { [listKey]: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Short preview on the card"
            />
            <textarea
              rows={3}
              value={coerceOstText(c.expandedContent)}
              onChange={(e) => {
                const next = [...cards];
                next[i] = { ...next[i], expandedContent: e.target.value };
                patchData(slide, { [listKey]: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Details shown after MORE…"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'folder-explorer') {
    const items: any[] = slide.data?.items || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Folder documents</label>
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">No documents yet — use Regenerate to rebuild this interaction.</p>
        ) : items.map((it, i) => (
          <div key={it.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <input
              value={it.title || ''}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], title: e.target.value };
                patchData(slide, { items: next }, onPatch);
              }}
              className={fieldClass}
              placeholder={`Document ${i + 1} title`}
            />
            <input
              value={it.previewText || ''}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], previewText: e.target.value };
                patchData(slide, { items: next }, onPatch);
              }}
              className={fieldClass}
              placeholder="One-line teaser"
            />
            <textarea
              rows={4}
              value={coerceOstText(it.content)}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], content: e.target.value };
                patchData(slide, { items: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Full text shown when the folder is opened…"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'hotspot') {
    const listKey = Array.isArray(slide.data?.hotspots) ? 'hotspots' : 'points';
    const points: any[] = slide.data?.[listKey] || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Hotspot pins</label>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Edit pin labels and the panel text. Drag pins on the slide to reposition them.
        </p>
        {points.length === 0 ? (
          <p className="text-xs text-slate-500">No pins yet — use Regenerate to rebuild this interaction.</p>
        ) : points.map((pt, i) => (
          <div key={pt.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <input
              value={pt.label || ''}
              onChange={(e) => {
                const next = [...points];
                next[i] = { ...next[i], label: e.target.value };
                patchData(slide, { [listKey]: next }, onPatch);
              }}
              className={fieldClass}
              placeholder={`Pin ${i + 1} label`}
            />
            <textarea
              rows={3}
              value={coerceOstText(pt.content)}
              onChange={(e) => {
                const next = [...points];
                next[i] = { ...next[i], content: e.target.value };
                patchData(slide, { [listKey]: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Text shown when this pin is opened…"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'matching') {
    const items: any[] = slide.data?.items || [];
    const targets: any[] = slide.data?.targets || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Matching pairs</label>
        <p className="text-[11px] text-slate-500">Left terms and right definitions. Use Edit via AI to add or remove pairs.</p>
        {items.map((it, i) => (
          <div key={it.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <input
              value={coerceOstText(it.content)}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], content: e.target.value };
                patchData(slide, { items: next }, onPatch);
              }}
              className={fieldClass}
              placeholder={`Term ${i + 1}`}
            />
            <textarea
              rows={2}
              value={coerceOstText(targets[i]?.content)}
              onChange={(e) => {
                const next = [...targets];
                if (!next[i]) next[i] = { id: `t${i + 1}`, content: e.target.value };
                else next[i] = { ...next[i], content: e.target.value };
                patchData(slide, { targets: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Matching definition"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'sorting') {
    const items: any[] = slide.data?.items || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Sorting items</label>
        <p className="text-[11px] text-slate-500">Edit the labels. Use Edit via AI or Regenerate to add, remove, or reorder the correct sequence.</p>
        {items.map((it, i) => (
          <input
            key={it.id || i}
            value={coerceOstText(it.content)}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], content: e.target.value };
              patchData(slide, { items: next }, onPatch);
            }}
            className={fieldClass}
            placeholder={`Item ${i + 1}`}
          />
        ))}
      </div>
    );
  }

  if (type === 'drop-targets') {
    const items: any[] = slide.data?.items || [];
    return (
      <div className="space-y-3">
        <label className={labelClass}>Drag items</label>
        <p className="text-[11px] text-slate-500">
          Edit labels here. Adding or removing drop targets is easiest with Edit via AI (“remove the third item”) or Regenerate.
        </p>
        {items.map((it, i) => (
          <div key={it.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <textarea
              rows={2}
              value={coerceOstText(it.content)}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], content: e.target.value };
                patchData(slide, { items: next }, onPatch);
              }}
              className={areaClass}
              placeholder={`Item ${i + 1}`}
            />
            <input
              value={it.category || ''}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], category: e.target.value };
                patchData(slide, { items: next }, onPatch);
              }}
              className={fieldClass}
              placeholder="Correct drop category"
            />
          </div>
        ))}
      </div>
    );
  }

  if (QUIZ_TYPES.has(type)) {
    const d = slide.data || {};
    const options: any[] = Array.isArray(d.options) ? d.options : [];
    const question = d.questionText || d.prompt || d.question || '';
    const isTf = type === 'true-false';
    const multi = type === 'multiple-answers' || type === 'multiple-answer';
    return (
      <div className="space-y-3">
        <label className={labelClass}>Question &amp; answers</label>
        <textarea
          rows={2}
          value={question}
          onChange={(e) => patchData(slide, { questionText: e.target.value }, onPatch)}
          className={areaClass}
          placeholder="Question text"
        />
        {options.map((opt, i) => {
          const correct = !!(opt.isCorrect || opt.correct);
          return (
            <div key={opt.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name="quiz-correct"
                  checked={correct}
                  onChange={() => {
                    const next = options.map((o, j) => {
                      if (multi) return j === i ? { ...o, isCorrect: !correct, correct: !correct } : o;
                      return { ...o, isCorrect: j === i, correct: j === i };
                    });
                    patchData(slide, { options: next }, onPatch);
                  }}
                  className="w-4 h-4 accent-emerald-500"
                  title={multi ? 'Mark as a correct answer' : 'Mark as the correct answer'}
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {correct ? 'Correct' : 'Choice'}
                </span>
                {!isTf && options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => patchData(slide, { options: options.filter((_, j) => j !== i) }, onPatch)}
                    className="ml-auto text-[10px] font-bold text-rose-400 hover:text-rose-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={coerceOstText(opt.text)}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = { ...next[i], text: e.target.value };
                  patchData(slide, { options: next }, onPatch);
                }}
                className={areaClass}
                placeholder={`Answer ${i + 1}`}
                disabled={isTf}
              />
            </div>
          );
        })}
        {!isTf && options.length < 6 && (
          <button
            type="button"
            onClick={() => {
              const id = String.fromCharCode(97 + options.length);
              patchData(slide, {
                options: [...options, { id, text: '', isCorrect: false }],
              }, onPatch);
            }}
            className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200"
          >
            + Add answer choice
          </button>
        )}
        {d.feedback != null && (
          <textarea
            rows={2}
            value={coerceOstText(d.feedback)}
            onChange={(e) => patchData(slide, { feedback: e.target.value }, onPatch)}
            className={areaClass}
            placeholder="Feedback after submit (optional)"
          />
        )}
      </div>
    );
  }

  return null;
}

export function sanitizeInteractionOstOnSave(slide: any): any {
  const s = { ...slide, data: { ...(slide.data || {}) } };
  const d = s.data;
  const clean = (v: unknown) => (v == null ? v : sanitizeOstText(v));
  if (Array.isArray(d.tabs)) {
    d.tabs = d.tabs.map((t: any) => ({
      ...t,
      content: clean(t.content),
      expandedContent: t.expandedContent != null ? clean(t.expandedContent) : t.expandedContent,
    }));
  }
  if (Array.isArray(d.items)) {
    d.items = d.items.map((it: any) => ({
      ...it,
      content: it.content != null ? clean(it.content) : it.content,
      definition: it.definition != null ? clean(it.definition) : it.definition,
      previewText: it.previewText != null ? clean(it.previewText) : it.previewText,
    }));
  }
  if (Array.isArray(d.events)) {
    d.events = d.events.map((ev: any) => ({ ...ev, content: clean(ev.content) }));
  }
  if (Array.isArray(d.cards)) {
    d.cards = d.cards.map((c: any) => ({
      ...c,
      front: c.front != null ? clean(c.front) : c.front,
      back: c.back != null ? clean(c.back) : c.back,
      description: c.description != null ? clean(c.description) : c.description,
      expandedContent: c.expandedContent != null ? clean(c.expandedContent) : c.expandedContent,
    }));
  }
  if (Array.isArray(d.hotspots)) {
    d.hotspots = d.hotspots.map((p: any) => ({ ...p, content: clean(p.content) }));
  }
  if (Array.isArray(d.points)) {
    d.points = d.points.map((p: any) => ({ ...p, content: clean(p.content) }));
  }
  if (Array.isArray(d.options)) {
    d.options = d.options.map((o: any) => ({ ...o, text: o.text != null ? clean(o.text) : o.text }));
  }
  return s;
}
