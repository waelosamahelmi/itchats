import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Bot, Shield, BarChart3 } from 'lucide-react';

const SECTIONS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'users', icon: Users, label: 'Users' },
  { key: 'characters', icon: Bot, label: 'Characters' },
  { key: 'moderation', icon: Shield, label: 'Moderation' },
  { key: 'analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AdminDashboard() {
  const [section, setSection] = useState('dashboard');
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch('http://localhost:3092/v1/health').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const cards = [
    { icon: Users, label: 'Total Users', value: '—', color: 'text-blue-400' },
    { icon: Bot, label: 'AI Characters', value: '—', color: 'text-purple-400' },
    { icon: Shield, label: 'Reports', value: '—', color: 'text-red-400' },
    { icon: BarChart3, label: 'API Status', value: stats.status === 'ok' ? 'Online' : '—', color: 'text-green-400' },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <aside className="w-60 border-r border-gray-800 p-5 space-y-4">
        <h1 className="text-xl font-bold text-purple-400">ItChats Admin</h1>
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                section === s.key ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <s.icon size={18} /> {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <h2 className="text-2xl font-bold mb-6 capitalize">{section === 'dashboard' ? 'Dashboard' : section}</h2>

        {section === 'dashboard' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((card) => (
              <div key={card.label} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <card.icon size={20} className={card.color} />
                  <span className="text-sm text-gray-400">{card.label}</span>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
            {(() => {
              const sec = SECTIONS.find((s) => s.key === section);
              if (!sec) return null;
              const IconComponent = sec.icon;
              return (
                <>
                  <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
                    <IconComponent size={28} />
                  </div>
                  <p className="text-sm capitalize">{section} management coming soon</p>
                </>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
