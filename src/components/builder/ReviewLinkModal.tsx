import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Link2, Loader2, Trash2, X } from 'lucide-react';
import {
  REVIEW_TTL_DAYS,
  ReviewLinkMeta,
  listReviewLinks,
  revokeReviewLink,
} from '../../lib/reviewLinkService';

interface Props {
  open: boolean;
  busy: boolean;
  error: string | null;
  createdUrl: string | null;
  createdExpiresAt: string | null;
  onClose: () => void;
  onCreate: () => void;
}

function formatExpiry(iso: string | null | undefined): string {
  if (!iso) return `Expires in ${REVIEW_TTL_DAYS} days`;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return `Expires in ${REVIEW_TTL_DAYS} days`;
    return `Expires ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } catch {
    return `Expires in ${REVIEW_TTL_DAYS} days`;
  }
}

export function ReviewLinkModal({
  open,
  busy,
  error,
  createdUrl,
  createdExpiresAt,
  onClose,
  onCreate,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<ReviewLinkMeta[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    let cancelled = false;
    listReviewLinks()
      .then(items => {
        if (!cancelled) {
          setLinks(items.filter(l => l.ready !== false && !l.revokedAt));
          setListError(null);
        }
      })
      .catch(e => {
        if (!cancelled) setListError(e?.message || 'Could not load existing links.');
      });
    return () => { cancelled = true; };
  }, [open, createdUrl]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy this review link:', url);
    }
  };

  const handleRevoke = async (token: string) => {
    setRevoking(token);
    try {
      await revokeReviewLink(token);
      setLinks(prev => prev.filter(l => l.token !== token));
    } catch (e: any) {
      setListError(e?.message || 'Could not revoke this link.');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={busy ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="review-link-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-sky-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 id="review-link-title" className="text-lg font-bold text-white">Review link</h3>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Creates a temporary, unlisted web link so an SME can click through this course like a learner.
                  No Edit, Save, or Publish — and no login. Links expire after {REVIEW_TTL_DAYS} days and can be revoked anytime.
                </p>
              </div>
            </div>

            <div className="px-5 pb-4 space-y-3">
              {createdUrl && (
                <div className="rounded-xl border border-sky-700/40 bg-sky-950/40 p-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Ready to share</p>
                  <p className="text-xs text-slate-300 break-all font-mono leading-relaxed">{createdUrl}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">{formatExpiry(createdExpiresAt)}</span>
                    <button
                      type="button"
                      onClick={() => copy(createdUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-lg px-3 py-2">{error}</p>
              )}
              {listError && !error && (
                <p className="text-xs text-amber-300/90">{listError}</p>
              )}

              {links.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active links</p>
                  <ul className="max-h-40 overflow-y-auto space-y-1">
                    {links.map(link => {
                      const url = typeof window !== 'undefined'
                        ? `${window.location.origin}/review/${encodeURIComponent(link.token)}`
                        : `/review/${link.token}`;
                      return (
                        <li
                          key={link.token}
                          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-200 truncate">{link.courseTitle || 'Untitled Course'}</p>
                            <p className="text-[10px] text-slate-500">{formatExpiry(link.expiresAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copy(url)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={revoking === link.token}
                            onClick={() => handleRevoke(link.token)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
                            title="Revoke"
                          >
                            {revoking === link.token
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 p-4 border-t border-slate-800 bg-slate-900/80">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onCreate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {busy ? 'Creating link…' : createdUrl ? 'Create new snapshot' : 'Create review link'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
