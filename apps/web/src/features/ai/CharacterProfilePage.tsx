import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, MessageCircle, Heart, Share2, Flag, Users, MapPin, Sparkles } from 'lucide-react';
import type { RootState } from '@/app/store';

export default function CharacterProfilePage() {
  const { characterId } = useParams<{ characterId: string }>();
  const nav = useNavigate();
  const { token } = useSelector((s: RootState) => s.auth);
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !characterId) return;
    fetch(`http://localhost:3002/v1/characters/${characterId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setChar).catch(console.error).finally(() => setLoading(false));
  }, [characterId, token]);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /></div>;
  if (!char) return <div className="flex h-full items-center justify-center text-text-muted text-sm">Character not found</div>;

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-full glass hover:bg-white/10"><ArrowLeft size={20} className="text-text-secondary" /></button>
          <div className="flex gap-2">
            <button className="p-2 rounded-full glass hover:bg-white/10"><Share2 size={17} className="text-text-secondary" /></button>
            <button className="p-2 rounded-full glass hover:bg-white/10"><Flag size={17} className="text-text-secondary" /></button>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-brand-glow flex items-center justify-center mb-4 accent-glow">
            <span className="text-3xl font-bold text-brand-primary">{char.name?.[0]}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-text-primary">{char.name}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary font-medium">AI</span>
          </div>
          {char.handle && <p className="text-text-muted text-sm">@{char.handle}</p>}
          {char.city && <p className="text-text-muted text-xs flex items-center gap-1 mt-1"><MapPin size={12} />{char.city}</p>}
          <div className="flex items-center gap-6 mt-4">
            <div className="text-center"><p className="text-lg font-bold text-text-primary">--</p><p className="text-[10px] text-text-muted">Followers</p></div>
            <div className="text-center"><p className="text-lg font-bold text-text-primary">--</p><p className="text-[10px] text-text-muted">Stories</p></div>
            <div className="text-center"><p className="text-lg font-bold text-text-primary">--</p><p className="text-[10px] text-text-muted">Chats</p></div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-2">About</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{char.description || 'No description yet.'}</p>
          {char.personality && (
            <div className="mt-3 pt-3 border-t border-border-subtle">
              <h3 className="text-xs font-medium text-text-muted mb-1.5">Personality</h3>
              <p className="text-sm text-text-secondary">{char.personality}</p>
            </div>
          )}
        </div>
        {char.backstory && (
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-semibold text-text-primary mb-2">Backstory</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{char.backstory}</p>
          </div>
        )}
        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Details</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Visibility', char.visibility],
              ['Gender', char.gender || '—'],
              ['Languages', Array.isArray(char.languages) ? char.languages.join(', ') : 'en'],
              ['Created', new Date(char.createdAt).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k}><span className="text-text-muted">{k}</span><p className="text-text-primary mt-0.5">{v}</p></div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-text-muted text-center pb-4 flex items-center justify-center gap-1">
          <Sparkles size={10} /> This is an AI character. All content is generated.
        </p>
      </div>
      <div className="safe-bottom p-4 pt-2 flex gap-3">
        <button className="flex-1 rounded-2xl glass py-3.5 text-sm font-semibold text-brand-primary flex items-center justify-center gap-2 hover:bg-brand-glow/20 transition-all">
          <Heart size={17} /> Follow
        </button>
        <button onClick={() => nav(`/ai/chat/${char.id}`)} className="flex-1 rounded-2xl bg-brand-primary py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 accent-glow hover:brightness-110 transition-all">
          <MessageCircle size={17} /> Chat
        </button>
      </div>
    </div>
  );
}
