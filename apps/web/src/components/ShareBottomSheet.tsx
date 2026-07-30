import { useState } from 'react';
import { X, Copy, Send, RefreshCw, Check, Image } from 'lucide-react';
import type { Post } from '@/app/store';
import { useAppDispatch } from '@/app/store';
import { shareToFeedThunk } from '@/app/store';
import { apiFetch } from '@/lib/api';

interface ShareBottomSheetProps {
  post: Post;
  onClose: () => void;
}

export default function ShareBottomSheet({ post, onClose }: ShareBottomSheetProps) {
  const dispatch = useAppDispatch();
  const [showRepostComposer, setShowRepostComposer] = useState(false);
  const [repostComment, setRepostComment] = useState('');
  const [sharingToFeed, setSharingToFeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showChatPicker, setShowChatPicker] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [sentToChatId, setSentToChatId] = useState<string | null>(null);

  const postUrl = `${window.location.origin}/post/${post.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareToFeed = async () => {
    if (!repostComment.trim()) return;
    setSharingToFeed(true);
    try {
      await dispatch(shareToFeedThunk({
        content: repostComment.trim(),
        repostOfPostId: post.id,
      })).unwrap();
      setShowRepostComposer(false);
      setRepostComment('');
      onClose();
    } catch (err) {
      console.error('Failed to share to feed:', err);
    }
    setSharingToFeed(false);
  };

  const handleSendInChat = async () => {
    setShowChatPicker(true);
    setLoadingChats(true);
    try {
      const data = await apiFetch<any[]>('/conversations');
      setConversations(data || []);
    } catch {
      setConversations([]);
    }
    setLoadingChats(false);
  };

  const handleSelectChat = async (convId: string) => {
    try {
      await apiFetch(`/conversations/${convId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: `📎 Shared post by ${post.authorName}:\n\n"${post.content.slice(0, 150)}${post.content.length > 150 ? '...' : ''}"\n\n🔗 ${postUrl}`,
        }),
      });
      setSentToChatId(convId);
      setTimeout(() => {
        setSentToChatId(null);
        setShowChatPicker(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Post preview image
  const previewImage = post.mediaUrl || (post.authorAvatar
    ? post.authorAvatar
    : `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(post.authorName)}`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Share Post</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {showChatPicker ? (
          /* Chat Picker */
          <div>
            <button
              onClick={() => setShowChatPicker(false)}
              className="text-xs text-brand-primary mb-3 hover:underline"
            >
              ← Back to share options
            </button>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Send in Chat</h3>
            {loadingChats ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-bg-elevated animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No conversations yet</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {conversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectChat(conv.id)}
                    disabled={sentToChatId === conv.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left ${
                      sentToChatId === conv.id ? 'bg-success/10' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-bg-elevated overflow-hidden shrink-0">
                      {conv.participantAvatar ? (
                        <img src={conv.participantAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Send size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary font-medium truncate">
                        {conv.participantName || conv.title || 'Conversation'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {conv.lastMessage?.slice(0, 30) || 'No messages yet'}
                      </p>
                    </div>
                    {sentToChatId === conv.id && (
                      <Check size={18} className="text-success shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : showRepostComposer ? (
          /* Repost composer */
          <div>
            <button
              onClick={() => setShowRepostComposer(false)}
              className="text-xs text-brand-primary mb-3 hover:underline"
            >
              ← Back to share options
            </button>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Share to Feed</h3>
            <div className="glass rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <img src={post.authorAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                <span className="text-xs font-medium text-text-primary">{post.authorName}</span>
              </div>
              <p className="text-xs text-text-secondary">{post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
            </div>
            <textarea
              value={repostComment}
              onChange={e => setRepostComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              autoFocus
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none border border-border-subtle rounded-xl p-3 mb-3"
            />
            <button
              onClick={handleShareToFeed}
              disabled={!repostComment.trim() || sharingToFeed}
              className="w-full rounded-full bg-brand-primary py-2.5 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40"
            >
              {sharingToFeed ? 'Sharing...' : 'Share to Feed'}
            </button>
          </div>
        ) : (
          /* Main share options */
          <div className="space-y-3">
            {/* Preview */}
            <div className="glass rounded-xl overflow-hidden mb-4">
              <div className="flex items-center gap-2.5 p-3">
                <img src={post.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">{post.authorName}</p>
                  <p className="text-[10px] text-text-muted">Post</p>
                </div>
              </div>
              {post.mediaUrl && (
                <img src={post.mediaUrl} alt="" className="w-full max-h-[200px] object-cover" />
              )}
              <div className="p-3">
                <p className="text-xs text-text-secondary line-clamp-2">{post.content}</p>
              </div>
            </div>

            {/* Share to Feed */}
            <button
              onClick={() => setShowRepostComposer(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl glass hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0 group-hover:bg-brand-primary/20 transition-colors">
                <RefreshCw size={18} className="text-brand-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-text-primary">Share to Feed</p>
                <p className="text-xs text-text-muted">Repost to your own feed with a comment</p>
              </div>
            </button>

            {/* Send in Chat */}
            <button
              onClick={handleSendInChat}
              className="w-full flex items-center gap-4 p-4 rounded-2xl glass hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-social-warm/10 flex items-center justify-center shrink-0 group-hover:bg-social-warm/20 transition-colors">
                <Send size={18} className="text-social-warm" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-text-primary">Send in Chat</p>
                <p className="text-xs text-text-muted">Share this post in a conversation</p>
              </div>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-4 p-4 rounded-2xl glass hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                {copied ? <Check size={18} className="text-success" /> : <Copy size={18} className="text-text-secondary" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-text-primary">{copied ? 'Copied!' : 'Copy Link'}</p>
                <p className="text-xs text-text-muted">{postUrl.length > 50 ? postUrl.slice(0, 50) + '...' : postUrl}</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
