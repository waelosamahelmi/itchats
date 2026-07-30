import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Sparkles, Trash2, AlertCircle, X, MoreHorizontal, Bell, BellOff } from 'lucide-react';
import type { RootState } from '@/app/store';
import { fetchConvs, deleteConv, useAppDispatch } from '@/app/store';
import { timeAgo } from '@/lib/timeAgo';

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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [mutedConvs, setMutedConvs] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('mutedConversations') || '[]')); } catch { return new Set(); }
  });
  const startXRef = useRef(0);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => { if (user) dispatch(fetchConvs()); }, [user, dispatch]);

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

  const toggleMute = (cid: string) => {
    setMutedConvs(prev => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      localStorage.setItem('mutedConversations', JSON.stringify([...next]));
      return next;
    });
    setMenuOpenId(null);
  };

  const handleMenuDelete = (cid: string) => {
    setMenuOpenId(null);
    confirmDelete(cid);
    // Auto-trigger delete after brief delay
    setTimeout(() => handleDelete(cid), 100);
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
          <button className="glass rounded-full p-2.5 text-text-secondary hover:text-brand-primary transition-colors">
            <Sparkles size={18} />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        {chatError && (
          <div className="mb-3 glass rounded-xl px-4 py-3 text-sm text-danger text-center flex items-center justify-center gap-2">
            <AlertCircle size={14} /> {chatError}
          </div>
        )}
        {convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <MessageCircle size={36} className="text-text-muted opacity-40" />
            <p className="text-text-muted text-sm">No conversations yet</p>
            <p className="text-text-muted text-xs">Start chatting with an AI character</p>
          </div>
        ) : (
          convs.map((c: any, i: number) => {
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
                    <div className="w-11 h-11 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
                      <span className="text-brand-secondary font-semibold text-sm">{c.characterName?.[0] || c.title?.[0] || 'C'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">{c.characterName || c.title || 'Conversation'}</p>
                        <span className="text-[10px] text-text-muted shrink-0">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : 'New'}</span>
                      </div>
                      <p className="text-xs text-text-muted truncate mt-0.5">{c.characterName ? `Chat with ${c.characterName}` : 'Conversation'}</p>
                    </div>
                    <ChevronRight size={14} className="text-text-muted shrink-0" />
                  </button>
                  {/* Three-dots menu */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                      className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Conversation options"
                    >
                      <MoreHorizontal size={16} className="text-text-muted" />
                    </button>
                    {menuOpenId === c.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 top-8 z-40 glass rounded-xl p-1.5 min-w-[180px] shadow-xl border border-border-subtle">
                          <button
                            onClick={() => toggleMute(c.id)}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-text-primary hover:bg-white/5 rounded-lg transition-colors"
                          >
                            {mutedConvs.has(c.id) ? <Bell size={14} /> : <BellOff size={14} />}
                            {mutedConvs.has(c.id) ? 'Unmute notifications' : 'Mute notifications'}
                          </button>
                          <button
                            onClick={() => handleMenuDelete(c.id)}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete conversation
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
