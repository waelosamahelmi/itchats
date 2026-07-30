import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Calendar } from 'lucide-react';
import { loginUser, registerUser, useAppDispatch } from '@/app/store';
import type { RootState } from '@/app/store';
import AnimatedLogo from '@/components/AnimatedLogo';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

function isAtLeast13(dd: string, mm: string, yyyy: string): boolean {
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (!day || !month || !year) return false;
  const dob = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 13;
}

function openLegal(path: string) {
  window.open(`${window.location.origin}${path}`, '_blank', 'noopener,noreferrer');
}

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { error, token, loading, user } = useSelector((s: RootState) => s.auth);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotToken, setForgotToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [googleAvailable, setGoogleAvailable] = useState(false);

  // Birthdate fields
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Terms agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => { if (token && user) nav('/', { replace: true }); }, [token, user, nav]);

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch(`${API}/auth/google-status`)
      .then(r => r.json())
      .then(data => setGoogleAvailable(data?.available === true))
      .catch(() => setGoogleAvailable(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLocalError('');
    if (isLogin) {
      dispatch(loginUser({ email, password }));
    } else {
      // Validate birthdate
      if (!isAtLeast13(dobDay, dobMonth, dobYear)) {
        setLocalError('You must be at least 13 years old to sign up');
        return;
      }
      if (!agreedToTerms) {
        setLocalError('You must agree to the Terms of Service and Privacy Policy');
        return;
      }
      const dateOfBirth = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      dispatch(registerUser({ email, username, password, dateOfBirth, agreedToTerms }));
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setLocalError('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.devToken) { setForgotToken(data.devToken); setForgotSent(true); }
      else setForgotSent(true);
    } catch { setLocalError('Failed to send reset email'); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setLocalError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: forgotToken, password: newPassword }),
      });
      if (res.ok) { setForgotMode(false); setForgotSent(false); setForgotToken(''); setIsLogin(true); }
      else { const d = await res.json(); setLocalError(d.message || 'Reset failed'); }
    } catch { setLocalError('Reset failed'); }
  };

  const displayError = localError || error;

  if (forgotMode) return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-bg-canvas" />
      <div className="w-full max-w-sm relative z-10">
        <button onClick={() => { setForgotMode(false); setForgotSent(false); }} className="mb-6 p-2 -ml-2 rounded-full glass text-text-secondary hover:text-white"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Reset Password</h1>
        <p className="text-text-muted text-sm mb-6">{forgotSent ? 'Enter the reset token and new password' : 'Enter your email to receive a reset link'}</p>
        {displayError && <div className="mb-4 rounded-2xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger text-center">{displayError}</div>}
        {!forgotSent ? (
          <form onSubmit={handleForgot} className="space-y-3">
            <div className="glass rounded-2xl flex items-center gap-3 px-4"><Mail size={17} className="text-text-muted shrink-0" />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary outline-none" required />
            </div>
            <button type="submit" className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm">Send Reset Link</button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <div className="glass rounded-2xl flex items-center gap-3 px-4"><Lock size={17} className="text-text-muted shrink-0" />
              <input value={forgotToken} onChange={e => setForgotToken(e.target.value)} placeholder="Reset token" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary outline-none font-mono" required />
            </div>
            <div className="glass rounded-2xl flex items-center gap-3 px-4"><Lock size={17} className="text-text-muted shrink-0" />
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="New password" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary outline-none" required minLength={8} />
            </div>
            <button type="submit" className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm">Reset Password</button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-bg-canvas" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.5), transparent)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.35), transparent)' }} />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-0"><AnimatedLogo size={180} /></div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight -mt-2">ItChats AI</h1>
          <p className="text-text-muted text-sm mt-2">{isLogin ? 'Welcome back to your AI world' : 'Start building your AI universe'}</p>
          {/* Google SSO */}
          {googleAvailable && (
          <div className="mt-5">
            <button onClick={() => { window.location.href = window.location.origin + '/v1/auth/google'; }}
               className="flex items-center justify-center gap-2.5 w-full rounded-xl border border-border-subtle bg-white/5 hover:bg-white/10 py-2.5 text-sm font-medium text-text-primary transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </div>
          )}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-border-subtle" /><span className="text-xs text-text-muted">or</span><div className="flex-1 h-px bg-border-subtle" />
          </div>
        </div>
        {displayError && (
          <div className="mb-5 rounded-2xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger text-center">{displayError}</div>
        )}
        <form onSubmit={submit} className="space-y-3">
          <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
            <Mail size={17} className="text-text-muted shrink-0" />
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none" required />
          </div>
          {!isLogin && (
            <>
              <div className="glass rounded-2xl flex items-center gap-3 px-4 animate-slide-up focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                <User size={17} className="text-text-muted shrink-0" />
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none" required minLength={3} />
              </div>
              <div className="animate-slide-up">
                <label className="text-xs text-text-muted mb-1.5 block font-medium">Date of Birth</label>
                <div className="flex gap-2">
                  <div className="glass rounded-2xl flex items-center px-3 flex-1 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                    <Calendar size={15} className="text-text-muted shrink-0 mr-1.5" />
                    <input value={dobDay} onChange={e => setDobDay(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="DD" className="flex-1 bg-transparent py-3 text-sm text-text-primary placeholder:text-text-muted outline-none text-center" required maxLength={2} />
                  </div>
                  <div className="glass rounded-2xl flex items-center px-3 flex-1 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                    <input value={dobMonth} onChange={e => setDobMonth(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="MM" className="flex-1 bg-transparent py-3 text-sm text-text-primary placeholder:text-text-muted outline-none text-center" required maxLength={2} />
                  </div>
                  <div className="glass rounded-2xl flex items-center px-3 flex-1 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                    <input value={dobYear} onChange={e => setDobYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="YYYY" className="flex-1 bg-transparent py-3 text-sm text-text-primary placeholder:text-text-muted outline-none text-center" required maxLength={4} />
                  </div>
                </div>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer group animate-slide-up">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle bg-bg-elevated accent-brand-primary cursor-pointer"
                />
                <span className="text-xs text-text-muted leading-relaxed">
                  I agree to the{' '}
                  <button type="button" onClick={() => openLegal('/legal/terms')} className="text-brand-primary hover:underline font-medium">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => openLegal('/legal/privacy')} className="text-brand-primary hover:underline font-medium">Privacy Policy</button>
                </span>
              </label>
            </>
          )}
          <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
            <Lock size={17} className="text-text-muted shrink-0" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none" required minLength={8} />
          </div>
          {isLogin && (
            <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-brand-primary hover:underline ml-1">Forgot password?</button>
          )}
          <button type="submit" disabled={loading || (!isLogin && !agreedToTerms)} className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all accent-glow disabled:opacity-50">
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="text-center text-text-muted text-sm mt-8">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-brand-primary font-semibold hover:underline">{isLogin ? 'Sign up free' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  );
}
