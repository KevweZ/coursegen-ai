import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Zap,
  Star,
  Building2,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Shield,
  Headphones,
  Users,
  Infinity,
  CreditCard,
  HelpCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { redirectToCheckout, type StripePlanId } from '../services/paymentService';
import { planDisplayName } from '../lib/planEntitlements';

// ── Types ───────────────────────────────────────────────────────────────────

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
  priceUnit?: string; // e.g. "/ mo" — omit for Custom
  audience: string;
  credits: string;
  features: PlanFeature[];
  cta: string;
  ctaStyle: 'primary' | 'secondary' | 'outline';
  badge?: string;
  highlighted?: boolean;
  stripePlanId?: StripePlanId;
  contactHref?: string;
}

// ── Data builders ───────────────────────────────────────────────────────────

function buildPlans(billing: 'annual' | 'monthly'): PricingPlan[] {
  const creatorAnnual = billing === 'annual';
  return [
    {
      id: 'creator',
      name: 'Creator',
      subtitle: 'For independent designers & SMEs',
      price: creatorAnnual ? '$59' : '$79',
      priceUnit: '/ mo',
      priceNote: creatorAnnual
        ? 'billed annually ($708/yr)'
        : 'billed monthly · cancel anytime',
      audience: 'Freelance IDs & Subject Matter Experts',
      credits: '500 AI + 500 TTS credits / month',
      features: [
        { text: 'Full AI course generation', included: true },
        { text: 'Interactive elements (tabs, timelines, click-reveal & more)', included: true },
        { text: 'SCORM 1.2 / 2004 export for your LMS', included: true },
        { text: 'AI voice-over (Alloy)', included: true },
        { text: '3 cloud drafts', included: true },
        { text: 'Email support', included: true },
        { text: 'Team seats & shared workspace', included: false },
        { text: 'All 6 TTS voices', included: false },
      ],
      cta: 'Get Started',
      ctaStyle: 'outline',
      badge: 'Solo',
      stripePlanId: creatorAnnual ? 'pro_creator' : 'pro_creator_monthly',
    },
    {
      id: 'team',
      name: 'Team',
      subtitle: 'One workspace for your L&D group',
      price: '$149',
      priceUnit: '/ mo',
      priceNote: 'billed annually ($1,788/yr) · up to 5 seats',
      audience: 'Corporate L&D teams (flat workspace fee)',
      credits: '1,500 pooled AI + TTS credits / month',
      features: [
        { text: 'Everything in Creator', included: true },
        { text: 'Up to 5 seats — flat fee, not per user', included: true },
        { text: '10 shared cloud drafts for the workspace', included: true },
        { text: 'Pooled AI + TTS credits across the team', included: true },
        { text: 'All 6 AI narration voices', included: true },
        { text: 'SCORM 1.2 / 2004 export for your LMS', included: true },
        { text: 'Priority email support', included: true },
      ],
      cta: 'Get Started',
      ctaStyle: 'primary',
      badge: 'Best Value',
      highlighted: true,
      stripePlanId: 'business_team',
    },
    {
      id: 'contact',
      name: 'Contact us',
      subtitle: 'Invoice & volume needs',
      price: 'Custom',
      audience: 'Larger orgs & procurement',
      credits: 'Custom volume',
      features: [
        { text: 'Invoice / PO billing', included: true },
        { text: 'Volume or multi-workspace quotes', included: true },
        { text: 'Onboarding help for your team', included: true },
        { text: 'Priority support channels', included: true },
        { text: 'Same core product as Team', included: true },
      ],
      cta: 'Contact Sales',
      ctaStyle: 'secondary',
      contactHref: 'mailto:support@nexcourse.ai?subject=NexCourse%20AI%20%E2%80%94%20Team%20%2F%20volume%20inquiry',
    },
  ];
}

