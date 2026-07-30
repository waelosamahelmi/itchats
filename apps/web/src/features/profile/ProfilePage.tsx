import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User, Settings, Star, MapPin, Globe, Calendar, Camera, Sparkles,
  Users2, Image, Heart, MessageCircle, Share2, MoreHorizontal,
  Plus, Pencil, Lock, ChevronRight, Shield, BadgeCheck,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { logout, useAppDispatch } from '@/app/store';
import { Badge, Tabs } from '@itchats/ui';
import {
  mockCurrentUser, mockFriends, mockPosts, mockCharacters,
  type MockUser, type MockPost, genId,
} from '@/lib/mockData';
import { fetchProfile, fetchFriends, fetchUserPosts, fetchPhotos } from '@/lib/api';

// ── Section wrapper ──
function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h3 className="text-xs uppercase tracking-widest text-text-muted mb-3 font-semibold px-5">{title}</h3>}
      {children}
    </section>
  );
}

// ── Post Card (simplified, same design as feed) ──
function ProfilePost({ post }: { post: MockPost }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);

  const isLongContent = post.content.length > 200;
  const [expanded, setExpanded] = useState(false);
  const displayContent = expanded ? post.content : post.content.slice(0, 200);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <img src={post.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-text-primary truncate">{post.authorName}</span>
            {post.authorIsAI && <Badge variant="ai" className="text-[9px] px-1.5">AI</Badge>}
          </div>
          <span className="text-[11px] text-text-muted">{timeAgo(post.createdAt)}</span>
        </div>
      </div>
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
            {displayContent}
            {isLongContent && !expanded && '...'}
          </p>
          {isLongContent && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-brand-primary mt-1 hover:underline">
              {expanded ? 'Show less' : 'See more'}
            </button>
          )}
        </div>
      )}
      {post.mediaUrl && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden">
          <img src={post.mediaUrl} alt="" className="w-full object-cover max-h-[400px] rounded-xl" />
        </div>
      )}
      <div className="flex items-center border-t border-border-subtle mx-4 py-1">
        <button
          onClick={() => { setLiked(!liked); setLikeCount(c => c + (liked ? -1 : 1)); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${liked ? 'text-brand-primary' : 'text-text-muted hover:bg-white/5'}`}
        >
          <Heart size={16} className={liked ? 'fill-current text-brand-primary' : ''} /> Like
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5">
          <MessageCircle size={16} /> Comment
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5">
          <Share2 size={16} /> Share
        </button>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Friend Card ──
function FriendCard({ friend }: { friend: MockUser }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(`/profile`)}
      className="glass rounded-2xl p-3 text-center hover:bg-white/6 transition-all"
    >
      <img src={friend.avatarUrl} alt={friend.username} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />
      <p className="text-xs font-semibold text-text-primary truncate">{friend.username}</p>
      <p className="text-[10px] text-text-muted truncate">{friend.rank}</p>
    </button>
  );
}

// ── Main ProfilePage ──
export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const [profile, setProfile] = useState<MockUser>(mockCurrentUser);
  const [friends, setFriends] = useState<MockUser[]>([]);
  const [posts, setPosts] = useState<MockPost[]>([]);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [composerText, setComposerText] = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    const [prof, fr, pt, ph] = await Promise.all([
      fetchProfile().catch(() => mockCurrentUser),
      fetchFriends().catch(() => mockFriends),
      fetchUserPosts('user-me').catch(() => mockPosts.slice(0, 3)),
      fetchPhotos('user-me').catch(() => []),
    ]);
    setProfile(prof);
    setFriends(fr);
    setPosts(pt);
    setPhotos(ph);
    setLoading(false);
  }

  const handlePost = () => {
    if (!composerText.trim()) return;
    const newPost: MockPost = {
      id: genId(), authorId: 'user-me', authorName: profile.username,
      authorAvatar: profile.avatarUrl, authorIsAI: false, content: composerText.trim(),
      createdAt: new Date().toISOString(), privacy: 'public',
      likes: 0, liked: false, topReactions: [], comments: [], commentCount: 0, shares: 0,
    };
    setPosts(p => [newPost, ...p]);
    setComposerText('');
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center"><User size={34} className="text-brand-secondary" /></div>
        <p className="text-text-secondary text-sm font-medium">Your Profile</p>
        <p className="text-text-muted text-xs text-center max-w-xs">Sign in to see your AI-powered profile</p>
        <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <div className="flex-1 overflow-y-auto">
        {/* Cover Photo */}
        <div className="relative h-[200px] bg-gradient-to-br from-brand-primary/20 via-brand-primary/5 to-surface-elevated overflow-hidden">
          {profile.coverUrl && (
            <img src={profile.coverUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-canvas to-transparent" />
          {/* Settings gear */}
          <button
            onClick={() => nav('/settings')}
            className="absolute top-4 right-4 glass rounded-full p-2.5 text-text-secondary hover:text-brand-primary transition-colors z-10"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-5 -mt-16 relative z-10">
          <div className="flex items-end justify-between">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-bg-canvas shadow-xl">
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => nav('/settings')}
              className="glass rounded-full px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <Pencil size={13} /> Edit Profile
            </button>
          </div>

          <div className="mt-3">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">{profile.username}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-xs">
                <Star size={12} className="text-social-warm fill-current" />
                <span className="font-semibold text-text-primary">{profile.score.toLocaleString()}</span>
                <span className="text-text-muted">points</span>
              </div>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-xs font-medium text-brand-primary">{profile.rank}</span>
            </div>
          </div>

          {/* About text */}
          {profile.bio && (
            <p className="text-sm text-text-secondary mt-3 leading-relaxed whitespace-pre-line">{profile.bio}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-text-muted">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin size={12} /> {profile.location}</span>
            )}
            {profile.website && (
              <span className="flex items-center gap-1"><Globe size={12} /> {profile.website}</span>
            )}
            <span className="flex items-center gap-1"><Calendar size={12} /> Joined {new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <span className="flex items-center gap-1"><Users2 size={12} /> {profile.friendCount} friends</span>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pb-4 border-b border-border-subtle">
            {[
              { label: 'Posts', value: posts.length },
              { label: 'Friends', value: friends.length },
              { label: 'Characters', value: profile.characterCount },
              { label: 'Followers', value: profile.followerCount },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-text-primary">{s.value}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 py-3">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'posts', label: 'Posts' },
              { value: 'about', label: 'About' },
              { value: 'friends', label: 'Friends' },
              { value: 'photos', label: 'Photos' },
            ]}
          />
        </div>

        {/* Tab Content */}
        <div className="px-5 pb-24">
          {loading ? (
            <div className="space-y-3 py-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-bg-elevated" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-bg-elevated rounded-full" />
                      <div className="h-2 w-12 bg-bg-elevated rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-bg-elevated rounded-full w-3/4" />
                    <div className="h-3 bg-bg-elevated rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Posts Tab */}
              {tab === 'posts' && (
                <div className="space-y-4">
                  {/* Composer */}
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <img src={profile.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <input
                        value={composerText}
                        onChange={e => setComposerText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePost()}
                        placeholder="What's on your mind?"
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                      />
                      <button
                        onClick={handlePost}
                        disabled={!composerText.trim()}
                        className="rounded-full bg-brand-primary px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40 transition-opacity"
                      >
                        Post
                      </button>
                    </div>
                  </div>

                  {posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Camera size={32} className="text-text-muted opacity-40" />
                      <p className="text-text-muted text-sm">No posts yet</p>
                      <p className="text-text-muted text-xs text-center">Share your first post with the world</p>
                    </div>
                  ) : (
                    posts.map(p => <ProfilePost key={p.id} post={p} />)
                  )}
                </div>
              )}

              {/* About Tab */}
              {tab === 'about' && (
                <div className="space-y-4">
                  <div className="glass rounded-2xl p-5 space-y-4">
                    {[
                      ['Bio', profile.bio || 'No bio yet'],
                      ['Website', profile.website || 'Not set'],
                      ['Location', profile.location || 'Not set'],
                      ['Joined', new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center">
                        <span className="text-xs text-text-muted">{k}</span>
                        <span className="text-xs text-text-primary">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="glass rounded-2xl p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-text-primary">Character Stats</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Characters Created</span>
                      <span className="text-xs text-text-primary font-medium">{profile.characterCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Total Followers</span>
                      <span className="text-xs text-text-primary font-medium">{profile.followerCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Score</span>
                      <span className="text-xs text-brand-primary font-bold">{profile.score.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Friends Tab */}
              {tab === 'friends' && (
                <>
                  {friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Users2 size={32} className="text-text-muted opacity-40" />
                      <p className="text-text-muted text-sm">No friends yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {friends.map(f => <FriendCard key={f.id} friend={f} />)}
                    </div>
                  )}
                </>
              )}

              {/* Photos Tab */}
              {tab === 'photos' && (
                <>
                  {photos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Image size={32} className="text-text-muted opacity-40" />
                      <p className="text-text-muted text-sm">No photos yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map(photo => (
                        <div key={photo.id} className="aspect-square rounded-lg overflow-hidden hover:scale-[1.02] transition-transform">
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
