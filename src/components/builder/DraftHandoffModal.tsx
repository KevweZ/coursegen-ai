import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Send, X, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  courseTitle?: string;
  onClose: () => void;
  onSend: (email: string) => Promise<{ ok: boolean; error?: string }>;
}

export function DraftHandoffModal({ isOpen, courseTitle, onClose, onSend }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setError('Enter the recipient’s NexCourse account email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onSend(trimmed);
      if (result.ok) {
        setEmail('');
        onClose();
      } else {
        setError(result.error || 'Could not send a copy.');
      }
    } finally {
      setBusy(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 bg-black/55 z-[720]" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[721] flex items-center justify-center p-4 pointer-events-none">
        <form
          onSubmit={submit}
          className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-white font-extrabold text-lg">Send a copy</h2>
              <p className="text-sm text-slate-400 mt-1">
                Duplicate {courseTitle ? `"${courseTitle}"` : 'this draft'} onto another NexCourse account.
                They edit independently. You keep your copy.
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recipient email</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send copy
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body,
  );
}
