import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Send, Bot, ImageIcon, Mic, MicOff, Play, Pause,
  UserCircle, Heart, Camera, Smile,
} from 'lucide-react';
import type { RootState } from '@/app/store';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3092/v1';

interface Message {
  role: string;
  content: string;
  id: string;
  type?: string;
  audioUrl?: string;
  metadata?: { status?: string; reactions?: Record<string, string> };
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
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
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
    if ((!input.trim() && !imageBase64) || !token) return;
    const msgContent = input.trim() || 'Describe this image';
    const userMsg: Message = { role: 'user', content: imageBase64 ? '📷 ' + msgContent : msgContent, id: crypto.randomUUID(), type: imageBase64 ? 'image' : 'text' };
    setMsgs((prev) => [...prev, userMsg]);
    setInput('');
    const imgData = imageBase64;
    setImageBase64(''); setImagePreview('');
    setSending(true);
    setStreaming('');

    try {
      const res = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ characterId, message: userMsg.content, imageBase64: imgData || undefined }),
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
    if (!audioRef.current) { audioRef.current = new Audio(); }
    if (playing === url) { audioRef.current.pause(); setPlaying(null); return; }
    audioRef.current.src = url;
    audioRef.current.play();
    setPlaying(url);
    audioRef.current.onended = () => setPlaying(null);
  };

  const requestSelfie = async () => {
    if (!token || !characterId) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/ai/selfie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ characterId, context: 'Can you send me a selfie?' }),
      });
      const data = await res.json();
      if (data.url) {
        setMsgs((prev) => [...prev, { role: 'assistant', content: data.url, id: crypto.randomUUID(), type: 'image' }]);
      } else {
        setMsgs((prev) => [...prev, { role: 'assistant', content: data.error || 'Could not generate selfie', id: crypto.randomUUID() }]);
      }
    } catch { setMsgs((prev) => [...prev, { role: 'assistant', content: 'Selfie generation failed', id: crypto.randomUUID() }]); }
    setSending(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1] || dataUrl);
    };
    reader.readAsDataURL(file);
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
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group ${
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
                      <div key={i} className="w-1 bg-current rounded-full opacity-70 animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }} />
                    ))}
                  </div>
                </button>
              ) : m.type === 'image' || m.content?.startsWith('http') ? (
                <img src={m.content} alt="" className="max-w-full rounded-lg max-h-80 object-contain" loading="lazy" />
              ) : (
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              )}
              {/* Reactions display */}
              {m.metadata?.reactions && Object.keys(m.metadata.reactions).length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {Object.entries(m.metadata.reactions).map(([userId, emoji]) => (
                    <span key={userId} className="text-xs bg-white/10 rounded-full px-1.5 py-0.5 leading-none" title={userId === 'ai' ? 'AI reacted' : 'Reaction'}>
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Message status for user messages */}
            {m.role === 'user' && (
              <div className="flex items-center gap-1 mt-0.5 px-1">
                <span className="text-[10px] text-text-muted">
                  {m.metadata?.status === 'seen' ? '✓✓' : m.metadata?.status === 'delivered' ? '✓✓' : '✓'}
                </span>
              </div>
            )}
            {/* Quick reaction buttons (appear on hover for AI messages) */}
            {m.role === 'assistant' && (
              <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                {['❤️', '😂', '😮', '🔥', '👍'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={async () => {
                      try {
                        await fetch(`${API}/conversations/${m.id.split('-')[0]}/messages/${m.id}/reactions`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ emoji }),
                        });
                        // Update local state
                        const updated = msgs.map(msg => 
                          msg.id === m.id 
                            ? { ...msg, metadata: { ...msg.metadata, reactions: { ...(msg.metadata?.reactions || {}), me: emoji } } }
                            : msg
                        );
                        setMsgs(updated);
                      } catch {}
                    }}
                    className="text-sm hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
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
        {/* Image upload button */}
        <label className="p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer">
          <ImageIcon size={20} className="text-text-muted hover:text-brand-secondary" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        {/* Selfie request button */}
        <button
          type="button"
          onClick={requestSelfie}
          disabled={sending}
          className="p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-30"
        >
          <Camera size={20} className="text-text-muted hover:text-brand-secondary" />
        </button>
        {mode === 'text' ? (
          <>
            <div className="flex-1 glass rounded-full flex items-center px-4">
              {imagePreview ? (
                <div className="relative mr-2">
                  <img src={imagePreview} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  <button onClick={() => { setImageBase64(''); setImagePreview(''); }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px]">✕</button>
                </div>
              ) : null}
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
              disabled={sending || (!input.trim() && !imageBase64)}
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
