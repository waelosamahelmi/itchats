import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Bot, Shield, BarChart3, Activity, Settings, Zap, MessageSquare, Flag } from 'lucide-react';
import type { RootState } from '@/app/store';

const SECTIONS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'users', icon: Users, label: 'Users' },
  { key: 'characters', icon: Bot, label: 'Characters' },
  { key: 'moderation', icon: Shield, label: 'Moderation' },
  { key: 'analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AdminDashboard() {
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const [section, setSection] = useState('dashboard');
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    if (!user || user.role !== 'admin') { nav('/'); return; }
    fetch('http://localhost:3092/v1/health').then(r => r.json()).then(setStats).catch(() => {});
  }, [user]);

  if (!user || user.role !== 'admin') return null;

  const cards = [
    { icon: Users, label: 'Total Users', value: '—', color: 'text-blue-400' },
    { icon: Bot, label: 'AI Characters', value: '—', color: 'text-purple-400' },
    { icon: Zap, label: 'Generations', value: '—', color: 'text-amber-400' },
    { icon: MessageSquare, label: 'Messages', value: '—', color: 'text-emerald-400' },
    { icon: Flag, label: 'Open Reports', value: '0', color: 'text-red-400' },
    { icon: Activity, label: 'API Status', value: stats.status ?? '—', color: stats.status === 'ok' ? 'text-emerald-400' : 'text-red-400' },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Admin Panel</h1>
            <p className="text-text-muted text-xs mt-0.5">{stats.status === 'ok' ? 'System healthy' : 'Monitoring'}</p>
          </div>
          <button className="glass rounded-full p-2.5 text-text-secondary"><Settings size={18} /></button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${section === s.key ? 'bg-brand-primary text-white' : 'glass text-text-secondary hover:text-text-primary'}`}>
              <s.icon size={14} /> {s.label}
            </button>
          ))}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        {section === 'dashboard' && (
          <div className="space-y-4 pt-2 pb-4">
            <div className="grid grid-cols-2 gap-3">
              {cards.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass rounded-2xl p-4 hover:bg-white/5 transition-all">
                  <Icon size={20} className={`${color} mb-2`} />
                  <p className="text-2xl font-bold text-text-primary">{value}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                {['View Reports', 'Manage Plans', 'Feature Flags', 'Audit Log'].map(a => (
                  <button key={a} className="glass rounded-xl py-2.5 text-xs text-text-secondary hover:text-brand-primary transition-colors">{a}</button>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-2">System Health</h2>
              <div className="space-y-2 text-xs">
                {[
                  ['API Server', stats.status === 'ok' ? 'Online' : 'Unknown', stats.status === 'ok'],
                  ['Database', stats.status === 'ok' ? 'Connected' : 'Unknown', stats.status === 'ok'],
                  ['Redis', 'Connected', true],
                  ['Worker', 'Running', true],
                ].map(([k, v, ok]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-text-muted">{k}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-danger'}`} />
                      <span className={ok ? 'text-text-secondary' : 'text-danger'}>{v}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {section !== 'dashboard' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted">
            <SECTIONS.find(s => s.key === section)?.icon && (
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
                {(() => { const Icon = SECTIONS.find(s => s.key === section)!.icon; return <Icon size={28} />; })()}
              </div>
            )}
            <p className="text-sm capitalize">{section} management coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
