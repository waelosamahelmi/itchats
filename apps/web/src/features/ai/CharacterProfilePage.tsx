import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, MessageCircle, Heart, Share2, Flag, MapPin, Sparkles,
  Globe, Lock, Pencil,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { Badge } from '@itchats/ui';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3092/v1';

export default function CharacterProfilePage() {
  const { characterId } = useParams<{ characterId: string }>();
  const nav = useNavigate();
  const { token, user } = useSelector((s: RootState) => s.auth);
  const [char, setChar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [relationship, setRelationship] = useState<{ level: number; label: string } | null>(null);
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
        <p className="text-lg font-semibold">{error || 'Character not found'}</p>
        <button onClick={() => nav(-1)} className="text-brand-primary text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 safe-top glass border-b border-border-subtle shrink-0">
        <button onClick={() => nav(-1)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">{char.name}</h1>
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
        <div className="flex flex-col items-center px-6 py-8">
          <div className="w-24 h-24 rounded-full bg-brand-glow flex items-center justify-center mb-4 shadow-lg shadow-brand-glow/30 overflow-hidden">
            {char.avatarUrl ? (
              <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-secondary text-3xl font-bold">{char.name?.[0]}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-text-primary">{char.name}</h2>
            <Badge variant="ai" className="text-[10px]">AI</Badge>
          </div>
          <p className="text-text-muted text-xs mb-4">
            {char.visibility === 'public' ? (
              <span className="flex items-center gap-1"><Globe size={12} /> Public character</span>
            ) : (
              <span className="flex items-center gap-1"><Lock size={12} /> Private character</span>
            )}
          </p>

          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-lg font-bold text-text-primary">{followersCount}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-text-primary">{relationship?.level || '--'}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Relationship</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-text-primary">--</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Stories</p>
            </div>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => nav(`/ai/chat/${characterId}`)}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-brand-primary text-white py-3 text-sm font-medium transition-all hover:brightness-110 hover:shadow-lg hover:shadow-brand-glow"
            >
              <MessageCircle size={16} /> Chat
            </button>
            <button
              onClick={handleFollow}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-all ${
                following ? 'bg-accent-warm/15 text-accent-warm border border-accent-warm/30' : 'glass text-text-primary hover:bg-white/5'
              }`}
            >
              <Heart size={16} className={following ? 'fill-current' : ''} /> {following ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        <div className="px-5 pb-8 space-y-5">
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
              {char.languages?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Languages</span>
                  <span className="text-text-primary">{Array.isArray(char.languages) ? char.languages.join(', ') : char.languages}</span>
                </div>
              )}
              {char.location && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Location</span>
                  <span className="text-text-primary flex items-center gap-1">
                    <MapPin size={12} /> {char.location.city || char.location.location_label || char.location.city}
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
      </div>
    </div>
  );
}
