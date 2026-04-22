import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, CreditCard, Crown, Star, Building2, GraduationCap,
  ArrowRight, RefreshCw, Shield, Loader2, AlertCircle,
  CheckCircle2, ChevronRight, Calendar, BarChart3, Sparkles,
  TrendingUp, Package,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPaymentStatus, redirectToCheckout, type PaymentStatus } from '../services/paymentService';

// ── Plan display metadata ─────────────────────────────────────────────────────
const PLAN_META: Record<string, {
  label: string; color: string; gradient: string; icon: React.ElementType; creditsAi: number; creditsTts: number;
}> = {
  free:          { label: 'Free',          color: 'slate',  gradient: 'from-slate-600 to-slate-700',    icon: Zap,       creditsAi: 50,   creditsTts: 0    },
  teacher_pro:   { label: 'Teacher Pro',   color: 'emerald',gradient: 'from-emerald-600 to-teal-600',   icon: GraduationCap, creditsAi: 300, creditsTts: 300 },
  pro_creator:   { label: 'Pro Creator',   color: 'indigo', gradient: 'from-indigo-600 to-purple-600',  icon: Star,      creditsAi: 500,  creditsTts: 500  },
  business_team: { label: 'Business Team', color: 'amber',  gradient: 'from-amber-500 to-orange-600',   icon: Building2, creditsAi: 1500, creditsTts: 1500 },
};

// ── Credit bar ────────────────────────────────────────────────────────────────
function CreditBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round(((total - used) / total) * 100)) : 0;
  const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-bold mb-1.5">
        <span className="text-slate-400">{used.toLocaleString()} remaining</span>
        <span className="text-slate-600">of {total.toLocaleString()}</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
      <p className="text-right text-[10px] text-slate-600 mt-1">{pct}% remaining</p>
    </div>
  );
}

