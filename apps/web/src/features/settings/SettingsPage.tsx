import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Palette, Globe, Shield, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const nav = useNavigate();
  const items = [
    { icon: Bell, label: 'Notifications', desc: 'Push & in-app alerts' },
    { icon: Palette, label: 'Appearance', desc: 'Midnight theme' },
    { icon: Globe, label: 'Language', desc: 'English' },
    { icon: Shield, label: 'Privacy', desc: 'Account visibility & data' },
    { icon: Smartphone, label: 'Devices', desc: 'Manage active sessions' },
  ];
  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => nav('/profile')} className="p-1.5 rounded-full glass"><ArrowLeft size={20} className="text-text-secondary" /></button>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Settings</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 space-y-1">
        {items.map(({ icon: Icon, label, desc }) => (
          <button key={label} className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl glass hover:bg-white/8 transition-colors text-left">
            <Icon size={20} className="text-text-secondary shrink-0" />
            <div className="flex-1"><p className="text-sm font-medium text-text-primary">{label}</p><p className="text-xs text-text-muted">{desc}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}
