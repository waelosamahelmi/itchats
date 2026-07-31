import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Send,
  Globe, Lock, Sparkles, X,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { useAppDispatch } from '@/app/store';
import type { Post, Comment } from '@/app/store';
import {
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
import PostMenu from './PostMenu';
import ShareBottomSheet from './ShareBottomSheet';
import MentionText from './MentionText';
import LinkPreviewCard from './LinkPreviewCard';

/** Trigger haptic feedback if available */
function haptic(ms: number = 10) {
  try { navigator?.vibrate?.(ms); } catch {}
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

interface PostCardProps {
  post: Post;
  /** Optional: character context for profile pages */
  characterName?: string;
  characterAvatar?: string;
}

export default function PostCard({ post, characterName, characterAvatar }: PostCardProps) {
  const dispatch = useAppDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const myCharacters = useSelector((s: RootState) => s.characters.myCharacters);
  const profile = useSelector((s: RootState) => s.profile.profile);
  const userAvatar = profile?.avatarUrl || user?.avatarUrl || '';
  const [comments, setComments] = useState<Comment[]>(post.comments ?? []);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [editContent, setEditContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const nav = useNavigate();
  const myCharacterIds = myCharacters?.map((c: any) => c.id) ?? [];

  // Use Redux-sourced reaction state
  const liked = post.viewerReaction != null;
  const likeCount = Number.isFinite(Number(post.likeCount ?? post.likes)) ? (post.likeCount ?? post.likes ?? 0) : 0;

  const [commentsLoading, setCommentsLoading] = useState(false);

  // Translation state
  const { language: userLang, autoTranslate, translatedPosts, translating } = useSelector((s: RootState) => s.translation);
  const isTranslating = translating[post.id] ?? false;
  const translatedData = translatedPosts[post.id];
  const [showTranslation, setShowTranslation] = useState(false);

  const displayName = characterName || post.authorName;
  const displayAvatar = characterAvatar || post.authorAvatar;
  const avatarSrc = avatarFailed || !displayAvatar
    ? `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(displayName)}`
    : displayAvatar;

  const isLongContent = post.content.length > 200;
  const displayContent = expandedContent ? post.content : post.content.slice(0, 200);

  const handleLike = () => {
    haptic(5);
    if (liked) {
      dispatch(unreactToPostThunk(post.id));
    } else {
      dispatch(reactToPostThunk({ postId: post.id, emoji: '\u2764\uFE0F' }));
    }
  };

  const handleReaction = (emoji: string) => {
    haptic(5);
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
    const parentCommentId = replyTo?.id;
    dispatch(addCommentThunk({ postId: post.id, content: commentText.trim(), parentCommentId }));
    // Optimistic
    const newComment: Comment = {
      id: genId(), authorName: 'You', authorAvatar: '',
      authorIsAI: false, content: commentText.trim(), createdAt: new Date().toISOString(), likes: 0, liked: false, replies: [],
      parentCommentId: parentCommentId ?? null,
    };
    if (parentCommentId) {
      setComments(cs => cs.map(c => c.id === parentCommentId ? { ...c, replies: [...(c.replies || []), newComment] } : c));
    } else {
      setComments(c => [...c, newComment]);
    }
    setCommentText('');
    setReplyTo(null);
  };

  const handleStartReply = (commentId: string, name: string) => {
    setReplyTo({ id: commentId, name });
    document.getElementById(`comment-input-pc-${post.id}`)?.focus();
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

  useEffect(() => {
    if (autoTranslate && !translatedData && !isTranslating && post.content) {
      handleTranslate();
    }
  }, [autoTranslate, post.id]);

  const visibleComments = showAllComments ? comments : comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up relative">
      {/* Post Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative shrink-0">
          <img src={avatarSrc} alt={displayName} className="w-10 h-10 rounded-full object-cover" onError={() => setAvatarFailed(true)} />
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
                {displayName}
              </button>
            ) : (post as any).authorUserId ? (
              <button
                onClick={() => nav(`/profile/${(post as any).authorUserId}`)}
                className="text-sm font-semibold text-text-primary truncate hover:text-brand-primary hover:underline transition-colors"
              >
                {displayName}
              </button>
            ) : (
              <span className="text-sm font-semibold text-text-primary truncate">{displayName}</span>
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
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line overflow-guard">
              <MentionText text={showTranslation && translatedData ? translatedData.translatedText : displayContent} />
              {isLongContent && !expandedContent && !showTranslation && '...'}
            </p>
            {isLongContent && !showTranslation && (
              <button onClick={() => setExpandedContent(!expandedContent)} className="text-xs text-brand-primary mt-1 hover:underline">
                {expandedContent ? t('feed.showLess') : t('feed.seeMore')}
              </button>
            )}
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

      {/* Link Preview (only when no media) */}
      {!post.mediaUrl && post.linkPreview?.url && (
        <div className="mx-4 mb-3">
          <LinkPreviewCard preview={post.linkPreview} />
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
          onClick={() => document.getElementById(`comment-input-pc-${post.id}`)?.focus()}
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
                      <p className="text-xs text-text-secondary overflow-guard"><MentionText text={c.content} /></p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <span className="text-[10px] text-text-muted">{timeAgo(c.createdAt)}</span>
                      <button onClick={() => handleLikeComment(c.id, !!c.liked)} className={`text-[10px] font-medium ${c.liked ? 'text-brand-primary' : 'text-text-muted'}`}>
                        {c.likes > 0 ? `Like · ${c.likes}` : 'Like'}
                      </button>
                      <button
                        onClick={() => handleStartReply(c.id, c.authorName)}
                        className="text-[10px] text-text-muted font-medium hover:text-brand-primary transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                  {c.likes > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0 self-start mt-7">
                      <span className="text-[10px]">\u2764\uFE0F</span>
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
                      <div className={`rounded-2xl px-3 py-1.5 inline-block max-w-full ${r.authorIsAI ? 'bg-brand-glow/10' : 'bg-bg-elevated'}`}>
                        <span className="text-xs font-semibold text-text-primary">{r.authorName || 'Unknown'}</span>
                        {r.authorIsAI && <Badge variant="ai" className="text-[9px] px-1 ml-1">AI</Badge>}
                        <p className="text-xs text-text-secondary mt-0.5 overflow-guard"><MentionText text={r.content} /></p>
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

      {/* Replying-to chip */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2 border-t border-border-subtle">
          <span className="text-[11px] text-text-muted">
            Replying to <span className="text-brand-primary font-medium">{replyTo.name}</span>
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="p-0.5 rounded-full text-text-muted hover:text-text-primary transition-colors"
            aria-label="Cancel reply"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Comment Composer */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${replyTo ? '' : 'border-t border-border-subtle'}`}>
        <img
          src={userAvatar || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(user?.username || 'you')}`}
          alt="You"
          className="w-7 h-7 rounded-full object-cover shrink-0"
        />
        <div className="flex-1 flex items-center gap-2 glass rounded-full px-3 py-2">
          <input
            id={`comment-input-pc-${post.id}`}
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
