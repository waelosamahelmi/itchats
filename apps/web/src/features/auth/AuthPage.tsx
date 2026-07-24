import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { loginUser, registerUser, useAppDispatch } from '@/app/store';
import type { RootState } from '@/app/store';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { error, token, loading } = useSelector((s: RootState) => s.auth);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) nav('/', { replace: true });
  }, [token, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) { dispatch(loginUser({ email, password })); }
    else { dispatch(registerUser({ email, username, password })); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-bg-canvas" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(255,72,210,0.5), transparent)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(255,72,210,0.35), transparent)' }} />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-0">
            <AnimatedLogo size={180} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight -mt-2">ItChats AI</h1>
          <p className="text-text-muted text-sm mt-2">{isLogin ? 'Welcome back to your AI world' : 'Start building your AI universe'}</p>

          {/* Google SSO */}
          <div className="mt-5">
            <a href="http://localhost:3092/v1/auth/google"
               className="flex items-center justify-center gap-2.5 w-full rounded-xl border border-border-subtle bg-white/5 hover:bg-white/10 py-2.5 text-sm font-medium text-text-primary transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </a>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
        </div>
        {error && (
          <div className="mb-5 rounded-2xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger text-center">{error}</div>
        )}
        <form onSubmit={submit} className="space-y-3">
          <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
            <Mail size={17} className="text-text-muted shrink-0" />
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none" required />
          </div>
          {!isLogin && (
            <div className="glass rounded-2xl flex items-center gap-3 px-4 animate-slide-up focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
              <User size={17} className="text-text-muted shrink-0" />
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none" required minLength={3} />
            </div>
          )}
          <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
            <Lock size={17} className="text-text-muted shrink-0" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none" required minLength={8} />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all accent-glow disabled:opacity-50">
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
