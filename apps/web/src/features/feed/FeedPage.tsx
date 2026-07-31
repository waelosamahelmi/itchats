import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Home, Heart, MessageCircle, Share2, Send,
  Smile, Globe, Lock, Plus, Sparkles, Check, Camera, X, AtSign, Bell, User,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { useAppDispatch } from '@/app/store';
import type { Post, Comment, Story, Character } from '@/app/store';
import {
  fetchFeed,
  fetchStoriesThunk,
  createNewPost,
  reactToPostThunk,
  unreactToPostThunk,
  addCommentThunk,
  reactToCommentThunk,
  unreactToCommentThunk,
  setTranslatedPost,
  setTranslating,
  clearTranslation,
  editPostThunk,
  EMOJI_TO_REACTION,
} from '@/app/store';
import { genId, reactionEmojis, apiFetch } from '@/lib/api';
import { translateText, getLanguageDisplayName, detectTextLanguage, getAutoTranslateSetting } from '@/lib/translate';
import { timeAgo } from '@/lib/timeAgo';
import { t } from '@/lib/i18n';
import { Badge } from '@itchats/ui';
import ProfileWizard from '@/features/auth/ProfileWizard';
import PostMenu from '@/components/PostMenu';
import ShareBottomSheet from '@/components/ShareBottomSheet';
import MentionAutocomplete from '@/components/MentionAutocomplete';
import FeelingPicker from '@/components/FeelingPicker';
import LinkPreviewCard, { LinkPreviewSkeleton, LinkPreviewData } from '@/components/LinkPreviewCard';
import { SkeletonLine } from '@/components/Skeleton';

/** Trigger haptic feedback if available (Section 22) */
function haptic(ms: number = 10) {
  try { navigator?.vibrate?.(ms); } catch {}
}

// ── Character cache (handle → id, name) ──
let characterCache: Map<string, { id: string; name: string; handle: string }> | null = null;

async function getCharacterCache(): Promise<Map<string, { id: string; name: string; handle: string }>> {
  if (characterCache) return characterCache;
  try {
    const chars = await apiFetch<Character[]>('/characters/discover?page=1&limit=200');
    characterCache = new Map();
    for (const c of chars) {
      const handle = (c.handle || c.name.toLowerCase().replace(/\s+/g, '_')).toLowerCase();
      characterCache.set(handle, { id: c.id, name: c.name, handle: c.handle || '' });
      // Also map by name
      const nameKey = c.name.toLowerCase();
      if (!characterCache.has(nameKey)) {
        characterCache.set(nameKey, { id: c.id, name: c.name, handle: c.handle || '' });
      }
    }
  } catch {
    characterCache = new Map();
  }
  return characterCache;
}

// ── Mention and Hashtag Text Renderer ──
function MentionText({ text, className = '' }: { text: string; className?: string }) {
  const nav = useNavigate();
  const [cache, setCache] = useState<Map<string, { id: string; name: string; handle: string }> | null>(null);

  useEffect(() => {
    getCharacterCache().then(setCache);
  }, []);

  // Parse @handle and #hashtag patterns
  const parts = text.split(/(@[\w]+|#[\w]+)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.slice(1);
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); nav(`/hashtag/${tag}`); }}
              className="text-brand-primary hover:underline cursor-pointer"
            >
              {part}
            </button>
          );
        }
        if (part.startsWith('@') && part.length > 1) {
          const handle = part.slice(1).toLowerCase();
          const char = cache?.get(handle);
          if (char) {
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); nav(`/ai/profile/${char.id}`); }}
                className="text-brand-primary hover:underline cursor-pointer"
              >
                @{char.name}
              </button>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── Story Circle ──
