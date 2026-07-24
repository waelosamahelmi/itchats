import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { RootState } from '@/app/store';
import { fetchMsgs, deleteMsg, deleteConv, useAppDispatch } from '@/app/store';

export default function ChatPage() {
  const { convId } = useParams<{ convId: string }>();
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const { msgs } = useSelector((s: RootState) => s.chat);
  const { convs } = useSelector((s: RootState) => s.chat);
  const conv = convs.find(c => c.id === convId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { if (convId) dispatch(fetchMsgs(convId)); }, [convId, dispatch]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const title = conv?.characterName || conv?.title || 'Conversation';

  const handleDeleteConv = () => {
    if (confirm('Delete this conversation?')) {
      dispatch(deleteConv(convId!));
      nav('/chats');
    }
  };

  const handleDeleteMsg = (msgId: string) => {
    dispatch(deleteMsg({ convId: convId!, msgId }));
  };

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 safe-top glass border-b border-border-subtle">
        <button onClick={() => nav('/chats')} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <div className="w-9 h-9 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
          <span className="text-brand-secondary font-semibold text-sm">{title[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{title}</p>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
            <MoreHorizontal size={18} className="text-text-secondary" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 glass rounded-xl p-1.5 min-w-[160px] shadow-xl border border-border-subtle">
                <button onClick={handleDeleteConv} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-white/5 rounded-lg transition-colors">
                  <Trash2 size={14} />
                  Delete conversation
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <MessageCircle size={32} />
            <p className="text-sm text-text-muted">No messages yet</p>
          </div>
        ) : (
          [...msgs].reverse().map(m => (
            <div key={m.id} className="group relative flex flex-col">
              <div className={`flex ${m.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.senderType === 'user'
                    ? 'bg-brand-primary text-white rounded-br-md'
                    : 'glass text-text-primary rounded-bl-md'
                }`}>
                  {m.content}
                </div>
              </div>
              {m.senderType === 'user' && (
                <button onClick={() => handleDeleteMsg(m.id)} className="absolute -right-1 top-0 p-1 rounded-full text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