// ── Days until reset ──────────────────────────────────────────────────────────
function daysUntilReset(updatedAt?: string): number {
  if (!updatedAt) return 30;
  const last = new Date(updatedAt).getTime();
  const next = last + 30 * 24 * 60 * 60 * 1000;
  const diff = Math.ceil((next - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// ── Main Component ────────────────────────────────────────────────────────────
interface AccountPageProps {
  onUpgrade: () => void; // navigate to pricing page
}

export function AccountPage({ onUpgrade }: AccountPageProps) {
  const { user } = useAuth();
  const [status, setStatus]   = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [packLoading, setPackLoading] = useState<'standard' | 'volume' | null>(null);
  const [packError, setPackError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getPaymentStatus(user.id).then(s => {
      setStatus(s);
      setLoading(false);
    });
  }, [user]);

  const plan = status?.subscription ?? 'free';
  const meta = PLAN_META[plan] ?? PLAN_META.free;
  const PlanIcon = meta.icon;

  const aiCredits  = status?.credits_ai  ?? 0;
  const ttsCredits = status?.credits_tts ?? 0;

  const handleBuyPack = async (packId: 'credits_standard' | 'credits_volume') => {
    if (!user) return;
    setPackError(null);
    setPackLoading(packId === 'credits_standard' ? 'standard' : 'volume');
    try {
      await redirectToCheckout({ planId: packId, userId: user.id, userEmail: user.email ?? '' });
    } catch (err: any) {
      setPackError(err.message ?? 'Something went wrong.');
      setPackLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading your account…</p>
        </div>
      </div>
    );
  }

  const daysLeft = daysUntilReset();

  return (
    <div className="min-h-screen w-full relative z-10 pb-24">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-900/15 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-10 relative">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-5">
              <Shield className="w-3.5 h-3.5" /> My Account
            </span>
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-500/20 shrink-0">
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${meta.gradient} text-white`}>
                    <PlanIcon className="w-3 h-3" />
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {user?.user_metadata?.track === 'k12' ? 'Education (K-12)' : 'Corporate Training'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-6">

        {/* ── Row 1: Plan + Reset Timer ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Current Plan Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
            className="relative rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-6 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${meta.gradient} opacity-5 rounded-full blur-2xl pointer-events-none`} />
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Plan</p>
                <p className="text-2xl font-extrabold text-white mt-1">{meta.label}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg`}>
                <PlanIcon className="w-6 h-6 text-white" />
              </div>
            </div>

            {plan === 'free' ? (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm">You're on the free plan. Upgrade to unlock more credits and premium features.</p>
                <button
                  onClick={onUpgrade}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 group hover:scale-[1.02]"
                >
                  <Crown className="w-4 h-4" /> Upgrade Plan
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Active subscription
                </div>
                <button
                  onClick={onUpgrade}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  View All Plans <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>

          {/* Credit Reset Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="relative rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-6 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-900/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Credit Reset</p>
            <div className="flex items-end gap-3 mb-4">
              <p className="text-5xl font-black text-white">{daysLeft}</p>
              <p className="text-slate-400 font-bold text-lg mb-1">days left</p>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((daysLeft / 30) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>Credits reset automatically every 30 days</span>
            </div>
          </motion.div>
        </div>

        {/* ── Row 2: Credits ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <div>
              <p className="font-bold text-white">Credit Balance</p>
              <p className="text-xs text-slate-500">Used for AI course generation and TTS narration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* AI Credits */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <p className="text-sm font-bold text-slate-300">AI Generation Credits</p>
              </div>
              <p className="text-3xl font-black text-white mb-3">{aiCredits.toLocaleString()}</p>
              <CreditBar used={aiCredits} total={meta.creditsAi} color="indigo" />
            </div>

            {/* TTS Credits */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-bold text-slate-300">TTS Audio Credits</p>
              </div>
              {meta.creditsTts > 0 ? (
                <>
                  <p className="text-3xl font-black text-white mb-3">{ttsCredits.toLocaleString()}</p>
                  <CreditBar used={ttsCredits} total={meta.creditsTts} color="purple" />
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-3xl font-black text-slate-600">—</p>
                  <p className="text-xs text-slate-600 font-medium">Not included in your plan</p>
                  <button onClick={onUpgrade} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors">
                    Upgrade to unlock <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Row 3: Buy Credit Packs ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 p-6 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-white">Top-Up Credit Packs</p>
              <p className="text-xs text-slate-500">One-time purchase · never expires · stacks with subscription</p>
            </div>
          </div>

          {packError && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{packError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Standard */}
            <div className="flex flex-col gap-3 bg-slate-800/50 border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-5 transition-all">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">Standard Pack</p>
                <p className="text-3xl font-extrabold text-white">$25</p>
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-bold text-slate-300">100 AI credits</span>
                </div>
              </div>
              <button
                onClick={() => handleBuyPack('credits_standard')}
                disabled={!!packLoading}
                className="w-full py-2.5 rounded-xl border border-amber-500/30 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {packLoading === 'standard'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><CreditCard className="w-4 h-4" /> Buy Pack</>}
              </button>
            </div>

            {/* Volume */}
            <div className="relative flex flex-col gap-3 bg-gradient-to-b from-amber-950/30 to-slate-800/50 border border-amber-400/40 hover:border-amber-400/60 rounded-xl p-5 transition-all shadow-lg shadow-amber-500/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Best Deal</span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">Volume Pack</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-extrabold text-white">$100</p>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mb-1">Save 20%</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-bold text-slate-300">500 AI credits</span>
                </div>
              </div>
              <button
                onClick={() => handleBuyPack('credits_volume')}
                disabled={!!packLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
              >
                {packLoading === 'volume'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><CreditCard className="w-4 h-4" /> Buy Pack</>}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Row 4: Publishing History (placeholder) ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-white">Course Publishing History</p>
              <p className="text-xs text-slate-500">Your generated and exported courses</p>
            </div>
          </div>

          {/* Placeholder — will be wired to real data once publishing is tracked */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-400 font-bold text-sm mb-1">No courses published yet</p>
            <p className="text-slate-600 text-xs max-w-xs">
              Your generated and exported courses will appear here. Start building your first course from the dashboard.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
