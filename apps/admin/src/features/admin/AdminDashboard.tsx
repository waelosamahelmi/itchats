import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Bot, Shield, BarChart3, HeartHandshake } from 'lucide-react';

const SECTIONS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'users', icon: Users, label: 'Users' },
  { key: 'characters', icon: Bot, label: 'Characters' },
  { key: 'moderation', icon: Shield, label: 'Moderation' },
  { key: 'analytics', icon: BarChart3, label: 'Analytics' },
  { key: 'relationships', icon: HeartHandshake, label: 'Relationship cheats' },
];

const PRESETS = ['stranger', 'friend', 'close_friend', 'romantic', 'conflict'] as const;

export default function AdminDashboard() {
  const [section, setSection] = useState('dashboard');
  const [stats, setStats] = useState<Record<string, any>>({});
  const [characterId, setCharacterId] = useState('');
  const [userId, setUserId] = useState('');
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>('friend');
  const [cheatStatus, setCheatStatus] = useState<string>();
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetch('/v1/health').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  async function applyRelationshipPreset(event: React.FormEvent) {
    event.preventDefault();
    setApplying(true);
    setCheatStatus(undefined);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/v1/admin/relationship-cheats/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ characterId: characterId.trim(), userId: userId.trim(), preset }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Relationship preset could not be applied.');
      setCheatStatus(`${preset.replace('_', ' ')} applied and audit logged.`);
    } catch (error) {
      setCheatStatus(error instanceof Error ? error.message : 'Relationship preset could not be applied.');
    } finally {
      setApplying(false);
    }
  }

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
        ) : section === 'relationships' ? (
          <section className="max-w-2xl rounded-2xl bg-gray-900 p-6">
            <div className="mb-6">
              <p className="text-sm text-amber-300">Testing only · every change is audit logged</p>
              <p className="mt-1 text-sm text-gray-400">Move one character relationship to a known state without changing either identity.</p>
            </div>
            <form className="grid gap-4" onSubmit={applyRelationshipPreset}>
              <label className="grid gap-1.5 text-sm text-gray-300">
                User ID
                <input required value={userId} onChange={(event) => setUserId(event.target.value)} className="rounded-lg bg-gray-950 px-3 py-2.5 outline-none ring-1 ring-gray-700 focus:ring-amber-400" placeholder="UUID" />
              </label>
              <label className="grid gap-1.5 text-sm text-gray-300">
                Character ID
                <input required value={characterId} onChange={(event) => setCharacterId(event.target.value)} className="rounded-lg bg-gray-950 px-3 py-2.5 outline-none ring-1 ring-gray-700 focus:ring-amber-400" placeholder="UUID" />
              </label>
              <label className="grid gap-1.5 text-sm text-gray-300">
                Relationship state
                <select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)} className="rounded-lg bg-gray-950 px-3 py-2.5 outline-none ring-1 ring-gray-700 focus:ring-amber-400">
                  {PRESETS.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
                </select>
              </label>
              <button disabled={applying} className="mt-2 rounded-lg bg-amber-400 px-4 py-3 font-semibold text-gray-950 transition hover:bg-amber-300 disabled:opacity-50">
                {applying ? 'Applying…' : 'Apply testing preset'}
              </button>
              {cheatStatus && <p role="status" className="text-sm text-gray-300">{cheatStatus}</p>}
            </form>
          </section>
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
