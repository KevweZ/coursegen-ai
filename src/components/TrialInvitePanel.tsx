import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, UserX, Clock, CheckCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';

interface InvitedUser {
  email: string;
  userId: string;
  expiresAt: string;
  invitedAt: string;
}

interface Props {
  onClose: () => void;
  apiBase: string;
  accessToken: string;
}

const TRIAL_OPTIONS = [
  { label: '7 days (default)', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

export function TrialInvitePanel({ onClose, apiBase, accessToken }: Props) {
  const [email, setEmail]         = useState('');
  const [trialDays, setTrialDays] = useState(7);
  const [sending, setSending]     = useState(false);
  const [message, setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>(() => {
    try { return JSON.parse(localStorage.getItem('nex_trial_invites') || '[]'); } catch { return []; }
  });
  const [revoking, setRevoking]   = useState<string | null>(null);

  const saveUsers = (users: InvitedUser[]) => {
    setInvitedUsers(users);
    localStorage.setItem('nex_trial_invites', JSON.stringify(users));
  };

  const sendInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: email.trim(), trialDays }),
      });
      const data = await res.json();
      if (res.status === 503 && data.code === 'COLD_START') {
        // Render is waking up — show countdown and auto-retry once
        setMessage({ type: 'error', text: '⏳ Server is warming up — retrying in 30 seconds...' });
        setSending(false);
        let secs = 30;
        const tick = setInterval(() => {
          secs--;
          if (secs > 0) {
            setMessage({ type: 'error', text: `⏳ Server warming up — retrying in ${secs}s...` });
          } else {
            clearInterval(tick);
            setMessage(null);
            sendInvite();
          }
        }, 1000);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      const newUser: InvitedUser = {
        email: email.trim(),
        userId: data.userId,
        expiresAt: data.expiresAt,
        invitedAt: new Date().toISOString(),
      };
      saveUsers([newUser, ...invitedUsers]);
      setEmail('');
      setMessage({ type: 'success', text: `✓ Invite sent to ${newUser.email}. They'll receive an email with a link to get started.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSending(false);
    }
  };


  const revokeUser = async (user: InvitedUser) => {
    setRevoking(user.userId);
    try {
      const res = await fetch(`${apiBase}/api/admin/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revoke failed');
      // Mark as revoked by setting expiresAt to yesterday
      saveUsers(invitedUsers.map(u =>
        u.userId === user.userId
          ? { ...u, expiresAt: new Date(Date.now() - 86400000).toISOString() }
          : u
      ));
    } catch (e: any) {
      setMessage({ type: 'error', text: `Revoke failed: ${e.message}` });
    } finally {
      setRevoking(null);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();
  const fmtDate   = (d: string)          => new Date(d).toLocaleDateString('en-GB', { dateStyle: 'medium' });

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-lg">Trial Invites</h2>
            <p className="text-slate-400 text-xs mt-0.5">Send timed trial access to beta testers</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* Send invite form */}
          <div className="bg-slate-800/60 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-slate-300 text-sm font-semibold">Send new invite</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="tester@example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex items-center gap-3">
              <select
                value={trialDays}
                onChange={e => setTrialDays(Number(e.target.value))}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                {TRIAL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={sendInvite}
                disabled={sending || !email.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-colors"
              >
                {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>

          {/* Status message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${
                  message.type === 'success' ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300' : 'bg-red-900/40 border border-red-700 text-red-300'
                }`}
              >
                {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invited users list */}
          {invitedUsers.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Sent Invites</p>
              <div className="flex flex-col gap-2">
                {invitedUsers.map((u, i) => {
                  const expired = isExpired(u.expiresAt);
                  return (
                    <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className={`text-xs ${expired ? 'text-red-400' : 'text-slate-400'}`}>
                            {expired ? 'Expired ' : 'Expires '}{fmtDate(u.expiresAt)}
                          </span>
                        </div>
                      </div>
                      {!expired && (
                        <button
                          onClick={() => revokeUser(u)}
                          disabled={revoking === u.userId}
                          title="Revoke access immediately"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-800/60 hover:bg-red-900/20 text-red-400 text-xs font-semibold disabled:opacity-40 transition-colors"
                        >
                          {revoking === u.userId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                          Revoke
                        </button>
                      )}
                      {expired && <span className="text-xs text-slate-600 font-medium">Expired</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* What trial users can/can't do */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Trial user constraints</p>
            <ul className="space-y-1">
              {[
                ['✅', 'Demo Course sandbox — full access'],
                ['✅', 'Upload a file & build a course'],
                ['✅', 'Edit slides, narration, Quality scan, save drafts (3 slots)'],
                ['⚠️', 'AI course generation — max 30 complex AI calls / week'],
                ['⚠️', 'Narration audio — max 200 TTS clips / week (shared platform limit)'],
                ['❌', 'Export SCORM (Publish is blocked with upgrade prompt)'],
                ['❌', 'Admin / invite tools hidden'],
                ['❌', 'Access ends automatically at expiry'],
              ].map(([icon, text], i) => (
                <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{icon}</span>{text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default TrialInvitePanel;
