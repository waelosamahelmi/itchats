import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, CreditCard, User, Compass, Search, Bot, Shield } from 'lucide-react';
import type { RootState } from '@/app/store';
import { logout, useAppDispatch } from '@/app/store';
import { Avatar, Card } from '@itchats/ui';

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <User size={48} className="text-text-muted" />
        <p className="text-text-secondary text-center">Sign in to manage your profile</p>
        <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-2 text-white text-sm">Sign In</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="safe-top px-5 pt-5 pb-3">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Profile</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-5 space-y-1">
        <Card className="flex items-center gap-4 mb-4 !p-4">
          <Avatar size="xl" fallback={user.username?.[0]?.toUpperCase()} />
          <div><p className="font-semibold text-text-primary">{user.username}</p><p className="text-sm text-text-secondary">{user.email}</p></div>
        </Card>
        {[
          { icon: Bot, label: 'My Characters', onClick: () => nav('/ai') },
          { icon: Compass, label: 'Discover', onClick: () => nav('/discover') },
          { icon: Search, label: 'Search Characters', onClick: () => nav('/search') },
          { icon: CreditCard, label: 'Billing & Credits', onClick: () => nav('/billing') },
          { icon: Settings, label: 'Settings', onClick: () => nav('/settings') },
        ].map(({ icon: Icon, label, onClick }) => (
          <button key={label} onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl glass hover:bg-white/8 transition-colors text-left">
            <Icon size={20} className="text-text-secondary" /><span className="text-sm text-text-primary">{label}</span>
          </button>
        ))}
        {user.role === 'admin' && (
          <button onClick={() => nav('/admin')} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl glass hover:bg-brand-glow/20 transition-colors text-left border border-brand-primary/20">
            <Shield size={20} className="text-brand-primary" /><span className="text-sm text-brand-primary font-medium">Admin Panel</span>
          </button>
        )}
        <button onClick={() => dispatch(logout())} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl glass hover:bg-danger/10 transition-colors text-left text-danger mt-4">
          <LogOut size={20} /><span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
