import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Send, Bot, Sparkles } from 'lucide-react';
import type { RootState } from '@/app/store';

const API = '/v1';

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
      let fullReply = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === 'chunk') { fullReply += d.content; setStreaming(fullReply); }
              else if (d.type === 'done') {
                setMsgs(prev => [...prev, { role: 'assistant', content: d.content || fullReply, id: crypto.randomUUID() }]);
                setStreaming('');
                fullReply = '';
              }
              else if (d.type === 'error') {
                setMsgs(prev => [...prev, { role: 'assistant', content: d.message || 'AI error', id: crypto.randomUUID() }]);
              }
            } catch {}
          }
        }
      }
      setStreaming('');
      setLoading(false);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Connection error — is the API server running?', id: crypto.randomUUID() }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 safe-top glass border-b border-border-subtle">
        <button onClick={() => nav(-1)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors"><ArrowLeft size={20} className="text-text-secondary" /></button>
        <div className="w-9 h-9 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
          <span className="text-brand-secondary font-semibold text-sm">{char?.name?.[0] || 'AI'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{char?.name || 'AI Character'}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <p className="text-[10px] text-text-muted">Online now</p>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center"><Bot size={28} className="text-brand-secondary" /></div>
            <p className="text-sm font-medium">Start a conversation</p>
            <p className="text-xs text-text-muted max-w-[240px] text-center">Say hello to {char?.name || 'your AI friend'} — they have a unique personality waiting to meet you</p>
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-brand-primary text-white rounded-br-md shadow-lg shadow-brand-glow'
                : 'glass text-text-primary rounded-bl-md'
            }`}>{m.content}</div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start animate-slide-up">
            <div className="max-w-[82%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed glass text-text-primary">
              {streaming}<span className="inline-block w-1.5 h-4 ml-0.5 bg-brand-primary rounded-full animate-pulse align-middle" />
            </div>
          </div>
        )}
        {loading && !streaming && (
          <div className="flex justify-start"><div className="glass rounded-2xl rounded-bl-md px-4 py-3"><span className="flex gap-1"><span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{animationDelay:'0ms'}} /><span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{animationDelay:'150ms'}} /><span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{animationDelay:'300ms'}} /></span></div></div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 px-4 py-3 glass safe-bottom">
        <div className="flex-1 glass rounded-full flex items-center px-4">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message..." className="flex-1 bg-transparent py-3 text-sm text-text-primary placeholder:text-text-muted outline-none" />
        </div>
        <button type="submit" disabled={loading || !input.trim()} className="rounded-full bg-brand-primary p-3 text-white disabled:opacity-40 transition-all hover:brightness-110 hover:shadow-lg hover:shadow-brand-glow">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
