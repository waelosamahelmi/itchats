import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Trash2, AlertCircle, BellOff } from 'lucide-react';
import type { RootState, ConversationListItem } from '@/app/store';
import { fetchConvs, deleteConv, useAppDispatch } from '@/app/store';
import { timeAgo } from '@/lib/timeAgo';
import ChatRowMenu from './ChatRowMenu';
import PullToRefresh from '@/components/PullToRefresh';
import NotificationBell from '@/components/NotificationBell';
import { SkeletonAvatar, SkeletonLine } from '@/components/Skeleton';

/** Touch-swipe delete handler state */
interface SwipeState {
  swipingId: string | null;
  offset: number;
  confirmedId: string | null;
}

export default function ChatsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { convs, error: chatError } = useSelector((s: RootState) => s.chat);
  const { user } = useSelector((s: RootState) => s.auth);
  const [swipe, setSwipe] = useState<SwipeState>({ swipingId: null, offset: 0, confirmedId: null });
  const [loading, setLoading] = useState(true);
  const startXRef = useRef(0);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    dispatch(fetchConvs()).finally(() => setLoading(false));
  }, [user, dispatch]);

  const handleRefresh = async () => {
    try { await dispatch(fetchConvs()).unwrap(); } catch { /* error surfaced via chatError */ }
  };

  const handleDelete = async (cid: string) => {
    try {
      await dispatch(deleteConv(cid)).unwrap();
      setSwipe({ swipingId: null, offset: 0, confirmedId: null });
    } catch (err: any) {
      alert(err.message || 'Failed to delete conversation');
    }
  };

  // ── Touch swipe handlers ──
  const handleTouchStart = (cid: string, e: React.TouchEvent) => {
    startXRef.current = e.touches[0]?.clientX ?? 0;
    setSwipe(s => ({ ...s, swipingId: cid, offset: 0 }));
  };

  const handleTouchMove = (cid: string, e: React.TouchEvent) => {
    if (swipe.swipingId !== cid) return;
    const dx = (e.touches[0]?.clientX ?? 0) - startXRef.current;
    // Only allow left swipe (negative dx)
    const offset = Math.min(0, Math.max(-120, dx));
    setSwipe(s => ({ ...s, offset }));
  };

  const handleTouchEnd = (cid: string) => {
    if (swipe.offset < -60) {
      // Snap open: show delete button
      setSwipe({ swipingId: null, offset: -100, confirmedId: null });
    } else {
      // Snap closed
      setSwipe({ swipingId: null, offset: 0, confirmedId: null });
    }
  };

  const confirmDelete = (cid: string) => {
    setSwipe(s => ({ ...s, confirmedId: cid }));
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
          <MessageCircle size={36} className="text-brand-secondary" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Your Messages</h2>
          <p className="text-text-muted text-sm max-w-xs">Sign in to chat with AI characters and real people</p>
        </div>
        <button onClick={() => navigate('/auth')} className="rounded-full bg-brand-primary px-8 py-3 text-white text-sm font-medium accent-glow hover:brightness-110 transition-all">Sign In</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Messages</h1>
            <p className="text-text-muted text-xs mt-0.5">Your conversations</p>
          </div>
          <NotificationBell />
        </div>
      </header>
      <PullToRefresh onRefresh={handleRefresh} scrollRef={scrollRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5">
        {chatError && (
          <div className="mb-3 glass rounded-xl px-4 py-3 text-sm text-danger text-center flex items-center justify-center gap-2">
            <AlertCircle size={14} /> {chatError}
          </div>
        )}
        {loading && convs.length === 0 ? (
          // Initial-load skeleton rows
          <div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3.5 px-1 border-b border-border-subtle">
                <SkeletonAvatar size={44} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <SkeletonLine width="40%" height={14} />
                    <SkeletonLine width={36} height={10} />
                  </div>
                  <SkeletonLine width="70%" height={12} />
                </div>
              </div>
            ))}
          </div>
        ) : convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <MessageCircle size={36} className="text-text-muted opacity-40" />
            <p className="text-text-muted text-sm">No conversations yet</p>
            <p className="text-text-muted text-xs">Start chatting with an AI character</p>
          </div>
        ) : (
          convs.map((c: ConversationListItem, i: number) => {
            const name = c.character?.name || c.characterName || c.title || 'Conversation';
            const avatarUrl = c.character?.avatarUrl || null;
            const isMuted = !!c.mutedUntil && new Date(c.mutedUntil).getTime() > Date.now();
            const previewTime = c.lastMessage?.createdAt || c.lastMessageAt;
            const preview = c.lastMessage
              ? `${c.lastMessage.senderType === 'user' ? 'You: ' : ''}${c.lastMessage.content}`
              : 'No messages yet';
            const isOpen = swipe.swipingId === c.id
              ? swipe.offset
              : swipe.offset === -100 && swipe.swipingId === null
                ? -100
                : 0;

            return (
              <div key={c.id} className="overflow-hidden relative mb-1">
                {/* Delete background */}
                <div
                  className={`absolute right-0 top-0 bottom-0 flex items-center transition-opacity duration-200 ${Math.abs(isOpen) > 10 ? 'opacity-100' : 'opacity-0'}`}
                  style={{ width: Math.abs(isOpen) }}
                >
                  {swipe.confirmedId === c.id ? (
                    <div className="flex items-center gap-1 px-2 w-full justify-end">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="bg-danger text-white text-[11px] font-medium rounded-xl px-3 py-2 whitespace-nowrap"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setSwipe({ swipingId: null, offset: 0, confirmedId: null })}
                        className="bg-bg-elevated text-text-secondary text-[11px] font-medium rounded-xl px-2 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => confirmDelete(c.id)}
                      className="bg-danger text-white text-[11px] font-medium rounded-xl px-3 py-2 ml-auto mr-1 whitespace-nowrap"
                    >
                      <Trash2 size={14} className="inline mr-1" />
                      Delete
                    </button>
                  )}
                </div>

                {/* Swipeable content */}
                <div
                  ref={(el) => { if (el) itemRefs.current.set(c.id, el); }}
                  onTouchStart={(e) => handleTouchStart(c.id, e)}
                  onTouchMove={(e) => handleTouchMove(c.id, e)}
                  onTouchEnd={() => handleTouchEnd(c.id)}
                  className="relative bg-bg-canvas z-10"
                  style={{
                    transform: `translateX(${isOpen}px)`,
                    transition: swipe.swipingId === c.id ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2)',
                  }}
                >
                  <button
                    onClick={() => {
                      if (swipe.confirmedId === c.id) return;
                      navigate(c.characterId ? `/ai/chat/${c.characterId}` : `/chat/${c.id}`);
                    }}
                    className="flex w-full items-center gap-4 py-3.5 border-b border-border-subtle hover:bg-white/[0.02] px-1 rounded-xl transition-colors text-left animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={name}
                        className="w-11 h-11 rounded-full object-cover shrink-0 bg-brand-glow"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
                        <span className="text-brand-secondary font-semibold text-sm">{name[0] || 'C'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                          {isMuted && <BellOff size={12} className="text-text-muted shrink-0" aria-label="Muted" />}
                        </div>
                        <span className="text-[10px] text-text-muted shrink-0">{previewTime ? timeAgo(previewTime) : 'New'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-text-secondary font-medium' : 'text-text-muted'}`}>{preview}</p>
                        {c.unreadCount > 0 && (
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-white text-[10px] font-semibold flex items-center justify-center">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-text-muted shrink-0" />
                  </button>
                  {/* Three-dots menu (portal-rendered) */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20" onClick={(e) => e.stopPropagation()}>
                    <ChatRowMenu conversation={c} onDelete={() => handleDelete(c.id)} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </PullToRefresh>
    </div>
  );
}
