import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Zap, ArrowRight, Sparkles, Brain, Layers, Mic,
  FileOutput, GraduationCap, Building2, CheckCircle2,
  ChevronRight, ChevronLeft, ChevronDown, Shield, BarChart3, BookOpen,
  Award, X, Menu, Volume2, Play, Pause,
  Eye, EyeOff, Image,
  AlertCircle, Lock, MessageSquare, Send, Loader2, Mail
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
  onMethodology?: () => void;
  onViewPricing?: () => void;
  onExamples?: () => void;
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

// (Interaction previews moved to ExamplesPage.tsx)



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

        {/* Google sign-in — white surface, Google brand colours */}
        <button type="button" onClick={handleGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-[#f8faff] border border-[#747775] hover:border-[#4285F4] text-[#1f1f1f] font-medium text-sm transition-all disabled:opacity-60 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4]/40"
          aria-label="Continue with Google">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
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
export function MarketingHomepage({ onGetStarted, onSignIn, onMethodology, onViewPricing, onExamples }: Props) {
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
    { q: 'How does NexCourse AI work?', a: 'Upload a PDF, Word doc, PowerPoint, or technical document. NexCourse AI analyzes the file, applies instructional design structure, and builds an interactive course with slides, knowledge checks, and narration. Export a SCORM package straight to your LMS—typically in minutes, not weeks.' },
    { q: 'What file types does it support?', a: 'PDF, Microsoft PowerPoint (.pptx), and Microsoft Word (.docx). You can also type a topic if you do not have a file yet.' },
    { q: 'Do I need experience with authoring tools?', a: 'No. Subject matter experts and corporate teams can publish without authoring-tool expertise. Instructional designers get extra Course Settings controls—objectives, assessments, interactions, and structure—then can edit everything before publishing.' },
    { q: 'Is there a free trial?', a: 'We offer trial access by invitation—contact us to request early access. Paid plans are credit-based and cover course generation, AI narration, and interactive content.' },
    { q: 'What is SCORM and which LMS platforms does it work with?', a: 'SCORM is the standard package format for eLearning. NexCourse AI exports SCORM 1.2 and 2004 packages for LMS platforms such as Moodle, Canvas, Blackboard, Cornerstone, TalentLMS, Docebo, and more.' },
    { q: 'Can I edit the AI-generated course?', a: 'Yes. Every slide is editable after generation—text, structure, images, quizzes, narration, and interactions—before you export.' },
    { q: 'Is my data and content private?', a: 'Yes. Uploaded files and generated courses stay private to your account. We do not use your content to train AI models.' },
    { q: 'How do I cancel my subscription?', a: 'Cancel anytime from My Account & Billing. No cancellation fees; your plan stays active until the end of the billing period.' },
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
    { icon: Brain,      title: 'Document → Course',       description: 'Upload a technical document, PDF, Word doc, or PowerPoint. AI structures modules, objectives, and slides using adult-learning principles.', color: 'from-indigo-600/20 to-purple-600/20', delay: 0 },
    { icon: Layers,     title: 'Interactions Built In',   description: 'Hotspots, tabs, flashcards, timelines, and assessments are all integrated—no eLearning design or development experience needed.', color: 'from-purple-600/20 to-pink-600/20',   delay: 0.05 },
    { icon: Mic,        title: 'AI Voice-Over',            description: 'Professional narration generated for each slide. Choose voices and speeds, then edit scripts anytime.',        color: 'from-cyan-600/20 to-blue-600/20',     delay: 0.1 },
    { icon: FileOutput, title: 'SCORM for Any LMS',        description: 'Export SCORM 1.2 or 2004 and publish to Canvas, Moodle, Blackboard, Cornerstone, and more.',                      color: 'from-emerald-600/20 to-teal-600/20', delay: 0.15 },
    { icon: Image,      title: 'Edit Before You Publish',  description: 'Refine text, images, quizzes, and interactions in preview—full control without rebuilding from scratch.',         color: 'from-amber-600/20 to-orange-600/20',  delay: 0.2 },
    { icon: BarChart3,  title: 'Quizzes & Tracking',      description: 'Mastery checks with completion and score reporting that align with your LMS.',          color: 'from-rose-600/20 to-red-600/20',      delay: 0.25 },
  ];

  const stats = [
    { label: 'Interaction Types',  value: 20,  suffix: '+' },
    { label: 'Knowledge Checks',   value: 8,   suffix: '+' },
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
            <button onClick={() => onExamples?.()}              className="hover:text-white transition-colors cursor-pointer">Examples</button>
            <button onClick={() => smoothScrollTo('tracks')}    className="hover:text-white transition-colors cursor-pointer">Who It's For</button>
            <button onClick={() => onViewPricing?.()}           className="hover:text-white transition-colors cursor-pointer">Pricing</button>
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
              className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-4 flex flex-col gap-1 text-sm font-medium text-slate-300 overflow-hidden">
              {([
                { label: 'Features',     scrollId: 'features'  },
                { label: 'Interactions', scrollId: null        },
                { label: "Who It's For", scrollId: 'tracks'   },
                { label: 'Pricing',      scrollId: null        },
              ] as { label: string; scrollId: string | null }[]).map(({ label, scrollId }) => (
                <button key={label}
                  onClick={() => {
                    setMenuOpen(false);
                    if (label === 'Interactions') {
                      setTimeout(() => onExamples?.(), 50);
                    } else if (label === 'Pricing') {
                      setTimeout(() => onViewPricing?.(), 50);
                    } else if (scrollId) {
                      // Delay scroll until the close animation finishes (~260 ms)
                      setTimeout(() => smoothScrollTo(scrollId), 280);
                    }
                  }}
                  className="text-left hover:text-white transition-colors py-3 min-h-[44px] flex items-center border-b border-slate-800/40 last:border-0"
                >{label}</button>
              ))}
              <button onClick={() => { setMenuOpen(false); onSignIn(); }} className="text-left pt-3 border-t border-slate-800 text-indigo-400 min-h-[44px] flex items-center">Sign In →</button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero — brand first, one clear promise, one supporting line ───────── */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center text-center px-6 pt-10 pb-20 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Upload a file. Publish to your LMS.
          </motion.div>

          <motion.h1 initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.55, delay:0.05 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-[1.05]">
            <span className="text-white">NexCourse </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
          </motion.h1>

          <motion.p initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.12 }}
            className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4 max-w-2xl leading-snug">
            Upload a document. Get an interactive, LMS-ready course.
          </motion.p>

          <motion.p initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.2 }}
            className="text-slate-400 text-base md:text-lg max-w-xl mb-10 leading-relaxed">
            PDFs, PowerPoints, Word docs, and technical documents become ready-made eLearning courses in minutes—no development experience needed.
          </motion.p>

          <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.26 }}
            className="flex flex-col sm:flex-row gap-4">
            <button onClick={onGetStarted}
              className="group flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all">
              Start Building Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={onSignIn}
              className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/60 text-slate-200 font-bold text-base px-8 py-4 rounded-2xl transition-all">
              Sign In
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Features (below the fold) ─────────────────────────────────────────── */}
      <section id="features" className="relative py-20 px-6 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-indigo-400 text-sm font-black uppercase tracking-widest mb-3">
            What you get
          </p>
          <h2 className="text-center text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            From file upload to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">SCORM package</span>
          </h2>
          <p className="text-center text-slate-400 text-base max-w-2xl mx-auto mb-12">
            A massive time-saver for people who need training published—not another authoring tool to learn.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => onExamples?.()}
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors group"
            >
              See interactive examples
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-t border-slate-800/60 mt-16 pt-10">
            {stats.map(({ label, value, suffix }) => (
              <div key={label}>
                <div className="text-3xl font-black text-white mb-1"><AnimatedCounter target={value} suffix={suffix} /></div>
                <p className="text-slate-500 text-xs font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/10 to-slate-950 pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-cyan-400 text-sm font-black uppercase tracking-widest mb-3">
              Simple 3-Step Process
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-black text-white mb-4">
              From document to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                published course
              </span>{' '}
              in minutes.
            </motion.h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Upload what you already have. We apply instructional design and build the interactions.
            </p>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connecting dashed line (desktop only) */}
            <div className="hidden md:block absolute top-14 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px border-t-2 border-dashed border-slate-700/70 z-0" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {[
                {
                  step: '01',
                  icon: FileOutput,
                  color: 'from-cyan-600/20 to-blue-600/20',
                  iconColor: 'text-cyan-400',
                  borderColor: 'border-cyan-500/30',
                  pillColor: 'bg-cyan-500/20 text-cyan-300',
                  title: 'Upload Your File',
                  description: 'Drop in a technical document, PowerPoint, Word file, or PDF. Or type a topic if you are starting from scratch.',
                  tags: ['PDF', 'PPTX', 'DOCX', 'Topic'],
                },
                {
                  step: '02',
                  icon: Brain,
                  color: 'from-indigo-600/20 to-purple-600/20',
                  iconColor: 'text-indigo-400',
                  borderColor: 'border-indigo-500/30',
                  pillColor: 'bg-indigo-500/20 text-indigo-300',
                  title: 'AI Designs the Course',
                  description: 'NexCourse AI analyzes your content, applies adult-learning structure, and builds slides, knowledge checks, interactions, and narration.',
                  tags: ['Slides', 'Quizzes', 'Interactions', 'Voice-over'],
                },
                {
                  step: '03',
                  icon: Award,
                  color: 'from-emerald-600/20 to-teal-600/20',
                  iconColor: 'text-emerald-400',
                  borderColor: 'border-emerald-500/30',
                  pillColor: 'bg-emerald-500/20 text-emerald-300',
                  title: 'Edit, Export, Publish',
                  description: 'Refine anything in preview, then download SCORM 1.2 or 2004 and upload to your company LMS—completion tracking included.',
                  tags: ['SCORM 1.2', 'SCORM 2004', 'Any LMS'],
                },
              ].map(({ step, icon: Icon, color, iconColor, borderColor, pillColor, title, description, tags }, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className={`relative flex flex-col items-center text-center p-8 rounded-3xl border ${borderColor} bg-gradient-to-b ${color} backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300`}
                >
                  {/* Step number */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-black px-3 py-1 rounded-full border ${borderColor} ${pillColor} tracking-widest uppercase`}>
                    Step {step}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br ${color} border ${borderColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 ${iconColor}`} />
                  </div>

                  <h3 className="text-xl font-black text-white mb-3">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">{description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap justify-center gap-2 mt-auto">
                    {tags.map(tag => (
                      <span key={tag} className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${pillColor} border ${borderColor}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-14"
          >
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base px-10 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all group"
            >
              Try It Now — It's Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-slate-500 text-xs mt-4">No credit card required · SCORM export included</p>
          </motion.div>
        </div>
      </section>

      {/* ── Who It's For — three clear upload personas ───────────────────────── */}
      <section id="tracks" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
              className="text-emerald-400 text-sm font-black uppercase tracking-widest mb-3">Who it's for</motion.p>
            <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ duration:0.5 }} className="text-3xl md:text-4xl font-black text-white mb-4">
              You bring the content. We build the course.
            </motion.h2>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              No eLearning developer required. Experienced authors still save hours—and can edit before publishing.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: GraduationCap,
                border: 'border-emerald-500/20',
                bg: 'from-emerald-900/20 to-teal-900/10',
                iconBg: 'bg-emerald-500/20 border-emerald-500/30',
                iconColor: 'text-emerald-400',
                checkColor: 'text-emerald-400',
                title: 'Subject Matter Experts',
                body: 'Upload a technical document or general instruction (GI). We apply instructional design so you can publish training without authoring-tool experience.',
                bullets: ['Technical PDFs & process docs', 'Adult-learning structure applied', 'SCORM export to your LMS'],
              },
              {
                icon: BookOpen,
                border: 'border-indigo-500/20',
                bg: 'from-indigo-900/20 to-purple-900/10',
                iconBg: 'bg-indigo-500/20 border-indigo-500/30',
                iconColor: 'text-indigo-400',
                checkColor: 'text-indigo-400',
                title: 'Instructional Designers',
                body: 'Upload source content, then use Course Settings to shape the course—objectives, assessments, interactions, and structure. Familiar ID controls, without rebuilding everything by hand.',
                bullets: ['Tune objectives, quizzes & interactions', 'Skip manual work in authoring tools', 'Full edit control before publishing'],
              },
              {
                icon: Building2,
                border: 'border-cyan-500/20',
                bg: 'from-cyan-900/20 to-blue-900/10',
                iconBg: 'bg-cyan-500/20 border-cyan-500/30',
                iconColor: 'text-cyan-400',
                checkColor: 'text-cyan-400',
                title: 'Corporate Teams',
                body: 'Upload the PowerPoint, Word doc, or PDF you already use. Get an interactive eLearning version ready for employees.',
                bullets: ['PPT, Word, or PDF in', 'Interactive course out', 'Publish straight to the LMS'],
              },
            ].map(({ icon: Icon, border, bg, iconBg, iconColor, checkColor, title, body, bullets }, i) => (
              <motion.div
                key={title}
                initial={{ opacity:0, y:24 }}
                whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }}
                transition={{ duration:0.45, delay: i * 0.08 }}
                className={`p-7 rounded-3xl border ${border} bg-gradient-to-br ${bg} flex flex-col`}
              >
                <div className={`w-11 h-11 rounded-2xl ${iconBg} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">{body}</p>
                <ul className="space-y-2 mt-auto">
                  {bullets.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 className={`w-4 h-4 ${checkColor} shrink-0 mt-0.5`} />{item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.45 }}
            className="text-center">
            <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
              Try It Free <ArrowRight className="w-4 h-4" />
            </button>
            {onMethodology && (
              <button onClick={onMethodology} className="ml-0 sm:ml-4 mt-3 sm:mt-0 inline-flex items-center gap-2 text-slate-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                Learn about our methodology <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing Teaser ───────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-slate-900/30 border-y border-slate-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
            className="text-amber-400 text-sm font-black uppercase tracking-widest mb-3">Simple, Transparent Pricing</motion.p>
          <motion.h2 initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
            transition={{ duration:0.5 }} className="text-4xl md:text-5xl font-black text-white mb-4">Credit-Based Plans for Every Team.</motion.h2>
          <p className="text-slate-400 text-lg mb-10">Purpose-built for corporate L&amp;D — from independent designers to enterprise organizations.</p>
          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            {[
              {
                name: 'Pro Creator',
                price: '$79',
                priceNote: 'per user / month · billed annually',
                color: 'border-slate-700',
                textColor: 'text-slate-300',
                badge: null,
                highlighted: false,
                features: ['Full AI course generation', 'All interactive templates', 'SCORM 1.2 & 2004 exports', 'Standard & HD TTS Audio', 'Premium support'],
                featureColor: 'text-slate-300',
              },
              {
                name: 'Business Team',
                price: '$149',
                priceNote: 'per user / month · billed annually',
                color: 'border-indigo-500/50 bg-indigo-500/5',
                textColor: 'text-indigo-300',
                badge: 'Best Value',
                highlighted: true,
                features: ['Everything in Pro Creator', 'HD TTS Audio (all 6 voices)', 'Up to 5 user seats', 'SCORM completion & score reporting', 'Priority email support'],
                featureColor: 'text-indigo-200',
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                priceNote: '',
                color: 'border-slate-700',
                textColor: 'text-slate-300',
                badge: null,
                highlighted: false,
                features: ['Custom AI configuration', 'Dedicated account manager', 'SLA guarantees', 'Custom contract & billing', 'API access'],
                featureColor: 'text-slate-300',
              },
            ].map(({ name, price, priceNote, color, textColor, badge, highlighted, features: planFeatures, featureColor }) => (
              <div key={name} className={`relative p-6 rounded-2xl border ${color} text-center ${highlighted ? 'scale-[1.03]' : ''}`}>
                {badge && <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap ${highlighted ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{badge}</div>}
                <p className={`font-black text-base mb-1 ${textColor}`}>{name}</p>
                <p className="text-3xl font-black text-white mb-1">{price}{price !== 'Custom' && <span className="text-sm text-slate-500 font-medium"> /user</span>}</p>
                {priceNote && <p className="text-[11px] text-slate-600 mb-4">{priceNote}</p>}
                <ul className="space-y-2 text-left mt-4">
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
          <button onClick={() => onViewPricing?.()}
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
            <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">Upload a document.<br />Publish to your LMS.</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Turn the files you already have into interactive, SCORM-ready eLearning—without becoming an eLearning developer.</p>
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
