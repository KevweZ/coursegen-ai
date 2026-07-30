import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BookOpen, Brain, CheckCircle2, Clock,
  GraduationCap, Layers, Sparkles, Target, Users, Zap,
  BarChart3, Building2, ChevronRight, Award, FileText,
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onBack: () => void;
}

// ── Fade-in section wrapper ───────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Timeline step ─────────────────────────────────────────────────────────────
function TimelineStep({ num, title, desc, icon: Icon, accent }: {
  num: string; title: string; desc: string; icon: any; accent: string;
}) {
  return (
    <FadeIn className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${accent}`}>
          {num}
        </div>
        <div className="w-px flex-1 bg-slate-700/60 mt-2" />
      </div>
      <div className="pb-10">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 opacity-60" />
          <h3 className="text-white font-bold text-lg">{title}</h3>
        </div>
        <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
      </div>
    </FadeIn>
  );
}

// ── Ref card ─────────────────────────────────────────────────────────────────
function RefCard({ author, year, work, relevance }: {
  author: string; year: string; work: string; relevance: string;
}) {
  return (
    <FadeIn className="p-5 rounded-2xl border border-slate-700/50 bg-slate-900/60 hover:border-indigo-500/40 transition-colors">
      <p className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-1">{author} · {year}</p>
      <p className="text-white font-bold text-sm mb-2">{work}</p>
      <p className="text-slate-400 text-xs leading-relaxed">{relevance}</p>
    </FadeIn>
  );
}

// ── Principle pill ────────────────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
      <CheckCircle2 className="w-3 h-3" />{label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MethodologyPage({ onGetStarted, onBack }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white selection:bg-indigo-500/30">

      {/* ── Sticky Nav ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span className="font-black text-white text-lg tracking-tight">NexCourse <span className="text-indigo-400">AI</span></span>
          </div>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-5 py-2 rounded-xl transition-all"
          >
            Try It Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
            className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-4"
          >
            Instructional Design Methodology
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-black leading-tight mb-6"
          >
            The Science Behind<br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Every Course We Build
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            NexCourse AI is not a slide generator. It is a fully automated implementation of
            evidence-based instructional design — grounded in decades of learning science research —
            compressed into a single click.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 mt-8"
          >
            {[
              { label: "Bloom's Taxonomy", color: "border-indigo-500/40 text-indigo-300 bg-indigo-500/10" },
              { label: "Gagné's 9 Events", color: "border-purple-500/40 text-purple-300 bg-purple-500/10" },
              { label: "ADDIE Model", color: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
              { label: "Mager's Objectives", color: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
              { label: "Knowles' Andragogy", color: "border-rose-500/40 text-rose-300 bg-rose-500/10" },
              { label: "7±2 Rule", color: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10" },
            ].map(p => <Pill key={p.label} label={p.label} color={p.color} />)}
          </motion.div>
        </div>
      </section>

      {/* ── The Problem ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-y border-slate-800/60 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-rose-400 text-sm font-black uppercase tracking-widest mb-3">The Reality of eLearning Production</p>
            <h2 className="text-4xl font-black text-white">Traditional Development Takes Weeks.<br />We Do It in Minutes.</h2>
          </FadeIn>

          {/* Before / After comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            <FadeIn className="p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-rose-400" />
                <h3 className="text-xl font-black text-white">Traditional Workflow</h3>
                <span className="ml-auto text-rose-400 font-black text-sm bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full">6–12 weeks</span>
              </div>
              <ol className="space-y-3">
                {[
                  ['Week 1–2', 'SME interviews, content gathering, source document review'],
                  ['Week 2–3', 'Learning objectives written and approved by stakeholders'],
                  ['Week 3–4', 'Storyboard drafted in Word/PowerPoint, SME review cycle'],
                  ['Week 4–6', 'Development in Articulate Storyline or Adobe Captivate'],
                  ['Week 6–8', 'QA review, bug fixes, accessibility check'],
                  ['Week 8–10', 'LMS upload, SCORM testing, pilot with learners'],
                  ['Week 10–12', 'Revisions, final sign-off, full rollout'],
                ].map(([week, task]) => (
                  <li key={week} className="flex gap-3 text-sm">
                    <span className="text-rose-400 font-bold shrink-0 w-20">{week}</span>
                    <span className="text-slate-400">{task}</span>
                  </li>
                ))}
              </ol>
            </FadeIn>

            <FadeIn delay={0.1} className="p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-black text-white">NexCourse AI Workflow</h3>
                <span className="ml-auto text-emerald-400 font-black text-sm bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">~5 minutes</span>
              </div>
              <ol className="space-y-3">
                {[
                  ['Step 1', 'Enter your topic or upload your source documents (PPT, PDF, Word)'],
                  ['Step 2', 'Define learning objectives — or let AI suggest them from your content'],
                  ['Step 3', 'Select interaction types and assessment style'],
                  ['Step 4', 'AI generates full course outline with ISD-compliant structure'],
                  ['Step 5', 'AI hydrates every slide with content, narration, and interactions'],
                  ['Step 6', 'Review, edit, and export SCORM package — upload to any LMS'],
                ].map(([step, task]) => (
                  <li key={step} className="flex gap-3 text-sm">
                    <span className="text-emerald-400 font-bold shrink-0 w-16">{step}</span>
                    <span className="text-slate-300">{task}</span>
                  </li>
                ))}
              </ol>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── ISD Principles ───────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-3">Built on Learning Science</p>
            <h2 className="text-4xl font-black text-white">Every AI Decision Reflects<br />Proven ISD Principles</h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Bloom's Taxonomy",
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10 border-indigo-500/20',
                points: [
                  'Objectives are written at the correct cognitive level (Remember → Create)',
                  'Knowledge checks align to the objective\'s Bloom\'s level',
                  'Interaction types are matched to cognitive complexity',
                ],
              },
              {
                icon: Layers,
                title: "Gagné's 9 Events of Instruction",
                color: 'text-purple-400',
                bg: 'bg-purple-500/10 border-purple-500/20',
                points: [
                  'Gain Attention — title slides with visual hooks',
                  'State Objective — explicit learning targets per module',
                  'Elicit Performance — embedded quizzes and interactions',
                  'Provide Feedback — immediate, explanatory quiz feedback',
                ],
              },
              {
                icon: Brain,
                title: "Cognitive Load Theory",
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10 border-emerald-500/20',
                points: [
                  'Miller\'s 7±2 Rule — max 7 bullets per content slide',
                  'One concept per screen — no wall-of-text slides',
                  'Progressive disclosure — click-to-reveal and tab interactions',
                  'Chunking — content grouped under ### subheadings',
                ],
              },
              {
                icon: Users,
                title: "Knowles' Andragogy",
                color: 'text-amber-400',
                bg: 'bg-amber-500/10 border-amber-500/20',
                points: [
                  'Adults learn best when content is immediately applicable',
                  'Problem-centered framing — real-world scenarios first',
                  'Self-directed — navigation modes from free to restricted',
                  'Experiential — branching scenarios simulate decisions',
                ],
              },
              {
                icon: FileText,
                title: "Mager's Performance Objectives",
                color: 'text-rose-400',
                bg: 'bg-rose-500/10 border-rose-500/20',
                points: [
                  'Every objective has a Condition, Behavior, and Criterion',
                  'Observable verbs — "Identify", "Explain", "Apply", "Evaluate"',
                  'Objectives drive slide structure — not topic coverage',
                ],
              },
              {
                icon: BarChart3,
                title: "ADDIE + SAM Model",
                color: 'text-cyan-400',
                bg: 'bg-cyan-500/10 border-cyan-500/20',
                points: [
                  'Analyze — topic + objectives form the analysis phase',
                  'Design — outline generation is the design deliverable',
                  'Develop — hydration produces the development artifact',
                  'Implement — SCORM export enables LMS deployment',
                  'Evaluate — mastery quiz provides summative data',
                ],
              },
            ].map(({ icon: Icon, title, color, bg, points }) => (
              <FadeIn key={title} className={`p-6 rounded-2xl border ${bg}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <h3 className={`font-black text-sm ${color}`}>{title}</h3>
                </div>
                <ul className="space-y-2">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How the AI Works ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-900/40 border-y border-slate-800/60">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-purple-400 text-sm font-black uppercase tracking-widest mb-3">Under the Hood</p>
            <h2 className="text-4xl font-black text-white">How NexCourse AI Applies<br />These Principles</h2>
          </FadeIn>

          <div className="space-y-0">
            {[
              {
                num: '01',
                title: 'Outline Generation — The Design Phase',
                icon: BookOpen,
                accent: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
                desc: 'The AI acts as a Senior Instructional Designer. Given your topic and objectives, it generates a full course Table of Contents — exactly one module per learning objective, with a mandatory sequence: Module Title → Objectives Slide → Content/Interaction Slides → Knowledge Check → Summary. This mirrors the ADDIE Design phase.',
              },
              {
                num: '02',
                title: 'Content Hydration — The Development Phase',
                icon: Layers,
                accent: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
                desc: 'Each module is hydrated independently to maximize AI context quality. The AI writes content slides using active voice, applies 7±2 chunking, writes Bloom\'s-aligned quiz questions with 4-option distractors, and generates voiceOverText that expands on bullets rather than just re-reading them. Bold formatting is restricted to key terms only.',
              },
              {
                num: '03',
                title: 'Interaction Mapping — Cognitive Alignment',
                icon: Brain,
                accent: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                desc: 'Interaction types are selected by the author and mapped to slide types in the outline. Accordions apply progressive disclosure. Timelines support chronological processing. Branching scenarios simulate real decision-making (Andragogy). Drag-and-drop and sorting exercises activate procedural memory encoding.',
              },
              {
                num: '04',
                title: 'Mastery Quiz — Summative Assessment',
                icon: Award,
                accent: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                desc: 'The mastery quiz is a Criterion-Referenced Assessment — questions are drawn from course content and must meet a configurable passing threshold (default 80%). It supports multiple question types (MC, True/False, Multi-Answer) and provides immediate feedback per question, aligning with Gagné\'s Event 8: Assess Performance.',
              },
              {
                num: '05',
                title: 'SCORM Export — Implementation Phase',
                icon: Building2,
                accent: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
                desc: 'The exported SCORM package reports completion status, score, and learner location to any compliant LMS. This closes the ADDIE loop: Implement. The Evaluate phase begins when learner score data flows back to L&D teams through the LMS reporting dashboard.',
              },
            ].map(step => (
              <TimelineStep key={step.num} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Two Audiences Deep Dive ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-emerald-400 text-sm font-black uppercase tracking-widest mb-3">Two Use Cases, One Platform</p>
            <h2 className="text-4xl font-black text-white">Who Uses NexCourse AI</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8">
            <FadeIn className="p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/20 to-slate-900/40">
              <GraduationCap className="w-8 h-8 text-indigo-400 mb-4" />
              <h3 className="text-2xl font-black text-white mb-3">Instructional Designers</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">
                IDs spend up to 70% of project time in the Development phase — authoring in Storyline,
                formatting in PowerPoint, copy-pasting from storyboards. NexCourse AI automates
                that entire phase. The ID's expertise is redirected to strategy: defining objectives,
                curating interaction types, reviewing AI output, and applying domain expertise.
              </p>
              <div className="space-y-2">
                {[
                  'Skip the storyboard → go straight to review',
                  'AI output matches professional ISD standards',
                  'Edit any slide with the built-in rich-text editor',
                  'Export SCORM in one click for any LMS',
                ].map(p => (
                  <p key={p} className="flex items-center gap-2 text-sm text-slate-300">
                    <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />{p}
                  </p>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.1} className="p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-slate-900/40">
              <Users className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-2xl font-black text-white mb-3">Subject Matter Experts</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">
                SMEs are the knowledge source in any eLearning project — but rarely have the tools
                or skills to produce polished digital learning on their own. NexCourse AI gives
                SMEs a self-service publishing pipeline: upload your existing materials,
                and receive a fully structured, interactive course in minutes. No design skills. No coding.
              </p>
              <div className="space-y-2">
                {[
                  'Upload PPT, PDF, or Word — AI extracts structure',
                  'AI converts lecture content into interactive learning',
                  'No Articulate, Captivate, or Lectora license needed',
                  'Professional SCORM output without a development team',
                ].map(p => (
                  <p key={p} className="flex items-center gap-2 text-sm text-slate-300">
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />{p}
                  </p>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Scholarly References ─────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-900/40 border-t border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-amber-400 text-sm font-black uppercase tracking-widest mb-3">Scholarly Foundation</p>
            <h2 className="text-4xl font-black text-white">Grounded in Learning Research</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              The AI prompt engineering and course structure logic in NexCourse AI is informed by these seminal works in instructional design and cognitive science.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { author: 'Bloom et al.', year: '1956', work: 'Taxonomy of Educational Objectives', relevance: 'Cognitive domain hierarchy used to align learning objectives to quiz complexity and interaction type selection.' },
              { author: 'Gagné, R.M.', year: '1965', work: 'The Conditions of Learning', relevance: '9 Events of Instruction form the structural template for each module: from gaining attention to assessing performance.' },
              { author: 'Mager, R.F.', year: '1975', work: 'Preparing Instructional Objectives', relevance: 'Condition–Behavior–Criterion format applied to all AI-generated learning objectives for measurability.' },
              { author: 'Knowles, M.', year: '1984', work: 'Andragogy in Action', relevance: 'Adult learning principles drive problem-centered framing, branching scenarios, and flexible navigation modes.' },
              { author: 'Sweller, J.', year: '1988', work: 'Cognitive Load Theory', relevance: 'Strict chunking rules (7±2, one concept per screen, progressive disclosure) reduce extraneous cognitive load.' },
              { author: 'Miller, G.A.', year: '1956', work: 'The Magical Number Seven', relevance: 'Hard bullet cap of 7 per slide, with 5–6 preferred for summary slides, grounded in working memory limits.' },
              { author: 'Merrill, M.D.', year: '2002', work: 'First Principles of Instruction', relevance: 'Activation, demonstration, application, and integration map directly to the module slide sequence structure.' },
              { author: 'Branch, R.M.', year: '2009', work: 'Instructional Design: The ADDIE Approach', relevance: 'ADDIE phases map 1:1 to NexCourse AI pipeline stages: Analyze → Design → Develop → Implement → Evaluate.' },
              { author: 'Clark, R. & Mayer, R.', year: '2011', work: 'e-Learning and the Science of Instruction', relevance: 'Multimedia principles (coherence, signaling, redundancy) inform how narration text differs from slide text.' },
            ].map(r => <RefCard key={r.author + r.year} {...r} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <FadeIn>
          <p className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-4">Ready to Build?</p>
          <h2 className="text-4xl font-black text-white mb-4">
            Put the Science to Work.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Every course you generate with NexCourse AI is built on these principles — automatically.
            No PhD required.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black px-10 py-4 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all text-lg"
          >
            Start Building for Free <ArrowRight className="w-5 h-5" />
          </button>
        </FadeIn>
      </section>

    </div>
  );
}
