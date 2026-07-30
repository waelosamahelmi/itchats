import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Pencil, Plus, Sparkles, Star, Users,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import type { Character } from '@/app/store';
import { useAppDispatch, fetchMine } from '@/app/store';
import { Badge, Tabs } from '@itchats/ui';

function CharacterCard({ char, index, onEdit }: { char: Character; index: number; onEdit: (id: string) => void }) {
  const nav = useNavigate();

  return (
    <button
      onClick={() => nav(`/ai/profile/${char.id}`)}
      className="glass rounded-2xl overflow-hidden text-left hover:bg-white/6 transition-all group animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Avatar */}
      <div className="relative w-full aspect-square overflow-hidden">
        <img
          src={char.avatarUrl ?? ''}
          alt={char.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Edit button */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(char.id); }}
          className="absolute top-3 right-3 glass rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all text-text-secondary hover:text-brand-primary hover:bg-brand-primary/10"
        >
          <Pencil size={14} />
        </button>
        {char.online && (
          <div className="absolute top-3 left-3 flex items-center gap-1 glass rounded-full px-2 py-0.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[9px] font-medium text-text-primary">Active</span>
          </div>
        )}
        {/* Score badge */}
        <div className="absolute bottom-3 left-3 glass rounded-full px-2 py-0.5 flex items-center gap-1">
          <Star size={10} className="text-social-warm fill-current" />
          <span className="text-[9px] font-bold text-text-primary">{char.score ?? '—'}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-text-primary truncate flex-1">{char.name}</h3>
          <Badge variant="ai" className="text-[9px] px-1.5 shrink-0">AI</Badge>
        </div>
        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mb-2">
          {char.description}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <Users size={11} />
          <span>{char.city || 'Unknown'} {char.followersCount ? `· ${char.followersCount} followers` : ''}</span>
        </div>
      </div>
    </button>
  );
}

export default function MyCharactersPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const chars = useSelector((s: RootState) => s.characters.myCharacters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('public');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await dispatch(fetchMine()).unwrap();
    } catch (e: any) {
      setError(e.message || 'Failed to load characters');
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    return chars.filter(c => c.visibility === tab);
  }, [chars, tab]);

  const handleEdit = (id: string) => {
    nav(`/characters/edit/${id}`);
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
          <Bot size={34} className="text-brand-secondary" />
        </div>
        <p className="text-text-secondary text-sm font-medium">Your AI Characters</p>
        <p className="text-text-muted text-xs text-center max-w-xs">Sign in to manage your AI characters</p>
        <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">My Characters</h1>
            <p className="text-text-muted text-xs mt-0.5">Manage your AI creations</p>
          </div>
        </div>
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ]}
        />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4">
        {refreshing && (
          <div className="flex justify-center py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                <div className="w-full aspect-square bg-bg-elevated" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-bg-elevated rounded-full w-3/4" />
                  <div className="h-2 bg-bg-elevated rounded-full w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
              <Bot size={28} className="text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted text-sm">Failed to load characters</p>
            <p className="text-text-muted text-xs text-center max-w-[260px]">{error}</p>
            <button onClick={handleRefresh} className="rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
              <Bot size={36} className="text-brand-secondary" />
            </div>
            <p className="text-text-secondary text-sm font-medium">
              {tab === 'public' ? 'No public characters yet' : 'No private characters yet'}
            </p>
            <p className="text-text-muted text-xs text-center max-w-xs">
              {tab === 'public'
                ? 'Create a public AI character for the world to discover'
                : 'Create a private AI character just for yourself'}
            </p>
            <button
              onClick={() => nav('/characters/create')}
              className="flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium accent-glow hover:brightness-110 transition-all mt-2"
            >
              <Sparkles size={16} /> Create Your First AI
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-24">
            {filtered.map((char, i) => (
              <CharacterCard key={char.id} char={char} index={i} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => nav('/characters/create')}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-glow hover:scale-110 hover:brightness-110 transition-all"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
