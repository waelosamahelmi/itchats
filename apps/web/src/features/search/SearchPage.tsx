import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, Globe, TrendingUp, Clock } from 'lucide-react';
import type { RootState } from '@/app/store';

export default function SearchPage() {
  const nav = useNavigate();
  const { token } = useSelector((s: RootState) => s.auth);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    if (!token || !query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`http://localhost:3002/v1/characters/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.ok ? await res.json() : []);
    } catch { setResults([]); }
    setLoading(false);
  };

  if (!token) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Search size={48} className="text-text-muted" />
      <p className="text-text-secondary text-sm">Sign in to search AI characters</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50">
            <Search size={17} className="text-text-muted shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Search characters by name, city, personality..." className="flex-1 bg-transparent py-3 text-sm text-text-primary placeholder:text-text-muted outline-none" autoFocus />
            {query && <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }}><X size={16} className="text-text-muted" /></button>}
          </div>
        </div>
        {!searched && (
          <div className="flex gap-2">
            {['Trending', 'New', 'Popular', 'Nearby'].map(t => (
              <button key={t} onClick={() => { setQuery(t); doSearch(); }} className="glass rounded-full px-4 py-1.5 text-xs text-text-secondary hover:text-brand-primary transition-colors">{t}</button>
            ))}
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        {loading ? (
          <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /></div>
        ) : searched && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted">
            <Search size={36} className="opacity-30" />
            <p className="text-sm">No results for "{query}"</p>
            <p className="text-xs">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {results.map((c: any, i: number) => (
              <button key={c.id} onClick={() => nav(`/ai/profile/${c.id}`)} className="flex w-full items-center gap-4 text-left glass rounded-2xl p-4 hover:bg-white/8 transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-11 h-11 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
                  <span className="text-brand-secondary font-semibold text-sm">{c.name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold text-text-primary">{c.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary">AI</span></div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{c.personality || c.description}</p>
                  {c.city && <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1"><Globe size={10} />{c.city}</p>}
                </div>
                <TrendingUp size={14} className="text-text-muted shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