function StoryCircle({ story, isYours, userAvatar, onYourStoryClick }: { story: Story; isYours?: boolean; userAvatar?: string; onYourStoryClick?: () => void }) {
  if (isYours) {
    return (
      <button onClick={onYourStoryClick} className="flex flex-col items-center gap-1 shrink-0 w-[72px] group">
        <div className="relative w-[64px] h-[64px] rounded-full overflow-hidden border-[3px] border-bg-canvas">
          {userAvatar ? (
            <img src={userAvatar} alt="You" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
              <Camera size={24} className="text-text-muted" />
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center border-[3px] border-bg-canvas">
          <Plus size={12} className="text-white" />
        </div>
        <span className="text-[10px] text-text-secondary truncate w-full text-center leading-tight">{t('feed.yourStory')}</span>
      </button>
    );
  }

  return (
    <button className="flex flex-col items-center gap-1 shrink-0 w-[72px] group">
      <div className={`relative p-[2px] rounded-full ${story.viewed ? '' : 'bg-gradient-to-br from-brand-primary via-social-warm to-brand-secondary'} ${story.isLive ? 'ring-2 ring-danger ring-offset-2 ring-offset-bg-canvas' : ''}`}>
        <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-[3px] border-bg-canvas">
          <img src={story.authorAvatar} alt={story.authorName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
        </div>
        {!story.viewed && (
          <div className="absolute inset-[2px] rounded-full border-[2px] border-transparent bg-gradient-to-br from-brand-primary via-social-warm to-brand-secondary" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor' }} />
        )}
      </div>
      <span className="text-[10px] text-text-secondary truncate w-full text-center leading-tight">{story.authorName}</span>
    </button>
  );
}

// ── Stories Bar ──
function StoriesBar({ stories, userAvatar, onYourStoryClick }: { stories: Story[]; userAvatar?: string; onYourStoryClick?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter: only show characters that have at least one active story
  // Group stories by character and keep only characters with stories
  const characterStories = new Map<string, Story>();
  for (const s of stories) {
    const key = (s as any).authorCharacterId || s.authorId || 'unknown';
    if (!characterStories.has(key)) {
      characterStories.set(key, s);
    }
  }
  const filteredStories = Array.from(characterStories.values());

  return (
    <div className="relative mb-4">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 py-3 scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {/* Your story */}
        <StoryCircle
          story={{ id: 'you', authorId: 'you', authorName: 'You', authorAvatar: userAvatar ?? '', isAI: false, viewed: false, isLive: false }}
          isYours
          userAvatar={userAvatar}
          onYourStoryClick={onYourStoryClick}
        />
        {filteredStories.map(s => (
          <StoryCircle key={s.id} story={s} />
        ))}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-canvas to-transparent" />
    </div>
  );
}

// ── Reaction Picker ──
function ReactionPicker({ onSelect, show, onClose }: { onSelect: (e: string) => void; show: boolean; onClose: () => void }) {
  if (!show) return null;
  return (
    <div className="absolute -top-12 left-0 z-20 flex gap-0.5 p-1.5 glass rounded-2xl shadow-lg animate-fade-in"
      onMouseLeave={onClose}>
      {reactionEmojis.slice(0, 6).map(e => (
        <button
          key={e}
          onClick={() => { onSelect(e); onClose(); }}
          className="w-8 h-8 flex items-center justify-center text-lg rounded-xl hover:bg-white/10 hover:scale-125 transition-all"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// ── Post Card ──
function PostCard({ post }: { post: Post }) {
  const dispatch = useAppDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const myCharacters = useSelector((s: RootState) => s.characters.myCharacters);
  const profile = useSelector((s: RootState) => s.profile.profile);
  const userAvatar = profile?.avatarUrl || user?.avatarUrl || '';
  const [comments, setComments] = useState<Comment[]>(post.comments ?? []);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; authorName: string } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const nav = useNavigate();
  const myCharacterIds = myCharacters?.map((c: any) => c.id) ?? [];

  // Use Redux-sourced reaction state
  const liked = post.viewerReaction != null;
  const likeCount = Number.isFinite(Number(post.likeCount ?? post.likes)) ? (post.likeCount ?? post.likes ?? 0) : 0;

  // Fetch comments with full threads from server
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Translation state
  const { language: userLang, autoTranslate, translatedPosts, translating } = useSelector((s: RootState) => s.translation);
  const isTranslating = translating[post.id] ?? false;
  const translatedData = translatedPosts[post.id];
  const [showTranslation, setShowTranslation] = useState(false);

  const avatarSrc = avatarFailed || !post.authorAvatar
    ? `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(post.authorName)}`
    : post.authorAvatar;

  const isLongContent = post.content.length > 200;
  const displayContent = expandedContent ? post.content : post.content.slice(0, 200);

  const handleLike = () => {
    haptic(5);
    if (liked) {
      dispatch(unreactToPostThunk(post.id));
    } else {
      dispatch(reactToPostThunk({ postId: post.id, emoji: '❤️' }));
    }
  };

  const handleReaction = (emoji: string) => {
    haptic(5);
    // If already reacted with same type, remove
    const reactionType = EMOJI_TO_REACTION[emoji] || 'like';
    if (post.viewerReaction === reactionType) {
      dispatch(unreactToPostThunk(post.id));
    } else {
      dispatch(reactToPostThunk({ postId: post.id, emoji }));
    }
  };

  const handleLikeMouseDown = () => {
    const timer = setTimeout(() => setShowReactionPicker(true), 500);
    setLongPressTimer(timer);
  };
  const handleLikeMouseUp = () => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    if (!showReactionPicker) handleLike();
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    dispatch(addCommentThunk({ postId: post.id, content: commentText.trim() }));
    // Optimistic
    const newComment: Comment = {
      id: genId(), authorName: 'You', authorAvatar: '',
      authorIsAI: false, content: commentText.trim(), createdAt: new Date().toISOString(), likes: 0, liked: false, replies: [],
    };
    setComments(c => [...c, newComment]);
    setCommentText('');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareSheet(true);
  };

  const handleEditSave = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      await dispatch(editPostThunk({ postId: post.id, content: editContent.trim() })).unwrap();
      setEditing(false);
    } catch (err) {
      console.error('Failed to edit post:', err);
    }
    setSavingEdit(false);
  };

  const handleLikeComment = (commentId: string, currentReaction: boolean) => {
    // Optimistic update
    setComments(c => c.map(cmt =>
      cmt.id === commentId ? { ...cmt, liked: !currentReaction, likes: (cmt.likes ?? 0) + (currentReaction ? -1 : 1) } : cmt
    ));
    if (currentReaction) {
      dispatch(unreactToCommentThunk(commentId));
    } else {
      dispatch(reactToCommentThunk({ commentId, reactionType: 'like' }));
    }
  };

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

  // Load server comments on mount and when showAllComments toggles
  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const data = await apiFetch<Comment[]>(`/posts/${post.id}/comments`);
      setComments(data || []);
    } catch {
      // keep existing
    }
    setCommentsLoading(false);
  }, [post.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Auto-translate when posts load
  useEffect(() => {
    if (autoTranslate && !translatedData && !isTranslating && post.content) {
      handleTranslate();
    }
  }, [autoTranslate, post.id]);

  // Show first 2 top-level comments, expand to show all
  const visibleComments = showAllComments ? comments : comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up relative">
      {/* Post Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative shrink-0">
          <img src={avatarSrc} alt={post.authorName} className="w-10 h-10 rounded-full object-cover" onError={() => setAvatarFailed(true)} />
          {post.authorIsAI && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center border-2 border-bg-canvas">
              <Sparkles size={8} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {post.authorIsAI && (post as any).authorCharacterId ? (
              <button
                onClick={() => nav(`/ai/profile/${(post as any).authorCharacterId}`)}
                className="text-sm font-semibold text-text-primary truncate hover:text-brand-primary hover:underline transition-colors"
              >
                {post.authorName}
              </button>
            ) : (post as any).authorUserId ? (
              <button
                onClick={() => nav(`/profile/${(post as any).authorUserId}`)}
                className="text-sm font-semibold text-text-primary truncate hover:text-brand-primary hover:underline transition-colors"
              >
                {post.authorName}
              </button>
            ) : (
              <span className="text-sm font-semibold text-text-primary truncate">{post.authorName}</span>
            )}
            {post.authorIsAI && <Badge variant="ai" className="text-[9px] px-1.5">AI</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-text-muted">{timeAgo(post.createdAt)}</span>
            <span className="text-text-muted">·</span>
            {post.privacy === 'public' ? <Globe size={10} className="text-text-muted" /> : <Lock size={10} className="text-text-muted" />}
          </div>
        </div>
        <PostMenu
          post={post}
          currentUserId={user?.id}
          myCharacterIds={myCharacterIds}
          onEdit={() => { setEditContent(post.content); setEditing(true); }}
        />
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none border border-border-subtle rounded-xl p-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-1.5 rounded-full text-xs text-text-secondary glass hover:bg-white/5 transition-colors"
              >
                {t('feed.cancel')}
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editContent.trim() || savingEdit}
                className="px-4 py-1.5 rounded-full text-xs text-white bg-brand-primary hover:brightness-110 transition-all disabled:opacity-40"
              >
                {savingEdit ? t('feed.saving') : t('feed.save')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
              <MentionText text={showTranslation && translatedData ? translatedData.translatedText : displayContent} />
              {isLongContent && !expandedContent && !showTranslation && '...'}
            </p>
            {isLongContent && !showTranslation && (
              <button onClick={() => setExpandedContent(!expandedContent)} className="text-xs text-brand-primary mt-1 hover:underline">
                {expandedContent ? t('feed.showLess') : t('feed.seeMore')}
              </button>
            )}
            {/* Translation label */}
            {showTranslation && translatedData && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full">
                  {t('feed.translatedFrom', { lang: getLanguageDisplayName(translatedData.detectedLanguage) })}
                </span>
                <button
                  onClick={() => setShowTranslation(false)}
                  className="text-[10px] text-brand-primary hover:underline"
                >
                  {t('feed.showOriginal')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Post Media */}
      {post.mediaUrl && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden">
          <img src={post.mediaUrl} alt="Post media" className="w-full object-cover max-h-[400px] rounded-xl hover:scale-[1.02] transition-transform duration-500" />
        </div>
      )}

      {/* Stats Row */}
      {(likeCount > 0 || post.commentCount > 0 || post.shares > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-text-muted">
          <div className="flex items-center gap-1">
            {post.topReactions?.slice(0, 3).map((r, i) => (
              <span key={i} className="-mr-1">{r.emoji}</span>
            ))}
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{Math.max(post.commentCount, comments.length)} {t('feed.comments')}</span>
            <span>{post.shares} {t('feed.shares')}</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center border-t border-border-subtle mx-4 py-1">
        <div className="relative flex-1">
          <button
            onMouseDown={handleLikeMouseDown}
            onMouseUp={handleLikeMouseUp}
            onMouseLeave={() => { if (showReactionPicker) setShowReactionPicker(false); }}
            className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-medium transition-colors ${liked ? 'text-brand-primary' : 'text-text-muted hover:bg-white/5 hover:text-text-secondary'}`}
          >
            <Heart size={16} className={liked ? 'fill-current text-brand-primary' : ''} />
            {t('feed.like')}
          </button>
          <ReactionPicker onSelect={handleReaction} show={showReactionPicker} onClose={() => setShowReactionPicker(false)} />
        </div>
        <button
          onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5 hover:text-text-secondary transition-colors"
        >
          <MessageCircle size={16} />
          {t('feed.comment')}
        </button>
        <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5 hover:text-text-secondary transition-colors">
          <Share2 size={16} />
          {t('feed.share')}
        </button>
        <button
          onClick={handleTranslate}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${translatedData ? 'text-brand-primary' : 'text-text-muted hover:bg-white/5 hover:text-text-secondary'}`}
        >
          <Globe size={16} className={isTranslating ? 'animate-spin' : ''} />
          {isTranslating ? '...' : translatedData && showTranslation ? t('feed.original') : t('feed.translate')}
        </button>
      </div>

      {/* Comments Section */}
      {comments.length > 0 && (
        <div className="px-4 pb-3">
          <div className="border-t border-border-subtle pt-3 space-y-3">
            {visibleComments.map(c => (
              <div key={c.id}>
                <div className="flex gap-2.5">
                  <img
                    src={c.authorAvatar || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(c.authorName)}`}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`rounded-2xl px-3 py-2 inline-block max-w-full ${c.authorIsAI ? 'bg-brand-glow/10' : 'bg-bg-elevated'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-text-primary">{c.authorName}</span>
                        {c.authorIsAI && <Badge variant="ai" className="text-[9px] px-1">AI</Badge>}
                      </div>
                      <p className="text-xs text-text-secondary"><MentionText text={c.content} /></p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <span className="text-[10px] text-text-muted">{timeAgo(c.createdAt)}</span>
                      <button onClick={() => handleLikeComment(c.id, !!c.liked)} className={`text-[10px] font-medium ${c.liked ? 'text-brand-primary' : 'text-text-muted'}`}>
                        {c.likes > 0 ? `Like · ${c.likes}` : 'Like'}
                      </button>
                      <button className="text-[10px] text-text-muted font-medium">Reply</button>
                    </div>
                  </div>
                  {c.likes > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0 self-start mt-7">
                      <span className="text-[10px]">❤️</span>
                    </div>
                  )}
                </div>
                {/* Threaded replies */}
                {c.replies?.map((r: any) => (
                  <div key={r.id} className="flex gap-2.5 ml-9 mt-2">
                    <img
                      src={r.authorAvatar || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(r.authorName || 'unknown')}`}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`rounded-2xl px-3 py-1.5 inline-block ${r.authorIsAI ? 'bg-brand-glow/10' : 'bg-bg-elevated'}`}>
                        <span className="text-xs font-semibold text-text-primary">{r.authorName || 'Unknown'}</span>
                        {r.authorIsAI && <Badge variant="ai" className="text-[9px] px-1 ml-1">AI</Badge>}
                        <p className="text-xs text-text-secondary mt-0.5"><MentionText text={r.content} /></p>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 ml-1">
                        <span className="text-[10px] text-text-muted">{timeAgo(r.createdAt)}</span>
                        <button onClick={() => handleLikeComment(r.id, !!r.liked)} className={`text-[10px] font-medium ${r.liked ? 'text-brand-primary' : 'text-text-muted'}`}>
                          {r.likes > 0 ? `Like · ${r.likes}` : 'Like'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {commentsLoading && (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
              </div>
            )}
            {hasMoreComments && !showAllComments && (
              <button onClick={() => setShowAllComments(true)} className="text-xs text-text-muted hover:text-brand-primary transition-colors pl-9">
                {t('feed.viewAllComments', { n: comments.length })}
              </button>
            )}
            {showAllComments && comments.length > 2 && (
              <button onClick={() => setShowAllComments(false)} className="text-xs text-text-muted hover:text-brand-primary transition-colors pl-9">
                {t('feed.showLess')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comment Composer */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border-subtle">
        {userAvatar ? (
          <img src={userAvatar} alt="You" className="w-7 h-7 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-bg-elevated shrink-0 flex items-center justify-center">
            <User size={12} className="text-text-muted" />
          </div>
        )}
        <div className="flex-1 flex items-center gap-2 glass rounded-full px-3 py-2">
          <input
            id={`comment-input-${post.id}`}
            type="text"
            placeholder="Write a comment..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
            className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
          />
          <button onClick={handleAddComment} disabled={!commentText.trim()} className="text-brand-primary disabled:opacity-30 transition-opacity">
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Share Bottom Sheet */}
      {showShareSheet && (
        <ShareBottomSheet post={post} onClose={() => setShowShareSheet(false)} />
      )}
    </div>
  );
}

// ── URL Regex ──
const URL_REGEX = /https?:\/\/[^\s<>"]+/gi;

function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0) return null;
  // Return the longest match (most likely the pasted URL)
  let best = matches[0]!;
  for (const m of matches) if (m.length > best.length) best = m;
  return best;
}

// ── Composer ──
function Composer({ onPost, userAvatar, username, onStoryCreate }: {
  onPost: (text: string, mediaUrl?: string, feeling?: string, mediaType?: string, linkPreview?: LinkPreviewData) => void;
  userAvatar?: string;
  username?: string;
  onStoryCreate?: () => void;
}) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Link preview state
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertMention = (before: string, mention: string, after: string) => {
    setText(before + mention + after);
    textareaRef.current?.focus();
    // Set cursor after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + mention.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleTextChange = (value: string) => {
    setText(value);

    // URL detection with debounce (500ms)
    const url = extractFirstUrl(value);
    if (url !== prevUrlRef.current) {
      prevUrlRef.current = url;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!url) {
        setLinkPreview(null);
        setLinkPreviewLoading(false);
        return;
      }

      setLinkPreviewLoading(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const token = localStorage.getItem('accessToken');
          const res = await fetch('/v1/link-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ url }),
          });
          if (res.ok) {
            const data = await res.json();
            setLinkPreview(data);
          }
        } catch {
          // Silent — link preview is non-critical
        }
        setLinkPreviewLoading(false);
      }, 500);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(file.type)) {
      setUploadError(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.`);
      return;
    }

    // Size validation
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? maxVideoSize : maxImageSize;

    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      setUploadError(`File too large. Maximum: ${maxMB}MB.`);
      return;
    }

    setUploadError(null);
    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedMedia) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    if (selectedMedia) {
      mediaType = selectedMedia.type.startsWith('video/') ? 'video' : 'image';
      try {
        setUploadProgress(10);
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(10 + Math.round((e.loaded / e.total) * 30));
            }
          };
          reader.readAsDataURL(selectedMedia);
        });
        const token = localStorage.getItem('accessToken');
        setUploadProgress(40);
        const uploadRes = await fetch('/v1/media/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fileName: selectedMedia.name,
            contentType: selectedMedia.type,
            fileSize: selectedMedia.size,
            visibility: 'public',
          }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const { mediaAssetId, uploadUrl } = uploadData;
          setUploadProgress(60);
          if (uploadUrl) {
            try {
              await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': selectedMedia.type },
                body: selectedMedia,
              });
              setUploadProgress(80);
              await fetch('/v1/media/confirm-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mediaAssetId }),
              });
            } catch {
              setUploadProgress(70);
              await fetch('/v1/media/upload-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mediaAssetId, base64Content: base64 }),
              });
            }
          }
          setUploadProgress(90);
          const dlRes = await fetch(`/v1/media/${mediaAssetId}/download-url`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dlRes.ok) {
            const { url } = await dlRes.json();
            mediaUrl = url;
          }
          setUploadProgress(100);
        } else {
          throw new Error('Upload URL request failed');
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadError('Upload failed. Retry or post without media.');
        setUploading(false);
        return;
      }
      if (!mediaUrl) {
        mediaUrl = mediaPreview ?? undefined;
      }
    }
    onPost(text.trim(), mediaUrl, selectedFeeling ?? undefined, mediaType, linkPreview ?? undefined);
    setText('');
    setSelectedMedia(null);
    setMediaPreview(null);
    setSelectedFeeling(null);
    setLinkPreview(null);
    setLinkPreviewLoading(false);
    prevUrlRef.current = null;
    setExpanded(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
  };

  return (
    <div className={`glass rounded-2xl p-4 mb-4 transition-all duration-300 ${expanded ? 'shadow-lg shadow-brand-glow/10' : ''}`}>
      <div className="flex items-center gap-3">
        {userAvatar ? (
          <img src={userAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-bg-elevated shrink-0" />
        )}
        <button
          onClick={() => setExpanded(true)}
          className={`flex-1 text-left glass rounded-full px-4 py-2.5 text-sm text-text-muted hover:bg-white/8 transition-colors ${expanded ? 'hidden' : ''}`}
        >
          {t('feed.whatsOnYourMind', { name: username || '' })}
        </button>
        {expanded && (
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={t('feed.whatsOnYourMind', { name: username || '' })}
              rows={3}
              autoFocus
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none"
            />
            <MentionAutocomplete
              textareaRef={textareaRef}
              text={text}
              onInsertMention={handleInsertMention}
            />
          </div>
        )}
      </div>

      {/* Media Preview */}
      {mediaPreview && (
        <div className="mt-3 relative rounded-xl overflow-hidden">
          <img src={mediaPreview} alt="Preview" className="w-full max-h-[200px] object-cover rounded-xl" />
          <button
            onClick={() => { setSelectedMedia(null); setMediaPreview(null); setUploadError(null); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploading && uploadProgress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-muted">Uploading...</span>
            <span className="text-[10px] text-text-muted">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-primary rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/20">
          <p className="text-xs text-danger">{uploadError}</p>
          <button
            onClick={() => { setSelectedMedia(null); setMediaPreview(null); setUploadError(null); }}
            className="text-[10px] text-text-secondary mt-1 hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Link Preview */}
      {linkPreviewLoading && !linkPreview && (
        <div className="mt-3">
          <LinkPreviewSkeleton compact />
        </div>
      )}
      {linkPreview && (
        <div className="mt-3">
          <LinkPreviewCard
            preview={linkPreview}
            compact
            onRemove={() => { setLinkPreview(null); prevUrlRef.current = null; }}
          />
        </div>
      )}

      {/* Feeling badge */}
      {selectedFeeling && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs">
          <span className="text-base">{selectedFeeling.split(' ')[0]}</span>
          <span className="text-text-secondary">{selectedFeeling.split(' ').slice(1).join(' ')}</span>
          <button onClick={() => setSelectedFeeling(null)} className="ml-1 text-text-muted hover:text-text-primary">
            <X size={12} />
          </button>
        </div>
      )}

      {expanded && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFilePick}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 rounded-full glass hover:bg-white/8 text-text-muted hover:text-brand-primary transition-all"
              title={t('feed.addPhoto')}
            >
              <Camera size={18} />
            </button>
            <button
              onClick={() => { setShowFeelingPicker(false); }}
              className="p-2 rounded-full glass hover:bg-white/8 text-text-muted hover:text-brand-primary transition-all"
              title={t('feed.mentionCharacter')}
            >
              <AtSign size={18} />
            </button>
            <button
              onClick={() => setShowFeelingPicker(true)}
              className="p-2 rounded-full glass hover:bg-white/8 text-text-muted hover:text-text-primary transition-all"
              title={t('feed.addFeeling')}
            >
              <Smile size={18} />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && !selectedMedia) || uploading}
            className="rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40"
          >
            {uploading ? t('feed.posting') : t('feed.post')}
          </button>
        </div>
      )}

      {/* Feeling Picker Portal */}
      <FeelingPicker
        show={showFeelingPicker}
        onClose={() => setShowFeelingPicker(false)}
        onSelect={(feeling) => setSelectedFeeling(feeling)}
      />
    </div>
  );
}

// ── Story Creator Modal ──
function StoryCreatorModal({ onClose, onPublish }: { onClose: () => void; onPublish: (caption: string, mediaUrl?: string) => void }) {
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [textOverlay, setTextOverlay] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!caption.trim() && !mediaFile) return;
    setPublishing(true);
    let mediaUrl: string | undefined;
    if (mediaFile) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.readAsDataURL(mediaFile);
        });
        const token = localStorage.getItem('accessToken');
        const uploadRes = await fetch('/v1/media/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fileName: mediaFile.name,
            contentType: mediaFile.type,
            fileSize: mediaFile.size,
            visibility: 'public',
          }),
        });
        if (uploadRes.ok) {
          const { mediaAssetId } = await uploadRes.json();
          await fetch('/v1/media/upload-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ mediaAssetId, base64Content: base64 }),
          });
          const dlRes = await fetch(`/v1/media/${mediaAssetId}/download-url`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dlRes.ok) {
            const { url } = await dlRes.json();
            mediaUrl = url;
          }
        }
      } catch { mediaUrl = mediaPreview ?? undefined; }
    }
    const finalCaption = textOverlay ? `${caption.trim() || 'My story'} — ${textOverlay}` : (caption.trim() || 'My story 📸');
    onPublish(finalCaption, mediaUrl);
    setPublishing(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal,1200)] bg-black/70 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5">
            <X size={20} className="text-text-secondary" />
          </button>
          <h2 className="text-lg font-semibold text-text-primary">{t('feed.createStory')}</h2>
          <button
            onClick={handlePublish}
            disabled={(!caption.trim() && !mediaFile) || publishing}
            className="text-sm font-semibold text-brand-primary disabled:opacity-40"
          >
            {publishing ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {mediaPreview ? (
          <div className="relative rounded-2xl overflow-hidden mb-3">
            <img src={mediaPreview} alt="" className="w-full aspect-[9/16] object-cover" />
            <button
              onClick={() => { setMediaFile(null); setMediaPreview(null); }}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white"
            >
              <X size={14} />
            </button>
            {/* Text overlay on image */}
            <input
              value={textOverlay}
              onChange={e => setTextOverlay(e.target.value)}
              placeholder="Add text overlay..."
              className="absolute top-1/2 left-4 right-4 -translate-y-1/2 bg-black/40 text-white text-center text-sm py-2 px-4 rounded-lg outline-none placeholder:text-white/60"
            />
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-sm p-3 outline-none placeholder:text-white/60"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[9/16] max-h-[300px] rounded-2xl glass border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-2 hover:border-brand-primary/50 transition-colors"
            >
              <Camera size={32} className="text-text-muted" />
              <span className="text-sm text-text-muted">Tap to add a photo</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              rows={2}
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none"
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Main FeedPage ──
export default function FeedPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const { feedPosts, loading, error } = useSelector((s: RootState) => s.posts);
  const { stories } = useSelector((s: RootState) => s.stories);
  const profile = useSelector((s: RootState) => s.profile.profile);

  const [refreshing, setRefreshing] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count for the bell badge
  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const res = await fetch('/v1/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setUnreadCount(data?.count ?? 0);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (user) {
      dispatch(fetchFeed());
      dispatch(fetchStoriesThunk());
    }
  }, [dispatch, user]);

  // Check if wizard should be shown (first login after registration)
  useEffect(() => {
    const wizardCompleted = localStorage.getItem('wizardCompleted');
    if (user?.firstLogin && !wizardCompleted) {
      setShowWizard(true);
    }
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchFeed()),
      dispatch(fetchStoriesThunk()),
    ]);
    setRefreshing(false);
  }

  const handleCreatePost = (text: string, mediaUrl?: string, feeling?: string, mediaType?: string, linkPreview?: LinkPreviewData) => {
    const content = feeling ? `${feeling} — ${text}` : text;
    const payload: any = { content, mediaUrl, mediaType };
    if (linkPreview) {
      payload.linkPreview = linkPreview;
    }
    dispatch(createNewPost(payload));
  };

  const handleCreateStory = async (caption: string, mediaUrl?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/v1/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storyType: 'selfie',
          caption,
          mediaUrl,
        }),
      });
      // Refresh stories after creating
      dispatch(fetchStoriesThunk());
    } catch (err) {
      console.error('Failed to create story:', err);
    }
  };

  // ── Profile Wizard on first login ──
  if (showWizard) {
    return (
      <ProfileWizard
        onComplete={() => {
          localStorage.setItem('wizardCompleted', 'true');
          setShowWizard(false);
          // Reload user to get updated state
          dispatch({ type: 'auth/me/pending' } as any);
        }}
      />
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
          <Home size={34} className="text-brand-secondary" />
        </div>
        <p className="text-text-secondary text-sm font-medium">{t('feed.welcome')}</p>
        <p className="text-text-muted text-xs text-center max-w-xs">{t('feed.signInPrompt')}</p>
        <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">{t('feed.signIn')}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">{t('feed.title')}</h1>
          <button
            onClick={() => nav('/notifications')}
            className="relative w-9 h-9 rounded-full bg-bg-glass-strong backdrop-blur-xl border border-border-subtle flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} className="text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger flex items-center justify-center px-1">
                <span className="text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {refreshing && (
          <div className="flex justify-center py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        )}

        {/* Stories Bar */}
        <StoriesBar stories={stories} userAvatar={profile?.avatarUrl} onYourStoryClick={() => setShowStoryCreator(true)} />

        {/* Composer */}
        <div className="px-4">
          <Composer onPost={handleCreatePost} userAvatar={profile?.avatarUrl} username={profile?.username ?? user?.username} onStoryCreate={() => setShowStoryCreator(true)} />
        </div>

        {/* Posts Feed */}
        <div className="px-4 pb-24 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-solid rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton rounded-full" style={{ width: 40, height: 40 }} />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonLine width={96} height={14} />
                    <SkeletonLine width={64} height={10} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SkeletonLine width="75%" height={14} />
                  <SkeletonLine width="50%" height={14} />
                </div>
                <div className="skeleton rounded-xl" style={{ height: 180 }} />
              </div>
            ))
          ) : error ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Home size={28} />
              </div>
              <p className="empty-state-title">{t('feed.loadFailed')}</p>
              <p className="empty-state-desc">{error}</p>
              <button onClick={handleRefresh} className="mt-4 rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium touch-target">
                {t('feed.retry')}
              </button>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Home size={28} />
              </div>
              <p className="empty-state-title">{t('feed.noPosts')}</p>
              <p className="empty-state-desc">{t('feed.feedWillFill')}</p>
            </div>
          ) : (
            feedPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
