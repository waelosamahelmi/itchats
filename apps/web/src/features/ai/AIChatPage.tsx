import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Send, Bot, Image, Mic, MicOff, Play, Pause,
  UserCircle, Heart,
} from 'lucide-react';
import type { RootState } from '@/app/store';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3092/v1';

interface Message {
  role: string;
  content: string;
  id: string;
  type?: string;
  audioUrl?: string;
}

export default function AIChatPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const nav = useNavigate();
  const { token } = useSelector((s: RootState) => s.auth);
  const characters = useSelector((s: RootState) => s.characters.mine);
  const char = characters.find((c: any) => c.id === characterId);

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [relationship, setRelationship] = useState<{ level: number; label: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [msgs, streaming]);

  useEffect(() => {
    if (!token || !characterId) return;
    async function load() {
      setLoading(true);
      try {
        const [histRes, relRes] = await Promise.all([
          fetch(`${API}/ai/chat/history/${characterId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/ai/relationship/${characterId}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (histRes.ok) {
          const data = await histRes.json();
          if (data.messages?.length) {
            setMsgs(data.messages.map((m: any) => ({
              id: m.id,
              role: m.senderType === 'user' ? 'user' : 'assistant',
              content: m.content,
              type: m.type,
              audioUrl: m.metadata?.audioUrl,
            })));
          }
        }
        if (relRes.ok) {
          const rel = await relRes.json();
          setRelationship(rel);
        }
      } catch { /* offline or API unavailable */ }
      setLoading(false);
    }
    load();
  }, [characterId, token]);

  const send = async () => {
    if (!input.trim() || !token) return;
    const userMsg: Message = { role: 'user', content: input, id: crypto.randomUUID() };
    setMsgs((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setStreaming('');

    try {
      const res = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ characterId, message: userMsg.content }),
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
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === 'chunk') {
                fullReply += d.content;
                setStreaming(fullReply);
              } else if (d.type === 'done') {
                const final = d.content || fullReply;
                setMsgs((prev) => [...prev, { role: 'assistant', content: final, id: crypto.randomUUID() }]);
                setStreaming('');
                fullReply = '';
              } else if (d.type === 'error') {
                setMsgs((prev) => [...prev, { role: 'assistant', content: d.message || 'AI error', id: crypto.randomUUID() }]);
              }
            } catch { /* skip unparseable chunks */ }
          }
        }
      }
    } catch {
      setMsgs((prev) => [...prev, { role: 'assistant', content: 'Connection error — check if the API server is running.', id: crypto.randomUUID() }]);
    }
    setSending(false);
    setStreaming('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        setMsgs((prev) => [...prev, { role: 'user', content: '🎤 Voice message', id: crypto.randomUUID(), type: 'voice', audioUrl: dataUrl }]);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert('Microphone access needed for voice messages');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const playAudio = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    if (playing === url) {
      audioRef.current.pause();
      setPlaying(null);
      return;
    }
    audioRef.current.src = url;
    audioRef.current.play();
    setPlaying(url);
    audioRef.current.onended = () => setPlaying(null);
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-canvas text-text-muted text-sm">
        Sign in to chat with AI characters
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 safe-top glass border-b border-border-subtle shrink-0">
        <button onClick={() => nav('/ai')} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-text-secondary" />
        </button>
        <Link to={`/ai/profile/${characterId}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-glow flex items-center justify-center shrink-0">
            <span className="text-brand-secondary font-semibold text-sm">{char?.name?.[0] || 'AI'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{char?.name || 'AI Character'}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-text-muted">
                {relationship ? `${relationship.label} (Lv ${relationship.level})` : 'Loading...'}
              </p>
            </div>
          </div>
        </Link>
        <Link to={`/ai/profile/${characterId}`} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <UserCircle size={20} className="text-text-secondary" />
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        {!loading && msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center">
              <Bot size={28} className="text-brand-secondary" />
            </div>
            <p className="text-sm font-medium">Start a conversation</p>
            <p className="text-xs text-text-muted max-w-[240px] text-center">
              Say hello to {char?.name || 'your AI friend'} — they remember your conversations and grow closer over time
            </p>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-brand-primary text-white rounded-br-md shadow-lg shadow-brand-glow'
                  : 'glass text-text-primary rounded-bl-md'
              }`}
            >
              {m.type === 'voice' && m.audioUrl ? (
                <button onClick={() => playAudio(m.audioUrl!)} className="flex items-center gap-2 text-white">
                  {playing === m.audioUrl ? <Pause size={18} /> : <Play size={18} />}
                  <div className="flex gap-0.5 items-end h-8">
                    {[4, 8, 6, 10, 7, 12, 5, 9, 6].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-current rounded-full opacity-70 animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                </button>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start animate-slide-up">
            <div className="max-w-[82%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed glass text-text-primary">
              {streaming}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-brand-primary rounded-full animate-pulse align-middle" />
            </div>
          </div>
        )}
        {sending && !streaming && (
          <div className="flex justify-start animate-slide-up">
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (mode === 'text') send(); }}
        className="flex items-center gap-2 px-4 py-3 glass safe-bottom shrink-0"
      >
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'text' ? 'voice' : 'text'))}
          className="p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          {mode === 'voice' ? <Mic size={20} className="text-brand-primary" /> : <Mic size={20} className="text-text-muted" />}
        </button>
        {mode === 'text' ? (
          <>
            <div className="flex-1 glass rounded-full flex items-center px-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${char?.name || 'AI'}...`}
                className="flex-1 bg-transparent py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-full bg-brand-primary p-3 text-white disabled:opacity-40 transition-all hover:brightness-110 hover:shadow-lg hover:shadow-brand-glow"
            >
              <Send size={18} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`flex-1 rounded-full py-4 text-sm font-medium transition-all ${
              recording
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'glass text-text-muted hover:bg-white/5'
            }`}
          >
            {recording ? 'Recording... release to send' : 'Hold to record voice message'}
          </button>
        )}
      </form>
    </div>
  );
}
