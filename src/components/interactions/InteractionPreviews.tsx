import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contrastTextOn, CAROUSEL_CARD_HEX } from '../../lib/colorContrast';

// ─────────────────────────────────────────────
// TABBED HORIZONTAL — interactive preview
// FIX: removed AnimatePresence mode="wait" (caused modal freeze on close)
//      replaced layoutId with simple CSS transition
// ─────────────────────────────────────────────
const H_TABS = [
  { id: 'h1', label: 'Topic 1', color: '#6366f1', content: 'Overview of the first topic. This content updates when you click a tab at the bottom.' },
  { id: 'h2', label: 'Topic 2', color: '#ec4899', content: 'Overview of the second topic. Each tab reveals its own dedicated content in this panel.' },
  { id: 'h3', label: 'Topic 3', color: '#f59e0b', content: 'Overview of the third topic. Click the tabs below to switch between sections.' },
];

export function TabbedHorizontalPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tab = H_TABS[activeIndex];

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-0 select-none">
      {/* Content panel — plain div, no AnimatePresence to avoid freeze */}
      <div
        className="relative overflow-hidden rounded-t-2xl bg-slate-800/60 border border-b-0 border-slate-700"
        style={{ minHeight: 190 }}
      >
        {H_TABS.map((t, i) => (
          <div
            key={t.id}
            className="absolute inset-0 p-5 transition-all duration-250"
            style={{
              opacity: i === activeIndex ? 1 : 0,
              transform: i === activeIndex ? 'translateY(0)' : 'translateY(12px)',
              pointerEvents: i === activeIndex ? 'auto' : 'none',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-7 rounded-full shrink-0 transition-colors duration-200" style={{ background: t.color }} />
              <h3 className="font-extrabold text-base transition-colors duration-200" style={{ color: t.color }}>{t.label}</h3>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{t.content}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex border border-t-0 border-slate-700 rounded-b-2xl overflow-hidden bg-slate-900/80">
        {H_TABS.map((t, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={t.id}
              onClick={() => setActiveIndex(i)}
              className={`flex-1 relative px-3 py-3 text-xs font-bold transition-all text-center border-r border-slate-700/60 last:border-r-0 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              style={isActive ? { background: `${t.color}22` } : {}}
            >
              {/* Indicator: simple CSS transition, no layoutId */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-200"
                style={{ background: t.color, opacity: isActive ? 1 : 0 }}
              />
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TABBED VERTICAL — interactive preview
// ─────────────────────────────────────────────
const V_TABS = [
  { id: 'v1', label: 'Module A', color: '#6366f1', content: 'Module A provides foundational knowledge. Click any tab on the left to see its content appear here with a smooth transition.' },
  { id: 'v2', label: 'Module B', color: '#ec4899', content: 'Module B covers intermediate concepts. The vertical layout works great for structured comparisons and longer topic labels.' },
  { id: 'v3', label: 'Module C', color: '#10b981', content: 'Module C dives into advanced application. Each tab holds rich content — text, bullets, or embedded media.' },
];

export function TabbedVerticalPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tab = V_TABS[activeIndex];

  return (
    <div className="w-full max-w-lg mx-auto flex gap-3 select-none" style={{ minHeight: 210 }}>
      <div className="flex flex-col gap-2 w-36">
        {V_TABS.map((t, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={t.id}
              onClick={() => setActiveIndex(i)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                isActive ? 'text-white border-transparent shadow-lg' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
              style={isActive ? { background: t.color, boxShadow: `0 0 0 2px ${t.color}55` } : {}}
            >
              <span className="flex-1 leading-snug">{t.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="flex-1 relative overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-700">
        {V_TABS.map((t, i) => (
          <div
            key={t.id}
            className="absolute inset-0 p-5 transition-all duration-250"
            style={{
              opacity: i === activeIndex ? 1 : 0,
              transform: i === activeIndex ? 'translateX(0)' : 'translateX(16px)',
              pointerEvents: i === activeIndex ? 'auto' : 'none',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 rounded-full" style={{ background: t.color }} />
              <h3 className="font-extrabold text-sm" style={{ color: t.color }}>{t.label}</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{t.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FOLDER EXPLORER — interactive preview
// Hover: paper peeks up. Click: paper flies out → content appears.
// Switching folders is instant (no janky exit animation).
// ─────────────────────────────────────────────
const FOLDER_COLORS = [
  { front: '#f59e0b', back: '#d97706', tab: '#b45309', paper: '#fffbf0', paperLine: '#e5dfc8' },
  { front: '#fb923c', back: '#ea580c', tab: '#c2410c', paper: '#fff8f3', paperLine: '#f0ddd0' },
  { front: '#facc15', back: '#ca8a04', tab: '#a16207', paper: '#fefce8', paperLine: '#e9e2c0' },
];

const FOLDER_ITEMS = [
  { id: 'f1', title: 'Chapter 1 — Introduction', previewText: 'Foundational overview', content: 'This document covers foundational principles including definitions, background context, and why this topic matters in practice. Open each folder to explore the full content within.' },
  { id: 'f2', title: 'Chapter 2 — Core Concepts', previewText: 'Key ideas & frameworks', content: 'This document dives into the core concepts with detailed explanations, diagrams, and examples drawn from real-world scenarios and industry case studies.' },
  { id: 'f3', title: 'Chapter 3 — Application', previewText: 'Practical exercises', content: 'This document walks through practical application — step-by-step guidance on how to apply knowledge from the previous chapters in professional environments.' },
];

export function FolderExplorerPreview() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [flyingId,  setFlyingId]  = useState<string | null>(null);
  const [openId,    setOpenId]    = useState<string | null>(null);

  const openIdx    = FOLDER_ITEMS.findIndex(f => f.id === openId);
  const openItem   = openIdx >= 0 ? FOLDER_ITEMS[openIdx] : null;
  const openColors = openItem ? FOLDER_COLORS[openIdx % FOLDER_COLORS.length] : null;

  const handleClick = (item: typeof FOLDER_ITEMS[0]) => {
    if (openId === item.id) {
      // Close same folder
      setOpenId(null);
      return;
    }
    // Close any open folder instantly, start fly on new one
    setOpenId(null);
    setFlyingId(item.id);
  };

  const handleFlyComplete = (id: string) => {
    if (flyingId === id) {
      setFlyingId(null);
      setOpenId(id);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto select-none">
      {/* Folder row */}
      <div className="relative flex items-end justify-center gap-3 px-4" style={{ minHeight: 200 }}>
        {FOLDER_ITEMS.map((item, i) => {
          const colors = FOLDER_COLORS[i % FOLDER_COLORS.length];
          const isHovered = hoveredId === item.id;
          const isFlying  = flyingId  === item.id;
          const isOpen    = openId    === item.id;
          const depth = FOLDER_ITEMS.length - 1 - i;
          const baseY = depth * 10;

          // Paper starts INSIDE the folder body (top:32) and rises UP on hover.
          // zIndex is set so it stays BEHIND tab notch (z=6) and folder body (z=10).
          const paperY = isFlying ? -200 : isHovered ? -50 : 0;
          const paperOpacity = isFlying ? 0 : 1;

          return (
            <div
              key={item.id}
              className="relative flex flex-col cursor-pointer"
              style={{ width: '30%', zIndex: i + 1 }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleClick(item)}
            >
              {/* The whole folder translates on hover/open */}
              <motion.div
                animate={{ y: isOpen ? -14 : baseY, scale: isOpen ? 1.04 : 1 - depth * 0.02 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="relative flex flex-col"
              >
                {/* Folder tab notch — z=6, sits IN FRONT of the rising paper */}
                <div
                  className="self-start ml-2 px-2 py-[3px] rounded-t-md text-white/90 font-extrabold text-[9px] leading-snug truncate"
                  style={{ background: colors.tab, maxWidth: '70%', position: 'relative', zIndex: 6 }}
                >
                  {item.title.split(' ').slice(0, 2).join(' ')}
                </div>

                {/* ── Animated Paper ──
                     Starts INSIDE folder body (top:32), zIndex:5 so it is
                     BEHIND tab (z=6) and BEHIND folder body (z=10).
                     Rises upward on hover/click — visible only through the
                     opening between tab and folder body top edge. */}
                <motion.div
                  animate={{ y: paperY, opacity: paperOpacity, scale: isFlying ? 1.05 : 1 }}
                  transition={
                    isFlying
                      ? { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }
                      : { type: 'spring', stiffness: 300, damping: 26 }
                  }
                  onAnimationComplete={() => isFlying && handleFlyComplete(item.id)}
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: 32,          // starts buried inside the folder body
                    zIndex: 5,        // behind tab (6) and folder body (10)
                    width: '80%',
                    height: 60,
                    background: colors.paper,
                    borderRadius: '6px 6px 4px 4px',
                    boxShadow: '0 -3px 10px rgba(0,0,0,0.14)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 8,
                    gap: 5,
                  }}
                >
                  <div style={{ width: '70%', height: 1, background: colors.paperLine }} />
                  <div style={{ width: '55%', height: 1, background: colors.paperLine, opacity: 0.6 }} />
                  <div style={{ width: '65%', height: 1, background: colors.paperLine, opacity: 0.4 }} />
                </motion.div>

                {/* Static paper edges — sit in the gap between tab notch and folder body;
                     top:7/10 positions them just above the folder body top edge,
                     z=1,2 keeps them behind the tab notch (z=6) */}
                {[1, 2].map(pi => (
                  <div
                    key={pi}
                    className="absolute left-1/2 -translate-x-1/2 rounded-t-sm"
                    style={{
                      width: `${78 - pi * 6}%`,
                      height: 8,
                      background: colors.paperLine,
                      top: 7 + (pi - 1) * 3,
                      zIndex: 3 - pi,
                    }}
                  />
                ))}

                {/* Folder body */}
                <div
                  className="relative z-10 rounded-b-xl rounded-tr-xl shadow-2xl flex flex-col items-center justify-end pt-6 pb-3"
                  style={{
                    background: `linear-gradient(155deg, ${colors.front} 10%, ${colors.back} 100%)`,
                    minHeight: 120,
                    boxShadow: `0 8px 24px -6px ${colors.back}99`,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-7 rounded-t-xl opacity-20 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.7),transparent)' }}
                  />
                  <FileText className="w-4 h-4 text-white/40 mb-1" />
                  <span className="text-white/75 text-[8px] font-bold text-center px-2 leading-snug line-clamp-2">{item.title}</span>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* ── Expanded content panel (no exit animation = no jank) ── */}
      {openItem && openColors && (
        <motion.div
          key={openItem.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="w-full mt-3 rounded-2xl overflow-hidden shadow-2xl border"
          style={{ background: openColors.paper, borderColor: openColors.paperLine }}
        >
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: openColors.tab }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/90" />
              <h3 className="text-white font-extrabold text-sm">{openItem.title}</h3>
            </div>
            <button
              onClick={() => setOpenId(null)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/35 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors"
            >
              <CornerDownLeft className="w-3.5 h-3.5" /> Return
            </button>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: openColors.tab }}>{openItem.previewText}</p>
            <p className="text-slate-800 text-sm leading-relaxed">{openItem.content}</p>
          </div>
        </motion.div>
      )}

      {!openItem && !flyingId && (
        <p className="text-slate-500 text-xs text-center mt-3 font-bold">
          Hover to peek · Click to open
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAROUSEL PANEL — interactive preview
// ─────────────────────────────────────────────
const C_CARDS = [
  { id: 'c1', label: 'Card A', color: CAROUSEL_CARD_HEX[0], description: 'First card — introductory overview.', expandedContent: 'Expanded detail for Card A — additional context, real-world examples, and step-by-step guidance appear here after clicking MORE.' },
  { id: 'c2', label: 'Card B', color: CAROUSEL_CARD_HEX[1], description: 'Second card — core concepts.', expandedContent: 'Expanded detail for Card B — deeper exploration with supporting analysis and practical takeaways.' },
  { id: 'c3', label: 'Card C', color: CAROUSEL_CARD_HEX[2], description: 'Third card — application exercises.', expandedContent: 'Expanded detail for Card C — practical exercises, case studies, and application guidance to reinforce learning.' },
];

export function CarouselPanelPreview() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const total = C_CARDS.length;

  const prev = () => { setActiveIndex(i => (i - 1 + total) % total); setExpanded(false); };
  const next = () => { setActiveIndex(i => (i + 1) % total); setExpanded(false); };
  const activeCard = C_CARDS[activeIndex];

  const getStyle = (i: number) => {
    let d = i - activeIndex;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    if (Math.abs(d) > 1) return null;
    return { tx: `calc(-50% + ${d * 68}%)`, scale: d === 0 ? 1 : 0.8, opacity: d === 0 ? 1 : 0.5, z: d === 0 ? 20 : 10, center: d === 0 };
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-3 select-none">
      <div className="relative h-44 overflow-hidden">
        {C_CARDS.map((card, i) => {
          const s = getStyle(i);
          if (!s) return null;
          return (
            <motion.div
              key={card.id}
              className="absolute top-0 left-1/2 rounded-2xl p-4 border border-white/10 shadow-2xl cursor-pointer"
              style={{ width: '58%', height: '100%', background: card.color, zIndex: s.z }}
              animate={{ x: s.tx, scale: s.scale, opacity: s.opacity }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={!s.center ? () => { setActiveIndex(i); setExpanded(false); } : undefined}
            >
              <div className="border rounded-xl px-3 py-1 mb-2 inline-block" style={{ borderColor: `${contrastTextOn(card.color)}55` }}>
                <h3 className="font-extrabold text-sm" style={{ color: contrastTextOn(card.color) }}>{card.label}</h3>
              </div>
              <p className="text-xs line-clamp-2 mb-2" style={{ color: contrastTextOn(card.color), opacity: 0.9 }}>{card.description}</p>
              {s.center && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/20 hover:bg-white/35 border border-white/40 text-white font-bold text-xs px-4 py-1 rounded-lg transition-all"
                >
                  {expanded ? 'CLOSE' : 'MORE...'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4">
        <button onClick={prev} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {C_CARDS.map((_, i) => (
          <button key={i} onClick={() => { setActiveIndex(i); setExpanded(false); }} className="rounded-full transition-all" style={{ width: i === activeIndex ? 24 : 8, height: 8, background: i === activeIndex ? activeCard.color : '#475569' }} />
        ))}
        <button onClick={next} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0.85, originY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.22 }}
          className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: activeCard.color }}
        >
          <div className="px-5 py-4">
            <div className="border rounded-xl px-3 py-1 mb-3 inline-block" style={{ borderColor: `${contrastTextOn(activeCard.color)}55` }}>
              <h3 className="font-extrabold text-sm" style={{ color: contrastTextOn(activeCard.color) }}>{activeCard.label}</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: contrastTextOn(activeCard.color), opacity: 0.92 }}>{activeCard.expandedContent}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
