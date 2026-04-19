import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  Building2,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth, UserTrack } from '../../contexts/AuthContext';

// ── Google Icon SVG ───────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// ── Shared input component ────────────────────────────────────────────────────
const AuthInput = ({
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  autoComplete,
  rightElement,
}: {
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  rightElement?: React.ReactNode;
}) => (
  <div className="relative">
    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoComplete={autoComplete}
      className="w-full bg-slate-800/60 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 text-white placeholder-slate-500 rounded-xl pl-10 pr-10 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
    />
    {rightElement && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
    )}
  </div>
);

// ── Main Auth Page ────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthPage({ onBackToHome }: { onBackToHome?: () => void }) {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode]           = useState<AuthMode>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [fullName, setFullName]   = useState('');
  const [track, setTrack]         = useState<UserTrack>('corporate');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const resetForm = () => {
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirm('');
  };

  const switchMode = (m: AuthMode) => { resetForm(); setMode(m); };

  // ── Submit handlers ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError(null);
    const { error, needsVerification } = await signUp(email, password, fullName, track);
    setLoading(false);
    if (error) { setError(error); return; }
    if (needsVerification) {
      setSuccess('Account created! Please check your email to verify your address before signing in.');
      switchMode('login');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) { setError(error); return; }
    setSuccess('Password reset link sent! Check your email inbox.');
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await signInWithGoogle();
    // Google OAuth redirects the page, so we only land here on error
    if (error) { setError(error); setGoogleLoading(false); }
  };

  // ── Shared submit ───────────────────────────────────────────────────────────
  const onSubmit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] transform -translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-8 relative z-10"
      >
        {onBackToHome && (
          <button onClick={onBackToHome} className="mr-2 text-slate-500 hover:text-slate-300 transition-colors text-xs font-medium flex items-center gap-1">
            ← Home
          </button>
        )}
        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
          <Zap className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="font-extrabold text-2xl tracking-tight text-white">
          CourseGEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span>
        </span>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Mode tabs (login / signup only) */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-slate-800">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-4 text-sm font-bold transition-all ${
                  mode === m
                    ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        <div className="p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-xl font-extrabold text-white">
                  {mode === 'login'  && 'Welcome back'}
                  {mode === 'signup' && 'Create your account'}
                  {mode === 'forgot' && 'Reset your password'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {mode === 'login'  && 'Sign in to access your courses.'}
                  {mode === 'signup' && 'Get started — it only takes a moment.'}
                  {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
                </p>
              </div>

              {/* Feedback banners */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-5"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-emerald-300 text-sm">{success}</p>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-3">
                {/* Full name — sign up only */}
                {mode === 'signup' && (
                  <AuthInput
                    icon={User}
                    placeholder="Full name"
                    value={fullName}
                    onChange={setFullName}
                    autoComplete="name"
                  />
                )}

                <AuthInput
                  icon={Mail}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />

                {mode !== 'forgot' && (
                  <AuthInput
                    icon={Lock}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                )}

                {mode === 'signup' && (
                  <AuthInput
                    icon={Lock}
                    type="password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={setConfirm}
                    autoComplete="new-password"
                  />
                )}

                {/* Track selector — sign up only */}
                {mode === 'signup' && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">
                      I'm signing up for
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'corporate', icon: Building2, label: 'Corporate Training' },
                        { value: 'k12',       icon: GraduationCap, label: 'Education (K-12)' },
                      ] as const).map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTrack(value)}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                            track === value
                              ? value === 'k12'
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                                : 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
                              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {label}
                        </button>
                      ))}
                    </div>
                    {track === 'k12' && (
                      <p className="text-xs text-amber-400/80 mt-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Requires a verified <strong>.edu</strong> or <strong>.k12.state.us</strong> email
                      </p>
                    )}
                  </div>
                )}

                {/* Forgot password link */}
                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 group mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login'  && 'Sign In'}
                      {mode === 'signup' && 'Create Account'}
                      {mode === 'forgot' && 'Send Reset Link'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Google OAuth — login & signup only */}
              {mode !== 'forgot' && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500 font-medium">or continue with</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>

                  <button
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800 text-white text-sm font-bold transition-all disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <GoogleIcon />
                    )}
                    Sign in with Google
                  </button>
                </>
              )}

              {/* Back link from forgot mode */}
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="mt-5 w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors font-medium"
                >
                  ← Back to Sign In
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer */}
      <p className="relative z-10 mt-6 text-xs text-slate-600 text-center">
        By signing in you agree to our Terms of Service and Privacy Policy.<br />
        Your data is always kept private & safe.
      </p>
    </div>
  );
}
