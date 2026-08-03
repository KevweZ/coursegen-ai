import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, X, ChevronDown, ChevronRight,
  MessageSquare, Send, CheckCircle2, Loader2, AlertCircle
} from 'lucide-react';

// ── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'My PowerPoint upload isn\'t working — what should I do?',
    a: 'Make sure your file is a .pptx file (not .ppt or .odp). Files over 50MB may time out — try splitting your deck into smaller sections. PDFs and Word documents also work if you can export to those formats.',
  },
  {
    q: 'Course generation is stuck — how long should it take?',
    a: 'Generation typically takes 30–90 seconds depending on course length. If it\'s been over 3 minutes with no progress, refresh the page and try again. If the issue persists, submit a support ticket below.',
  },
  {
    q: 'How do I export my course to SCORM?',
    a: 'From the Course Preview, click the "Export SCORM" button in the top toolbar. This downloads a .zip file that can be uploaded directly to any SCORM-compatible LMS (Moodle, Cornerstone, Blackboard, TalentLMS, etc.).',
  },
  {
    q: 'Why are my quiz slides showing as empty after generation?',
    a: 'This can happen if the source document had very little content on a particular topic. Try refreshing the Course Preview — if the quiz is still empty, use the QC Check tool (in the preview toolbar) which can detect and regenerate broken slides.',
  },
  {
    q: 'How do I change the course theme or background?',
    a: 'In the Course Preview, open "Player Properties" from the top-right toolbar. You can change the theme (Dark / Light / Unified) and the background image from there.',
  },
  {
    q: 'How do I cancel or change my subscription?',
    a: 'Go to My Account → Manage Subscription (Stripe billing portal) to update payment method, download invoices, or cancel. Access continues through the end of the paid period. For refund requests within 14 days of a charge, email support@nexcourse.ai with your account email and receipt.',
  },
];

const ISSUE_TYPES = [
  'Generation Issue',
  'Export / SCORM Issue',
  'File Upload Issue',
  'Billing & Subscriptions',
  'Bug Report',
  'Other',
];

interface HelpWidgetProps {
  userEmail?: string;
  userId?: string;
}

export function HelpWidget({ userEmail, userId }: HelpWidgetProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'faq' | 'ticket'>('faq');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Ticket form state
  const [issueType, setIssueType] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketRef, setTicketRef] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!issueType) { setError('Please select an issue type.'); return; }
    if (message.trim().length < 20) { setError('Please describe your issue in at least 20 characters.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userEmail?.split('@')[0] ?? 'NexCourse User',
          email: userEmail ?? '',
          subject: issueType,
          message,
          issueType,
          userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setTicketRef(data.ticketRef);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetTicket = () => {
    setSubmitted(false);
    setIssueType('');
    setMessage('');
    setTicketRef('');
    setError('');
  };

  return (
    <>
      {/* Floating button */}
      <button
        id="help-widget-toggle"
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-[800] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-slate-700 hover:bg-slate-600 rotate-90'
            : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-110'
        }`}
        aria-label="Toggle help panel"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <HelpCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="help-panel"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-[799] w-[360px] max-h-[calc(100vh-200px)] bg-slate-950 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 shrink-0">
              <h3 className="text-white font-bold text-base">Help & Support</h3>
              <p className="text-indigo-200 text-xs mt-0.5">Get answers or submit a ticket</p>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-800 shrink-0 bg-slate-900">
              <button
                onClick={() => setTab('faq')}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                  tab === 'faq'
                    ? 'text-indigo-400 border-b-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                FAQ
              </button>
              <button
                onClick={() => setTab('ticket')}
                className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                  tab === 'ticket'
                    ? 'text-indigo-400 border-b-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Submit Ticket
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
              {/* FAQ Tab */}
              {tab === 'faq' && (
                <div className="p-4 space-y-2">
                  {FAQS.map((faq, i) => (
                    <div key={i} className="border border-slate-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
                      >
                        <ChevronRight
                          className={`w-4 h-4 text-indigo-400 mt-0.5 shrink-0 transition-transform ${expandedFaq === i ? 'rotate-90' : ''}`}
                        />
                        <span className="text-sm font-semibold text-slate-200 leading-snug">{faq.q}</span>
                      </button>
                      <AnimatePresence>
                        {expandedFaq === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <p className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 text-center pt-2">
                    Can't find your answer?{' '}
                    <button
                      onClick={() => setTab('ticket')}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Submit a ticket →
                    </button>
                  </p>
                </div>
              )}

              {/* Ticket Tab */}
              {tab === 'ticket' && (
                <div className="p-4">
                  {submitted ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                      <h4 className="text-white font-bold">Ticket Submitted!</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        We'll respond to <span className="text-indigo-300 font-semibold">{userEmail}</span> within 24–48 hours.
                      </p>
                      <p className="text-xs text-slate-500 font-mono bg-slate-900 px-3 py-1.5 rounded-lg inline-block">
                        Ref: {ticketRef}
                      </p>
                      <button
                        onClick={resetTicket}
                        className="block mx-auto text-sm text-indigo-400 hover:text-indigo-300 mt-2"
                      >
                        Submit another ticket
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Auto-filled email display */}
                      {userEmail && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
                          <p className="text-xs text-slate-500 mb-0.5">Responding to</p>
                          <p className="text-sm text-slate-300 font-semibold">{userEmail}</p>
                        </div>
                      )}

                      {/* Issue Type */}
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                          Issue Type <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={issueType}
                          onChange={e => setIssueType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none transition-all"
                        >
                          <option value="">Select issue type...</option>
                          {ISSUE_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                          Describe your issue <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          rows={5}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="Please describe the problem in detail — what you were doing, what happened, and any error messages you saw..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none transition-all resize-none placeholder-slate-600"
                        />
                        <p className="text-xs text-slate-600 mt-1 text-right">{message.length} chars</p>
                      </div>

                      {/* Error */}
                      {error && (
                        <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p className="text-xs">{error}</p>
                        </div>
                      )}

                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                      >
                        {submitting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : (
                          <><Send className="w-4 h-4" /> Submit Ticket</>
                        )}
                      </button>

                      <p className="text-xs text-slate-500 text-center">
                        Or email us directly at{' '}
                        <a href="mailto:support@nexcourse.ai" className="text-indigo-400 hover:text-indigo-300">
                          support@nexcourse.ai
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