const faqItems = [
  {
    q: 'How do credits work?',
    a: 'Credits are used when you generate a course and when you generate AI narration. A short overview uses fewer credits than a full multi-module course. Narration uses TTS credits per slide based on script length. Your plan refreshes AI and TTS credits each billing cycle.',
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Subscription credits reset at the start of each billing cycle. Pay-As-You-Go credit packs you buy separately never expire and stack on top of your plan.',
  },
  {
    q: 'What’s the difference between Creator and Team?',
    a: 'Creator is for one person: Alloy voice, 3 cloud drafts, 500 AI + 500 TTS credits/month. Team is a flat workspace fee for up to 5 seats, 10 shared drafts, pooled credits, and all 6 narration voices. The Team buyer owns billing; teammates join via invite and share the workspace pool.',
  },
  {
    q: 'Is SCORM export included?',
    a: 'Yes. Creator and Team both include SCORM 1.2 and 2004 packages you upload to your LMS. Completion and score reporting are handled by your LMS after you publish the package — not a separate NexCourse analytics product.',
  },
  {
    q: 'Can I cancel or get a refund?',
    a: 'You can cancel anytime from My Account → Manage Subscription (Stripe billing portal). Access continues through the end of the paid period. For refunds within 14 days of a charge, email support@nexcourse.ai with your account email and Stripe receipt — we review refund requests case by case (unused credits and first-time charges are prioritized).',
  },
  {
    q: 'Can I switch between annual and monthly?',
    a: 'Creator offers annual ($59/mo equivalent) or month-to-month ($79/mo). Team is billed annually at the $149/mo rate. You can manage or cancel anytime from My Account → Manage Subscription.',
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = 'w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed';

  const handleClick = async () => {
    if (plan.contactHref) {
      window.location.href = plan.contactHref;
      return;
    }
    if (!plan.stripePlanId || plan.price === '$0') return;
    if (!user) {
      window.location.href = '/#auth';
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await redirectToCheckout({
        planId:    plan.stripePlanId,
        userId:    user.id,
        userEmail: user.email ?? '',
      });
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const isClickable = !!plan.stripePlanId || !!plan.contactHref;

  const inner = loading ? (
    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
  ) : (
    <>
      {plan.contactHref ? <Mail className="w-4 h-4" /> : null}
      {plan.cta}
      {!plan.contactHref && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
    </>
  );

  return (
    <div className="space-y-2">
      {plan.ctaStyle === 'primary' && (
        <button
          onClick={handleClick}
          disabled={loading}
          className={`${base} bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]`}
        >{inner}</button>
      )}
      {plan.ctaStyle === 'secondary' && (
        <button
          onClick={handleClick}
          disabled={loading}
          className={`${base} bg-slate-700/60 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white hover:scale-[1.02] active:scale-[0.98]`}
        >{inner}</button>
      )}
      {plan.ctaStyle === 'outline' && (
        <button
          onClick={handleClick}
          disabled={loading}
          className={`${base} bg-transparent border ${
            isClickable
              ? 'border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-500/10 text-indigo-300 hover:text-indigo-200 hover:scale-[1.02] active:scale-[0.98]'
              : 'border-slate-600 text-slate-400 cursor-default'
          }`}
        >{inner}</button>
      )}
      {error && (
        <p className="text-red-400 text-xs text-center font-medium">{error}</p>
      )}
    </div>
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

    <div className="mb-5">
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{plan.subtitle}</p>
      <h3 className={`text-2xl font-extrabold mb-1 ${plan.highlighted ? 'text-white' : 'text-slate-100'}`}>{plan.name}</h3>
      <p className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5 mt-2">
        <Users className="w-3 h-3" /> {plan.audience}
      </p>
    </div>

    <div className="mb-5 pb-5 border-b border-slate-700/60">
      <div className="flex items-end gap-2">
        <span className={`font-extrabold tracking-tight ${plan.price === 'Custom' ? 'text-3xl text-slate-200' : 'text-5xl text-white'}`}>
          {plan.price}
        </span>
        {plan.priceUnit && (
          <span className="text-slate-400 text-sm pb-2">{plan.priceUnit}</span>
        )}
      </div>
      {plan.priceNote && (
        <p className="text-xs text-slate-500 mt-1 font-medium">{plan.priceNote}</p>
      )}
      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
        <Zap className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-bold text-indigo-300">{plan.credits}</span>
      </div>
    </div>

    <ul className="space-y-3 flex-1 mb-7">
      {plan.features.map((f, i) => (
        <FeatureRow key={i} feature={f} />
      ))}
    </ul>

    <CtaButton plan={plan} />
  </motion.div>
);

const FAQItem = ({ item }: { item: typeof faqItems[0]; index: number }) => {
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

const CreditPackButtons = () => {
  const { user } = useAuth();
  const [loadingPack, setLoadingPack] = useState<'standard' | 'volume' | null>(null);
  const [packError, setPackError] = useState<string | null>(null);

  const handleBuyPack = async (packId: 'credits_standard' | 'credits_volume') => {
    if (!user) { window.location.href = '/#auth'; return; }
    setPackError(null);
    setLoadingPack(packId === 'credits_standard' ? 'standard' : 'volume');
    try {
      await redirectToCheckout({ planId: packId, userId: user.id, userEmail: user.email ?? '' });
    } catch (err: any) {
      setPackError(err.message ?? 'Something went wrong.');
      setLoadingPack(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1 min-w-[200px] rounded-xl border border-amber-500/20 bg-slate-800/60 p-5 hover:border-amber-500/40 hover:bg-slate-800 transition-all">
        <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Standard Pack</p>
        <p className="text-3xl font-extrabold text-white mb-1">$25</p>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-bold text-sm">100 AI credits</span>
        </div>
        <button
          onClick={() => handleBuyPack('credits_standard')}
          disabled={!!loadingPack}
          className="w-full py-2.5 rounded-lg border border-amber-500/30 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loadingPack === 'standard' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><CreditCard className="w-4 h-4" /> Buy Pack</>}
        </button>
      </div>

      <div className="relative flex-1 min-w-[200px] rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-950/40 to-slate-800/60 p-5 hover:border-amber-400/60 transition-all shadow-lg shadow-amber-500/5">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Best Deal</span>
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">Volume Pack</p>
        <p className="text-3xl font-extrabold text-white mb-1">$100</p>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-bold text-sm">500 AI credits</span>
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Save 20%</span>
        </div>
        <button
          onClick={() => handleBuyPack('credits_volume')}
          disabled={!!loadingPack}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loadingPack === 'volume' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><CreditCard className="w-4 h-4" /> Buy Pack</>}
        </button>
      </div>

      {packError && (
        <p className="text-red-400 text-xs text-center font-medium w-full">{packError}</p>
      )}
    </div>
  );
};

const ManageBillingBanner = () => {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [planName, setPlanName]     = useState<string>('');
  const [loading, setLoading]       = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/payments/status?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.stripe_customer_id) {
          setCustomerId(d.stripe_customer_id);
          setPlanName(d.subscription ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading || !customerId) return null;

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to open billing portal.');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-6 pt-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm">
              Current Plan: <span className="text-emerald-400">{planDisplayName(planName)}</span>
            </p>
            <p className="text-slate-400 text-xs mt-0.5">Manage invoices, update payment method, or cancel anytime.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shrink-0 whitespace-nowrap"
          >
            {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            Manage Subscription
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      </div>
    </motion.div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export function PricingPage() {
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const plans = useMemo(() => buildPlans(billing), [billing]);

  return (
    <div className="min-h-screen w-full relative z-10">
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
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
              Upload documents. Get LMS-ready SCORM courses. Pricing for solo creators and small L&amp;D teams — without fake enterprise claims.
            </p>

            {/* Creator billing toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  billing === 'annual'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Annual
                <span className="ml-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-300">Save 25%</span>
              </button>
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  billing === 'monthly'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Toggle applies to Creator. Team is always billed annually.
            </p>
          </motion.div>
        </div>
      </div>

      <ManageBillingBanner />

      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-center gap-2.5 mb-10 px-5 py-3 rounded-xl border text-sm font-semibold mx-auto max-w-xl bg-indigo-500/5 border-indigo-500/20 text-indigo-400">
          <Building2 className="w-4 h-4 shrink-0" />
          All paid plans include SCORM 1.2 / 2004 export for your LMS.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, i) => (
            <PlanCard key={`${plan.id}-${billing}`} plan={plan} index={i} />
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 overflow-hidden p-8 md:p-10">
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
                Running low? Purchase Pay-As-You-Go AI credit packs anytime. They never expire and stack on top of your subscription credits.
              </p>
            </div>
            <CreditPackButtons />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: 'Encrypted & Secure', desc: 'Your data is always kept private & safe' },
            { icon: Infinity, label: 'SCORM Export', desc: '1.2 & 2004 for your LMS' },
            { icon: Headphones, label: 'Human Support', desc: 'Email help when you need it' },
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
