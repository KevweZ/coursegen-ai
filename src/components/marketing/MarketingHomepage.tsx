import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Zap, ArrowRight, Sparkles, Brain, Gamepad2, Mic,
  FileOutput, GraduationCap, Building2, CheckCircle2,
  ChevronRight, ChevronLeft, ChevronDown, Shield, Layers, BarChart3, BookOpen,
  Award, X, Menu, Volume2, Play, Pause,
  Globe, Target, Eye, EyeOff, Move, Crop, Image,
  AlertCircle, Lock, MessageSquare, Send, Loader2, Mail
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
  onMethodology?: () => void;
}

// ── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const step = target / 60;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, color, delay }: {
  icon: React.ElementType; title: string; description: string; color: string; delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="group relative p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-300 overflow-hidden cursor-default">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${color} rounded-2xl`} />
      <div className="relative z-10">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${color} border border-white/10`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-white text-base mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors">{description}</p>
      </div>
    </motion.div>
  );
}

// ── Showcase Card ─────────────────────────────────────────────────────────────
function ShowcaseCard({ label, icon: Icon, preview, accent, wide }: {
  label: string; icon: React.ElementType; preview: React.ReactNode; accent: string; wide?: boolean;
}) {
  return (
    <div className={`shrink-0 ${wide ? 'w-[28rem]' : 'w-80'} rounded-2xl border ${accent} bg-slate-900/80 overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${accent} flex items-center gap-2 bg-slate-800/40`}>
        <Icon className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-bold text-slate-300">{label}</span>
      </div>
      <div className="p-4">{preview}</div>
    </div>
  );
}

