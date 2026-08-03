import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { confirmCheckoutSession } from '../services/paymentService';

interface PaymentSuccessPageProps {
  onContinue: () => void;
  userId?: string | null;
}

export function PaymentSuccessPage({ onContinue, userId }: PaymentSuccessPageProps) {
  const [countdown, setCountdown] = useState(5);
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [planLabel, setPlanLabel] = useState<string | null>(null);

  // Activate entitlements from ?session_id= (covers missed webhooks)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId || !userId) {
      setSyncing(false);
      if (!sessionId) setSyncError('Missing session id — open My Account and refresh, or contact support if plan stays Free.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await confirmCheckoutSession(sessionId, userId);
        if (cancelled) return;
        if (!result.ok) {
          setSyncError(result.error ?? 'Could not activate plan automatically.');
        } else {
          setPlanLabel(result.subscription ?? null);
          // Clean session_id from URL after successful sync
          params.delete('session_id');
          const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
          window.history.replaceState({}, '', next);
        }
      } catch (err: any) {
        if (!cancelled) setSyncError(err.message ?? 'Activation failed.');
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // Auto-redirect after sync finishes
  useEffect(() => {
    if (syncing) return;
    if (countdown <= 0) { onContinue(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onContinue, syncing]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-24 h-24 mx-auto mb-8"
        >
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-full flex items-center justify-center">
            {syncing
              ? <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
              : <CheckCircle2 className="w-12 h-12 text-emerald-400" />}
          </div>
        </motion.div>

        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-5">
          <Sparkles className="w-3.5 h-3.5" /> Payment Successful
        </span>

        <h1 className="text-4xl font-extrabold text-white mb-3">
          {syncing ? 'Activating your plan…' : "You're all set!"}
        </h1>

        <p className="text-slate-400 text-lg mb-6 leading-relaxed">
          {syncing
            ? 'Confirming your Stripe checkout and unlocking credits on your account.'
            : planLabel
              ? `Your ${planLabel.replace(/_/g, ' ')} plan is active. Credits are ready on My Account.`
              : 'Your payment was processed. Check My Account for your plan and credits.'}
        </p>

        {syncError && (
          <div className="flex items-start gap-2 mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">{syncError}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={onContinue}
            disabled={syncing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group disabled:opacity-60"
          >
            Go to My Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {!syncing && (
            <p className="text-slate-600 text-sm">
              Redirecting in <span className="text-emerald-400 font-bold">{countdown}s</span>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
