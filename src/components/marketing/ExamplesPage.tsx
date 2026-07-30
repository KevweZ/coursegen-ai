import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle2,
  Layers, Globe, BookOpen, Image, Crop,
  Move
} from 'lucide-react';

// ── Animated Click & Reveal Preview ───────────────────────────────────────────
function ClickRevealPreview() {
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
                  key="reveal-body"
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
const FLASHCARDS = [
  {
    term: "Bloom's Taxonomy",
    def: "A hierarchy classifying learning objectives from Remember to Create.",
    frontGrad: 'from-purple-600/25 to-indigo-600/20',
    frontBorder: 'border-purple-500/25',
    backGrad: 'from-indigo-600/25 to-cyan-600/20',
    backBorder: 'border-indigo-500/30',
    accentFront: 'text-purple-400',
    accentBack: 'text-indigo-400',
  },
  {
    term: 'ADDIE Model',
    def: 'Analyze, Design, Develop, Implement, Evaluate — the core ID framework.',
    frontGrad: 'from-cyan-600/20 to-blue-600/20',
    frontBorder: 'border-cyan-500/25',
    backGrad: 'from-blue-600/20 to-indigo-600/20',
    backBorder: 'border-blue-500/30',
    accentFront: 'text-cyan-400',
    accentBack: 'text-blue-400',
  },
  {
    term: 'Kirkpatrick Model',
    def: 'Four training evaluation levels: Reaction, Learning, Behavior, Results.',
    frontGrad: 'from-violet-600/20 to-purple-600/20',
    frontBorder: 'border-violet-500/25',
    backGrad: 'from-purple-600/20 to-pink-600/20',
    backBorder: 'border-purple-500/30',
    accentFront: 'text-violet-400',
    accentBack: 'text-purple-400',
  },
];

function FlashcardPreview() {
  const [flipped, setFlipped] = useState([false, false, false]);

  useEffect(() => {
    // Stagger each card's independent flip cycle
    const intervals = FLASHCARDS.map((_, i) =>
      setInterval(() => {
        setFlipped(prev => prev.map((v, j) => j === i ? !v : v) as [boolean, boolean, boolean]);
      }, 3000 + i * 1100)
    );
    return () => intervals.forEach(clearInterval);
  }, []);

  return (
    <div className="flex gap-3">
      {FLASHCARDS.map((card, i) => (
        <div key={i} className="flex-1 min-w-0" style={{ perspective: '700px', height: '130px' }}>
          <motion.div
            animate={{ rotateY: flipped[i] ? 180 : 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
          >
            {/* Front */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.frontGrad} rounded-xl p-3 border ${card.frontBorder} flex flex-col items-center justify-center gap-1.5`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className={`text-[9px] ${card.accentFront} font-black uppercase tracking-widest`}>Term</div>
              <div className="font-bold text-white text-[11px] text-center leading-snug">{card.term}</div>
              <div className="text-[9px] text-slate-500 border-t border-slate-700/60 pt-1.5 mt-0.5 w-full text-center">flip →</div>
            </div>
            {/* Back */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.backGrad} rounded-xl p-3 border ${card.backBorder} flex flex-col items-center justify-center gap-1.5`}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className={`text-[9px] ${card.accentBack} font-black uppercase tracking-widest`}>Definition</div>
              <div className="text-[9px] text-slate-200 text-center leading-relaxed">{card.def}</div>
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
}


// ── Decision Simulation Preview ────────────────────────────────────────────────
function BranchingScenarioPreview() {
  const [phase, setPhase] = useState(0);
  const durations = [1200, 1800, 1200, 2000, 1800, 1500, 2800];
  useEffect(() => {
    const id = setTimeout(() => setPhase(p => (p + 1) % 7), durations[phase]);
    return () => clearTimeout(id);
  }, [phase]);

  const selB         = phase >= 2;
  const showConseq   = phase >= 3;
  const inPhase2     = phase >= 4;
  const selA2        = phase >= 5;
  const showProfile  = phase >= 6;

  return (
    <div className="select-none space-y-2">
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
          <motion.div key="phase1" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.3 }}>
            <div className="bg-slate-800 rounded-xl border-l-[3px] border-indigo-500 p-2.5 mb-2">
              <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest mb-0.5">Phase 1 — First Response</p>
              <p className="text-white text-[9px] font-semibold leading-snug">It's Monday morning. Priya flagged that Ethan missed two deliverables — and an urgent client email demands a response.</p>
              <p className="text-slate-300 text-[8px] mt-1">What is your first move?</p>
            </div>
            <div className="space-y-1.5">
              {[
                { text: 'Reply to the client immediately to buy time', sel: false },
                { text: 'Speak privately with Ethan before responding', sel: selB },
                { text: 'CC your director and ask for guidance', sel: false },
              ].map((o, i) => (
                <div key={i} className={`p-2 rounded-lg border transition-all duration-500 text-[8px] font-medium ${o.sel ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-400'}`}>
                  {o.text}{o.sel && <span className="ml-1 text-indigo-400 font-black">✓</span>}
                </div>
              ))}
            </div>
            {showConseq && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="mt-2 p-2 rounded-lg border border-emerald-500/60 bg-emerald-900/20">
                <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">✦ Strong choice</p>
                <p className="text-[8px] text-white leading-snug">Ethan reveals a family emergency. You now have full context before making any commitments.</p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="phase2" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.3 }}>
            <div className="bg-slate-800 rounded-xl border-l-[3px] border-violet-500 p-2.5 mb-2">
              <p className="text-[8px] text-violet-400 font-black uppercase tracking-widest mb-0.5">Phase 2 — Director Meeting</p>
              <p className="text-white text-[9px] font-semibold leading-snug">Your director's check-in is in 3 hours. How do you approach the meeting?</p>
            </div>
            <div className="space-y-1.5">
              {[
                { text: 'Bring a recovery plan with revised timelines', sel: selA2 },
                { text: 'Tell the director everything is under control', sel: false },
                { text: 'Escalate to HR before the meeting', sel: false },
              ].map((o, i) => (
                <div key={i} className={`p-2 rounded-lg border transition-all duration-500 text-[8px] font-medium ${o.sel ? 'border-indigo-500 bg-indigo-900/30 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-400'}`}>
                  {o.text}{o.sel && <span className="ml-1 text-indigo-400 font-black">✓</span>}
                </div>
              ))}
            </div>
            {showProfile && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="mt-2 p-2.5 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-2">Your Decision Profile</p>
                {[{ label:'Trust',val:82 },{ label:'Accountability',val:90 },{ label:'Morale',val:75 }].map(b => (
                  <div key={b.label} className="mb-1.5">
                    <div className="flex justify-between text-[7px] mb-0.5"><span className="text-slate-300">{b.label}</span><span className="text-white font-bold">{b.val}%</span></div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div initial={{ width:0 }} animate={{ width:`${b.val}%` }} transition={{ duration:0.8, delay:0.1 }} className="h-full bg-indigo-500 rounded-full" />
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

// ── Image Background Template Preview ─────────────────────────────────────────
const BG_TEMPLATES = [
  '/Reference/Images/40570635_l_normal_none.jpg',
  '/Reference/Images/72769332_l_normal_none.jpg',
  '/Reference/Images/124953787_l_normal_none.jpg',
  '/Reference/Images/129314759_l_normal_none.jpg',
];
function ImageBackgroundTemplatePreview() {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setSelected(s => (s + 1) % BG_TEMPLATES.length), 2400);
    return () => clearTimeout(id);
  }, [selected]);
  return (
    <div className="space-y-2">
      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Slide Canvas — Background Template</p>
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-700/50" style={{ paddingBottom: '56.25%' }}>
        {BG_TEMPLATES.map((src, i) => (
          <img key={i} src={src} alt="bg template" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700" style={{ opacity: i === selected ? 0.6 : 0 }} />
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
      <div className="mt-2">
        <div className="text-[8px] text-slate-600 font-bold mb-1.5 uppercase tracking-widest">Choose Template</div>
        <div className="flex gap-1.5">
          {BG_TEMPLATES.map((src, i) => (
            <div key={i} className={`relative w-12 h-8 rounded overflow-hidden border-2 transition-all duration-300 ${i === selected ? 'border-indigo-500 scale-105' : 'border-slate-700 opacity-60'}`}>
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
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

// ── Multi-Image Editor Preview ─────────────────────────────────────────────────
function MultiImageEditorPreview() {
  const [phase, setPhase] = useState(0); // 0=resize img1, 1=move img2, 2=crop img3

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 3), 2600);
    return () => clearInterval(id);
  }, []);

  const imgs = [
    '/Reference/Images/72769332_l_normal_none.jpg',
    '/Reference/Images/124953787_l_normal_none.jpg',
    '/Reference/Images/40570635_l_normal_none.jpg',
  ];

  return (
    <div className="space-y-3 w-full">
      {/* Action label */}
      <AnimatePresence mode="wait">
        <motion.p key={phase}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`text-[10px] font-black uppercase tracking-widest ${
            phase === 0 ? 'text-indigo-400' : phase === 1 ? 'text-violet-400' : 'text-amber-400'
          }`}
        >
          {phase === 0 ? '↔ Resizing Image 1' : phase === 1 ? '↕ Moving Image 2' : '⬚ Cropping Image 3'}
        </motion.p>
      </AnimatePresence>

      {/* Image collage — sits directly on the player background, no inner box */}
      <div className="relative w-full" style={{ height: '280px' }}>

        {/* Image 1 — large, left side */}
        <div
          className={`absolute top-0 left-0 rounded-xl overflow-hidden border-2 transition-all duration-500 ${
            phase === 0 ? 'border-indigo-400 shadow-2xl shadow-indigo-500/30' : 'border-slate-700/60 opacity-80'
          }`}
          style={{ width: '57%', height: '72%' }}
        >
          <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
          {/* Resize handles */}
          {phase === 0 && ['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5'].map(pos => (
            <motion.div key={pos}
              className={`absolute ${pos} w-3 h-3 bg-white border-2 border-indigo-400 rounded-sm z-10`}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          ))}
        </div>

        {/* Image 2 — top-right */}
        <motion.div
          className={`absolute top-0 right-0 rounded-xl overflow-hidden border-2 transition-colors duration-500 ${
            phase === 1 ? 'border-violet-400 shadow-2xl shadow-violet-500/30' : 'border-slate-700/60 opacity-80'
          }`}
          style={{ width: '40%', height: '48%' }}
          animate={phase === 1 ? { y: [-10, 10, -10] } : { y: 0 }}
          transition={phase === 1 ? { duration: 1.5, ease: 'easeInOut', repeat: Infinity } : { duration: 0.3 }}
        >
          <img src={imgs[1]} alt="" className="w-full h-full object-cover" />
          {phase === 1 && (
            <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center">
              <Move className="w-5 h-5 text-violet-300" />
            </div>
          )}
        </motion.div>

        {/* Image 3 — bottom-right */}
        <div
          className={`absolute bottom-0 right-0 rounded-xl overflow-hidden border-2 transition-all duration-500 ${
            phase === 2 ? 'border-amber-400 shadow-2xl shadow-amber-500/30' : 'border-slate-700/60 opacity-80'
          }`}
          style={{ width: '40%', height: '46%' }}
        >
          <img src={imgs[2]} alt="" className="w-full h-full object-cover" />
          {phase === 2 && (
            <motion.div
              className="absolute inset-3 border-2 border-amber-400 rounded-sm z-10"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>

        {/* Status badge — bottom-left */}
        <div className={`absolute bottom-0 left-0 flex items-center gap-1 border rounded-lg px-2 py-1 text-[9px] font-black transition-all duration-300 ${
          phase === 0 ? 'bg-slate-900/90 border-indigo-500/50 text-indigo-300'
          : phase === 1 ? 'bg-slate-900/90 border-violet-500/50 text-violet-300'
          : 'bg-slate-900/90 border-amber-500/50 text-amber-300'
        }`}>
          {phase === 0 ? '480 × 336 px' : phase === 1 ? 'X: 148  Y: 32' : 'Crop: 64%'}
        </div>
      </div>

      {/* Tool buttons */}
      <div className="flex gap-2">
        <button className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold border rounded-lg transition-all ${
          phase === 2 ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-slate-800 text-slate-500'
        }`}><Crop className="w-3.5 h-3.5" /> Crop</button>
        <button className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold border rounded-lg transition-all ${
          phase === 1 ? 'border-violet-500/50 bg-violet-500/10 text-violet-300' : 'border-slate-800 text-slate-500'
        }`}><Move className="w-3.5 h-3.5" /> Move</button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold border border-indigo-700/50 bg-indigo-500/10 rounded-lg text-indigo-300">
          <Image className="w-3.5 h-3.5" /> Add Image
        </button>
      </div>
    </div>
  );
}
// ── Slide definitions ─────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'click-reveal',
    label: 'Click & Reveal',
    subtitle: 'Exploring Key Concepts',
    icon: Layers,
    accent: 'text-indigo-400',
    accentBorder: 'border-indigo-500/30',
    bg: 'from-indigo-900/20 to-slate-950',
    component: <ClickRevealPreview />,
    description: 'Present layered content in expandable sections learners control.',
  },
  {
    id: 'branching',
    label: 'Branching Scenario',
    subtitle: 'Decision Simulation',
    icon: Globe,
    accent: 'text-cyan-400',
    accentBorder: 'border-cyan-500/30',
    bg: 'from-cyan-900/10 to-slate-950',
    component: <BranchingScenarioPreview />,
    description: 'Multi-phase role-play scenarios with consequence-driven feedback.',
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    subtitle: 'Key Terms & Definitions',
    icon: BookOpen,
    accent: 'text-purple-400',
    accentBorder: 'border-purple-500/30',
    bg: 'from-purple-900/10 to-slate-950',
    component: <FlashcardPreview />,
    description: '3D flip-card interactions for terminology and concept reinforcement.',
  },
  {
    id: 'bg-template',
    label: 'Image Backgrounds',
    subtitle: 'Visual Slide Templates',
    icon: Image,
    accent: 'text-rose-400',
    accentBorder: 'border-rose-500/30',
    bg: 'from-rose-900/10 to-slate-950',
    component: <ImageBackgroundTemplatePreview />,
    description: 'Apply rich background photography to any slide with one click.',
  },
  {
    id: 'multi-image',
    label: 'Multi-Image Editor',
    subtitle: 'Layout & Image Tools',
    icon: Crop,
    accent: 'text-violet-400',
    accentBorder: 'border-violet-500/30',
    bg: 'from-violet-900/10 to-slate-950',
    component: <MultiImageEditorPreview />,
    description: 'Drag, resize, and crop multiple images on the same slide.',
  },
];

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
  onGetStarted: () => void;
}

export function ExamplesPage({ onBack, onGetStarted }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = SLIDES[activeIndex];
  const progress = ((activeIndex + 1) / SLIDES.length) * 100;

  const goTo = (i: number) => setActiveIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));

  // Touch swipe state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only count as horizontal swipe if dx is dominant
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goTo(dx < 0 ? activeIndex + 1 : activeIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans overflow-x-hidden">

      {/* ── Top nav bar ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-extrabold text-lg text-white">
              NexCourse <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </span>
          </div>
          <button onClick={onGetStarted}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
            Try It Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="text-center py-14 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.12),transparent_60%)] pointer-events-none" />
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-widest mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Interactive Examples
          </span>
        </motion.div>
        <motion.h1 initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.08 }}
          className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
          See It In Action
        </motion.h1>
        <motion.p initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.14 }}
          className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Every interaction below is generated by NexCourse AI — no coding, no design skills required.
          Browse them as slides inside an actual eLearning player.
        </motion.p>
      </div>

      {/* ── Mock eLearning player ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.2 }}
          className="rounded-2xl border border-slate-700/60 overflow-hidden shadow-2xl shadow-slate-950/80">

          {/* Player top bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 bg-indigo-500/15 rounded-lg flex items-center justify-center border border-indigo-500/20 shrink-0">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight truncate">Effective Workplace Communication</p>
                <p className="text-slate-500 text-[11px]">Interactive Course Demo · NexCourse AI</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-slate-500 text-xs font-bold hidden sm:block">
                Slide <span className="text-slate-300">{activeIndex + 1}</span> of {SLIDES.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-300 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === SLIDES.length - 1}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-300 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Player body: sidebar + content — swipeable on mobile */}
          <div className="flex bg-slate-950 select-none" style={{ minHeight: '520px' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >

            {/* Slide navigator sidebar */}
            <div className="w-52 shrink-0 border-r border-slate-800/60 bg-slate-900/40 py-3 overflow-y-auto hidden md:block">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-3">Course Outline</p>
              {SLIDES.map((slide, i) => {
                const Icon = slide.icon;
                const isActive  = i === activeIndex;
                const isVisited = i < activeIndex;
                return (
                  <button key={i} onClick={() => setActiveIndex(i)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-2.5 border-l-2 transition-all ${
                      isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-transparent hover:bg-slate-800/50 hover:border-slate-700'
                    }`}>
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isVisited ? 'border-emerald-500 bg-emerald-500'
                      : isActive  ? 'border-indigo-400'
                                  : 'border-slate-700'
                    }`}>
                      {isVisited && <div className="w-2 h-2 text-white flex items-center justify-center"><svg viewBox="0 0 8 8" fill="none" className="w-2 h-2"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold leading-snug truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>{slide.label}</p>
                      <p className="text-[10px] text-slate-600 truncate mt-0.5">{slide.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Slide header */}
              <div className={`px-6 pt-5 pb-4 bg-gradient-to-r ${current.bg} border-b border-slate-800/60`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${current.accent}`}>
                    {current.label}
                  </span>
                  <span className="text-slate-700 text-[11px]">·</span>
                  <span className="text-slate-600 text-[11px]">Module {activeIndex + 1} of {SLIDES.length}</span>
                </div>
                <h2 className="text-white font-black text-lg leading-snug">{current.subtitle}</h2>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{current.description}</p>
              </div>

              {/* Interaction content */}
              <div className="flex-1 p-6 overflow-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity:0, x:16 }}
                    animate={{ opacity:1, x:0 }}
                    exit={{ opacity:0, x:-16 }}
                    transition={{ duration:0.22, ease:'easeOut' }}
                  >
                    {current.component}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation footer inside main area */}
              <div className="border-t border-slate-800/60 px-6 py-3 flex items-center justify-between bg-slate-900/30">
                <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                {/* Dot indicators */}
                <div className="flex items-center gap-1.5">
                  {SLIDES.map((_, i) => (
                    <button key={i} onClick={() => setActiveIndex(i)}
                      className={`rounded-full transition-all ${i === activeIndex ? 'w-5 h-2 bg-indigo-500' : i < activeIndex ? 'w-2 h-2 bg-emerald-600' : 'w-2 h-2 bg-slate-700 hover:bg-slate-600'}`}
                    />
                  ))}
                </div>
                <button onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === SLIDES.length - 1}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar (full width) */}
          <div className="bg-slate-900 border-t border-slate-800 px-5 py-2.5 flex items-center gap-4">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-600 shrink-0">{Math.round(progress)}% complete</span>
          </div>
        </motion.div>

        {/* ── Mobile swipe hint ──────────────────────────────────── */}
        <p className="mt-3 text-center text-[11px] text-slate-600 md:hidden select-none">
          ← Swipe to explore →
        </p>

        {/* ── Mobile slide selector ─────────────────────────────────── */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {SLIDES.map((slide, i) => {
            const Icon = slide.icon;
            return (
              <button key={i} onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
                  i === activeIndex ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 text-slate-500 hover:border-slate-700'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {slide.label}
              </button>
            );
          })}
        </div>

        {/* ── CTA below player ────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.4 }}
          className="mt-14 text-center">
          <p className="text-slate-500 text-sm mb-2">All of these interactions are generated by AI in seconds.</p>
          <p className="text-slate-300 font-semibold mb-6">Ready to build your own?</p>
          <button onClick={onGetStarted}
            className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-10 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all">
            Start Building Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-slate-600 text-xs mt-4">No credit card required to get started.</p>
        </motion.div>
      </div>
    </div>
  );
}
