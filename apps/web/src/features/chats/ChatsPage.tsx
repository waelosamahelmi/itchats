import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import type { RootState } from '@/app/store';
import { fetchConvs, useAppDispatch } from '@/app/store';
import { Avatar, Card } from '@itchats/ui';

export default function ChatsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { convs } = useSelector((s: RootState) => s.chat);
  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => { if (user) dispatch(fetchConvs()); }, [user, dispatch]);

  if (!user) {
    return <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <MessageCircle size={48} className="text-text-muted" />
      <p className="text-text-secondary text-center">Sign in to see your conversations</p>
      <button onClick={() => navigate('/auth')} className="rounded-full bg-brand-primary px-6 py-2 text-white text-sm">Sign In</button>
    </div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 safe-top"><h1 className="text-xl font-bold text-text-primary">Chats</h1></header>
      <div className="flex-1 overflow-y-auto px-4">
        {convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20"><MessageCircle size={40} className="text-text-muted mb-2" /><p className="text-text-muted text-sm">No conversations yet</p></div>
        ) : (
          convs.map((c: any) => (
            <button key={c.id} onClick={() => navigate(`/chats`)} className="flex w-full items-center gap-3 py-3 border-b border-border-subtle hover:bg-surface-elevated px-2 rounded-lg transition-colors text-left">
              <Avatar size="md" fallback={c.title?.[0] || '?'} />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-text-primary truncate">{c.title || 'Conversation'}</p><p className="text-xs text-text-muted truncate">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : 'New'}</p></div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
