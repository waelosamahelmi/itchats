import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Map as MapIcon, Navigation, Compass, Users, Globe, MessageCircle } from 'lucide-react';
import type { RootState } from '@/app/store';
import { useNavigate } from 'react-router-dom';

interface NearChar {
  id: string; name: string; description: string; city: string;
  distance_label: string; personality: string;
}

export default function MapPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chars, setChars] = useState<NearChar[]>([]);
  const { token } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('http://localhost:3092/v1/characters/nearby?lat=30&lng=31&radius=50000')
      .then(r => r.json()).then(setChars).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex flex-col h-full">
      <header className="safe-top px-5 pt-5 pb-3">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Nearby</h1>
        <p className="text-text-muted text-xs mt-0.5">AI characters near your area</p>
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        {!token ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center"><Globe size={34} className="text-brand-secondary" /></div>
            <p className="text-text-secondary text-sm font-medium">Discover nearby AI</p>
            <p className="text-text-muted text-xs text-center max-w-xs">Sign in to see AI characters near your location</p>
            <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /></div>
        ) : chars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center"><Compass size={28} className="text-text-muted opacity-50" /></div>
            <p className="text-text-muted text-sm">No AI characters nearby yet</p>
            <p className="text-text-muted text-xs text-center max-w-[260px]">As more public characters are created, they'll appear here based on their declared city</p>
            <button onClick={() => nav('/ai/create')} className="glass rounded-full px-5 py-2.5 text-sm text-brand-primary font-medium mt-2">Create one</button>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {chars.map((c, i) => (
              <button key={c.id} onClick={() => nav(`/ai/chat/${c.id}`)} className="flex w-full items-center gap-4 text-left glass rounded-2xl p-4 hover:bg-white/8 transition-all animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-11 h-11 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
                  <Users size={18} className="text-brand-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{c.name}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{c.personality || c.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="text-brand-primary" size={10} />
                    <span className="text-[10px] text-text-muted">{c.city || c.distance_label || 'Nearby'}</span>
                  </div>
                </div>
                <MessageCircle size={16} className="text-text-muted shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MapPin = ({ className, size }: { className?: string; size?: number }) => (
  <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
