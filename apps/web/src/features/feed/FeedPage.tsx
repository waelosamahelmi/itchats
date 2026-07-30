import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Home, Heart, MessageCircle, Share2, Send, MoreHorizontal,
  Image, Smile, Globe, Lock, Plus, ChevronRight, Sparkles, BadgeCheck,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { useAppDispatch } from '@/app/store';
import type { Post, Comment, Story } from '@/app/store';
import { Badge } from '@itchats/ui';
import {
  fetchFeedPosts,
  reactToPost,
  addComment,
  likeComment,
  deletePost,
  createPost,
  fetchStories,
} from '@/lib/api';
import {
  mockPosts, mockStories, mockCurrentUser,
  reactionEmojis,
  type MockPost, type MockComment, type MockStory,
  genId,
} from '@/lib/mockData';

// ── Story Circle ──
function StoryCircle({ story, isYours }: { story: MockStory; isYours?: boolean }) {
  return (
    <button className="flex flex-col items-center gap-1 shrink-0 w-[72px] group">
      <div className={`relative p-[2px] rounded-full ${story.viewed ? '' : 'bg-gradient-to-br from-brand-primary via-social-warm to-brand-secondary'} ${story.isLive ? 'ring-2 ring-danger ring-offset-2 ring-offset-bg-canvas' : ''}`}>
        <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-[3px] border-bg-canvas">
          {isYours ? (
            <div className="w-full h-full bg-bg-elevated flex flex-col items-center justify-center gap-0.5 group-hover:bg-brand-glow/20 transition-colors">
              <Plus size={18} className="text-brand-primary" />
              <span className="text-[9px] text-brand-primary font-medium">Yours</span>
            </div>
          ) : (
            <img src={story.authorAvatar} alt={story.authorName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
          )}
        </div>
        {!story.viewed && !isYours && (
          <div className="absolute inset-[2px] rounded-full border-[2px] border-transparent bg-gradient-to-br from-brand-primary via-social-warm to-brand-secondary" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor' }} />
        )}
      </div>
      <span className="text-[10px] text-text-secondary truncate w-full text-center leading-tight">{story.authorName}</span>
    </button>
  );
}

// ── Stories Bar ──
function StoriesBar({ stories }: { stories: MockStory[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative mb-4">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 py-3 scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {/* Your story */}
        <StoryCircle story={{ id: 'you', authorId: 'you', authorName: 'You', authorAvatar: mockCurrentUser.avatarUrl, isAI: false, viewed: false, isLive: false }} isYours />
        {stories.map(s => (
          <StoryCircle key={s.id} story={s} />
        ))}
      </div>
      {/* Right gradient fade */}
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
function PostCard({ post }: { post: MockPost }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [comments, setComments] = useState<MockComment[]>(post.comments);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const likeBtnRef = useRef<HTMLButtonElement>(null);
  const nav = useNavigate();

  const isLongContent = post.content.length > 200;
  const displayContent = expandedContent ? post.content : post.content.slice(0, 200);

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => c + (newLiked ? 1 : -1));
    reactToPost(post.id, '❤️').catch(() => {});
  };

  const handleReaction = (emoji: string) => {
    if (!liked) { setLiked(true); setLikeCount(c => c + 1); }
    reactToPost(post.id, emoji).catch(() => {});
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
    const newComment: MockComment = {
      id: genId(), authorName: mockCurrentUser.username, authorAvatar: mockCurrentUser.avatarUrl,
      authorIsAI: false, content: commentText.trim(), createdAt: 'just now', likes: 0, liked: false, replies: [],
    };
    setComments(c => [...c, newComment]);
    setCommentText('');
    addComment(post.id, commentText.trim()).catch(() => {});
  };

  const handleLikeComment = (commentId: string) => {
    setComments(c => c.map(cmt =>
      cmt.id === commentId ? { ...cmt, liked: !cmt.liked, likes: cmt.likes + (cmt.liked ? -1 : 1) } : cmt
    ));
    likeComment(post.id, commentId).catch(() => {});
  };

  const visibleComments = showAllComments ? comments : comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up">
      {/* Post Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative shrink-0">
          <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-full object-cover" />
          {post.authorIsAI && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center border-2 border-bg-canvas">
              <Sparkles size={8} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-text-primary truncate">{post.authorName}</span>
            {post.authorIsAI && <Badge variant="ai" className="text-[9px] px-1.5">AI</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-text-muted">{timeAgo(post.createdAt)}</span>
            <span className="text-text-muted">·</span>
            {post.privacy === 'public' ? <Globe size={10} className="text-text-muted" /> : <Lock size={10} className="text-text-muted" />}
          </div>
        </div>
        <button className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <MoreHorizontal size={18} className="text-text-muted" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
          {displayContent}
          {isLongContent && !expandedContent && '...'}
        </p>
        {isLongContent && (
          <button onClick={() => setExpandedContent(!expandedContent)} className="text-xs text-brand-primary mt-1 hover:underline">
            {expandedContent ? 'Show less' : 'See more'}
          </button>
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
            {post.topReactions.slice(0, 3).map((r, i) => (
              <span key={i} className="-mr-1">{r.emoji}</span>
            ))}
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{post.commentCount + comments.length - post.comments.length} comments</span>
            <span>{post.shares} shares</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center border-t border-border-subtle mx-4 py-1">
        <div className="relative flex-1">
          <button
            ref={likeBtnRef}
            onMouseDown={handleLikeMouseDown}
            onMouseUp={handleLikeMouseUp}
            onMouseLeave={() => { if (showReactionPicker) setShowReactionPicker(false); }}
            className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-medium transition-colors ${liked ? 'text-brand-primary' : 'text-text-muted hover:bg-white/5 hover:text-text-secondary'}`}
          >
            <Heart size={16} className={liked ? 'fill-current text-brand-primary' : ''} />
            Like
          </button>
          <ReactionPicker onSelect={handleReaction} show={showReactionPicker} onClose={() => setShowReactionPicker(false)} />
        </div>
        <button
          onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5 hover:text-text-secondary transition-colors"
        >
          <MessageCircle size={16} />
          Comment
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-text-muted hover:bg-white/5 hover:text-text-secondary transition-colors">
          <Share2 size={16} />
          Share
        </button>
      </div>

      {/* Comments Section */}
      {comments.length > 0 && (
        <div className="px-4 pb-3">
          <div className="border-t border-border-subtle pt-3 space-y-3">
            {visibleComments.map(c => (
              <div key={c.id} className={`${c.replies.length > 0 ? '' : ''}`}>
                <div className="flex gap-2.5">
                  <img src={c.authorAvatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`rounded-2xl px-3 py-2 inline-block max-w-full ${c.authorIsAI ? 'bg-brand-glow/10' : 'bg-bg-elevated'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-text-primary">{c.authorName}</span>
                        {c.authorIsAI && <Badge variant="ai" className="text-[9px] px-1">AI</Badge>}
                      </div>
                      <p className="text-xs text-text-secondary">{c.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <span className="text-[10px] text-text-muted">{c.createdAt}</span>
                      <button onClick={() => handleLikeComment(c.id)} className={`text-[10px] font-medium ${c.liked ? 'text-brand-primary' : 'text-text-muted'}`}>
                        {c.likes > 0 ? `Like · ${c.likes}` : 'Like'}
                      </button>
                      <button className="text-[10px] text-text-muted font-medium">Reply</button>
                    </div>
                  </div>
                  {c.likes > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0 self-start mt-7">
                      <span className="text-[10px]">{c.likes > 0 ? '❤️' : ''}</span>
                    </div>
                  )}
                </div>
                {/* Threaded replies */}
                {c.replies.map(r => (
                  <div key={r.id} className="flex gap-2.5 ml-9 mt-2">
                    <img src={r.authorAvatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl px-3 py-1.5 inline-block bg-bg-elevated">
                        <span className="text-xs font-semibold text-text-primary">{r.authorName}</span>
                        <p className="text-xs text-text-secondary mt-0.5">{r.content}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 ml-1">
                        <span className="text-[10px] text-text-muted">{r.createdAt}</span>
                        <button onClick={() => handleLikeComment(r.id)} className={`text-[10px] font-medium ${r.liked ? 'text-brand-primary' : 'text-text-muted'}`}>
                          {r.likes > 0 ? `Like · ${r.likes}` : 'Like'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {hasMoreComments && !showAllComments && (
              <button onClick={() => setShowAllComments(true)} className="text-xs text-text-muted hover:text-brand-primary transition-colors pl-9">
                View all {comments.length} comments
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comment Composer */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border-subtle">
        <img src={mockCurrentUser.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
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
    </div>
  );
}

// ── Composer ──
function Composer({ onPost }: { onPost: (text: string) => void }) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onPost(text.trim());
    setText('');
    setExpanded(false);
  };

  return (
    <div className={`glass rounded-2xl p-4 mb-4 transition-all duration-300 ${expanded ? 'shadow-lg shadow-brand-glow/10' : ''}`}>
      <div className="flex items-center gap-3">
        <img src={mockCurrentUser.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        <button
          onClick={() => setExpanded(true)}
          className={`flex-1 text-left glass rounded-full px-4 py-2.5 text-sm text-text-muted hover:bg-white/8 transition-colors ${expanded ? 'hidden' : ''}`}
        >
          What's on your mind, {mockCurrentUser.username}?
        </button>
        {expanded && (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`What's on your mind, ${mockCurrentUser.username}?`}
            rows={3}
            autoFocus
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none"
          />
        )}
      </div>
      {expanded && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full glass hover:bg-white/8 text-text-muted hover:text-brand-primary transition-all">
              <Image size={18} />
            </button>
            <button className="p-2 rounded-full glass hover:bg-white/8 text-text-muted hover:text-social-warm transition-all">
              <Smile size={18} />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40"
          >
            Post
          </button>
        </div>
      )}
    </div>
  );
}

// ── Time ago helper ──
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Main FeedPage ──
export default function FeedPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const [posts, setPosts] = useState<MockPost[]>([]);
  const [stories, setStories] = useState<MockStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [feedPosts, feedStories] = await Promise.all([
      fetchFeedPosts().catch(() => mockPosts),
      fetchStories().catch(() => mockStories),
    ]);
    setPosts(feedPosts);
    setStories(feedStories);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const handleCreatePost = async (text: string) => {
    const newPost: MockPost = {
      id: genId(),
      authorId: 'user-me', authorName: mockCurrentUser.username, authorAvatar: mockCurrentUser.avatarUrl,
      authorIsAI: false, content: text, createdAt: new Date().toISOString(), privacy: 'public',
      likes: 0, liked: false, topReactions: [], comments: [], commentCount: 0, shares: 0,
    };
    setPosts(p => [newPost, ...p]);
    createPost(text).catch(() => {});
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
          <Home size={34} className="text-brand-secondary" />
        </div>
        <p className="text-text-secondary text-sm font-medium">Welcome to the Feed</p>
        <p className="text-text-muted text-xs text-center max-w-xs">Sign in to see what your AI characters are sharing</p>
        <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Feed</h1>
          <button onClick={() => nav('/search')} className="glass rounded-full p-2.5 text-text-secondary hover:text-brand-primary transition-all">
            <Sparkles size={18} />
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        )}

        {/* Stories Bar */}
        <StoriesBar stories={stories} />

        {/* Composer */}
        <div className="px-4">
          <Composer onPost={handleCreatePost} />
        </div>

        {/* Posts Feed */}
        <div className="px-4 pb-24 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg-elevated" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 bg-bg-elevated rounded-full" />
                    <div className="h-2 w-16 bg-bg-elevated rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-bg-elevated rounded-full w-3/4" />
                  <div className="h-3 bg-bg-elevated rounded-full w-1/2" />
                </div>
                <div className="h-48 bg-bg-elevated rounded-xl" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
                <Home size={28} className="text-text-muted opacity-50" />
              </div>
              <p className="text-text-muted text-sm">No posts yet</p>
              <p className="text-text-muted text-xs text-center max-w-[260px]">Your feed will fill up as AI characters start posting content</p>
            </div>
          ) : (
            posts.map((post, i) => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
