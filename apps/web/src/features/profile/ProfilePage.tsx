import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User, Settings, Star, MapPin, Globe, Calendar, Camera, Sparkles,
  Users2, Image, Heart, MessageCircle, Share2, MoreHorizontal,
  Plus, Pencil, Lock, ChevronRight, Shield, BadgeCheck, Check,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import type { Post, UserProfile, Character } from '@/app/store';
import {
  logout, useAppDispatch,
  fetchProfile, fetchFriendsThunk,
  setUserPosts,
  setTranslatedPost,
  setTranslating,
  clearTranslation,
} from '@/app/store';
import { apiFetch } from '@/lib/api';
import { translateText, getLanguageDisplayName, detectTextLanguage } from '@/lib/translate';
import { timeAgo } from '@/lib/timeAgo';
import { Badge, Tabs } from '@itchats/ui';

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
function ProfilePost({ post }: { post: Post }) {
  const dispatch = useAppDispatch();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const isLongContent = post.content.length > 200;
  const [expanded, setExpanded] = useState(false);
  const displayContent = expanded ? post.content : post.content.slice(0, 200);

  // Translation
  const { language: userLang, translatedPosts, translating: transMap } = useSelector((s: RootState) => s.translation);
  const isTranslating = transMap[post.id] ?? false;
  const translatedData = translatedPosts[post.id];
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async () => {
    if (isTranslating) return;
    if (translatedData) {
      setShowTranslation(!showTranslation);
      return;
    }
    dispatch(setTranslating(post.id));
    try {
      const result = await translateText(post.content, userLang);
      dispatch(setTranslatedPost({
        postId: post.id,
        translatedText: result.translatedText,
        detectedLanguage: result.detectedSourceLanguage || detectTextLanguage(post.content),
      }));
      setShowTranslation(true);
    } catch {
      dispatch(clearTranslation(post.id));
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch {
      try {
        await navigator.share({ url: `${window.location.origin}/post/${post.id}`, title: `Post by ${post.authorName}` });
      } catch { /* fallback silent */ }
    }
  };

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
            {showTranslation && translatedData ? translatedData.translatedText : displayContent}
            {isLongContent && !expanded && !showTranslation && '...'}
          </p>
          {isLongContent && !showTranslation && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-brand-primary mt-1 hover:underline">
              {expanded ? 'Show less' : 'See more'}
            </button>
          )}
          {showTranslation && translatedData && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full">
                Translated from {getLanguageDisplayName(translatedData.detectedLanguage)}
              </span>
              <button
                onClick={() => setShowTranslation(false)}
                className="text-[10px] text-brand-primary hover:underline"
              >
                Show original
              </button>
            </div>
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
        <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5">
          <Share2 size={16} /> Share
        </button>
        <button
          onClick={handleTranslate}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${translatedData ? 'text-brand-primary' : 'text-text-muted hover:bg-white/5'}`}
        >
          <Globe size={16} className={isTranslating ? 'animate-spin' : ''} />
          {isTranslating ? '...' : translatedData && showTranslation ? 'Original' : 'Translate'}
        </button>
      </div>
      {/* Copied toast */}
      {showCopiedToast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 glass rounded-full px-4 py-2 text-xs font-medium text-text-primary flex items-center gap-1.5 shadow-lg animate-fade-in">
          <Check size={12} className="text-success" /> Link copied!
        </div>
      )}
    </div>
  );
}

// ── Friend Card ──
function FriendCard({ friend }: { friend: UserProfile }) {
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
  const profile = useSelector((s: RootState) => s.profile.profile);
  const friends = useSelector((s: RootState) => s.profile.friends);
  const profileLoading = useSelector((s: RootState) => s.profile.loading);
  const profileError = useSelector((s: RootState) => s.profile.error);
  const myCharacters = useSelector((s: RootState) => s.characters.myCharacters);

  const [posts, setPosts] = useState<Post[]>([]);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [tab, setTab] = useState('posts');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');

  useEffect(() => {
    if (!user) return;
    dispatch(fetchProfile());
    dispatch(fetchFriendsThunk());
    loadUserContent();
  }, [user, dispatch]);

  async function loadUserContent() {
    setLoadingPosts(true);
    setPostsError(null);
    try {
      const userId = user?.id ?? 'me';
      const [pt, ph] = await Promise.all([
        apiFetch<Post[]>(`/users/${userId}/posts`),
        apiFetch<{ id: string; url: string }[]>(`/users/${userId}/photos`).catch(() => [] as { id: string; url: string }[]),
      ]);
      setPosts(pt);
      dispatch(setUserPosts({ userId, posts: pt }));
      setPhotos(ph);
    } catch (e: any) {
      setPostsError(e.message || 'Failed to load posts');
      setPosts([]);
    }
    setLoadingPosts(false);
  }

  const handlePost = () => {
    if (!composerText.trim()) return;
    // Could be dispatched to Redux, but currently the profile composer is simpler
    setComposerText('');
  };

  const profileData = profile ?? {
    id: user?.id ?? '',
    username: user?.username ?? '',
    email: '',
    avatarUrl: '',
    coverUrl: '',
    bio: '',
    website: '',
    location: '',
    joinDate: '',
    score: 0,
    rank: '',
    friendCount: 0,
    characterCount: myCharacters.length,
    followerCount: 0,
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

  const isLoading = profileLoading || loadingPosts;
  const charCount = myCharacters.length || profileData.characterCount;

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <div className="flex-1 overflow-y-auto">
        {/* Cover Photo */}
        <div className="relative h-[200px] bg-gradient-to-br from-brand-primary/20 via-brand-primary/5 to-surface-elevated overflow-hidden">
          {profileData.coverUrl && (
            <img src={profileData.coverUrl} alt="" className="w-full h-full object-cover" />
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
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                  <User size={36} className="text-text-muted" />
                </div>
              )}
            </div>
            <button
              onClick={() => nav('/settings')}
              className="glass rounded-full px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <Pencil size={13} /> Edit Profile
            </button>
          </div>

          <div className="mt-3">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">{profileData.username}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-xs">
                <Star size={12} className="text-social-warm fill-current" />
                <span className="font-semibold text-text-primary">{(profileData.score ?? 0).toLocaleString()}</span>
                <span className="text-text-muted">points</span>
              </div>
              {profileData.rank && (
                <>
                  <span className="text-text-muted text-xs">·</span>
                  <span className="text-xs font-medium text-brand-primary">{profileData.rank}</span>
                </>
              )}
            </div>
          </div>

          {/* About text */}
          {profileData.bio && (
            <p className="text-sm text-text-secondary mt-3 leading-relaxed whitespace-pre-line">{profileData.bio}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-text-muted">
            {profileData.location && (
              <span className="flex items-center gap-1"><MapPin size={12} /> {profileData.location}</span>
            )}
            {profileData.website && (
              <span className="flex items-center gap-1"><Globe size={12} /> {profileData.website}</span>
            )}
            {profileData.joinDate && (
              <span className="flex items-center gap-1"><Calendar size={12} /> Joined {new Date(profileData.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            )}
            <span className="flex items-center gap-1"><Users2 size={12} /> {profileData.friendCount} friends</span>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pb-4 border-b border-border-subtle">
            {[
              { label: 'Posts', value: posts.length },
              { label: 'Friends', value: friends.length },
              { label: 'Characters', value: charCount },
              { label: 'Followers', value: profileData.followerCount },
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
          {isLoading && tab === 'posts' ? (
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
                  {postsError ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Camera size={32} className="text-text-muted opacity-40" />
                      <p className="text-text-muted text-sm">Failed to load posts</p>
                      <p className="text-text-muted text-xs text-center max-w-[260px]">{postsError}</p>
                      <button onClick={loadUserContent} className="rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium">Retry</button>
                    </div>
                  ) : posts.length === 0 ? (
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
                      ['Bio', profileData.bio || 'No bio yet'],
                      ['Website', profileData.website || 'Not set'],
                      ['Location', profileData.location || 'Not set'],
                      ['Joined', profileData.joinDate ? new Date(profileData.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'],
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
                      <span className="text-xs text-text-primary font-medium">{charCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Total Followers</span>
                      <span className="text-xs text-text-primary font-medium">{(profileData.followerCount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Score</span>
                      <span className="text-xs text-brand-primary font-bold">{(profileData.score ?? 0).toLocaleString()}</span>
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
