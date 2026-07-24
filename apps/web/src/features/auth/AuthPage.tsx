import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Sparkles, ArrowRight } from 'lucide-react';
import { loginUser, registerUser, useAppDispatch } from '@/app/store';
import type { RootState } from '@/app/store';

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { error, token, loading } = useSelector((s: RootState) => s.auth);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (token) { nav('/'); return null; }

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
        style={{ background: 'radial-gradient(circle, rgba(109,106,246,0.6), transparent)' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(180,79,240,0.5), transparent)' }} />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-brand-glow flex items-center justify-center mx-auto mb-4 accent-glow">
            <Sparkles size={28} className="text-brand-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">ItChats AI</h1>
          <p className="text-text-muted text-sm mt-2">{isLogin ? 'Welcome back to your AI world' : 'Start building your AI universe'}</p>
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
