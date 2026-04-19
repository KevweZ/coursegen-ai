import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Zap,
  Star,
  Building2,
  GraduationCap,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Shield,
  Headphones,
  Users,
  Infinity,
  CreditCard,
  HelpCircle,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type Track = 'corporate' | 'k12';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  priceNote?: string;
  audience: string;
  credits: string;
  features: PlanFeature[];
  cta: string;
  ctaStyle: 'primary' | 'secondary' | 'outline';
  badge?: string;
  highlighted?: boolean;
}

// ── Data ────────────────────────────────────────────────────────────────────

const k12Plans: PricingPlan[] = [
  {
    id: 'teacher-free',
    name: 'Teacher Free',
    subtitle: 'Perfect for getting started',
    price: '$0',
    audience: 'Individual Teachers',
    credits: '50 credits / month',
    features: [
      { text: 'Basic AI course generation (Quick Overview & Standard)', included: true },
      { text: 'Standard K-12 templates', included: true },
      { text: 'Community support', included: true },
      { text: 'Watermarked exports', included: true },
      { text: 'TTS Audio narration', included: false },
      { text: 'Full AI generation (Comprehensive Units)', included: false },
      { text: 'Advanced game templates', included: false },
      { text: 'LMS integration', included: false },
    ],
    cta: 'Get Started Free',
    ctaStyle: 'outline',
    badge: 'Free Forever',
  },
  {
    id: 'teacher-pro',
    name: 'Teacher Pro',
    subtitle: 'For power-user educators',
    price: '$12',
    priceNote: 'per user / month · billed annually',
    audience: 'Power-User Teachers',
    credits: '300 credits / month',
    features: [
      { text: 'Full AI generation (incl. Comprehensive Units)', included: true },
      { text: 'Advanced game templates', included: true },
      { text: 'No watermarks on exports', included: true },
      { text: 'LMS integration', included: true },
      { text: 'Standard TTS Audio (accessibility / UDL)', included: true },
      { text: 'HD TTS Audio', included: false },
      { text: 'Voice Cloning', included: false },
      { text: 'Admin dashboard', included: false },
    ],
    cta: 'Get Started',
    ctaStyle: 'primary',
    badge: 'Most Popular',
    highlighted: true,
  },
  {
    id: 'school-district',
    name: 'School / District',
    subtitle: 'Enterprise-grade for institutions',
    price: 'Custom',
    priceNote: 'per student or per site',
    audience: 'School Admins & District IT',
    credits: 'Pooled / Custom',
    features: [
      { text: 'SSO & Rostering integration', included: true },
      { text: 'Admin dashboards', included: true },
      { text: 'Shared curriculum libraries', included: true },
      { text: 'Custom data privacy agreements', included: true },
      { text: 'HD TTS Audio', included: true },
      { text: 'Voice Cloning options', included: true },
      { text: 'Priority dedicated support', included: true },
      { text: 'Custom AI model fine-tuning', included: false },
    ],
    cta: 'Contact Sales',
    ctaStyle: 'secondary',
  },
];

