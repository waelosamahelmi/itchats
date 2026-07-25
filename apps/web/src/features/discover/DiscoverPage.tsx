import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, Flame } from 'lucide-react';
import type { RootState } from '@/app/store';

const TABS = ['For You', 'Trending', 'New', 'Nearby'];
const API = (import.meta as any).env?.VITE_API_URL || '/v1';

export default function DiscoverPage() {
  const nav = useNavigate();
  const { token } = useSelector((s: RootState) => s.auth);
  const [tab, setTab] = useState('For You');
  const [chars, setChars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API}/characters/discover?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => setChars(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (!token) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center"><Compass size={34} className="text-brand-secondary" /></div>
      <p className="text-text-secondary text-sm font-medium">Discover AI Characters</p>
      <p className="text-text-muted text-xs text-center max-w-xs">Sign in to explore the AI community</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div><h1 className="text-2xl font-bold text-text-primary tracking-tight">Discover</h1><p className="text-text-muted text-xs mt-0.5">Explore the AI world</p></div>
          <button onClick={() => nav('/search')} className="glass rounded-full p-2.5 text-text-secondary hover:text-brand-primary"><Sparkles size={18} /></button>
        </div>
        <div className="flex gap-1.5">
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${tab === t ? 'bg-brand-primary text-white' : 'glass text-text-secondary hover:text-text-primary'}`}>{t}</button>)}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        {loading ? <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /></div>
        : chars.length === 0 ? <div className="flex flex-col items-center justify-center py-24 gap-3"><Compass size={36} className="text-text-muted opacity-30" /><p className="text-text-muted text-sm">No characters to discover yet</p><button onClick={() => nav('/ai/create')} className="rounded-full bg-brand-primary px-5 py-2.5 text-white text-sm font-medium">Create the first one</button></div>
        : <div className="grid grid-cols-2 gap-3 pb-4">{chars.map((c: any, i: number) => (
            <button key={c.id} onClick={() => nav(`/ai/profile/${c.id}`)} className="glass rounded-2xl p-4 text-left hover:bg-white/8 transition-all animate-slide-up" style={{animationDelay:`${i*60}ms`}}>
              <div className="w-14 h-14 rounded-xl bg-brand-glow flex items-center justify-center mb-3"><span className="text-xl font-bold text-brand-primary">{c.name?.[0]}</span></div>
              <div className="flex items-center gap-1.5 mb-1"><p className="text-sm font-semibold text-text-primary truncate">{c.name}</p><span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary shrink-0">AI</span></div>
              <p className="text-xs text-text-muted line-clamp-2">{c.personality || c.description || 'A unique AI personality'}</p>
              <div className="flex items-center gap-2 mt-2">{c.city && <span className="text-[10px] text-text-muted">{c.city}</span>}<span className="text-[10px] text-brand-primary flex items-center gap-0.5"><Flame size={10} /> {i%3===0?'Trending':'New'}</span></div>
            </button>
          ))}</div>}
      </div>
    </div>
  );
}
