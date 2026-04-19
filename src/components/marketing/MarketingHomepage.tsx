import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Zap, ArrowRight, Sparkles, Brain, Gamepad2, Mic,
  FileOutput, GraduationCap, Building2, CheckCircle2,
  ChevronRight, Shield, Layers, BarChart3, BookOpen,
  Award, X, Menu, Volume2, Play, Pause, SkipForward,
  ChevronDown, ChevronUp, Globe
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
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

// ── Interaction Showcase Card ─────────────────────────────────────────────────
function ShowcaseCard({ label, icon: Icon, preview, accent }: {
  label: string; icon: React.ElementType; preview: React.ReactNode; accent: string;
}) {
  return (
    <div className={`shrink-0 w-72 rounded-2xl border ${accent} bg-slate-900/80 overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${accent} flex items-center gap-2 bg-slate-800/40`}>
        <Icon className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-bold text-slate-300">{label}</span>
      </div>
      <div className="p-4">{preview}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MarketingHomepage({ onGetStarted, onSignIn }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeVoice, setActiveVoice] = useState('nova');
  const [narrationPlaying, setNarrationPlaying] = useState(false);

  const voices = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];

  const features = [
    { icon: Brain,      title: 'AI Course Generation',    description: 'Paste a topic or upload a document — our AI drafts a full course outline with slides, quizzes, and narration in minutes.',       color: 'from-indigo-600/20 to-purple-600/20', delay: 0 },
    { icon: Gamepad2,   title: 'Game-Based Learning',     description: 'Choose from Jeopardy, Millionaire, Escape Room, Family Feud, and more. Turn assessments into memorable experiences.',             color: 'from-purple-600/20 to-pink-600/20',   delay: 0.05 },
    { icon: Mic,        title: 'AI Voice-Over Narration', description: 'Every slide gets a professional AI voice-over generated automatically. Choose from 6 voices and multiple playback speeds.',        color: 'from-cyan-600/20 to-blue-600/20',     delay: 0.1 },
    { icon: FileOutput, title: 'SCORM Export',            description: 'Export SCORM 1.2 and 2004 packages ready to upload to any LMS — Canvas, Moodle, Blackboard, Cornerstone, and more.',             color: 'from-emerald-600/20 to-teal-600/20', delay: 0.15 },
    { icon: Layers,     title: 'Rich Interactions',       description: 'Accordion, flashcards, timelines, branching scenarios, drag-and-drop, matching, tabbed panels — all AI-generated automatically.', color: 'from-amber-600/20 to-orange-600/20',  delay: 0.2 },
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
        <motion.div animate={{ scale: [1,1.08,1], opacity:[0.15,0.22,0.15] }} transition={{ duration: 8, repeat: Infinity, ease:'easeInOut' }}
          className="absolute top-0 right-0 w-[700px] h-[700px] bg-indigo-600 rounded-full blur-[160px] transform translate-x-1/2 -translate-y-1/3" />
        <motion.div animate={{ scale: [1,1.1,1], opacity:[0.1,0.18,0.1] }} transition={{ duration: 10, repeat: Infinity, ease:'easeInOut', delay:2 }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-700 rounded-full blur-[140px] transform -translate-x-1/3 translate-y-1/3" />
        <motion.div animate={{ scale: [1,1.06,1], opacity:[0.08,0.14,0.08] }} transition={{ duration: 12, repeat: Infinity, ease:'easeInOut', delay:5 }}
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
              CourseGEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features"  className="hover:text-white transition-colors">Features</a>
            <a href="#showcase"  className="hover:text-white transition-colors">Interactions</a>
            <a href="#tracks"    className="hover:text-white transition-colors">Who It's For</a>
            <a href="#pricing"   className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onSignIn} className="hidden md:flex text-sm font-bold text-slate-300 hover:text-white transition-colors px-4 py-2">Sign In</button>
            <button onClick={onGetStarted} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30">
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
            <button className="md:hidden text-slate-400" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-4 flex flex-col gap-3 text-sm font-medium text-slate-300">
              {['Features','Interactions',"Who It's For",'Pricing'].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(/[^a-z]/g,'')}`} onClick={() => setMenuOpen(false)} className="hover:text-white transition-colors py-1">{l}</a>
              ))}
              <button onClick={() => { setMenuOpen(false); onSignIn(); }} className="text-left pt-2 border-t border-slate-800 text-indigo-400">Sign In →</button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 pt-8 pb-24 overflow-hidden">

        {/* Background video — same as App Dashboard */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video src="/landing_background_3.mp4" autoPlay loop muted playsInline
            className="absolute top-0 left-0 w-full h-auto scale-90 origin-top opacity-20 mix-blend-screen" />
          <div className="absolute inset-0 bg-slate-950/50" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered eLearning Builder
          </motion.div>

          {/* App title — large, prominent */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}
            className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[1.02] tracking-tight mb-4">
            CourseGEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">AI</span>
          </motion.h1>

          {/* Primary tagline — small, punchy */}
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}
            className="text-indigo-300/80 text-lg md:text-xl font-semibold tracking-wide mb-5">
            Turn any topic into a complete eLearning course — instantly.
          </motion.p>

          {/* Secondary subtext */}
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
            className="text-slate-400 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
            AI generates your slides, quizzes, games, and voice-over narration. Export SCORM-ready packages to any LMS. Built for{' '}
            <span className="text-indigo-300 font-semibold">corporate trainers</span> and{' '}
            <span className="text-emerald-300 font-semibold">K-12 educators</span>.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-col sm:flex-row gap-4 mb-20">
            <button onClick={onGetStarted}
              className="group flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all">
              Start Building Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={onSignIn}
              className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/60 text-slate-200 font-bold text-base px-8 py-4 rounded-2xl transition-all">
              Sign In to Dashboard
            </button>
          </motion.div>

          {/* ── UI Mockup ─────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.38 }}
            className="relative w-full max-w-5xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-cyan-500/30 rounded-3xl blur-xl" />
            <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800 bg-slate-950/60">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 mx-4 bg-slate-800 rounded-lg h-6 flex items-center px-3">
                  <span className="text-slate-500 text-xs font-mono">app.coursegen.ai/player</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Zap className="w-3 h-3 text-indigo-400" />CourseGEN AI
                </div>
              </div>

              {/* Content area */}
              <div className="grid grid-cols-12 min-h-[420px]">

                {/* ── Left: Course Outline (player-style numbered) ── */}
                <div className="col-span-3 border-r border-slate-800 bg-slate-950/50 p-3 overflow-y-auto">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-2 mb-2">Course Outline</div>
                  {[
                    { num: 1, title: 'Introduction', slides: ['1.1  Title Slide', '1.2  Objectives'] },
                    { num: 2, title: 'Core Concepts', slides: ['2.1  Key Terms', '2.2  Flashcards', '2.3  Knowledge Check'] },
                    { num: 3, title: 'Application', slides: ['3.1  Scenario', '3.2  Branching', '3.3  Summary'] },
                    { num: 4, title: 'Assessment', slides: ['4.1  Mastery Quiz', '4.2  Results'] },
                  ].map((mod, mi) => (
                    <div key={mi} className="mb-1">
                      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${mi === 1 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${mi === 1 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{mod.num}</span>
                        {mod.title}
                      </div>
                      {mi === 1 && (
                        <div className="ml-3 mt-0.5 space-y-px">
                          {mod.slides.map((s, si) => (
                            <div key={si} className={`flex items-center gap-1.5 pl-3 py-1 text-[9px] border-l-2 transition-all cursor-pointer ${si === 1 ? 'border-indigo-500 text-indigo-300 font-bold' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>
                              {si === 1 && <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />}
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Center: Quiz Interaction ── */}
                <div className="col-span-6 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
                  <div className="w-full max-w-sm">
                    <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Award className="w-3 h-3" /> Knowledge Check — Module 2
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 space-y-3">
                      <p className="text-white text-xs font-bold leading-relaxed">
                        Which interaction type is best suited for comparing two or more concepts side-by-side?
                      </p>
                      {[
                        { text: 'Accordion', correct: false },
                        { text: 'Flashcards', correct: false },
                        { text: 'Tabbed Panel', correct: true },
                        { text: 'Timeline', correct: false },
                      ].map((opt, oi) => (
                        <div key={oi} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          opt.correct
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                        }`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${opt.correct ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                            {opt.correct && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          {opt.text}
                          {opt.correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />}
                        </div>
                      ))}
                      <div className="pt-2 border-t border-slate-700/50">
                        <p className="text-[10px] text-emerald-400/80 leading-relaxed">✓ Correct! Tabbed panels let learners compare multiple concepts within a single clean interface.</p>
                      </div>
                    </div>
                    {/* Player seekbar */}
                    <div className="mt-4 bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                          <Play className="w-3 h-3 text-indigo-400 ml-0.5" />
                        </button>
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full relative">
                          <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-2/5" />
                          <div className="absolute top-1/2 left-[40%] -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow border-2 border-indigo-500" />
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap">1:24 / 3:15</span>
                        <Volume2 className="w-3 h-3 text-slate-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Right: AI Narration Panel (player-style) ── */}
                <div className="col-span-3 border-l border-slate-800 bg-slate-950/50 p-3 flex flex-col gap-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">AI Narration</div>

                  {/* Voice selector */}
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1.5 font-medium">Voice</div>
                    <div className="grid grid-cols-2 gap-1">
                      {voices.map(v => (
                        <button key={v} onClick={() => setActiveVoice(v)}
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-bold capitalize transition-all border ${activeVoice === v ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Waveform visualizer */}
                  <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Preview</span>
                      <button onClick={() => setNarrationPlaying(p => !p)}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${narrationPlaying ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {narrationPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                      </button>
                    </div>
                    {/* Waveform bars */}
                    <div className="flex items-end justify-center gap-0.5 h-8">
                      {[4,7,5,9,6,11,8,6,10,7,5,9,6,4,8,6,11,7,5,9].map((h, i) => (
                        <motion.div key={i}
                          animate={narrationPlaying ? { scaleY: [1, 0.4 + Math.random() * 0.6, 1] } : { scaleY: 1 }}
                          transition={{ duration: 0.4 + i * 0.03, repeat: Infinity, ease: 'easeInOut' }}
                          style={{ height: `${h * 2.5}px` }}
                          className={`w-1 rounded-full origin-bottom ${narrationPlaying ? 'bg-indigo-400' : 'bg-slate-700'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Speed selector */}
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1.5 font-medium">Playback Speed</div>
                    <div className="flex gap-1">
                      {['0.75×', '1×', '1.25×', '1.5×'].map(s => (
                        <button key={s} className={`flex-1 py-1 rounded text-[8px] font-bold border transition-all ${s === '1×' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'border-slate-800 text-slate-600 hover:border-slate-700'}`}>{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Generate button */}
                  <button className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white border border-indigo-500/30 hover:from-indigo-500/80 hover:to-purple-500/80 transition-all flex items-center justify-center gap-1.5 mt-auto">
                    <Mic className="w-3 h-3" /> Generate All
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-800/60 bg-slate-900/30 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ label, value, suffix }) => (
            <div key={label}>
              <div className="text-4xl font-black text-white mb-1">
                <AnimatedCounter target={value} suffix={suffix} />
              </div>
              <p className="text-slate-500 text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-3">Everything You Need</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-black text-white leading-tight">
              One Platform.<br />Every eLearning Need.
            </motion.h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── Interactions Showcase ────────────────────────────────────────────── */}
      <section id="showcase" className="py-24 bg-slate-900/30 border-y border-slate-800/60 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-purple-400 text-sm font-black uppercase tracking-widest mb-3">See It In Action</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-black text-white">
              Rich Interactions,<br />Zero Effort
            </motion.h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">Our AI selects and populates the right interaction type for each piece of content automatically.</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            <ShowcaseCard label="Accordion" icon={Layers} accent="border-indigo-700/40"
              preview={<div className="space-y-2">{['What is Active Listening?', 'Barriers in Remote Teams', 'Practical Techniques', 'Common Mistakes'].map((t, i) => (
                <div key={i} className={`px-3 py-2 rounded-lg text-xs border flex items-center justify-between cursor-pointer ${i === 0 ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200' : 'border-slate-700 text-slate-500'}`}>
                  {t} <ChevronRight className={`w-3 h-3 ${i === 0 ? 'rotate-90 text-indigo-400' : 'text-slate-600'}`} />
                </div>
              ))}</div>}
            />
            <ShowcaseCard label="Flashcards" icon={BookOpen} accent="border-purple-700/40"
              preview={<div className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-xl p-4 text-center border border-purple-500/20 min-h-[110px] flex flex-col items-center justify-center gap-2">
                <div className="text-xs text-purple-400 font-bold uppercase tracking-widest">Term</div>
                <div className="font-bold text-white text-sm">Bloom's Taxonomy</div>
                <div className="text-[10px] text-slate-400 border-t border-slate-700 pt-2 mt-1 w-full text-center">Tap to reveal definition →</div>
              </div>}
            />
            <ShowcaseCard label="Knowledge Quiz" icon={Award} accent="border-emerald-700/40"
              preview={<div className="space-y-2">
                <p className="text-xs font-bold text-white mb-3">Which interaction type is best for comparing options?</p>
                {['Accordion', 'Timeline', 'Matching Activity', 'Branching Scenario'].map((o, i) => (
                  <div key={i} className={`px-3 py-2 rounded-lg text-xs border flex items-center gap-2 ${i === 2 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 text-slate-500'}`}>
                    {i === 2 && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                    {i !== 2 && <div className="w-3 h-3 rounded-full border border-slate-600 shrink-0" />}
                    {o}
                  </div>
                ))}
              </div>}
            />
            <ShowcaseCard label="Jeopardy Game" icon={Gamepad2} accent="border-amber-700/40"
              preview={<div className="grid grid-cols-3 gap-1.5">
                {['Safety', 'Compliance', 'Procedures'].map(c => <div key={c} className="text-center text-[9px] font-black text-amber-300 uppercase py-1.5 bg-amber-500/10 rounded">{c}</div>)}
                {[100,200,300,100,200,300,100,200,300].map((v, i) => (
                  <div key={i} className={`text-center text-xs font-black py-2 rounded cursor-pointer transition-all ${i === 4 ? 'bg-amber-500 text-slate-900' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}>${v}</div>
                ))}
              </div>}
            />
            <ShowcaseCard label="Branching Scenario" icon={Globe} accent="border-cyan-700/40"
              preview={<div className="space-y-2">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2.5 text-[10px] text-cyan-200">A team member raises a concern. How do you respond?</div>
                {['Acknowledge and schedule follow-up', 'Redirect the conversation', 'Address it publicly now'].map((o, i) => (
                  <div key={i} className={`px-2 py-1.5 rounded text-[10px] border cursor-pointer ${i === 0 ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>→ {o}</div>
                ))}
              </div>}
            />
          </div>
        </div>
      </section>

      {/* ── Dual Track ───────────────────────────────────────────────────────── */}
      <section id="tracks" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-emerald-400 text-sm font-black uppercase tracking-widest mb-3">Built For Two Worlds</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-black text-white">One Tool. Two Tracks.</motion.h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/20 to-purple-900/10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Corporate Training</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">Onboarding, compliance, soft skills, product training — delivered in polished SCORM-exportable formats your LMS will love.</p>
              <ul className="space-y-2.5">
                {['SCORM 1.2 & 2004 export','Compliance & HR course templates','Mastery quiz with score reporting','Branching scenarios & simulations','Enterprise DPA agreements available'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="mt-8 flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200 transition-colors group">
                Explore Corporate Plans <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-teal-900/10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5">
                <GraduationCap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Education (K-12)</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">From lesson plans to engaging digital experiences. Built with teachers in mind — I Can statements, formative assessments, and age-appropriate interactions.</p>
              <ul className="space-y-2.5">
                {['"I Can" learning targets (K-12 aligned)','Early & upper elementary UI modes','Formative assessment & exit tickets','Interactive games students love','FERPA-compliant, district-ready'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="mt-8 flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors group">
                Explore Education Plans <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Pricing Teaser ───────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-slate-900/30 border-y border-slate-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-amber-400 text-sm font-black uppercase tracking-widest mb-3">Flexible Plans</motion.p>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-black text-white mb-4">Start Free. Scale When Ready.</motion.h2>
          <p className="text-slate-400 text-lg mb-10">Teacher Free plan available. No credit card required.</p>
          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            {[
              { name: 'Free',       price: '$0',     color: 'border-slate-700',          textColor: 'text-slate-300',  badge: null },
              { name: 'Pro',        price: '$49',    color: 'border-indigo-500/50 bg-indigo-500/5', textColor: 'text-indigo-300', badge: 'Most Popular' },
              { name: 'Enterprise', price: 'Custom', color: 'border-slate-700',          textColor: 'text-slate-300',  badge: null },
            ].map(({ name, price, color, textColor, badge }) => (
              <div key={name} className={`relative p-6 rounded-2xl border ${color} text-center`}>
                {badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white px-3 py-1 rounded-full whitespace-nowrap">{badge}</div>}
                <p className={`font-black text-base mb-1 ${textColor}`}>{name}</p>
                <p className="text-3xl font-black text-white">{price}<span className="text-sm text-slate-500 font-medium">{price !== 'Custom' ? '/mo' : ''}</span></p>
              </div>
            ))}
          </div>
          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-10 py-4 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all">
            View Full Pricing <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">Ready to Transform<br />Your Training?</h2>
            <p className="text-slate-400 text-lg mb-10">Join educators and trainers who build courses in minutes, not months.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={onGetStarted}
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-10 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all">
                Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={onSignIn}
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
            <span className="font-extrabold text-base text-white">CourseGEN <span className="text-indigo-400">AI</span></span>
          </div>
          <span className="text-slate-600 text-sm">© 2025 CourseGEN AI. All rights reserved.</span>
          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
            <Shield className="w-3 h-3" /> Your data is always kept private & safe
          </div>
        </div>
      </footer>

    </div>
  );
}
