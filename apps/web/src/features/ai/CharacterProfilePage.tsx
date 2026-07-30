import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, MessageCircle, Heart, Share2, Flag, MapPin, Sparkles,
  Globe, Lock, Pencil, Ban, Camera, Clock, Users, Star, Image, Plus, Loader2, AlertTriangle,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { Badge } from '@itchats/ui';
import { apiFetch } from '@/lib/api';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3092/v1';

export default function CharacterProfilePage() {
  const { characterId } = useParams<{ characterId: string }>();
  const nav = useNavigate();
  const { token, user } = useSelector((s: RootState) => s.auth);
  const [char, setChar] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [relationship, setRelationship] = useState<{ level: number; label: string } | null>(null);
  const [tab, setTab] = useState<'posts' | 'about'>('posts');
  const isOwner = user?.id === char?.ownerUserId;

  useEffect(() => {
    if (!token || !characterId) return;
    setLoading(true);
    async function load() {
      try {
        const res = await fetch(`${API}/characters/${characterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Character not found');
        const data = await res.json();
        setChar(data);
        setFollowersCount(data.followersCount || 0);

        const relRes = await fetch(`${API}/ai/relationship/${characterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        if (relRes?.ok) {
          const rel = await relRes.json();
          setRelationship(rel);
        }

        // Fetch character posts
        setPostsLoading(true);
        try {
          const postsData = await apiFetch<any[]>(`/posts/character/${characterId}`);
          setPosts(postsData || []);
        } catch { /* ignore */ }
        setPostsLoading(false);

        // Fetch stories
        try {
          const storiesData = await apiFetch<any[]>(`/stories/character/${characterId}`);
          setStories(storiesData || []);
        } catch { /* ignore */ }
      } catch (err: any) {
        setError(err.message || 'Failed to load character');
      }
      setLoading(false);
    }
    load();
  }, [characterId, token]);

  const handleFollow = async () => {
    if (!token) return;
    try {
      if (following) {
        await fetch(`${API}/characters/${characterId}/follow`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        });
        setFollowing(false);
        setFollowersCount((c: number) => Math.max(0, c - 1));
      } else {
        await fetch(`${API}/characters/${characterId}/follow`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` },
        });
        setFollowing(true);
        setFollowersCount((c: number) => c + 1);
      }
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/ai/profile/${characterId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
    } catch {
      prompt('Copy this link:', url);
    }
  };

  const handleReport = () => {
    const reason = prompt('Why are you reporting this character?');
    if (reason && token) {
      fetch(`${API}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entityType: 'character', entityId: characterId, reason }),
      }).then(() => alert('Report submitted. Thank you.')).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-canvas">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (error || !char) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg-canvas gap-4 text-text-muted">
        <AlertTriangle size={40} className="text-text-muted opacity-50" />
        <p className="text-lg font-semibold">{error || 'Character not found'}</p>
        <button onClick={() => nav(-1)} className="text-brand-primary text-sm">Go back</button>
      </div>
    );
  }

  const stats = {
    followers: followersCount,
    posts: posts.length,
    score: char.characterScore ?? char.score ?? 0,
  };

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 safe-top glass border-b border-border-subtle shrink-0 z-10">
        <button onClick={() => nav(-1)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary truncate">{char.name}</h1>
        <div className="flex-1" />
        {isOwner && (
          <button onClick={() => nav(`/ai/edit/${characterId}`)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors" title="Edit character">
            <Pencil size={18} className="text-text-secondary" />
          </button>
        )}
        <button onClick={handleShare} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <Share2 size={18} className="text-text-secondary" />
        </button>
        <button onClick={handleReport} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <Flag size={18} className="text-text-secondary" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Cover Image */}
        <div className="relative h-[180px] bg-gradient-to-br from-brand-primary/30 via-brand-primary/10 to-surface-elevated overflow-hidden">
          {char.coverUrl ? (
            <img src={char.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-glow/10 to-bg-canvas" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-canvas to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="px-5 -mt-16 relative z-10">
          <div className="flex items-end justify-between">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-bg-canvas shadow-xl bg-bg-elevated">
              {char.avatarUrl ? (
                <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-primary/30 to-brand-glow/20">
                  <span className="text-brand-secondary text-3xl font-bold">{char.name?.[0]}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pb-1">
              <button
                onClick={() => nav(`/ai/chat/${characterId}`)}
                className="flex items-center gap-1.5 rounded-full bg-brand-primary text-white px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
              >
                <MessageCircle size={15} /> Chat
              </button>
              {!isOwner && (
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    following ? 'bg-accent-warm/15 text-accent-warm border border-accent-warm/30' : 'glass text-text-primary hover:bg-white/5'
                  }`}
                >
                  <Heart size={15} className={following ? 'fill-current' : ''} /> {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          {/* Name + Badges */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">{char.name}</h2>
              <Badge variant="ai" className="text-[10px]">AI</Badge>
            </div>
            {char.handle && <p className="text-text-muted text-sm mt-0.5">@{char.handle}</p>}

            {/* Stats Row */}
            <div className="flex gap-6 mt-3 pb-4 border-b border-border-subtle">
              {[
                { label: 'Followers', value: stats.followers, icon: Users },
                { label: 'Posts', value: stats.posts, icon: Image },
                { label: 'Score', value: stats.score, icon: Star },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-text-primary">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {char.description && (
            <p className="text-sm text-text-secondary mt-3 leading-relaxed">
              {char.description.length > 200 ? char.description.slice(0, 200) + '...' : char.description}
            </p>
          )}

          {/* Personality tags */}
          {char.personality && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {char.personality.split(/[,;.]/).filter(Boolean).slice(0, 6).map((trait: string, i: number) => (
                <span key={i} className="px-2.5 py-1 rounded-full glass text-[11px] text-text-secondary">
                  {trait.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Occupation */}
          {char.occupation && (
            <p className="text-xs text-text-muted mt-3 flex items-center gap-1">
              <Sparkles size={12} className="text-brand-secondary" />
              {char.occupation}
            </p>
          )}
        </div>

        {/* Story Rings */}
        {stories.length > 0 && (
          <div className="px-5 mt-4">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stories.slice(0, 8).map((story: any) => (
                <button key={story.id} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand-primary to-accent-warm">
                    <div className="w-full h-full rounded-full overflow-hidden bg-bg-elevated">
                      {story.mediaUrl ? (
                        <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera size={18} className="text-text-muted" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted truncate max-w-[64px]">
                    {story.caption?.slice(0, 12) || 'Story'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Relationship Bar */}
        {relationship && relationship.level > 1 && (
          <div className="px-5 mt-3">
            <div className="glass rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">Relationship</span>
                <span className="text-xs text-brand-primary font-medium">{relationship.label} · Level {relationship.level}/10</span>
              </div>
              <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-primary to-accent-warm rounded-full transition-all duration-500" style={{ width: `${(relationship.level / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-5 mt-4">
          <div className="flex border-b border-border-subtle">
            {(['posts', 'about'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                  tab === t ? 'text-brand-primary border-brand-primary' : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                {t === 'posts' ? 'Posts' : 'About'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5 pb-24 mt-4">
          {tab === 'posts' && (
            <>
              {postsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-text-muted" />
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Camera size={32} className="text-text-muted opacity-40" />
                  <p className="text-text-muted text-sm">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post: any) => (
                    <div key={post.id} className="glass rounded-2xl p-4">
                      {post.content && (
                        <p className="text-sm text-text-primary whitespace-pre-line leading-relaxed">{post.content}</p>
                      )}
                      {post.mediaUrl && (
                        <img src={post.mediaUrl} alt="" className="mt-3 rounded-xl w-full max-h-[300px] object-cover" />
                      )}
                      <p className="text-[11px] text-text-muted mt-2">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'about' && (
            <div className="space-y-4">
              {char.description && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest text-text-muted mb-2 font-semibold">About</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{char.description}</p>
                </section>
              )}

              {char.personality && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest text-text-muted mb-2 font-semibold">Personality</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{char.personality}</p>
                </section>
              )}

              {char.backstory && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest text-text-muted mb-2 font-semibold">Backstory</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{char.backstory}</p>
                </section>
              )}

              <section>
                <h3 className="text-xs uppercase tracking-widest text-text-muted mb-2 font-semibold">Details</h3>
                <div className="glass rounded-2xl p-4 space-y-3 text-sm">
                  {char.ageDisplay && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Age</span>
                      <span className="text-text-primary">{char.ageDisplay}</span>
                    </div>
                  )}
                  {char.gender && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Gender</span>
                      <span className="text-text-primary">{char.gender}</span>
                    </div>
                  )}
                  {char.pronouns && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Pronouns</span>
                      <span className="text-text-primary">{char.pronouns}</span>
                    </div>
                  )}
                  {char.occupation && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Occupation</span>
                      <span className="text-text-primary">{char.occupation}</span>
                    </div>
                  )}
                  {char.interests?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Interests</span>
                      <span className="text-text-primary">{Array.isArray(char.interests) ? char.interests.join(', ') : char.interests}</span>
                    </div>
                  )}
                  {char.visibility && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Visibility</span>
                      <span className="text-text-primary flex items-center gap-1">
                        {char.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                        {char.visibility}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {relationship && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest text-text-muted mb-2 font-semibold">Your Relationship</h3>
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-text-primary font-medium">{relationship.label}</span>
                      <span className="text-xs text-brand-secondary">Level {relationship.level}/10</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-primary to-accent-warm transition-all duration-500"
                        style={{ width: `${(relationship.level / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
