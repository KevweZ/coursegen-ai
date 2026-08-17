import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, UserX, Clock, CheckCircle, AlertTriangle, X, RefreshCw, RotateCcw } from 'lucide-react';

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

const LS_KEY = 'nex_trial_invites';

function readLocalCache(): InvitedUser[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

export function TrialInvitePanel({ onClose, apiBase, accessToken }: Props) {
  const [email, setEmail]         = useState('');
  const [trialDays, setTrialDays] = useState(7);
  const [sending, setSending]     = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [message, setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>(() => readLocalCache());
  const [revoking, setRevoking]   = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);

  const saveUsers = (users: InvitedUser[]) => {
    setInvitedUsers(users);
    try { localStorage.setItem(LS_KEY, JSON.stringify(users)); } catch { /* quota */ }
  };

  const loadInvites = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/invites`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load invites');
      const cloud: InvitedUser[] = (data.invites || [])
        .filter((u: any) => u?.email && u?.userId)
        .map((u: any) => ({
          email: u.email,
          userId: u.userId,
          expiresAt: u.expiresAt || new Date(0).toISOString(),
          invitedAt: u.invitedAt || new Date().toISOString(),
        }));
      saveUsers(cloud);
    } catch (e: any) {
      // Fall back to device cache if API is cold / unreachable
      const cached = readLocalCache();
      if (cached.length) {
        setInvitedUsers(cached);
        setMessage({
          type: 'error',
          text: `Could not refresh cloud invite list (${e.message}). Showing this device’s cache.`,
        });
      } else {
        setMessage({ type: 'error', text: e.message || 'Could not load invites' });
      }
    } finally {
      setLoadingList(false);
    }
  }, [apiBase, accessToken]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

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
      setEmail('');
      setMessage({ type: 'success', text: `✓ Invite sent to ${email.trim()}. They'll receive an email with a link to get started.` });
      await loadInvites();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSending(false);
    }
  };

  const revokeUser = async (user: InvitedUser) => {
    setRevoking(user.userId);
    setMessage(null);
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
      setMessage({ type: 'success', text: `Revoked access for ${user.email}.` });
      await loadInvites();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Revoke failed: ${e.message}` });
    } finally {
      setRevoking(null);
    }
  };

  const reactivateUser = async (user: InvitedUser, days = 7) => {
    setExtending(user.userId);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.userId, trialDays: days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reactivate failed');
      setMessage({
        type: 'success',
        text: `✓ Reactivated ${user.email} for ${days} days (expires ${new Date(data.expiresAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}). Ask them to refresh or sign out/in if they still see the expired screen.`,
      });
      await loadInvites();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Reactivate failed: ${e.message}` });
    } finally {
      setExtending(null);
    }
  };

  const isExpired = (expiresAt: string) => !expiresAt || new Date(expiresAt) < new Date();
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-lg">Trial Invites</h2>
            <p className="text-slate-400 text-xs mt-0.5">Synced across devices · send timed trial access</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void loadInvites()}
              disabled={loadingList}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-40"
              title="Refresh list from cloud"
            >
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
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

          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Sent Invites {loadingList ? '· loading…' : `· ${invitedUsers.length}`}
            </p>
            {invitedUsers.length === 0 && !loadingList ? (
              <p className="text-sm text-slate-500 py-4 text-center">No trial users yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {invitedUsers.map((u) => {
                  const expired = isExpired(u.expiresAt);
                  const busy = revoking === u.userId || extending === u.userId;
                  return (
                    <div key={u.userId} className="flex items-center justify-between gap-2 bg-slate-800/50 rounded-lg px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className={`text-xs ${expired ? 'text-red-400' : 'text-slate-400'}`}>
                            {expired ? 'Expired ' : 'Expires '}{fmtDate(u.expiresAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {expired ? (
                          <button
                            onClick={() => void reactivateUser(u, 7)}
                            disabled={busy}
                            title="Renew trial for 7 days from now"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-700/60 hover:bg-emerald-900/20 text-emerald-400 text-xs font-semibold disabled:opacity-40 transition-colors"
                          >
                            {extending === u.userId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                            Reactivate
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => void reactivateUser(u, 7)}
                              disabled={busy}
                              title="Extend trial by 7 days from now"
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-700/60 hover:bg-indigo-900/20 text-indigo-300 text-xs font-semibold disabled:opacity-40 transition-colors"
                            >
                              {extending === u.userId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                              Extend
                            </button>
                            <button
                              onClick={() => void revokeUser(u)}
                              disabled={busy}
                              title="Revoke access immediately"
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-800/60 hover:bg-red-900/20 text-red-400 text-xs font-semibold disabled:opacity-40 transition-colors"
                            >
                              {revoking === u.userId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Trial user constraints</p>
            <ul className="space-y-1">
              {[
                ['✅', 'Demo Course sandbox — full access'],
                ['✅', 'Upload a file & build a course'],
                ['✅', 'Edit slides, narration, Quality scan, save drafts (3 slots)'],
                ['⚠️', 'AI course generation — max 30 complex AI calls / week (not the same as trial end date)'],
                ['⚠️', 'Narration audio — max 200 TTS clips / week (separate from AI generation limit)'],
                ['✅', 'Export SCORM (Publish Course)'],
                ['✅', 'Save drafts (3 slots) — syncs to your account across devices'],
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
