import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch, RootStateOrAny } from 'react-redux';
import {
  fetchFeed,
  reactToPost,
  unreactToPost,
  addComment,
  fetchComments,
  reactToComment,
  unreactToComment,
  Post,
  Comment,
  PostReaction,
} from 'features/Social/SocialStore';
import Header from 'components/Header/Header';
import './Feed.scss';

const safeNum = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

const REACTION_EMOJI: Record<string, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
  care: '🤗',
};

const Feed: React.FC = () => {
  const dispatch = useDispatch();
  const { feed, feedLoading, feedHasMore, feedPage } = useSelector(
    ({ social }: RootStateOrAny) => social,
  );
  const userSession = useSelector(({ user }: RootStateOrAny) => user?.session);

  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; authorName: string } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});

  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchFeed({ page: 1 }));
  }, [dispatch]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (feedLoading || !feedHasMore) return;
      const el = feedContainerRef.current;
      if (!el) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
        dispatch(fetchFeed({ page: feedPage + 1 }));
      }
    };

    const el = feedContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [feedLoading, feedHasMore, feedPage, dispatch]);

  const handleReaction = (post: Post, type: string) => {
    setShowReactionPicker(null);
    if (post.viewerReaction === type) {
      // Remove reaction
      dispatch(unreactToPost(post.id));
    } else {
      dispatch(reactToPost({ postId: post.id, reactionType: type }));
    }
  };

  const handleLoadComments = (postId: string) => {
    if (activeCommentPost === postId) {
      setActiveCommentPost(null);
      return;
    }
    setActiveCommentPost(postId);
    if (!comments[postId]) {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      dispatch(fetchComments({ postId })).then((action: any) => {
        if (action.payload?.comments) {
          setComments((prev) => ({ ...prev, [postId]: action.payload.comments }));
        }
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      });
    }
  };

  const handleAddComment = (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    const payload: { postId: string; content: string; parentCommentId?: string } = { postId, content: text };
    if (replyTarget) {
      payload.parentCommentId = replyTarget.commentId;
    }

    dispatch(addComment(payload)).then((action: any) => {
      if (action.payload?.comment) {
        const newComment = action.payload.comment;
        setComments((prev) => {
          const existing = prev[postId] || [];
          if (newComment.parentCommentId) {
            // Add as reply to the parent comment
            return {
              ...prev,
              [postId]: existing.map((c) =>
                c.id === newComment.parentCommentId
                  ? { ...c, replies: [...(c.replies || []), newComment] }
                  : c,
              ),
            };
          }
          return { ...prev, [postId]: [...existing, newComment] };
        });
      }
    });

    setCommentText((prev) => ({ ...prev, [postId]: '' }));
    setReplyTarget(null);
  };

  const handleCommentReaction = (commentId: string, currentReaction: string | null, type: string) => {
    if (currentReaction === type) {
      dispatch(unreactToComment(commentId));
    } else {
      dispatch(reactToComment({ commentId, reactionType: type }));
    }
  };

  const startReply = (comment: Comment) => {
    setReplyTarget({
      commentId: comment.id,
      authorName: comment.authorName || 'User',
    });
    // Set the comment text input focus
    if (comment.postId) {
      setActiveCommentPost(comment.postId);
    }
  };

  const cancelReply = () => {
    setReplyTarget(null);
  };

  const userAvatarUrl = userSession?.avatar || '';
  const userInitial = (userSession?.username || userSession?.fullName || 'Y').charAt(0).toUpperCase();

  const getAvatarColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const renderCommentTree = (postComments: Comment[], postId: string) => {
    return postComments.map((comment) => (
      <div key={comment.id} className="feed-comment">
        <div className="feed-comment__avatar">
          {comment.authorAvatar ? (
            <img src={comment.authorAvatar} alt="" style={{ maxWidth: '100%' }} />
          ) : (
            <div
              className="feed-comment__initial"
              style={{ backgroundColor: getAvatarColor(comment.authorName || '') }}
            >
              {(comment.authorName || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="feed-comment__body" style={{ minWidth: 0 }}>
          <div className="feed-comment__header">
            <span className="feed-comment__author">{comment.authorName}</span>
            <span className="feed-comment__time">{formatTime(comment.createdAt)}</span>
            {comment.isAiGenerated && <span className="feed-comment__ai-badge">AI</span>}
          </div>
          <p className="feed-comment__content" style={{ overflowWrap: 'anywhere' }}>
            {comment.content}
          </p>
          <div className="feed-comment__actions">
            <button
              className="feed-comment__react-btn"
              onClick={() => handleCommentReaction(comment.id, comment.viewerReaction || null, comment.viewerReaction ? comment.viewerReaction : 'like')}
            >
              {comment.viewerReaction ? REACTION_EMOJI[comment.viewerReaction] || '👍' : '👍'}{' '}
              {safeNum(comment.likeCount)}
            </button>
            <button className="feed-comment__reply-btn" onClick={() => startReply(comment)}>
              Reply
            </button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <div className="feed-comment__replies">
              {renderCommentTree(comment.replies, postId)}
            </div>
          )}
        </div>
      </div>
    ));
  };

  return (
    <main className="feed-page" ref={feedContainerRef}>
      <Header insideDrawer />

      {/* Post Composer */}
      <div className="feed-composer">
        <div className="feed-composer__avatar">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="You" style={{ maxWidth: '100%' }} />
          ) : (
            <div
              className="feed-composer__initial"
              style={{ backgroundColor: getAvatarColor(userSession?.username || 'User') }}
            >
              {userInitial}
            </div>
          )}
        </div>
        <div className="feed-composer__placeholder">What's on your mind?</div>
      </div>

      {/* Feed */}
      <div className="feed-list" style={{ minWidth: 0, maxWidth: '100%' }}>
        {feed.length === 0 && !feedLoading && (
          <div className="feed-empty">
            <p>No posts yet. Follow some characters to see their posts!</p>
          </div>
        )}

        {feed.map((post) => (
          <article key={post.id} className="feed-post">
            <div className="feed-post__header">
              <div className="feed-post__avatar">
                {post.authorAvatar ? (
                  <img src={post.authorAvatar} alt="" style={{ maxWidth: '100%' }} />
                ) : (
                  <div
                    className="feed-post__initial"
                    style={{ backgroundColor: getAvatarColor(post.authorName || '') }}
                  >
                    {(post.authorName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="feed-post__author-info" style={{ minWidth: 0 }}>
                <div className="feed-post__author-name">
                  {post.authorName}
                  {post.authorIsAI && <span className="feed-post__ai-badge">AI</span>}
                </div>
                <div className="feed-post__time">{formatTime(post.createdAt)}</div>
              </div>
            </div>

            <div className="feed-post__content" style={{ overflowWrap: 'anywhere', minWidth: 0, maxWidth: '100%' }}>
              <p>{post.content}</p>
              {post.mediaUrl && (
                <img
                  src={post.mediaUrl}
                  alt=""
                  className="feed-post__media"
                  style={{ maxWidth: '100%' }}
                />
              )}
            </div>

            <div className="feed-post__stats">
              {safeNum(post.likeCount) > 0 && (
                <span>
                  {post.reactions?.slice(0, 3).map((r) => REACTION_EMOJI[r.type] || '👍')}{' '}
                  {safeNum(post.likeCount)}
                </span>
              )}
              {safeNum(post.commentCount) > 0 && (
                <span>{safeNum(post.commentCount)} comments</span>
              )}
            </div>

            <div className="feed-post__actions">
              <div className="feed-post__reaction-wrapper">
                <button
                  className={`feed-post__action-btn ${post.viewerReaction ? 'feed-post__action-btn--active' : ''}`}
                  onClick={() => setShowReactionPicker(showReactionPicker === post.id ? null : post.id)}
                >
                  {post.viewerReaction ? REACTION_EMOJI[post.viewerReaction] : '👍'}{' '}
                  {post.viewerReaction ? post.viewerReaction : 'Like'}
                </button>
                {showReactionPicker === post.id && (
                  <div className="feed-post__reaction-picker" style={{ zIndex: 1000 }}>
                    {REACTION_TYPES.map((type) => (
                      <button
                        key={type}
                        className={`reaction-option ${post.viewerReaction === type ? 'reaction-option--active' : ''}`}
                        onClick={() => handleReaction(post, type)}
                        title={type}
                      >
                        {REACTION_EMOJI[type]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="feed-post__action-btn" onClick={() => handleLoadComments(post.id)}>
                💬 Comment
              </button>
              <button className="feed-post__action-btn">↗️ Share</button>
            </div>

            {/* Comments Section */}
            {activeCommentPost === post.id && (
              <div className="feed-post__comments">
                {commentsLoading[post.id] ? (
                  <p>Loading comments...</p>
                ) : comments[post.id]?.length ? (
                  renderCommentTree(comments[post.id], post.id)
                ) : (
                  <p className="feed-comments-empty">No comments yet.</p>
                )}

                {/* Reply indicator */}
                {replyTarget && (
                  <div className="feed-composer__reply-indicator">
                    Replying to <strong>{replyTarget.authorName}</strong>
                    <button onClick={cancelReply} className="feed-composer__cancel-reply">✕</button>
                  </div>
                )}

                {/* Comment Input */}
                <div className="feed-comment-input">
                  <div className="feed-composer__avatar feed-composer__avatar--small">
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt="You" style={{ maxWidth: '100%' }} />
                    ) : (
                      <div
                        className="feed-composer__initial"
                        style={{ backgroundColor: getAvatarColor(userSession?.username || 'User') }}
                      >
                        {userInitial}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className="feed-comment-input__field"
                    placeholder={replyTarget ? `Reply to ${replyTarget.authorName}...` : 'Write a comment...'}
                    value={commentText[post.id] || ''}
                    onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddComment(post.id);
                    }}
                  />
                  <button
                    className="feed-comment-input__send"
                    onClick={() => handleAddComment(post.id)}
                    disabled={!(commentText[post.id]?.trim())}
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}

        {feedLoading && <p className="feed-loading">Loading posts...</p>}
      </div>
    </main>
  );
};

export default Feed;
