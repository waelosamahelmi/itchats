import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Compass, Search, Star, Heart, Users, Sparkles, Plus, Loader2, Lock } from 'lucide-react';
import type { RootState } from '@/app/store';
import type { Character } from '@/app/store';
import { useAppDispatch, fetchDiscover, followChar, unfollowChar } from '@/app/store';
import { Badge } from '@itchats/ui';

function CharacterCard({ char, index }: { char: Character; index: number }) {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  // Use server state — no local useState(false) that resets on refresh
  const following = Boolean(char.isFollowing);

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (following) dispatch(unfollowChar(char.id));
    else dispatch(followChar(char.id));
  };

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
        {/* Online indicator */}
        {char.online && (
          <div className="absolute top-3 right-3 flex items-center gap-1 glass rounded-full px-2 py-0.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[9px] font-medium text-text-primary">Online</span>
          </div>
        )}
        {/* Score badge — only show if score is available */}
        {(char.score != null && Number(char.score) > 0) && (
          <div className="absolute top-3 left-3 glass rounded-full px-2 py-0.5 flex items-center gap-1" title="Character score based on community engagement">
            <Star size={10} className="text-social-warm fill-current" />
            <span className="text-[9px] font-bold text-text-primary">{char.score}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-text-primary truncate flex-1">{char.name}</h3>
          {char.visibility === 'private' && <Lock size={11} className="text-amber-400 shrink-0" />}
          <Badge variant="ai" className="text-[9px] px-1.5 shrink-0">AI</Badge>
        </div>
        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mb-2">
          {char.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <Users size={11} />
            <span>{formatCount(char.followersCount ?? 0)} followers</span>
          </div>
          <button
            onClick={handleFollow}
            className={`rounded-full px-3 py-1 text-[10px] font-medium transition-all ${
              following
                ? 'glass text-brand-primary border border-brand-primary/20'
                : 'bg-brand-primary text-white hover:brightness-110'
            }`}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>
    </button>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export default function DiscoverPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const chars = useSelector((s: RootState) => s.characters.discoverCharacters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await dispatch(fetchDiscover()).unwrap();
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

  // Filter out user's own characters
  const visibleChars = useMemo(() => {
    // The discover endpoint returns public characters; we additionally filter by ownerUserId
    const filtered = chars.filter(c => {
      // If the character has ownerUserId, don't show if it matches current user
      if ((c as any).ownerUserId && (c as any).ownerUserId === user?.id) return false;
      return true;
    });

    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.interests?.some(i => i.toLowerCase().includes(q)))
    );
  }, [chars, search, user?.id]);

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
          <Compass size={34} className="text-brand-secondary" />
        </div>
        <p className="text-text-secondary text-sm font-medium">Discover AI Characters</p>
        <p className="text-text-muted text-xs text-center max-w-xs">Sign in to explore the AI community</p>
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
            <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Discover</h1>
            <p className="text-text-muted text-xs mt-0.5">Explore the AI world</p>
          </div>
          <button
            onClick={() => nav('/ai/create')}
            className="flex items-center gap-1.5 rounded-full bg-brand-primary text-white px-4 py-2.5 text-sm font-medium hover:brightness-110 transition-all"
          >
            <Plus size={16} /> Create Character
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search characters..."
            className="w-full glass rounded-full pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4">
        {refreshing && (
          <div className="flex justify-center py-3">
            <Loader2 size={20} className="animate-spin text-brand-primary" />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                <div className="w-full aspect-square bg-bg-elevated" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-bg-elevated rounded-full w-3/4" />
                  <div className="h-2 bg-bg-elevated rounded-full w-full" />
                  <div className="h-2 bg-bg-elevated rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
              <Compass size={28} className="text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted text-sm">Failed to load characters</p>
            <p className="text-text-muted text-xs text-center max-w-[260px]">{error}</p>
            <button onClick={handleRefresh} className="rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium">Retry</button>
          </div>
        ) : visibleChars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
              <Compass size={28} className="text-text-muted opacity-50" />
            </div>
            <p className="text-text-muted text-sm">{search ? 'No characters match your search' : 'No characters discovered yet'}</p>
            <p className="text-text-muted text-xs text-center max-w-[260px]">
              {search ? 'Try a different search term' : 'Characters created by the community will appear here'}
            </p>
            {!search && (
              <button
                onClick={() => nav('/ai/create')}
                className="mt-2 flex items-center gap-1.5 rounded-full bg-brand-primary text-white px-5 py-2.5 text-sm font-medium hover:brightness-110 transition-all"
              >
                <Plus size={16} /> Create Your First Character
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-24">
            {visibleChars.map((char, i) => (
              <CharacterCard key={char.id} char={char} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