// ── Animated Accordion Preview ────────────────────────────────────────────────
function AccordionPreview() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOpen(o => !o), 3000);
    return () => clearInterval(id);
  }, []);
  const items = [
    { title: 'What is Active Listening?', body: 'Active listening is the practice of fully concentrating on what is being said, understanding the message, and responding thoughtfully rather than passively hearing.' },
    { title: 'Barriers in Remote Teams', body: '' },
    { title: 'Practical Techniques', body: '' },
    { title: 'Common Mistakes', body: '' },
  ];
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className={`px-3 py-2 rounded-lg text-xs border flex items-center justify-between cursor-pointer transition-all duration-300 ${
            i === 0
              ? open ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200' : 'border-slate-700 text-slate-400'
              : 'border-slate-700 text-slate-500'
          }`}>
            {item.title}
            <ChevronRight className={`w-3 h-3 shrink-0 transition-transform duration-300 ${
              i === 0 ? (open ? 'rotate-90 text-indigo-400' : 'text-slate-500') : 'text-slate-600'
            }`} />
          </div>
          {i === 0 && (
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="accordion-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-3 py-2.5 text-[10px] leading-relaxed text-slate-300 bg-slate-800/40 border border-t-0 border-indigo-500/30 rounded-b-lg">
                    {item.body}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Animated Flashcard Preview ────────────────────────────────────────────────
function FlashcardPreview() {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setFlipped(f => !f), 3200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative" style={{ perspective: '600px', minHeight: '120px' }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '120px' }}
      >
        {/* Front */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-xl p-4 border border-purple-500/20 flex flex-col items-center justify-center gap-2" style={{ backfaceVisibility: 'hidden' }}>
          <div className="text-xs text-purple-400 font-bold uppercase tracking-widest">Term</div>
          <div className="font-bold text-white text-sm text-center">Bloom's Taxonomy</div>
          <div className="text-[10px] text-slate-400 border-t border-slate-700 pt-2 mt-1 w-full text-center">Tap to reveal definition →</div>
        </div>
        {/* Back */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 rounded-xl p-4 border border-indigo-500/30 flex flex-col items-center justify-center gap-2" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Definition</div>
          <div className="text-[10px] text-slate-200 text-center leading-relaxed">A hierarchical model classifying learning objectives into six levels — from <span className="text-indigo-300 font-bold">Remember</span> to <span className="text-cyan-300 font-bold">Create</span>.</div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Animated Jeopardy Preview ────────────────────────────────────────────────
// Phase 0: board at rest, score $0
// Phase 1: Safety $100 cell highlighted / "selected"
// Phase 2: Question modal with correct answer shown
// Phase 3: Board updated — $100 cell answered, score $100, progress updated
// then loops back to 0
function JeopardyPreview() {
  const [phase, setPhase] = useState(0);
  // Phase durations in ms
  const durations = [2200, 900, 2200, 2200];
  useEffect(() => {
    const id = setTimeout(() => setPhase(p => (p + 1) % 4), durations[phase]);
    return () => clearTimeout(id);
  }, [phase]);

  const score   = phase >= 3 ? 100 : 0;
  const maxScore = 2500;
  const target  = 2000;
  const pct     = Math.round((score / target) * 100);
  const barPct  = Math.round((score / maxScore) * 100);

  const cells = [
    { v: 100, stars: 1, col: 0 }, // Safety $100 — the one that gets answered
    { v: 100, stars: 1, col: 1 },
    { v: 100, stars: 1, col: 2 },
    { v: 200, stars: 2, col: 0, daily: true },
    { v: 200, stars: 2, col: 1 },
    { v: 200, stars: 2, col: 2 },
    { v: 300, stars: 3, col: 0 },
    { v: 300, stars: 3, col: 1 },
    { v: 300, stars: 3, col: 2 },
  ];

  return (
    <div className="space-y-2.5">
      {/* Score + Target row */}
      <div className="flex gap-2">
        <div className="flex-1 bg-indigo-900/60 border border-indigo-500/40 rounded-xl px-3 py-2 text-center">
          <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Your Score</div>
          <motion.div
            key={score}
            initial={{ scale: 1.3, color: '#facc15' }}
            animate={{ scale: 1,   color: '#ffffff' }}
            transition={{ duration: 0.4 }}
            className="text-xl font-black"
          >
            ${score.toLocaleString()}
          </motion.div>
        </div>
        <div className="flex-1 bg-amber-900/40 border border-amber-500/40 rounded-xl px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Target className="w-2.5 h-2.5 text-amber-400" />
            <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Target</div>
          </div>
          <div className="text-xl font-black text-amber-300">${target.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-center min-w-[56px]">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Max</div>
          <div className="text-base font-black text-slate-400">${maxScore.toLocaleString()}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700 mb-1">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            animate={{ width: `${barPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-bold text-slate-500">
          <span>$0</span>
          <span className="text-amber-400">Target: ${target.toLocaleString()} ({pct}%)</span>
          <span>${maxScore.toLocaleString()}</span>
        </div>
      </div>

      {/* Difficulty legend */}
      <div className="flex items-center gap-2 flex-wrap text-[8px] font-bold bg-slate-800/50 border border-slate-700/40 rounded-lg px-2 py-1.5">
        <span className="text-slate-600 uppercase tracking-wider shrink-0">⭐ Difficulty:</span>
        <span className="text-emerald-400">★☆☆☆ Beginner</span>
        <span className="text-yellow-400">★★☆☆ Inter.</span>
        <span className="text-orange-400">★★★☆ Adv.</span>
        <span className="text-red-400">★★★★ Expert</span>
      </div>

      {/* Game grid — animated */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5">
          {['Safety', 'Compliance', 'Procedures'].map(c => (
            <div key={c} className="bg-indigo-900/80 border-2 border-indigo-500/60 text-indigo-100 text-[9px] font-black uppercase text-center py-2 px-1 rounded-t-lg">{c}</div>
          ))}
          {cells.map((cell, i) => {
            const isTarget  = i === 0; // Safety $100
            const answered  = isTarget && phase >= 3;
            const selected  = isTarget && phase === 1;
            return (
              <motion.div
                key={i}
                animate={selected ? { scale: [1, 1.08, 1.08], boxShadow: ['0 0 0px transparent', '0 0 18px rgba(250,204,21,0.6)', '0 0 18px rgba(250,204,21,0.6)'] } : { scale: 1, boxShadow: '0 0 0px transparent' }}
                transition={{ duration: 0.4 }}
                className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-center border-2 cursor-pointer transition-all ${
                  answered
                    ? 'bg-slate-800 border-slate-700 opacity-25 cursor-not-allowed'
                    : selected
                    ? 'bg-yellow-500/30 border-yellow-400'
                    : 'bg-indigo-600 border-indigo-400 hover:scale-105'
                }`}
              >
                {!answered && (
                  <>
                    <span className="text-yellow-400 text-base font-black">${cell.v}</span>
                    {cell.daily && <span className="text-[7px] font-black text-yellow-300 uppercase tracking-widest">Daily Double</span>}
                    <span className={`text-[8px] font-black ${['','text-emerald-400','text-yellow-400','text-orange-400'][cell.stars]}`}>
                      {'★'.repeat(cell.stars)}{'☆'.repeat(3-cell.stars)}
                    </span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Question overlay — phase 2 */}
        <AnimatePresence>
          {phase === 2 && (
            <motion.div
              key="question"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-slate-950/95 rounded-xl border-2 border-yellow-500/60 p-3 flex flex-col gap-2 z-10"
            >
              <div className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">Safety — $100</div>
              <p className="text-white text-[10px] font-bold leading-snug">
                What is the first step when you notice a safety hazard in the workplace?
              </p>
              <div className="space-y-1.5 mt-1">
                {[
                  { text: 'Report it to your supervisor immediately', correct: true },
                  { text: 'Try to fix it yourself first',             correct: false },
                  { text: 'Wait until end of shift to report',       correct: false },
                ].map((opt, oi) => (
                  <div key={oi} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[9px] font-medium ${
                    opt.correct
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                      : 'border-slate-700 text-slate-500'
                  }`}>
                    <div className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      opt.correct ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                    }`}>
                      {opt.correct && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {opt.text}
                    {opt.correct && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Showcase Scroller (with large left/right nav arrows) ─────────────────────
// Hover         → scroll at normal speed (3 px/frame via rAF)
// Click + hold  → scroll faster (12 px/frame)
// Mouse off     → scroll stops exactly where it is (no reset)
// Plain click   → smooth jump of 360 px
function ShowcaseScroller({ children }: { children: React.ReactNode }) {
  const scrollRef     = useRef<HTMLDivElement>(null);
  const rafRef        = useRef<number | null>(null);
  const dirRef        = useRef<0 | 1 | -1>(0);   // active scroll direction
  const speedRef      = useRef<number>(3);        // px per frame

  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  // rAF scroll loop — only runs while dirRef.current !== 0
  const startLoop = () => {
    if (rafRef.current !== null) return; // already running
    const tick = () => {
      if (dirRef.current === 0) { rafRef.current = null; return; }
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += dirRef.current * speedRef.current;
        updateArrows();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    dirRef.current  = 0;
    speedRef.current = 3;
  };

  // Clean up on unmount
  useEffect(() => () => stopLoop(), []);

  const makeHandlers = (dir: 1 | -1) => ({
    // Hover start → normal speed scroll
    onMouseEnter: () => {
      dirRef.current   = dir;
      speedRef.current = 3;
      startLoop();
    },
    // Mouse off → stop immediately, stay at current position
    onMouseLeave: () => stopLoop(),
    // Hold start → fast scroll (overrides hover speed)
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();         // prevent button focus ring flash
      speedRef.current = 12;      // fast lane
    },
    // Hold release → back to normal hover speed (still hovering)
    onMouseUp: () => {
      speedRef.current = 3;
    },
  });

  const jumpBy = (dir: 1 | -1) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 360, behavior: 'smooth' });
  };

  const btnBase =
    'absolute top-1/2 -translate-y-1/2 z-20 ' +
    'w-12 h-12 rounded-full flex items-center justify-center ' +
    'bg-slate-800/90 border border-slate-600/60 shadow-xl ' +
    'text-white hover:bg-indigo-600 hover:border-indigo-500 ' +
    'active:scale-95 transition-all duration-150 cursor-pointer select-none';

  return (
    <div className="relative">
      {/* LEFT arrow */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            key="arr-left"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            onClick={() => jumpBy(-1)}
            {...makeHandlers(-1)}
            className={`${btnBase} left-0 -translate-x-3`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* RIGHT arrow */}
      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            key="arr-right"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onClick={() => jumpBy(1)}
            {...makeHandlers(1)}
            className={`${btnBase} right-0 translate-x-3`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Edge fade gradients */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10
          bg-gradient-to-r from-slate-900/80 to-transparent" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10
          bg-gradient-to-l from-slate-900/80 to-transparent" />
      )}

      {/* Scrollable strip — native scrollbar hidden */}
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className="flex gap-5 overflow-x-auto pb-4 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Decision Simulation Preview (auto-looping) ───────────────────────────────
function BranchingScenarioPreview() {
  // Phase 0: role card appears, situation loads
  // Phase 1: options fade in
  // Phase 2: option B highlighted (selected)
  // Phase 3: consequence revealed
  // Phase 4: "Phase 2" transition + question
  // Phase 5: option A selected + consequence
  // Phase 6: Decision Profile bars animate
  // then loops back to 0
  const [phase, setPhase] = useState(0);
  const durations = [1200, 1800, 1200, 2000, 1800, 1500, 2800];
  useEffect(() => {
    const id = setTimeout(() => setPhase(p => (p + 1) % 7), durations[phase]);
    return () => clearTimeout(id);
  }, [phase]);

  const phaseActive = (phase >= 1);
  const selB = (phase >= 2);
  const showConsequence = (phase >= 3);
  const inPhase2 = (phase >= 4);
  const selA2 = (phase >= 5);
  const showProfile = (phase >= 6);

  return (
    <div className="select-none space-y-2">
      {/* Role badge */}
      <div className="flex items-center gap-2 mb-2 p-2 bg-slate-800/60 rounded-xl border border-slate-700">
        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-[9px] shrink-0">JR</div>
        <div>
          <p className="text-white font-bold text-[9px]">Jordan Reyes — Operations Manager</p>
          <p className="text-slate-400 text-[8px]">Decision Simulation · AI-Generated</p>
        </div>
        <div className="ml-auto flex gap-1">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-3 h-1 rounded-full transition-all duration-500 ${i===0?'bg-indigo-500':i===1&&inPhase2?'bg-indigo-500':'bg-slate-700'}`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!inPhase2 ? (
          <motion.div key="phase1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            {/* Situation block */}
            <div className="bg-slate-800 rounded-xl border-l-[3px] border-indigo-500 p-2.5 mb-2">
              <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest mb-0.5">Phase 1 — First Response</p>
              <p className="text-white text-[9px] font-semibold leading-snug">
                It's Monday morning. Priya flagged that Ethan missed two deliverables. An urgent client email is waiting.
              </p>
              <p className="text-slate-300 text-[8px] mt-1">What is your first move?</p>
            </div>
            {/* Options */}
            <div className="space-y-1.5">
              {[
                { text: 'Reply to the client immediately to buy time', sel: false },
                { text: 'Speak privately with Ethan before responding', sel: selB },
                { text: 'CC your director and ask for guidance', sel: false },
              ].map((o, i) => (
                <div key={i} className={`p-2 rounded-lg border transition-all duration-500 text-[8px] font-medium ${
                  o.sel ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-400'
                }`}>
                  {o.text}
                  {o.sel && <span className="ml-1 text-indigo-400 font-black">✓</span>}
                </div>
              ))}
            </div>
            {/* Consequence */}
            {showConsequence && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 p-2 rounded-lg border border-emerald-500/60 bg-emerald-900/20">
                <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">✦ Strong choice</p>
                <p className="text-[8px] text-white leading-snug">Ethan reveals a family emergency. You now have full context before making any commitments.</p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="phase2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {/* Phase 2 */}
            <div className="bg-slate-800 rounded-xl border-l-[3px] border-violet-500 p-2.5 mb-2">
              <p className="text-[8px] text-violet-400 font-black uppercase tracking-widest mb-0.5">Phase 2 — Director Meeting</p>
              <p className="text-white text-[9px] font-semibold leading-snug">
                Your director's check-in is in 3 hours. How do you approach the meeting?
              </p>
            </div>
            <div className="space-y-1.5">
              {[
                { text: 'Bring a recovery plan with revised timelines', sel: selA2 },
                { text: 'Tell the director everything is under control', sel: false },
                { text: 'Escalate to HR before the meeting', sel: false },
              ].map((o, i) => (
                <div key={i} className={`p-2 rounded-lg border transition-all duration-500 text-[8px] font-medium ${
                  o.sel ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-400'
                }`}>
                  {o.text}
                  {o.sel && <span className="ml-1 text-indigo-400 font-black">✓</span>}
                </div>
              ))}
            </div>
            {/* Decision Profile */}
            {showProfile && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 p-2.5 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-2">Your Decision Profile</p>
                {[{label:'Trust',val:82},{label:'Accountability',val:90},{label:'Morale',val:75}].map(b => (
                  <div key={b.label} className="mb-1.5">
                    <div className="flex justify-between text-[7px] mb-0.5"><span className="text-slate-300">{b.label}</span><span className="text-white font-bold">{b.val}%</span></div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${b.val}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-full bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Image Background Template Preview (animated loop) ────────────────────────
// Cycles through 4 thumbnail options, updating the main slide bg image
const BG_TEMPLATES = [
  '/Reference/Images/40570635_l_normal_none.jpg',
  '/Reference/Images/72769332_l_normal_none.jpg',
  '/Reference/Images/124953787_l_normal_none.jpg',
  '/Reference/Images/129314759_l_normal_none.jpg',
];
function ImageBackgroundTemplatePreview() {
  const [selected, setSelected] = useState(0);
  // Cycle: 0 → 1 → 2 → 3 → 0 ...
  useEffect(() => {
    const id = setTimeout(() => setSelected(s => (s + 1) % BG_TEMPLATES.length), 2400);
    return () => clearTimeout(id);
  }, [selected]);
  return (
    <div className="space-y-2">
      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Slide Canvas — Background Template</p>
      {/* Slide canvas — all images stacked; CSS opacity crossfade eliminates the blink */}
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-700/50" style={{ paddingBottom: '56.25%' }}>
        {BG_TEMPLATES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt="bg template"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === selected ? 0.6 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent" />
        <div className="absolute left-3 top-3 right-1/3">
          <div className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1">Module 2 — Leadership</div>
          <div className="text-xs font-black text-white leading-snug">Leading with Confidence</div>
          <div className="text-[9px] text-slate-300 mt-1 leading-relaxed">Effective leaders inspire trust through clear communication and decisive action.</div>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-900/70 border border-slate-600/50 rounded px-1.5 py-0.5 text-[8px] text-slate-400 font-bold">
          <Move className="w-2.5 h-2.5" /> Background
        </div>
      </div>
      {/* Thumbnail picker */}
      <div className="mt-2">
        <div className="text-[8px] text-slate-600 font-bold mb-1.5 uppercase tracking-widest">Choose Template</div>
        <div className="flex gap-1.5">
          {BG_TEMPLATES.map((src, i) => (
            <div key={i} className={`relative w-12 h-8 rounded overflow-hidden border-2 transition-all duration-300 ${
              i === selected ? 'border-indigo-500 scale-105' : 'border-slate-700 opacity-60'
            }`}>
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover preview-img" />
              {i === selected && <div className="absolute inset-0 bg-indigo-500/20" />}
            </div>
          ))}
          <div className="w-12 h-8 rounded border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600">
            <span className="text-[10px]">+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Multi-Image Editor Preview (animated loop) ────────────────────────────────
// Phase 0: Image 1 resizing (scale + handle animation)
// Phase 1: Image 2 moving (translate animation)
// Phase 2: Image 3 crop mask shrinking
// then loops
function MultiImageEditorPreview() {
  const [phase, setPhase] = useState(0);
  const durations = [2400, 2400, 2400];
  useEffect(() => {
    const id = setTimeout(() => setPhase(p => (p + 1) % 3), durations[phase]);
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Multiple Images — Drag, Crop &amp; Resize</p>
      <div className="relative w-full bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden" style={{ height: '160px' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />

        {/* Label / action badge */}
        <div className="absolute top-2 left-2 z-20">
          <AnimatePresence mode="wait">
            {phase === 0 && (
              <motion.div key="resize-badge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                className="flex items-center gap-1 bg-indigo-900/90 border border-indigo-500/60 rounded-lg px-2 py-0.5 text-[8px] font-black text-indigo-300">
                ↔ Resizing Image 1
              </motion.div>
            )}
            {phase === 1 && (
              <motion.div key="move-badge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                className="flex items-center gap-1 bg-violet-900/90 border border-violet-500/60 rounded-lg px-2 py-0.5 text-[8px] font-black text-violet-300">
                <Move className="w-2.5 h-2.5" /> Moving Image 2
              </motion.div>
            )}
            {phase === 2 && (
              <motion.div key="crop-badge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                className="flex items-center gap-1 bg-amber-900/90 border border-amber-500/60 rounded-lg px-2 py-0.5 text-[8px] font-black text-amber-300">
                <Crop className="w-2.5 h-2.5" /> Cropping Image 3
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Image 1 — top-left: resizes in phase 0 */}
        <motion.div
          animate={phase === 0
            ? { width: '9rem', height: '6rem', left: '0.75rem', top: '0.75rem' }
            : { width: '8rem', height: '5rem', left: '0.75rem', top: '0.75rem' }}
          transition={{ duration: 1.2, ease: 'easeInOut', repeat: phase === 0 ? Infinity : 0, repeatType: 'reverse' }}
          className={`absolute rounded-lg overflow-visible border-2 shadow-lg ${
            phase === 0 ? 'border-indigo-400 shadow-indigo-500/20' : 'border-slate-600'
          }`}
          style={{ width: '8rem', height: '5rem', left: '0.75rem', top: '0.75rem' }}
        >
          <img src="/Reference/Images/72769332_l_normal_none.jpg" alt="img1" loading="lazy" className="w-full h-full object-cover rounded-lg preview-img" />
          {phase === 0 && ['-top-1 -left-1','-top-1 -right-1','-bottom-1 -left-1','-bottom-1 -right-1'].map(pos => (
            <motion.div key={pos} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
              className={`absolute ${pos} w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-sm z-10`} />
          ))}
        </motion.div>

        {/* Image 2 — right side: moves horizontally in phase 1 (whole element translates) */}
        <motion.div
          animate={phase === 1
            ? { x: [-8, 8, -8], right: '0.75rem', top: '0.75rem' }
            : { x: 0, right: '0.75rem', top: '0.75rem' }}
          transition={phase === 1
            ? { x: { duration: 1.4, ease: 'easeInOut', repeat: Infinity }, right: { duration: 0 }, top: { duration: 0 } }
            : { duration: 0.4, ease: 'easeOut' }}
          style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', width: '6rem', height: '4rem' }}
          className={`rounded-lg overflow-hidden border-2 ${phase === 1 ? 'border-violet-400 shadow-lg shadow-violet-500/20' : 'border-slate-600 opacity-80'}`}
        >
          <img src="/Reference/Images/124953787_l_normal_none.jpg" alt="img2" loading="lazy" className="w-full h-full object-cover preview-img" />
        </motion.div>

        {/* Image 3 — bottom center: crop mask in phase 2 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden border-2 border-slate-600 opacity-90"
          style={{ width: '5rem', height: '3.5rem' }}>
          <img src="/Reference/Images/40570635_l_normal_none.jpg" alt="img3" loading="lazy" className="w-full h-full object-cover preview-img" />
          {phase === 2 && (
            <>
              {/* Crop overlay */}
              <motion.div
                className="absolute inset-0 border-2 border-amber-400 z-10"
                initial={{ top: '0%', left: '0%', right: '0%', bottom: '0%' }}
                animate={{ top: '15%', left: '10%', right: '10%', bottom: '15%' }}
                transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
                style={{ position: 'absolute' }}
              />
              <div className="absolute inset-0 bg-black/40 z-5" />
            </>
          )}
        </div>

        {/* Size badge */}
        <div className={`absolute bottom-2 left-3 rounded px-2 py-0.5 text-[8px] font-black transition-all ${
          phase === 0 ? 'bg-indigo-900/80 border border-indigo-500/40 text-indigo-300' :
          phase === 1 ? 'bg-violet-900/80 border border-violet-500/40 text-violet-300' :
                        'bg-amber-900/80 border border-amber-500/40 text-amber-300'
        }`}>
          {phase === 0 ? '320 × 200 px' : phase === 1 ? 'X: 148  Y: 32' : 'Crop: 80%'}
        </div>
      </div>

      {/* Controls strip */}
      <div className="flex gap-2 mt-1">
        <button className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold border rounded-lg transition-all ${
          phase === 2 ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-400'
        }`}><Crop className="w-3 h-3" /> Crop</button>
        <button className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold border rounded-lg transition-all ${
          phase === 1 ? 'border-violet-500/50 bg-violet-500/10 text-violet-300' : 'border-slate-700 text-slate-400'
        }`}><Move className="w-3 h-3" /> Reposition</button>
        <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold border border-indigo-600/50 bg-indigo-500/10 rounded-lg text-indigo-300">
          <Image className="w-3 h-3" /> Add Image
        </button>
      </div>
    </div>
  );
}

// ── Sign In Dropdown ──────────────────────────────────────────────────────────
function SignInDropdown({ onClose, onGetStarted }: { onClose: () => void; onGetStarted: () => void }) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError('');
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err || 'Sign in failed. Please check your credentials.');
    else onClose();
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    const { error: err } = await signInWithGoogle();
    setLoading(false);
    if (err) setError(err || 'Google sign in failed.');
  };

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.18 }}
      className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950/60 z-[999] overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-white text-base">Welcome back</p>
            <p className="text-slate-500 text-xs mt-0.5">Sign in to your account</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSignIn} className="p-5 space-y-3">
        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@example.com"
            className="w-full bg-slate-800/60 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all placeholder-slate-600" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-slate-800/60 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm rounded-xl px-3.5 py-2.5 pr-10 outline-none transition-all placeholder-slate-600" />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPw
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white font-black text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock className="w-3.5 h-3.5" />Sign In</>}
        </button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <button type="button" onClick={handleGoogle} disabled={loading}
          className="w-full border border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800 text-slate-200 font-bold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-60">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-xs text-slate-600">
          Don't have an account?{' '}
          <button type="button" onClick={() => { onClose(); onGetStarted(); }} className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
            Create one →
          </button>
        </p>
      </form>
    </motion.div>
  );
}

// ── Smooth-scroll helper (accounts for sticky nav height) ────────────────────
function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = 64; // matches the nav h-16 (64 px)
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MarketingHomepage({ onGetStarted, onSignIn, onMethodology }: Props) {
  const [menuOpen, setMenuOpen]           = useState(false);
  const [showSignIn, setShowSignIn]       = useState(false);

  // FAQ state
  const [expandedFaq, setExpandedFaq]     = useState<number | null>(null);

  // Contact form state
  const [contactName, setContactName]     = useState('');
  const [contactEmail, setContactEmail]   = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent]     = useState(false);
  const [contactTicketRef, setContactTicketRef] = useState('');
  const [contactError, setContactError]   = useState('');

  const CONTACT_SUBJECTS = [
    'General Inquiry',
    'Pricing & Plans',
    'Technical Issue',
    'Partnership & Enterprise',
    'Other',
  ];

  const MARKETING_FAQS = [
    { q: 'How does NexCourse AI work?', a: 'You paste a topic, upload a PDF/PowerPoint/Word document, or describe your course in plain text. Our AI drafts a full course outline with modules and slides, then generates all the content — narration scripts, quiz questions, interactions, and voice-over audio. The whole process typically takes 30–90 seconds.' },
    { q: 'What file types does it support?', a: 'NexCourse AI accepts PDF files, Microsoft PowerPoint (.pptx), and Microsoft Word (.docx) documents. You can also type a topic directly without uploading a file.' },
    { q: 'Is there a free trial or free plan?', a: 'Yes! The Teacher Free plan lets you build up to 3 courses with no credit card required. Paid plans unlock unlimited generation, all game templates, AI voice options, and advanced SCORM export.' },
    { q: 'What is SCORM and which LMS platforms does it work with?', a: 'SCORM is the universal standard format for eLearning content. NexCourse AI exports SCORM 1.2 and SCORM 2004 packages that work with virtually any LMS — Moodle, Canvas, Blackboard, Cornerstone, TalentLMS, Docebo, and more.' },
    { q: 'Can I edit the AI-generated course?', a: 'Absolutely. Every slide is fully editable after generation. You can change text, add or remove slides, swap images, adjust quiz questions, edit narration scripts, and tweak interactions — all from within the Course Preview.' },
    { q: 'How long does course generation take?', a: 'A standard 15–20 slide course generates in approximately 30–90 seconds. Comprehensive courses with 30+ slides may take up to 2–3 minutes. A progress bar keeps you informed throughout.' },
    { q: 'Is my data and content private?', a: 'Yes. Your uploaded files and generated courses are private to your account. We do not use your content to train AI models. See our Privacy Policy for full details.' },
    { q: 'How do I cancel my subscription?', a: 'You can cancel anytime from your Account page (click your name → My Account & Billing). There are no cancellation fees and your plan stays active until the end of the billing period.' },
  ];

  const handleContactSubmit = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactSubject || !contactMessage.trim()) {
      setContactError('Please fill in all fields.');
      return;
    }
    if (contactMessage.trim().length < 10) { setContactError('Message must be at least 10 characters.'); return; }
    setContactError('');
    setContactSending(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contactName, email: contactEmail, subject: contactSubject, message: contactMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setContactTicketRef(data.ticketRef);
      setContactSent(true);
    } catch (e: any) {
      setContactError(e.message ?? 'Failed to send. Please try again.');
    } finally {
      setContactSending(false);
    }
  };

  const features = [
    { icon: Brain,      title: 'AI Course Generation',    description: 'Paste a topic or upload a document — our AI drafts a full course outline with slides, quizzes, and narration in minutes.',       color: 'from-indigo-600/20 to-purple-600/20', delay: 0 },
    { icon: Gamepad2,   title: 'Game-Based Learning',     description: 'Choose from Jeopardy, Millionaire, Escape Room, Family Feud, and more. Turn assessments into memorable experiences.',             color: 'from-purple-600/20 to-pink-600/20',   delay: 0.05 },
    { icon: Mic,        title: 'AI Voice-Over Narration', description: 'Every slide gets a professional AI voice-over generated automatically. Choose from 6 voices and multiple playback speeds.',        color: 'from-cyan-600/20 to-blue-600/20',     delay: 0.1 },
    { icon: FileOutput, title: 'SCORM Export',            description: 'Export SCORM 1.2 and 2004 packages ready for any LMS — Canvas, Moodle, Blackboard, Cornerstone, and more.',                      color: 'from-emerald-600/20 to-teal-600/20', delay: 0.15 },
    { icon: Image,      title: 'Built-In Image Editor',   description: 'Add, crop, resize, and reposition multiple images per slide. Drop in a background photo template or build from scratch.',         color: 'from-amber-600/20 to-orange-600/20',  delay: 0.2 },
    { icon: BarChart3,  title: 'Mastery Quiz & Reporting',description: 'Built-in mastery exam engine with completion tracking, score reporting, and pass/fail thresholds aligned to your LMS.',          color: 'from-rose-600/20 to-red-600/20',      delay: 0.25 },
  ];

  const stats = [
    { label: 'Interaction Types',  value: 20,  suffix: '+' },
    { label: 'Game Templates',     value: 8,   suffix: '+' },
    { label: 'LMS Compatible',     value: 100, suffix: '%' },
    { label: 'AI Voice Options',   value: 6,   suffix: ''  },
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans overflow-x-hidden">

      {/* ── Background Orbs ──────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale:[1,1.08,1], opacity:[0.15,0.22,0.15] }} transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }}
          className="absolute top-0 right-0 w-[700px] h-[700px] bg-indigo-600 rounded-full blur-[160px] transform translate-x-1/2 -translate-y-1/3" />
        <motion.div animate={{ scale:[1,1.1,1], opacity:[0.1,0.18,0.1] }} transition={{ duration:10, repeat:Infinity, ease:'easeInOut', delay:2 }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-700 rounded-full blur-[140px] transform -translate-x-1/3 translate-y-1/3" />
        <motion.div animate={{ scale:[1,1.06,1], opacity:[0.08,0.14,0.08] }} transition={{ duration:12, repeat:Infinity, ease:'easeInOut', delay:5 }}
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-700 rounded-full blur-[120px] transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500/15 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <button onClick={() => smoothScrollTo('features')}  className="hover:text-white transition-colors cursor-pointer">Features</button>
            <button onClick={() => smoothScrollTo('showcase')}  className="hover:text-white transition-colors cursor-pointer">Interactions</button>
            <button onClick={() => smoothScrollTo('tracks')}    className="hover:text-white transition-colors cursor-pointer">Who It's For</button>
            <button onClick={() => smoothScrollTo('pricing')}   className="hover:text-white transition-colors cursor-pointer">Pricing</button>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Sign In button + dropdown */}
            <div className="hidden md:block relative">
              <button id="nav-signin-btn" onClick={() => setShowSignIn(o => !o)}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-all ${showSignIn ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>
                Sign In
              </button>
              <AnimatePresence>
                {showSignIn && (
                  <SignInDropdown onClose={() => setShowSignIn(false)} onGetStarted={onGetStarted} />
                )}
              </AnimatePresence>
            </div>

            <button onClick={onGetStarted}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30">
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
            <button className="md:hidden text-slate-400" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-4 flex flex-col gap-3 text-sm font-medium text-slate-300">
              {[
                { label: 'Features',      id: 'features'  },
                { label: 'Interactions',  id: 'showcase'  },
                { label: "Who It's For",  id: 'tracks'    },
                { label: 'Pricing',       id: 'pricing'   },
              ].map(({ label, id }) => (
                <button key={id} onClick={() => { setMenuOpen(false); smoothScrollTo(id); }}
                  className="text-left hover:text-white transition-colors py-1">{label}</button>
              ))}
              <button onClick={() => { setMenuOpen(false); setShowSignIn(true); }} className="text-left pt-2 border-t border-slate-800 text-indigo-400">Sign In →</button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 pt-8 pb-24 overflow-hidden">
        {/* Background video — full height, no vertical clipping */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <video src="/landing_background_4.mp4" autoPlay loop muted playsInline
            className="absolute top-0 left-0 w-full h-full object-cover opacity-20 mix-blend-screen" />
          <div className="absolute inset-0 bg-slate-950/50" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Brand label — smaller, above the value prop */}
          <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered eLearning Builder
          </motion.div>

          {/* Brand name — reduced to subtitle treatment */}
          <motion.p initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45, delay:0.06 }}
            className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight mb-3">
            NexCourse AI
          </motion.p>

          {/* Value proposition — now the dominant h1 */}
          <motion.h1 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
            className="max-w-3xl mx-auto text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.04] tracking-tight mb-5">
            Turn any topic into a complete eLearning course —{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">instantly.</span>
          </motion.h1>

          <motion.p initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.22 }}
            className="text-slate-400 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
            AI generates your slides, quizzes, games, and voice-over narration. Export SCORM-ready packages to any LMS. Built for{' '}
            <span className="text-indigo-300 font-semibold">corporate trainers</span> and{' '}
            <span className="text-emerald-300 font-semibold">subject matter experts</span>.
          </motion.p>

          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.28 }}
            className="flex flex-col sm:flex-row gap-4 mb-20">
            <button onClick={onGetStarted}
              className="group flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all">
              Start Building Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => setShowSignIn(true)}
              className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/60 text-slate-200 font-bold text-base px-8 py-4 rounded-2xl transition-all">
              Sign In to Dashboard
            </button>
          </motion.div>

          {/* ── Stats Bar — appears before the showcase ──────────────── */}
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5, delay:0.34 }}
            className="w-full max-w-4xl mx-auto px-6 py-8 mb-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-y border-slate-800/60 py-8">
              {stats.map(({ label, value, suffix }) => (
                <div key={label}>
                  <div className="text-3xl font-black text-white mb-1"><AnimatedCounter target={value} suffix={suffix} /></div>
                  <p className="text-slate-500 text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Interactions Showcase ————————————————————————————— */}
          <div id="showcase" className="w-full mt-2 pb-8">
            <motion.p
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.5, delay:0.38 }}
              className="text-center text-purple-400 text-sm font-black uppercase tracking-widest mb-3"
            >
              See It In Action
            </motion.p>
            {/* Descriptive headline — Change 2 */}
            <motion.h2
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.5, delay:0.43 }}
              className="text-center text-2xl md:text-3xl font-black text-white mb-8 leading-tight"
            >
              Create engaging interactions —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">without writing a single line of code.</span>
            </motion.h2>
            <motion.div
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.6, delay:0.48 }}
            >
              <ShowcaseScroller>
                <ShowcaseCard label="Accordion" icon={Layers} accent="border-indigo-700/40" preview={<AccordionPreview />} />
                <ShowcaseCard label="Flashcards" icon={BookOpen} accent="border-purple-700/40" preview={<FlashcardPreview />} />
                <ShowcaseCard label="Jeopardy Game" icon={Gamepad2} accent="border-amber-700/40" wide preview={<JeopardyPreview />} />
                <ShowcaseCard label="Image Background Template" icon={Image} accent="border-rose-700/40" wide preview={<ImageBackgroundTemplatePreview />} />
                <ShowcaseCard label="Image Editor - Multi-Image Layout" icon={Crop} accent="border-violet-700/40" wide preview={<MultiImageEditorPreview />} />
                <ShowcaseCard label="Branching Scenario" icon={Globe} accent="border-cyan-700/40" wide preview={<BranchingScenarioPreview />} />
              </ShowcaseScroller>
            </motion.div>
          </div>

        </div>
      </section>


      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
              className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-3">Everything You Need</motion.p>
            <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ duration:0.5 }} className="text-4xl md:text-5xl font-black text-white leading-tight">
              One Platform.<br />Every eLearning Need.
            </motion.h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>



      {/* ── Dual Track ───────────────────────────────────────────────────────── */}
      <section id="tracks" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
              className="text-emerald-400 text-sm font-black uppercase tracking-widest mb-3">Two Audiences. One Magic Button.</motion.p>
            <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ duration:0.5 }} className="text-4xl md:text-5xl font-black text-white mb-6">Built for the People Who Build Training.</motion.h2>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
              In traditional eLearning, a{' '}
              <span className="text-indigo-300 font-semibold">Subject Matter Expert</span> provides the content while an{' '}
              <span className="text-purple-300 font-semibold">Instructional Designer</span> transforms it into a structured course.
              NexCourse AI collapses both workflows into a single click.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <motion.div initial={{ opacity:0, x:-30 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.5 }}
              className="p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/20 to-purple-900/10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Instructional Designers</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Stop spending hours manually authoring slides in Storyline or Captivate.
                NexCourse AI drafts your full course structure — quizzes, interactions, narration scripts, and SCORM export —
                so you can focus on strategy, not production.
              </p>
              <ul className="space-y-2.5">
                {['Full course outline in seconds','SCORM 1.2 & 2004 export for any LMS','Built-in mastery quiz & score reporting','Branching scenarios & gamified assessments','AI narration + voice-over generation'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="mt-8 flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200 transition-colors group">
                Start Building <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
            <motion.div initial={{ opacity:0, x:30 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.5 }}
              className="p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-teal-900/10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5">
                <GraduationCap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Subject Matter Experts</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                You know your field. Now you can publish a polished, interactive eLearning course without needing a developer or an expensive authoring tool.
                Upload your PPT, PDF, or Word docs — and NexCourse AI does the rest.
              </p>
              <ul className="space-y-2.5">
                {['Upload PDF, Word, or PowerPoint files','AI extracts topics, objectives & structure','No design skills or coding required','Publish directly to any LMS via SCORM','Professional output in minutes, not weeks'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="mt-8 flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors group">
                Upload Your Content <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5 }}
            className="text-center p-8 rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/40">
            <p className="text-slate-300 text-lg leading-relaxed max-w-3xl mx-auto">
              Whether you are an <span className="text-indigo-300 font-bold">instructional designer</span> looking to 10x your output, or a{' '}
              <span className="text-emerald-300 font-bold">subject matter expert</span> who wants to share knowledge without a technical team —
              NexCourse AI puts a complete eLearning production pipeline at your fingertips.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                Try It Free <ArrowRight className="w-4 h-4" />
              </button>
              {onMethodology && (
                <button onClick={onMethodology} className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                  Learn about our methodology <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing Teaser ───────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-slate-900/30 border-y border-slate-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
            className="text-amber-400 text-sm font-black uppercase tracking-widest mb-3">Flexible Plans</motion.p>
          <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
            transition={{ duration:0.5 }} className="text-4xl md:text-5xl font-black text-white mb-4">Start Free. Scale When Ready.</motion.h2>
          <p className="text-slate-400 text-lg mb-10">Teacher Free plan available. No credit card required.</p>
          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            {[
              {
                name:'Free', price:'$0', color:'border-slate-700', textColor:'text-slate-300', badge:null,
                features: ['Up to 3 courses', 'SCORM 1.2 export', '2 AI voice options', 'Basic game templates'],
                featureColor: 'text-slate-300',
              },
              {
                name:'Pro', price:'$49', color:'border-indigo-500/50 bg-indigo-500/5', textColor:'text-indigo-300', badge:'Most Popular',
                features: ['Unlimited AI course generation', 'SCORM 1.2 & 2004 export', 'All 5 AI voice options', 'All 6+ game templates', 'Mastery quiz & score reporting'],
                featureColor: 'text-indigo-200',
              },
              {
                name:'Enterprise', price:'Custom', color:'border-slate-700', textColor:'text-slate-300', badge:null,
                features: ['Everything in Pro', 'Enterprise DPA agreement', 'Dedicated onboarding support', 'Custom LMS integrations'],
                featureColor: 'text-slate-300',
              },
            ].map(({ name, price, color, textColor, badge, features: planFeatures, featureColor }) => (
              <div key={name} className={`relative p-6 rounded-2xl border ${color} text-center`}>
                {badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white px-3 py-1 rounded-full whitespace-nowrap">{badge}</div>}
                <p className={`font-black text-base mb-1 ${textColor}`}>{name}</p>
                <p className="text-3xl font-black text-white mb-5">{price}<span className="text-sm text-slate-500 font-medium">{price !== 'Custom' ? '/mo' : ''}</span></p>
                <ul className="space-y-2 text-left">
                  {planFeatures.map(feat => (
                    <li key={feat} className={`flex items-start gap-2 text-xs ${featureColor}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-10 py-4 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all">
            View Full Pricing <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 bg-slate-900/30 border-y border-slate-800/60">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
              className="text-purple-400 text-sm font-black uppercase tracking-widest mb-3">Frequently Asked Questions</motion.p>
            <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ duration:0.5 }} className="text-4xl md:text-5xl font-black text-white">
              Got Questions?
            </motion.h2>
          </div>
          <div className="space-y-3">
            {MARKETING_FAQS.map((faq, i) => (
              <motion.div key={i} initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ delay: i * 0.04 }}
                className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 hover:border-slate-700 transition-colors">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-bold text-white text-sm md:text-base leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-indigo-400 shrink-0 transition-transform duration-300 ${expandedFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedFaq === i && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                      exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }}>
                      <p className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-slate-800 pt-4">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-8">
            Still have questions?{' '}
            <button onClick={() => { const el = document.getElementById('contact'); el?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold">Contact us →</button>
          </p>
        </div>
      </section>

      {/* ── Contact Us ──────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
              className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-3">Get In Touch</motion.p>
            <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ duration:0.5 }} className="text-4xl md:text-5xl font-black text-white mb-4">Contact Us</motion.h2>
            <p className="text-slate-400">Have a question about our plans or want to explore an enterprise deal? We'd love to hear from you.</p>
          </div>

          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
            transition={{ duration:0.5 }}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8">

            {contactSent ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-white font-black text-xl">Message Sent!</h3>
                <p className="text-slate-400">We'll get back to you at <span className="text-indigo-300 font-semibold">{contactEmail}</span> within 24–48 hours.</p>
                <p className="text-xs text-slate-500 font-mono bg-slate-800 px-4 py-2 rounded-lg inline-block">Ref: {contactTicketRef}</p>
                <button onClick={() => { setContactSent(false); setContactName(''); setContactEmail(''); setContactSubject(''); setContactMessage(''); }}
                  className="block mx-auto text-sm text-indigo-400 hover:text-indigo-300 font-semibold mt-2">Send another message</button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Name <span className="text-red-400">*</span></label>
                    <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all placeholder-slate-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Email <span className="text-red-400">*</span></label>
                    <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all placeholder-slate-600" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Subject <span className="text-red-400">*</span></label>
                  <select value={contactSubject} onChange={e => setContactSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all">
                    <option value="">Select a subject...</option>
                    {CONTACT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Message <span className="text-red-400">*</span></label>
                  <textarea rows={5} value={contactMessage} onChange={e => setContactMessage(e.target.value)}
                    placeholder="Tell us what you need..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none transition-all resize-none placeholder-slate-600" />
                </div>
                {contactError && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{contactError}
                  </div>
                )}
                <button onClick={handleContactSubmit} disabled={contactSending}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-lg shadow-indigo-500/20">
                  {contactSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Message</>}
                </button>
                <p className="text-center text-xs text-slate-500">
                  Or email us directly at{' '}
                  <a href="mailto:support@nexcourse.ai" className="text-indigo-400 hover:text-indigo-300 font-semibold">support@nexcourse.ai</a>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.6 }}>
            <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">Ready to Transform<br />Your Training?</h2>
            <p className="text-slate-400 text-lg mb-10">Join educators and trainers who build courses in minutes, not months.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={onGetStarted}
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-10 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all">
                Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setShowSignIn(true)}
                className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-bold text-base px-10 py-4 rounded-2xl transition-all">
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 py-10 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-500/15 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="font-extrabold text-base text-white">NexCourse <span className="text-indigo-400">AI</span></span>
          </div>
          <span className="text-slate-600 text-sm">© 2026 NexCourse AI. All rights reserved.</span>
          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
            <Shield className="w-3 h-3" /> Your data is always kept private & safe
          </div>
        </div>
      </footer>

    </div>
  );
}
