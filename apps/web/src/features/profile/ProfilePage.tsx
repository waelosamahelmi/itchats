import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, CreditCard, User } from 'lucide-react';
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
      <header className="px-4 py-3 safe-top"><h1 className="text-xl font-bold text-text-primary">Profile</h1></header>
      <div className="px-4">
        <Card className="flex items-center gap-4 mb-4">
          <Avatar size="xl" fallback={user.username?.[0]?.toUpperCase()} />
          <div><p className="font-semibold text-text-primary">{user.username}</p><p className="text-sm text-text-secondary">{user.email}</p></div>
        </Card>
        <div className="space-y-1">
          {[{ icon: CreditCard, label: 'Billing & Credits' }, { icon: Settings, label: 'Settings' }].map(({ icon: Icon, label }) => (
            <button key={label} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-elevated transition-colors text-left">
              <Icon size={20} className="text-text-secondary" /><span className="text-sm text-text-primary">{label}</span>
            </button>
          ))}
          <button onClick={() => dispatch(logout())} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-elevated transition-colors text-left text-danger">
            <LogOut size={20} /><span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
