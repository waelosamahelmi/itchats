import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User, Settings, Star, MapPin, Globe, Calendar, Camera, Sparkles,
  Users2, Image, Heart, MessageCircle, Share2, MoreHorizontal,
  Plus, Pencil, Lock, ChevronRight, Shield, BadgeCheck, Check,
  X, Send, Upload, Loader2, Smile, AtSign,
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
  createNewPost,
} from '@/app/store';
import { apiFetch } from '@/lib/api';
import { translateText, getLanguageDisplayName, detectTextLanguage } from '@/lib/translate';
import { timeAgo } from '@/lib/timeAgo';
import { t } from '@/lib/i18n';
import { Badge, Tabs } from '@itchats/ui';
import LinkPreviewCard, { LinkPreviewSkeleton, LinkPreviewData } from '@/components/LinkPreviewCard';

// ── Edit Profile Modal ──
function EditProfileModal({ profile, onClose, onSaved }: { profile: UserProfile; onClose: () => void; onSaved: (data: any) => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName || profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await apiFetch('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          location: location.trim() || undefined,
          website: website.trim() || undefined,
        }),
      });
      onSaved(result);
      onClose();
    } catch (err: any) {
      console.error('Failed to save profile:', err);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal,1200)] bg-black/70 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">{t('profile.editProfile')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5"><X size={20} className="text-text-secondary" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Display Name</label>
            <input
              ref={nameRef}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-transparent glass rounded-xl px-4 py-3 text-sm text-text-primary outline-none"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full bg-transparent glass rounded-xl px-4 py-3 text-sm text-text-primary outline-none resize-none"
              placeholder="Tell people about yourself..."
            />
            <span className="text-[10px] text-text-muted float-right">{bio.length}/160</span>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-transparent glass rounded-xl px-4 py-3 text-sm text-text-primary outline-none"
              placeholder="City, Country"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Website</label>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              className="w-full bg-transparent glass rounded-xl px-4 py-3 text-sm text-text-primary outline-none"
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 rounded-full glass px-4 py-3 text-sm text-text-secondary">{t('feed.cancel')}</button>
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="flex-1 rounded-full bg-brand-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-40 flex items-center justify-center gap-1"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving</> : t('feed.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Post Composer for Profile ──
function ProfileComposer({ onPost, userAvatar, username }: { onPost: (text: string) => void; userAvatar?: string; username?: string }) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      onPost(text.trim());
      setText('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-3">
        {userAvatar ? (
          <img src={userAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-bg-elevated shrink-0 flex items-center justify-center">
            <User size={18} className="text-text-muted" />
          </div>
        )}
        <div className="flex-1 flex items-center gap-2 glass rounded-full px-3 py-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePost()}
            placeholder={t('feed.whatsOnYourMind', { name: username || '' })}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <button onClick={handlePost} disabled={!text.trim() || posting} className="text-brand-primary disabled:opacity-30">
            {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared Post Card ──
function ProfilePost({ post }: { post: Post }) {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isLongContent = post.content.length > 200;
  const displayContent = expanded ? post.content : post.content.slice(0, 200);

  const { language: userLang, translatedPosts, translating: transMap } = useSelector((s: RootState) => s.translation);
  const isTranslating = transMap[post.id] ?? false;
  const translatedData = translatedPosts[post.id];
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async () => {
    if (isTranslating) return;
    if (translatedData) { setShowTranslation(!showTranslation); return; }
    dispatch(setTranslating(post.id));
    try {
      const result = await translateText(post.content, userLang);
      dispatch(setTranslatedPost({ postId: post.id, translatedText: result.translatedText, detectedLanguage: result.detectedSourceLanguage || detectTextLanguage(post.content) }));
      setShowTranslation(true);
    } catch { dispatch(clearTranslation(post.id)); }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <img
          src={post.authorAvatar || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(post.authorName)}`}
          alt=""
          className="w-10 h-10 rounded-full object-cover"
        />
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
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium ${liked ? 'text-brand-primary' : 'text-text-muted hover:bg-white/5'}`}
        >
          <Heart size={16} className={liked ? 'fill-current text-brand-primary' : ''} /> Like
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5">
          <MessageCircle size={16} /> Comment
        </button>
        <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5">
          <Share2 size={16} /> Share
        </button>
        <button onClick={handleTranslate} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium ${translatedData ? 'text-brand-primary' : 'text-text-muted hover:bg-white/5'}`}>
          <Globe size={16} className={isTranslating ? 'animate-spin' : ''} />
          {isTranslating ? '...' : translatedData && showTranslation ? 'Original' : 'Translate'}
        </button>
      </div>
      {showCopiedToast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 glass rounded-full px-4 py-2 text-xs font-medium text-text-primary shadow-lg animate-fade-in">
          <Check size={12} className="text-success inline mr-1" /> Link copied!
        </div>
      )}
    </div>
  );
}

// ── Friend Card ──
function FriendCard({ friend }: { friend: any }) {
  return (
    <div className="glass rounded-2xl p-3 text-center hover:bg-white/6 transition-all">
      <img
        src={friend.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(friend.username || friend.displayName || '')}`}
        alt={friend.username}
        className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
      />
      <p className="text-xs font-semibold text-text-primary truncate">{friend.displayName || friend.username}</p>
    </div>
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
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Avatar / cover upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        apiFetch<{ id: string; url: string }[]>(`/users/${userId}/photos`).catch(() => []),
      ]);
      setPosts(pt);
      dispatch(setUserPosts({ userId, posts: pt }));
      setPhotos(Array.isArray(ph) ? ph : []);
    } catch (e: any) {
      setPostsError(e.message || 'Failed to load posts');
      setPosts([]);
    }
    setLoadingPosts(false);
  }

  // Upload avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum 10MB.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/v1/users/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        dispatch(fetchProfile());
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
    setUploadingAvatar(false);
  };

  // Upload cover
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum 10MB.');
      return;
    }
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/v1/users/cover', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        dispatch(fetchProfile());
      }
    } catch (err) {
      console.error('Cover upload failed:', err);
    }
    setUploadingCover(false);
  };

  // Create post from profile composer
  const handleCreatePost = (text: string) => {
    dispatch(createNewPost({ content: text }));
    // Refresh posts
    loadUserContent();
  };

  const profileData = profile ?? {
    id: user?.id ?? '',
    username: user?.username ?? '',
    displayName: (user as any)?.displayName || user?.username || '',
    avatarUrl: '',
    coverUrl: '',
    bio: '',
    website: '',
    location: '',
    score: 0,
    rank: '',
    friendCount: 0,
    characterCount: 0,
    followerCount: 0,
    createdAt: undefined,
  };

  const charCount = profile?.characterCount ?? myCharacters.length ?? 0;
  const followerCnt = profile?.followerCount ?? 0;
  const avatarUrl = profile?.avatarUrl || (user as any)?.avatarUrl || '';

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center"><User size={34} className="text-brand-secondary" /></div>
        <p className="text-text-secondary text-sm font-medium">{t('profile.yourProfile')}</p>
        <p className="text-text-muted text-xs text-center max-w-xs">{t('profile.signInPrompt')}</p>
        <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">{t('profile.signIn')}</button>
      </div>
    );
  }

  const isLoading = profileLoading || loadingPosts;

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <div className="flex-1 overflow-y-auto">
        {/* Cover Photo */}
        <div className="relative h-[200px] bg-gradient-to-br from-brand-primary/20 via-brand-primary/5 to-surface-elevated overflow-hidden group">
          {profileData.coverUrl ? (
            <img src={profileData.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-canvas to-transparent" />
          {/* Upload cover button */}
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-4 right-4 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 disabled:opacity-50"
            title="Change cover photo"
          >
            {uploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
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
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-bg-canvas shadow-xl">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                    <User size={36} className="text-text-muted" />
                  </div>
                )}
              </div>
              {/* Upload avatar overlay */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
              >
                {uploadingAvatar ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="glass rounded-full px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <Pencil size={13} /> {t('profile.editProfile')}
            </button>
          </div>

          <div className="mt-3">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              {profileData.displayName || profileData.username}
            </h1>
            {profileData.displayName && profileData.displayName !== profileData.username && (
              <p className="text-xs text-text-muted">@{profileData.username}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-xs">
                <Star size={12} className="text-social-warm fill-current" />
                <span className="font-semibold text-text-primary">{(profileData.score ?? 0).toLocaleString()}</span>
                <span className="text-text-muted">{t('profile.points')}</span>
              </div>
              {profileData.rank && (
                <>
                  <span className="text-text-muted text-xs">·</span>
                  <span className="text-xs font-medium text-brand-primary">{profileData.rank}</span>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {profileData.bio ? (
            <p className="text-sm text-text-secondary mt-3 leading-relaxed whitespace-pre-line">{profileData.bio}</p>
          ) : (
            <p className="text-xs text-text-muted mt-3 italic">No bio yet. Tap Edit to add one.</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-text-muted">
            {profileData.location && (
              <span className="flex items-center gap-1"><MapPin size={12} /> {profileData.location}</span>
            )}
            {profileData.website && (
              <a href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-primary hover:underline">
                <Globe size={12} /> {profileData.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pb-4 border-b border-border-subtle">
            {[
              { label: t('profile.posts'), value: posts.length },
              { label: t('profile.friends'), value: friends.length },
              { label: t('profile.characters'), value: charCount },
              { label: t('profile.followers'), value: followerCnt },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-text-primary">{s.value.toLocaleString()}</p>
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
              { value: 'posts', label: t('profile.posts') },
              { value: 'about', label: t('profile.about') },
              { value: 'friends', label: t('profile.friends') },
              { value: 'photos', label: t('profile.photos') },
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
                  {/* Profile Composer */}
                  <ProfileComposer onPost={handleCreatePost} userAvatar={avatarUrl} username={profileData.displayName || user?.username} />

                  {postsError ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Camera size={32} className="text-text-muted opacity-40" />
                      <p className="text-text-muted text-sm">{t('profile.loadFailed')}</p>
                      <button onClick={loadUserContent} className="rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium">{t('feed.retry')}</button>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Camera size={32} className="text-text-muted opacity-40" />
                      <p className="text-text-muted text-sm">{t('profile.noPosts')}</p>
                      <p className="text-text-muted text-xs text-center">{t('profile.shareFirst')}</p>
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
                      ['Bio', profileData.bio || 'No bio set'],
                      ['Website', profileData.website || 'Not set'],
                      ['Location', profileData.location || 'Not set'],
                      ['Joined', profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center">
                        <span className="text-xs text-text-muted">{k}</span>
                        <span className="text-xs text-text-primary text-right max-w-[60%] truncate">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="glass rounded-2xl p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-text-primary">Stats</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Characters Created</span>
                      <span className="text-xs text-text-primary font-medium">{charCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Total Followers</span>
                      <span className="text-xs text-text-primary font-medium">{followerCnt.toLocaleString()}</span>
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
                      <p className="text-text-muted text-sm">{t('profile.noFriends')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {friends.map((f: any) => <FriendCard key={f.id || f.username} friend={f} />)}
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
                      <p className="text-text-muted text-sm">{t('profile.noPhotos')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.filter(p => p.url).map(photo => (
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

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          profile={profileData}
          onClose={() => setShowEditProfile(false)}
          onSaved={(updated) => {
            dispatch({ type: 'profile/fetch/fulfilled', payload: updated } as any);
          }}
        />
      )}
    </div>
  );
}
