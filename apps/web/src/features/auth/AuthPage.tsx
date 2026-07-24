import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, LogIn } from 'lucide-react';
import { loginUser, registerUser, useAppDispatch } from '@/app/store';
import type { RootState } from '@/app/store';

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { error, token } = useSelector((s: RootState) => s.auth);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (token) { nav('/'); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      dispatch(loginUser({ email, password }));
    } else {
      dispatch(registerUser({ email, username, password }));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-bg-canvas">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">ItChats AI</h1>
          <p className="text-text-secondary text-sm">{isLogin ? 'Welcome back' : 'Create your account'}</p>
        </div>
        {error && <div className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger text-center">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="relative"><Mail size={18} className="absolute left-4 top-3.5 text-text-muted" /><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full rounded-2xl bg-surface-elevated pl-11 pr-4 py-3 text-sm text-text-primary outline-none border border-border-subtle focus:border-brand-primary" required /></div>
          {!isLogin && <div className="relative"><User size={18} className="absolute left-4 top-3.5 text-text-muted" /><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full rounded-2xl bg-surface-elevated pl-11 pr-4 py-3 text-sm text-text-primary outline-none border border-border-subtle focus:border-brand-primary" required /></div>}
          <div className="relative"><Lock size={18} className="absolute left-4 top-3.5 text-text-muted" /><input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full rounded-2xl bg-surface-elevated pl-11 pr-4 py-3 text-sm text-text-primary outline-none border border-border-subtle focus:border-brand-primary" required minLength={8} /></div>
          <button type="submit" className="w-full rounded-full bg-brand-primary py-3 text-white font-medium text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"><LogIn size={18} />{isLogin ? 'Sign In' : 'Create Account'}</button>
        </form>
        <p className="text-center text-text-muted text-sm mt-6">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-brand-primary font-medium">{isLogin ? 'Sign up' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  );
}
