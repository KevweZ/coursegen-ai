/**
 * Per-item on-screen text editors for clickable interactions
 * (timeline, flashcards, carousel, folder, hotspot, quiz options).
 */
import React from 'react';
import { coerceOstText, sanitizeOstText } from '../../lib/formatTabIntroOst';
import { CAROUSEL_CARD_HEX, carouselCardHex } from '../../lib/colorContrast';
import {
  applyKnowledgeCheckEdits,
  knowledgeCheckEditQuestions,
  setKnowledgeCheckCorrect,
} from '../../lib/knowledgeCheckOst';
import {
  applyKeyTakeawayEdits,
  keyTakeawayEditItems,
  MAX_KEY_TAKEAWAYS,
  MIN_KEY_TAKEAWAYS,
} from '../../lib/keyTakeawayOst';
import { inferChoiceCardsMode } from '../interactions/ChoiceCardsInteraction';

interface Props {
  slide: any;
  onPatch: (next: any) => void;
  getSlide?: () => any;
}

function patchData(slide: any, data: Record<string, unknown>, onPatch: (next: any) => void, getSlide?: () => any) {
  const base = getSlide?.() ?? slide;
  onPatch({ ...base, data: { ...(base.data || {}), ...data } });
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

export function EditSlideItemFields({ slide, onPatch, getSlide }: Props) {
  const type = String(slide?.type || '');
  const live = () => getSlide?.() ?? slide;

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
                  patchData(live(), { events: next }, onPatch);
                }}
                className={fieldClass}
                placeholder="Label (e.g. Week 1–2)"
              />
              <input
                value={ev.title || ''}
                onChange={(e) => {
                  const next = [...events];
                  next[i] = { ...next[i], title: e.target.value };
                  patchData(live(), { events: next }, onPatch);
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
                patchData(live(), { events: next }, onPatch);
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
                patchData(live(), { cards: next }, onPatch);
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
                patchData(live(), { cards: next }, onPatch);
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
                patchData(live(), { [listKey]: next }, onPatch);
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
                    patchData(live(), { [listKey]: next }, onPatch);
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
                  patchData(live(), { [listKey]: next }, onPatch);
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
                patchData(live(), { [listKey]: next }, onPatch);
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
                patchData(live(), { [listKey]: next }, onPatch);
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
                patchData(live(), { items: next }, onPatch);
              }}
              className={fieldClass}
              placeholder={`Document ${i + 1} title`}
            />
            <input
              value={it.previewText || ''}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], previewText: e.target.value };
                patchData(live(), { items: next }, onPatch);
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
                patchData(live(), { items: next }, onPatch);
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
                patchData(live(), { [listKey]: next }, onPatch);
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
                patchData(live(), { [listKey]: next }, onPatch);
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
                patchData(live(), { items: next }, onPatch);
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
                patchData(live(), { targets: next }, onPatch);
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
              patchData(live(), { items: next }, onPatch);
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
                patchData(live(), { items: next }, onPatch);
              }}
              className={areaClass}
              placeholder={`Item ${i + 1}`}
            />
            <input
              value={it.category || ''}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], category: e.target.value };
                patchData(live(), { items: next }, onPatch);
              }}
              className={fieldClass}
              placeholder="Correct drop category"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'key-takeaways') {
    const current = live();
    const items = keyTakeawayEditItems(current);
    const commit = (nextItems: typeof items) => {
      onPatch(applyKeyTakeawayEdits(live(), nextItems));
    };
    return (
      <div className="space-y-3">
        <label className={labelClass}>Key takeaways</label>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          These numbered cards are what learners see on the Module Summary. The layout stays numbered — edit the statements below.
        </p>
        {items.map((item, i) => (
          <div key={item.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300">
                {i + 1}
              </span>
              {items.length > MIN_KEY_TAKEAWAYS && (
                <button
                  type="button"
                  onClick={() => commit(items.filter((_, j) => j !== i))}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={item.text}
              onChange={(e) => {
                const next = items.map((row, idx) =>
                  idx === i ? { ...row, text: e.target.value } : row
                );
                commit(next);
              }}
              className={areaClass}
              placeholder={`Takeaway ${i + 1}`}
            />
          </div>
        ))}
        {items.length < MAX_KEY_TAKEAWAYS ? (
          <button
            type="button"
            onClick={() => commit([...items, { id: String(Date.now()), text: '' }])}
            className="w-full rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/10 px-3 py-2.5 text-[12px] font-bold text-indigo-200 hover:bg-indigo-500/20"
          >
            + Add takeaway
          </button>
        ) : (
          <p className="text-[11px] text-slate-500">Maximum {MAX_KEY_TAKEAWAYS} takeaways on this slide.</p>
        )}
      </div>
    );
  }

  if (QUIZ_TYPES.has(type) || type === 'knowledge-check') {
    const current = live();
    const questions = knowledgeCheckEditQuestions(current);
    const isTf = type === 'true-false';
    const multi = type === 'multiple-answers' || type === 'multiple-answer';
    const commit = (nextQuestions: typeof questions, extra?: { scenarioText?: string; feedback?: string }) => {
      onPatch(applyKnowledgeCheckEdits(live(), nextQuestions, extra));
    };
    const scenario = String(questions[0]?.scenarioText || '');
    const feedback = String(questions[0]?.feedback || '');
    return (
      <div className="space-y-3">
        <label className={labelClass}>Question &amp; answers</label>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          These are the stem and choices on the slide. Mark the correct answer
          {multi ? 's (this is a select-all question)' : ''} — no need to regenerate.
        </p>
        {questions.map((q, qi) => (
          <div key={qi} className="space-y-2">
            {questions.length > 1 && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Question {qi + 1} of {questions.length}
              </p>
            )}
            <textarea
              rows={3}
              value={q.questionText || ''}
              onChange={(e) => {
                const next = questions.map((item, idx) =>
                  idx === qi ? { ...item, questionText: e.target.value } : item
                );
                commit(next);
              }}
              className={areaClass}
              placeholder="Question text"
            />
            {(q.options || []).map((opt, i) => {
              const correct = !!(opt.isCorrect || opt.correct);
              return (
                <div key={opt.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={`quiz-correct-${qi}`}
                      checked={correct}
                      onChange={() => commit(setKnowledgeCheckCorrect(questions, qi, i, multi))}
                      className="w-4 h-4 accent-emerald-500"
                      title={multi ? 'Mark as a correct answer' : 'Mark as the correct answer'}
                    />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {correct ? 'Correct' : 'Choice'}
                    </span>
                    {!isTf && (q.options || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = questions.map((item, idx) =>
                            idx === qi
                              ? { ...item, options: (item.options || []).filter((_, j) => j !== i) }
                              : item
                          );
                          commit(next);
                        }}
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
                      const next = questions.map((item, idx) => {
                        if (idx !== qi) return item;
                        const options = [...(item.options || [])];
                        options[i] = { ...options[i], text: e.target.value };
                        return { ...item, options };
                      });
                      commit(next);
                    }}
                    className={areaClass}
                    placeholder={`Answer ${i + 1}`}
                    disabled={isTf}
                  />
                </div>
              );
            })}
            {!isTf && (q.options || []).length < 6 && (
              <button
                type="button"
                onClick={() => {
                  const opts = q.options || [];
                  const id = String.fromCharCode(97 + opts.length);
                  const next = questions.map((item, idx) =>
                    idx === qi
                      ? { ...item, options: [...opts, { id, text: '', isCorrect: false }] }
                      : item
                  );
                  commit(next);
                }}
                className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200"
              >
                + Add answer choice
              </button>
            )}
          </div>
        ))}
        <textarea
          rows={2}
          value={scenario}
          onChange={(e) => commit(questions, { scenarioText: e.target.value, feedback })}
          className={areaClass}
          placeholder="Optional situation the learner reads before the question"
        />
        <textarea
          rows={2}
          value={feedback}
          onChange={(e) => commit(questions, { scenarioText: scenario, feedback: e.target.value })}
          className={areaClass}
          placeholder="Feedback after submit (optional)"
        />
      </div>
    );
  }

  if (type === 'choice-cards') {
    const d = slide.data || {};
    const cards: any[] = Array.isArray(d.cards) ? d.cards : [];
    const mode = inferChoiceCardsMode({ ...d, cards });
    return (
      <div className="space-y-3">
        <label className={labelClass}>Choice cards</label>
        <select
          value={mode}
          onChange={(e) => patchData(live(), { mode: e.target.value }, onPatch)}
          className={fieldClass}
        >
          <option value="explore">Click to reveal (visit each card)</option>
          <option value="select">Select then Check</option>
        </select>
        <textarea
          rows={2}
          value={d.prompt || ''}
          onChange={(e) => patchData(live(), { prompt: e.target.value }, onPatch)}
          className={areaClass}
          placeholder="Prompt above the cards"
        />
        {cards.map((card, i) => (
          <div key={card.id || i} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <input
              value={card.label || ''}
              onChange={(e) => {
                const next = cards.map((c, j) => j === i ? { ...c, label: e.target.value } : c);
                patchData(live(), { cards: next }, onPatch);
              }}
              className={fieldClass}
              placeholder="Card label"
            />
            <textarea
              rows={2}
              value={card.body || card.description || ''}
              onChange={(e) => {
                const next = cards.map((c, j) => j === i ? { ...c, body: e.target.value } : c);
                patchData(live(), { cards: next }, onPatch);
              }}
              className={areaClass}
              placeholder="Short teaser on the card (one line). Put Reaction conditions / Key product in the reveal."
            />
            {mode === 'explore' && (
              <textarea
                rows={2}
                value={card.reveal || ''}
                onChange={(e) => {
                  const next = cards.map((c, j) => j === i ? { ...c, reveal: e.target.value } : c);
                  patchData(live(), { cards: next }, onPatch);
                }}
                className={areaClass}
                placeholder="Unique callout shown after this card is clicked"
              />
            )}
            {mode === 'select' && (
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={!!(card.isCorrect || card.accepted)}
                  onChange={(e) => {
                    const next = cards.map((c, j) => j === i ? { ...c, isCorrect: e.target.checked } : c);
                    patchData(live(), { cards: next }, onPatch);
                  }}
                />
                Highlight as a correct choice after Check
              </label>
            )}
          </div>
        ))}
        <textarea
          rows={3}
          value={d.feedback || ''}
          onChange={(e) => patchData(live(), { feedback: e.target.value }, onPatch)}
          className={areaClass}
          placeholder={mode === 'explore' ? 'Optional wrap-up after all cards are visited' : 'Explanatory feedback after Check'}
        />
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
      label: c.label != null ? clean(c.label) : c.label,
      body: c.body != null ? clean(c.body) : c.body,
      description: c.description != null ? clean(c.description) : c.description,
      expandedContent: c.expandedContent != null ? clean(c.expandedContent) : c.expandedContent,
      reveal: c.reveal != null ? clean(c.reveal) : c.reveal,
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
  if (d.questionText != null) d.questionText = clean(d.questionText);
  if (Array.isArray(d.objectives)) {
    d.objectives = d.objectives.map((o: any) => ({
      ...o,
      label: o.label != null ? clean(o.label) : o.label,
      content: o.content != null ? clean(o.content) : o.content,
    }));
  }
  if (Array.isArray(s.interactions) && s.interactions[0] && typeof s.interactions[0] === 'object') {
    const ix = { ...s.interactions[0] };
    if (ix.questionText != null) ix.questionText = clean(ix.questionText);
    if (Array.isArray(ix.options)) {
      ix.options = ix.options.map((o: any) => ({ ...o, text: o.text != null ? clean(o.text) : o.text }));
    }
    s.interactions = [ix, ...s.interactions.slice(1)];
  }
  return s;
}
