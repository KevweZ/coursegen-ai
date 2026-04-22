import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, LifeBuoy } from 'lucide-react';

interface PaymentCancelPageProps {
  onBackToPricing: () => void;
  onBackToHome: () => void;
}

export function PaymentCancelPage({ onBackToPricing, onBackToHome }: PaymentCancelPageProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-800/30 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative max-w-md w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-24 h-24 mx-auto mb-8"
        >
          <div className="absolute inset-0 bg-slate-700/30 rounded-full blur-xl" />
          <div className="relative w-24 h-24 bg-slate-800/60 border-2 border-slate-600/40 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-slate-400" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-extrabold text-white mb-3"
        >
          Payment Cancelled
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 text-lg mb-8 leading-relaxed"
        >
          No worries — your payment was not processed and you haven't been charged. You can go back and try again whenever you're ready.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={onBackToPricing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Pricing
          </button>

          <button
            onClick={onBackToHome}
            className="w-full py-3.5 rounded-xl bg-transparent border border-slate-700 hover:border-slate-600 hover:bg-slate-800/40 text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <LifeBuoy className="w-4 h-4 text-slate-400" />
            Return to Dashboard
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
