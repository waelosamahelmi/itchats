import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MoreHorizontal, Phone, Sparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { ChatComposer } from './ChatComposer';
import { MessageBubble } from './MessageBubble';
import {
  normalizeHistoryMessage,
  parseAssistantResponse,
  responsePartsToMessages,
  type ChatMessage,
  type ConversationMode,
} from './chatModel';

const API = '/v1';

function fallbackAvatar(name: string) {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(name)}`;
}

export default function AIChatPage() {
  const { characterId = '' } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const auth = useSelector((state: RootState) => state.auth);
  const characters = useSelector((state: RootState) => [...state.characters.mine, ...state.characters.discover]);
  const character = characters.find((item) => item.id === characterId);
  const name = character?.name || 'Character';
  const avatarUrl = character?.avatarUrl || fallbackAvatar(name);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<ConversationMode>('chat');
  const [relationship, setRelationship] = useState<{ level: number; label: string } | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [playingId, setPlayingId] = useState<string>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const headers = useCallback(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token]);
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  useEffect(scrollToBottom, [messages, streaming, scrollToBottom]);

  useEffect(() => {
    if (!auth.token || !characterId) return;
    let active = true;
    Promise.all([
      fetch(`${API}/ai/chat/history/${characterId}`, { headers: headers() }),
      fetch(`${API}/ai/relationship/${characterId}`, { headers: headers() }),
    ]).then(async ([historyResponse, relationshipResponse]) => {
      if (!historyResponse.ok) throw new Error('Conversation history could not be loaded.');
      const history = await historyResponse.json();
      const relation = relationshipResponse.ok ? await relationshipResponse.json() : null;
      if (!active) return;
      const normalized = (history.messages ?? []).flatMap((item: any): ChatMessage[] => {
        const base = normalizeHistoryMessage(item);
        if (base.sender !== 'character' || base.kind !== 'text') return [base];
        const parts = parseAssistantResponse(base.text);
        return responsePartsToMessages(parts, history.mode ?? 'chat', characterId)
          .map((part, index) => ({ ...part, id: index === 0 ? base.id : `${base.id}-${index}`, createdAt: base.createdAt }));
      });
      setMessages(normalized);
      setConversationId(history.conversationId);
      setMode(history.mode ?? 'chat');
      setRelationship(relation);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Conversation could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.token, characterId, headers]);

  async function updateMode(nextMode: ConversationMode) {
    const previous = mode;
    setMode(nextMode);
    if (!conversationId) return;
    try {
      const response = await fetch(`${API}/conversations/${conversationId}/mode`, {
        method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });
      if (!response.ok) throw new Error('Mode could not be saved.');
    } catch (cause) {
      setMode(previous);
      setError(cause instanceof Error ? cause.message : 'Mode could not be saved.');
    }
  }

  async function send() {
    const content = input.trim();
    if (!content || !auth.token || busy) return;
    const optimisticId = crypto.randomUUID();
    setMessages((current) => [...current, {
      id: optimisticId, sender: 'user', kind: 'text', text: content,
      createdAt: new Date().toISOString(), delivery: 'sending', reactions: [],
    }]);
    setInput('');
    setBusy(true);
    setError(undefined);
    setStreaming('');
    let fullResponse = '';
    try {
      const response = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, conversationId, message: content }),
      });
      if (!response.ok || !response.body) throw new Error('Message could not be sent.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6));
          if (payload.type === 'chunk') {
            fullResponse += payload.content;
            setStreaming(fullResponse);
          }
          if (payload.type === 'done') {
            const parts = parseAssistantResponse(fullResponse);
            setMessages((current) => [
              ...current.map((message) => message.id === optimisticId ? { ...message, delivery: 'delivered' as const } : message),
              ...responsePartsToMessages(parts, mode, characterId).map((message, index) => ({
                ...message, id: index === 0 && payload.messageId ? payload.messageId : message.id,
              })),
            ]);
            setStreaming('');
          }
          if (payload.type === 'image') {
            setMessages((current) => [...current, {
              id: crypto.randomUUID(), sender: 'character', kind: 'image',
              text: payload.description ? `${name} sent an image` : `${name} sent a selfie`,
              mediaUrl: payload.url, createdAt: new Date().toISOString(),
              delivery: 'delivered', reactions: [],
            }]);
          }
          if (payload.type === 'video') {
            setMessages((current) => [...current, {
              id: crypto.randomUUID(), sender: 'character', kind: 'video',
              text: payload.description ? `${name} sent a video` : `${name} sent a video`,
              mediaUrl: payload.url, createdAt: new Date().toISOString(),
              delivery: 'delivered', reactions: [],
            }]);
          }
          if (payload.type === 'video_queued') {
            setMessages((current) => [...current, {
              id: crypto.randomUUID(), sender: 'character', kind: 'system',
              text: payload.message || `Video is generating: ${payload.description}`,
              createdAt: new Date().toISOString(), delivery: 'delivered', reactions: [],
            }]);
          }
          if (payload.type === 'media_error') {
            setMessages((current) => [...current, {
              id: crypto.randomUUID(), sender: 'character', kind: 'system',
              text: `⚠️ ${payload.message}`,
              createdAt: new Date().toISOString(), delivery: 'delivered', reactions: [],
            }]);
          }
          if (payload.type === 'error') throw new Error(payload.message || 'Character could not reply.');
        }
      }
    } catch (cause) {
      setMessages((current) => current.map((message) => message.id === optimisticId
        ? { ...message, delivery: 'failed' as const } : message));
      setError(cause instanceof Error ? cause.message : 'Message could not be sent.');
    } finally {
      setBusy(false);
      setStreaming('');
    }
  }

  async function react(messageId: string, emoji: string) {
    if (!conversationId) return;
    try {
      const response = await fetch(`${API}/conversations/${conversationId}/messages/${messageId}/reactions`, {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }),
      });
      if (!response.ok) throw new Error('Reaction could not be saved.');
      const reaction = await response.json();
      setMessages((current) => current.map((message) => message.id === messageId ? {
        ...message,
        reactions: [...message.reactions.filter((item) => item.actorType !== 'user'), reaction],
      } : message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reaction could not be saved.');
    }
  }

  function playVoice(message: ChatMessage) {
    if (!message.mediaUrl) return;
    if (!audioRef.current) audioRef.current = new Audio();
    if (playingId === message.id) {
      audioRef.current.pause();
      setPlayingId(undefined);
      return;
    }
    audioRef.current.src = message.mediaUrl;
    void audioRef.current.play();
    setPlayingId(message.id);
    audioRef.current.onended = () => setPlayingId(undefined);
  }

  if (!auth.token) return <main className="chat-auth-required">Sign in to continue this conversation.</main>;

  return (
    <main className="real-chat-shell">
      <header className="real-chat-header safe-top">
        <button type="button" className="chat-header-button" aria-label="Back to characters" onClick={() => navigate('/ai')}>
          <ArrowLeft size={20} />
        </button>
        <Link to={`/ai/profile/${characterId}`} className="chat-identity">
          <img src={avatarUrl} alt={`${name} profile`} />
          <span>
            <strong>{name}</strong>
            <small><i aria-hidden="true" /> {relationship?.label || 'Getting to know you'}</small>
          </span>
        </Link>
        <button type="button" className="chat-header-button" aria-label={`Call ${name}`}><Phone size={19} /></button>
        <button type="button" className="chat-header-button" aria-label="Conversation options"><MoreHorizontal size={20} /></button>
      </header>

      <nav className="conversation-mode" aria-label="Conversation mode">
        <button type="button" aria-pressed={mode === 'chat'} onClick={() => void updateMode('chat')}>Chat</button>
        <button type="button" aria-pressed={mode === 'roleplay'} onClick={() => void updateMode('roleplay')}>Roleplay</button>
      </nav>

      <section className="message-timeline" aria-live="polite" aria-busy={loading || busy}>
        {loading && <div className="chat-loading">Opening your conversation…</div>}
        {!loading && messages.length === 0 && (
          <div className="chat-empty">
            <img src={avatarUrl} alt="" />
            <Sparkles size={18} aria-hidden="true" />
            <h1>Start where it feels natural</h1>
            <p>{mode === 'chat' ? `${name} will reply like a real private chat.` : `You and ${name} are in a live scene. Actions and thoughts can appear.`}</p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onReact={react} onPlay={playVoice} playing={playingId === message.id} />
        ))}
        {streaming && <div className="character-typing"><span /><span /><span /></div>}
        <div ref={bottomRef} />
      </section>

      <input ref={uploadRef} type="file" accept="image/*" hidden />
      <ChatComposer
        characterName={name}
        value={input}
        disabled={busy}
        error={error}
        onChange={setInput}
        onSend={() => void send()}
        onVoice={() => setError('Voice-note recording is being connected to persistent uploads.')}
        onImage={() => uploadRef.current?.click()}
      />
    </main>
  );
}