const corporatePlans: PricingPlan[] = [
  {
    id: 'pro-creator',
    name: 'Pro Creator',
    subtitle: 'Built for independent designers',
    price: '$79',
    priceNote: 'per user / month · billed annually',
    audience: 'Freelance IDs & Subject Matter Experts',
    credits: '500 credits / month',
    features: [
      { text: 'Full AI course generation', included: true },
      { text: 'All interactive templates', included: true },
      { text: 'SCORM 1.2 / 2004 exports', included: true },
      { text: 'Standard & HD TTS Audio', included: true },
      { text: 'Premium support', included: true },
      { text: 'Team collaboration', included: false },
      { text: 'Brand kit management', included: false },
      { text: 'Advanced analytics', included: false },
    ],
    cta: 'Get Started',
    ctaStyle: 'outline',
    badge: 'Freelancers',
  },
  {
    id: 'business-team',
    name: 'Business Team',
    subtitle: 'Scale your L&D operations',
    price: '$149',
    priceNote: 'per user / month · billed annually',
    audience: 'Corporate L&D Teams (3+ users)',
    credits: '1,500 pooled credits / month',
    features: [
      { text: 'Full AI course generation', included: true },
      { text: 'Team collaboration tools', included: true },
      { text: 'Shared asset libraries', included: true },
      { text: 'Brand kit management', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'HD TTS Audio', included: true },
      { text: 'Basic Voice Cloning', included: true },
      { text: 'Custom AI model training', included: false },
    ],
    cta: 'Get Started',
    ctaStyle: 'primary',
    badge: 'Best Value',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'For large-scale organizations',
    price: 'Custom',
    audience: 'Large Corporations',
    credits: 'Custom',
    features: [
      { text: 'Custom AI model training', included: true },
      { text: 'Advanced security (SOC2)', included: true },
      { text: 'API access', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Unlimited HD TTS Audio', included: true },
      { text: 'Enterprise Voice Cloning', included: true },
      { text: 'SLA guarantees', included: true },
      { text: 'Custom contract & billing', included: true },
    ],
    cta: 'Contact Sales',
    ctaStyle: 'secondary',
  },
];

const faqItems = [
  {
    q: 'How do credits work?',
    a: 'Credits are consumed based on the complexity of the course you generate. A Quick Overview costs 20 credits, while a Comprehensive Course costs 100 credits. Generating audio narration costs additional credits per slide — 5 for Standard TTS and 10 for HD TTS.',
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Subscription credits reset at the beginning of each billing cycle. However, any Pay-As-You-Go overage credits you purchase will roll over and never expire.',
  },
  {
    q: 'Can I use the Education track for my corporate training?',
    a: 'The Education track is strictly reserved for verified K-12 educators and schools. You must register with a valid .edu or .k12.state.us email address to access these plans.',
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

const FeatureRow = ({ feature }: { feature: PlanFeature }) => (
  <li className="flex items-start gap-3 text-sm">
    {feature.included ? (
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
        <Check className="w-3 h-3 text-indigo-400 stroke-[3]" />
      </span>
    ) : (
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
        <X className="w-3 h-3 text-slate-600 stroke-[3]" />
      </span>
    )}
    <span className={feature.included ? 'text-slate-300' : 'text-slate-600 line-through decoration-slate-700'}>{feature.text}</span>
  </li>
);

const CtaButton = ({ plan }: { plan: PricingPlan }) => {
  const base = 'w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group';
  if (plan.ctaStyle === 'primary') {
    return (
      <button className={`${base} bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]`}>
        {plan.cta}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    );
  }
  if (plan.ctaStyle === 'secondary') {
    return (
      <button className={`${base} bg-slate-700/60 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white hover:scale-[1.02] active:scale-[0.98]`}>
        {plan.cta}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    );
  }
  return (
    <button className={`${base} bg-transparent border border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-500/10 text-indigo-300 hover:text-indigo-200 hover:scale-[1.02] active:scale-[0.98]`}>
      {plan.cta}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </button>
  );
};

const PlanCard = ({ plan, index }: { plan: PricingPlan; index: number }) => (
  <motion.div
    key={plan.id}
    initial={{ opacity: 0, y: 32 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
    className={`relative flex flex-col rounded-2xl border p-7 transition-all duration-300 ${
      plan.highlighted
        ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-indigo-500/60 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 scale-[1.03]'
        : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/60'
    }`}
  >
    {/* Badge */}
    {plan.badge && (
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
        <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${
          plan.highlighted
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
            : 'bg-slate-700 text-slate-300 border border-slate-600'
        }`}>
          {plan.badge}
        </span>
      </div>
    )}

    {/* Header */}
    <div className="mb-5">
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{plan.subtitle}</p>
      <h3 className={`text-2xl font-extrabold mb-1 ${plan.highlighted ? 'text-white' : 'text-slate-100'}`}>{plan.name}</h3>
      <p className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5 mt-2">
        <Users className="w-3 h-3" /> {plan.audience}
      </p>
    </div>

    {/* Price */}
    <div className="mb-5 pb-5 border-b border-slate-700/60">
      <div className="flex items-end gap-2">
        <span className={`font-extrabold tracking-tight ${plan.price === 'Custom' ? 'text-3xl text-slate-200' : 'text-5xl text-white'}`}>
          {plan.price}
        </span>
        {plan.price !== 'Custom' && plan.price !== '$0' && (
          <span className="text-slate-400 text-sm pb-2">/ user</span>
        )}
      </div>
      {plan.priceNote && (
        <p className="text-xs text-slate-500 mt-1 font-medium">{plan.priceNote}</p>
      )}
      {/* Credits badge */}
      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
        <Zap className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-bold text-indigo-300">{plan.credits}</span>
      </div>
    </div>

    {/* Features */}
    <ul className="space-y-3 flex-1 mb-7">
      {plan.features.map((f, i) => (
        <FeatureRow key={i} feature={f} />
      ))}
    </ul>

    <CtaButton plan={plan} />
  </motion.div>
);

const FAQItem = ({ item, index }: { item: typeof faqItems[0]; index: number }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${open ? 'border-indigo-500/40 bg-slate-800/60' : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-600'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left group"
        aria-expanded={open}
      >
        <span className={`font-bold text-base transition-colors ${open ? 'text-indigo-300' : 'text-slate-200 group-hover:text-white'}`}>
          {item.q}
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-400' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p className="px-5 pb-5 text-slate-400 text-sm leading-relaxed border-t border-slate-700/50 pt-4">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export function PricingPage() {
  const [track, setTrack] = useState<Track>('corporate');
  const plans = track === 'k12' ? k12Plans : corporatePlans;

  return (
    <div className="min-h-screen w-full relative z-10">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center relative">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Simple, Transparent Pricing
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
              Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Plan</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
              Purpose-built pricing for every type of creator — from individual teachers to enterprise L&amp;D teams.
            </p>

            {/* ── Track Toggle ── */}
            <div className="inline-flex items-center p-1.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl gap-1 shadow-xl backdrop-blur-sm">
              <button
                onClick={() => setTrack('corporate')}
                className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                  track === 'corporate'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Corporate Training
              </button>
              <button
                onClick={() => setTrack('k12')}
                className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                  track === 'k12'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Education (K-12)
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Pricing Cards ── */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        {/* Track context banner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={track}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center justify-center gap-2.5 mb-10 px-5 py-3 rounded-xl border text-sm font-semibold mx-auto max-w-xl ${
              track === 'k12'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400'
            }`}
          >
            {track === 'k12' ? (
              <>
                <GraduationCap className="w-4 h-4 shrink-0" />
                Education plans require a valid <strong className="font-black">.edu</strong> or <strong className="font-black">.k12.state.us</strong> email for verification.
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 shrink-0" />
                All corporate plans include SCORM 1.2 / 2004 export and full LMS compatibility.
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Cards grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={track + '-grid'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
          >
            {plans.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Credit Overage Section ── */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 overflow-hidden p-8 md:p-10">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Need More Credits?</h2>
              </div>
              <p className="text-slate-400 text-base max-w-xl leading-relaxed">
                Running low? Purchase Pay-As-You-Go credit packs at any time. They never expire and stack on top of your monthly subscription credits.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Standard Pack */}
              <div className="relative flex-1 min-w-[200px] rounded-xl border border-amber-500/20 bg-slate-800/60 p-5 hover:border-amber-500/40 hover:bg-slate-800 transition-all group cursor-pointer">
                <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Standard Pack</p>
                <p className="text-3xl font-extrabold text-white mb-1">$25</p>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300 font-bold text-sm">100 credits</span>
                </div>
                <button className="w-full py-2.5 rounded-lg border border-amber-500/30 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-sm font-bold transition-all flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" /> Buy Pack
                </button>
              </div>

              {/* Volume Pack */}
              <div className="relative flex-1 min-w-[200px] rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-950/40 to-slate-800/60 p-5 hover:border-amber-400/60 transition-all group cursor-pointer shadow-lg shadow-amber-500/5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Best Deal</span>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Volume Pack</p>
                <p className="text-3xl font-extrabold text-white mb-1">$100</p>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300 font-bold text-sm">500 credits</span>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Save 20%</span>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-black transition-all flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" /> Buy Pack
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trust Badges ── */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: 'Encrypted & Secure', desc: 'Your data is always kept private & safe' },
            { icon: Infinity, label: 'SCORM Compliant', desc: '1.2 & 2004 supported' },
            { icon: Headphones, label: 'Dedicated Support', desc: 'Human help, not bots' },
            { icon: Star, label: 'Cancel Anytime', desc: 'No lock-in contracts' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-5 rounded-xl bg-slate-800/30 border border-slate-700/40 text-center">
              <Icon className="w-6 h-6 text-indigo-400" />
              <p className="font-bold text-white text-sm">{label}</p>
              <p className="text-slate-500 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="max-w-3xl mx-auto px-6 pb-32">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
            <HelpCircle className="w-3.5 h-3.5" /> FAQ
          </span>
          <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-slate-400 mt-2">Everything you need to know about credits and plans.</p>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <FAQItem key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
