import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Sparkles, Trash2, AlertCircle } from 'lucide-react';
import type { RootState } from '@/app/store';
import { fetchConvs, deleteConv, useAppDispatch } from '@/app/store';

export default function ChatsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { convs, error: chatError } = useSelector((s: RootState) => s.chat);
  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => { if (user) dispatch(fetchConvs()); }, [user, dispatch]);

  const handleDelete = async (e: React.MouseEvent, cid: string) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await dispatch(deleteConv(cid)).unwrap();
    } catch (err: any) {
      alert(err.message || 'Failed to delete conversation');
    }
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
          convs.map((c: any, i: number) => (
            <div key={c.id} className="group relative">
              <button onClick={() => navigate(c.characterId ? `/ai/chat/${c.characterId}` : `/chat/${c.id}`)} className="flex w-full items-center gap-4 py-3.5 border-b border-border-subtle hover:bg-white/[0.02] px-1 rounded-xl transition-colors text-left animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="w-11 h-11 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
                  <span className="text-brand-secondary font-semibold text-sm">{c.characterName?.[0] || c.title?.[0] || 'C'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary truncate">{c.characterName || c.title || 'Conversation'}</p>
                    <span className="text-[10px] text-text-muted shrink-0">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'New'}</span>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{c.characterName ? `Chat with ${c.characterName}` : 'Conversation'}</p>
                </div>
                <ChevronRight size={14} className="text-text-muted shrink-0" />
              </button>
              <button onClick={e => handleDelete(e, c.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
