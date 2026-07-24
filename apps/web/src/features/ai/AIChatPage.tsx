import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Send, Bot } from 'lucide-react';
import type { RootState } from '@/app/store';
import { Avatar } from '@itchats/ui';

const API = 'http://localhost:3002/v1';

export default function AIChatPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const nav = useNavigate();
  const { user, token } = useSelector((s: RootState) => s.auth);
  const characters = useSelector((s: RootState) => s.characters.mine);
  const char = characters.find(c => c.id === characterId);

  const [msgs, setMsgs] = useState<{ role: string; content: string; id: string }[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, streaming]);

  const send = async () => {
    if (!input.trim() || !token) return;
    const userMsg = { role: 'user', content: input, id: crypto.randomUUID() };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreaming('');

    try {
      const res = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ characterId, message: input }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === 'chunk') setStreaming(prev => prev + d.content);
              else if (d.type === 'done') {
                setMsgs(prev => [...prev, { role: 'assistant', content: streaming + (d.type === 'done' ? '' : ''), id: crypto.randomUUID() }]);
                setStreaming('');
              } else if (d.type === 'error') { setMsgs(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.', id: crypto.randomUUID() }]); }
            } catch {}
          }
        }
      }
      if (streaming) { setMsgs(prev => [...prev, { role: 'assistant', content: streaming, id: crypto.randomUUID() }]); setStreaming(''); }
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Connection error. Make sure the API is running.', id: crypto.randomUUID() }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle safe-top bg-bg-surface">
        <button onClick={() => nav(-1)} className="p-1"><ArrowLeft size={22} className="text-text-secondary" /></button>
        <Avatar size="sm" fallback={char?.name?.[0] || 'AI'} />
        <div><p className="text-sm font-medium text-text-primary">{char?.name || 'AI Character'}</p><p className="text-[10px] text-text-muted">AI • Online</p></div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted"><Bot size={40} className="mb-2" /><p className="text-sm">Start a conversation</p></div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand-primary text-white rounded-br-md' : 'bg-surface-elevated text-text-primary rounded-bl-md'}`}>{m.content}</div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm bg-surface-elevated text-text-primary">{streaming}<span className="animate-pulse">▌</span></div></div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 px-4 py-3 border-t border-border-subtle bg-bg-surface safe-bottom">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message..." className="flex-1 rounded-full bg-surface-elevated px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none" />
        <button type="submit" disabled={loading || !input.trim()} className="rounded-full bg-brand-primary p-2.5 text-white disabled:opacity-50"><Send size={18} /></button>
      </form>
    </div>
  );
}
