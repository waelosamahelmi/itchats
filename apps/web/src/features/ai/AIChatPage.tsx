import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MoreHorizontal, Phone, Sparkles, MessageCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { deleteConv, useAppDispatch } from '@/app/store';
import { ChatComposer } from './ChatComposer';
import { MessageBubble } from './MessageBubble';
import {
  normalizeHistoryMessage,
  parseAssistantResponse,
  responsePartsToMessages,
  stripJsonContent,
  type ChatMessage,
  type ConversationMode,
} from './chatModel';
import { detectTextLanguage, getCharacterCooldown, setCharacterCooldown, clearCharacterCooldown } from '@/lib/translate';
import { t } from '@/lib/i18n';

const API = '/v1';

function fallbackAvatar(name: string) {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(name)}`;
}

function userAvatarUrl(user: any): string {
  if (user?.avatarUrl) return user.avatarUrl;
  if (user?.username) return fallbackAvatar(user.username);
  return fallbackAvatar('user');
}

/** Strip raw JSON artifacts from streaming text for cleaner display */
function stripJsonArtifacts(text: string): string {
  // Try to parse the full accumulated text as an assistant response array
  const trimmed = text.trim();
  if (!trimmed) return text;
  try {
    const cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const value = JSON.parse(cleaned);
    if (Array.isArray(value)) {
      // Extract speech content from parsed parts
      return value
        .filter((p: any) => p && typeof p === 'object' && (p.type === 'speech' || p.type === 'action' || p.type === 'thought') && typeof p.content === 'string')
        .map((p: any) => {
          if (p.type === 'action') return `*${p.content}*`;
          if (p.type === 'thought') return `_${p.content}_`;
          return p.content;
        })
        .join('\n') || text;
    }
  } catch {
    // Not valid JSON yet, strip any partial JSON wrapper characters
    let cleaned = text;
    // If text starts with [{"type": pattern, try to extract partial content
    const partialMatch = cleaned.match(/\{"type":"speech","content":"([^"]*(?:\\.[^"]*)*)"/);
    if (partialMatch) {
      try {
        return JSON.parse(`"${partialMatch[1]}"`);
      } catch { /* fall through */ }
    }
  }
  return text;
}

export default function AIChatPage() {
  const { characterId = '' } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useAppDispatch();
  const characters = useSelector((state: RootState) => [...state.characters.mine, ...state.characters.discover]);
  const character = characters.find((item) => item.id === characterId);
  const name = character?.name || 'Character';
  const avatarUrl = character?.avatarUrl || fallbackAvatar(name);
  const userAvatar = userAvatarUrl(auth.user);
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const conversationIdRef = useRef<string | null>(null);

  // Language detection & cooldown
  const [detectedLang, setDetectedLang] = useState<string>('en');
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // ── Voice Call State ──
  const [callActive, setCallActive] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callSpeaking, setCallSpeaking] = useState(false);
  const [callTranscript, setCallTranscript] = useState('');
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const headers = useCallback(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token]);
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  useEffect(scrollToBottom, [messages, streaming, scrollToBottom]);

  // Keep conversationId ref in sync for async callbacks
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  // Check conversation cooldown
  useEffect(() => {
    if (!characterId) return;
    const cd = getCharacterCooldown(characterId);
    if (cd) setCooldownUntil(cd);
  }, [characterId]);

  // Clear expired cooldowns
  useEffect(() => {
    if (!cooldownUntil || !characterId) return;
    if (new Date() >= cooldownUntil) {
      setCooldownUntil(null);
      clearCharacterCooldown(characterId);
    }
    const interval = setInterval(() => {
      if (new Date() >= (cooldownUntil)) {
        setCooldownUntil(null);
        clearCharacterCooldown(characterId);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [cooldownUntil, characterId]);

  // Fetch credit balance
  useEffect(() => {
    if (!auth.token) return;
    fetch(`${API}/billing/wallet`, { headers: headers() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setCreditBalance(data.balance ?? 0); })
      .catch(() => {});
  }, [auth.token, headers]);

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
        if (base.sender !== 'character' || base.kind !== 'text') {
          // Strip JSON from non-character or non-text messages as a safety net
          if (base.kind === 'text' && base.text) {
            const stripped = stripJsonContent(base.text);
            if (stripped !== base.text) return [{ ...base, text: stripped }];
          }
          return [base];
        }
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

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) sendVoiceNote(blob);
      };

      recorder.onerror = () => {
        setError('Recording failed. Please try again.');
        stopVoiceRecording();
      };

      recorder.start(100); // collect data every 100ms
      setRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            stopVoiceRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access was denied. Please allow it in your browser settings.');
      } else {
        setError('Could not access microphone.');
      }
    }
  }

  function stopVoiceRecording() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecording(false);
    setRecordingDuration(0);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  async function sendVoiceNote(audioBlob: Blob) {
    if (!auth.token || !audioBlob || audioBlob.size === 0) return;
    const optimisticId = crypto.randomUUID();
    const blobUrl = URL.createObjectURL(audioBlob);

    setMessages((current) => [...current, {
      id: optimisticId, sender: 'user', kind: 'voice_note',
      text: 'Voice note', mediaUrl: blobUrl,
      createdAt: new Date().toISOString(), delivery: 'sending', reactions: [],
    }]);

    try {
      // 1. Get upload URL
      const uploadRes = await fetch(`${API}/media/voice-note-upload-url`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize: audioBlob.size }),
      });
      if (!uploadRes.ok) throw new Error('Failed to prepare voice upload.');
      const { uploadUrl, mediaAssetId } = await uploadRes.json();

      // 2. Upload audio blob
      const uploadBlob = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': audioBlob.type },
        body: audioBlob,
      });
      if (!uploadBlob.ok && uploadBlob.status !== 200) {
        // If S3 upload fails in dev mode, use data URL directly
        throw new Error('Voice upload failed.');
      }

      // 3. Confirm upload
      await fetch(`${API}/media/confirm-upload`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaAssetId }),
      }).catch(() => {});

      // 4. Transcribe via ASR
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = (reader.result as string).split(',')[1];
          if (result) resolve(result);
          else reject(new Error('Empty audio data'));
        };
        reader.onerror = () => reject(new Error('Failed to read audio'));
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;

      const asrRes = await fetch(`${API}/ai/asr`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64 }),
      });

      let transcription = '';
      if (asrRes.ok) {
        const asrData = await asrRes.json();
        transcription = asrData.text || '';
      }

      // 5. Update message with transcription and server URL
      setMessages((current) => current.map((message) =>
        message.id === optimisticId
          ? { ...message, text: transcription || 'Voice note', delivery: 'delivered' as const }
          : message,
      ));

      // 6. If transcribed, trigger AI response
      if (transcription && characterId) {
        await sendWithContent(transcription, optimisticId, detectTextLanguage(transcription));
      }
    } catch (err: any) {
      setMessages((current) => current.map((message) =>
        message.id === optimisticId
          ? { ...message, delivery: 'failed' as const }
          : message,
      ));
      setError(err.message || 'Voice note could not be sent.');
    }
  }

  async function send() {
    const content = input.trim();
    if (!content || !auth.token || busy) return;

    // Check cooldown
    if (cooldownUntil && new Date() < cooldownUntil) {
      const mins = Math.ceil((cooldownUntil.getTime() - Date.now()) / 60000);
      setCooldownMessage(`They need some space. Try again in about ${mins} minute${mins > 1 ? 's' : ''}.`);
      setTimeout(() => setCooldownMessage(null), 4000);
      return;
    }

    // Detect language from user's message
    const lang = detectTextLanguage(content);
    setDetectedLang(lang);

    setInput('');
    await sendWithContent(content, undefined, lang);
  }

  async function sendWithContent(content: string, existingOptimisticId?: string, language?: string) {
    if (!auth.token || busy) return;
    const optimisticId = existingOptimisticId ?? crypto.randomUUID();
    const lang = language || detectTextLanguage(content);

    if (!existingOptimisticId) {
      setMessages((current) => [...current, {
        id: optimisticId, sender: 'user', kind: 'text', text: content,
        createdAt: new Date().toISOString(), delivery: 'sending', reactions: [],
      }]);
    }

    setBusy(true);
    setError(undefined);
    setStreaming('');
    let fullResponse = '';
    try {
      const response = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, conversationId, message: content, detectedLanguage: lang }),
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
            // Strip raw JSON artifacts from streaming display
            const displayText = stripJsonArtifacts(fullResponse);
            setStreaming(displayText);
          }
          if (payload.type === 'done') {
            if (payload.conversationId && !conversationId) {
              setConversationId(payload.conversationId);
              conversationIdRef.current = payload.conversationId;
            }
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
          if (payload.type === 'media_request') {
            // Check if user has auto-approve enabled for this character
            const autoApproveKey = `media_auto_approve_${characterId}`;
            const autoApprove = localStorage.getItem(autoApproveKey) === 'true';
            if (autoApprove) {
              // Auto-approve: call the approve endpoint immediately using the conversationId from the event
              const reqId = payload.requestId as string;
              const cid = (payload.conversationId as string) || conversationIdRef.current;
              if (cid) {
                approveMediaRequest(reqId, true, cid).catch(() => {});
              }
            } else {
              // Show confirmation card in chat
              setMessages((current) => [...current, {
                id: crypto.randomUUID(), sender: 'character', kind: 'media_request',
                text: payload.mediaType === 'selfie'
                  ? `📸 ${name} wants to send you a selfie`
                  : `📸 ${name} wants to send an image: "${payload.mediaPrompt ?? ''}"`,
                createdAt: new Date().toISOString(), delivery: 'delivered', reactions: [],
                mediaRequestId: payload.requestId as string,
                estimatedCredits: payload.estimatedCredits as number,
                mediaPrompt: payload.mediaPrompt as string,
                mediaRequestType: payload.mediaType as 'selfie' | 'image',
              }]);
            }
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

  async function approveMediaRequest(requestId: string, approved: boolean, overrideConversationId?: string) {
    const cid = overrideConversationId || conversationIdRef.current;
    if (!cid || !characterId) return;
    try {
      const response = await fetch(`${API}/ai/chat/media/approve`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, conversationId: cid, requestId, approved }),
      });
      if (!response.ok) throw new Error('Media approval failed.');
      const result = await response.json();

      if (result.status === 'generated' && result.url) {
        // Legacy sync path
        setMessages((current) => [...current, {
          id: crypto.randomUUID(), sender: 'character', kind: 'image',
          text: result.mediaType === 'selfie' ? `${name} sent a selfie` : `${name} sent an image`,
          mediaUrl: result.url, createdAt: new Date().toISOString(),
          delivery: 'delivered', reactions: [],
        }]);
        if (result.creditsUsed) {
          setCreditBalance((b) => Math.max(0, b - result.creditsUsed));
        }
      } else if (result.status === 'queued' && result.jobId) {
        // Async path: poll for job completion
        const placeholderId = crypto.randomUUID();
        setMessages((current) => [...current, {
          id: placeholderId, sender: 'character', kind: 'system',
          text: `🎨 ${name} is generating an image...`,
          createdAt: new Date().toISOString(), delivery: 'delivered', reactions: [],
        }]);

        // Start polling in background
        const maxPolls = 60;
        let resolved = false;
        for (let i = 0; i < maxPolls && !resolved; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const statusRes = await fetch(`${API}/ai/chat/media/status/${result.jobId}`, {
              headers: headers(),
            });
            if (!statusRes.ok) continue;
            const job = await statusRes.json();

            if (job.status === 'succeeded' && job.url) {
              resolved = true;
              setMessages((current) => [
                ...current.filter((m) => m.id !== placeholderId),
                {
                  id: crypto.randomUUID(), sender: 'character', kind: 'image',
                  text: result.mediaType === 'selfie' ? `${name} sent a selfie` : `${name} sent an image`,
                  mediaUrl: job.url, createdAt: new Date().toISOString(),
                  delivery: 'delivered', reactions: [],
                },
              ]);
              if (job.creditsUsed) {
                setCreditBalance((b) => Math.max(0, b - job.creditsUsed));
              }
            } else if (job.status === 'failed') {
              resolved = true;
              setMessages((current) => [
                ...current.filter((m) => m.id !== placeholderId),
                {
                  id: crypto.randomUUID(), sender: 'character', kind: 'system',
                  text: `⚠️ Image generation failed${job.error ? `: ${job.error}` : ''}`,
                  createdAt: new Date().toISOString(), delivery: 'delivered', reactions: [],
                },
              ]);
            }
          } catch {
            // Network error, continue polling
          }
        }
        if (!resolved) {
          setMessages((current) => [
            ...current.filter((m) => m.id !== placeholderId),
            {
              id: crypto.randomUUID(), sender: 'character', kind: 'system',
              text: `⏰ Image generation is taking too long. It may appear shortly.`,
              createdAt: new Date().toISOString(), delivery: 'delivered', reactions: [],
            },
          ]);
        }
      } else if (result.status === 'failed') {
        setError(result.message || 'Media generation failed. Please try again.');
      }
      // If denied, nothing additional to show — the request card is just removed
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Media approval failed.');
    }
  }

  function handleApproveMedia(msg: ChatMessage) {
    if (!msg.mediaRequestId) return;
    // Remove the media request card from messages
    setMessages((current) => current.filter((m) => m.id !== msg.id));
    approveMediaRequest(msg.mediaRequestId, true);
  }

  function handleDenyMedia(msg: ChatMessage) {
    if (!msg.mediaRequestId) return;
    // Remove the media request card from messages
    setMessages((current) => current.filter((m) => m.id !== msg.id));
    approveMediaRequest(msg.mediaRequestId, false);
  }

  // ── Voice Call (Walkie-Talkie Mode) ──
  async function startVoiceCall() {
    setCallActive(true);
    setCallDuration(0);
    setCallTranscript('');
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

    // Start speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = detectedLang || 'en';
      speechRecognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCallTranscript(transcript);
      };

      recognition.onerror = () => { /* silently retry */ };
      recognition.onend = () => {
        if (callActive) {
          try { recognition.start(); } catch { /* ignore */ }
        }
      };

      try { recognition.start(); } catch { /* not supported */ }
    }

    // Send initial greeting
    await sendVoiceCallMessage('Hello?');
  }

  async function sendVoiceCallMessage(text: string) {
    if (!text.trim() || !characterId || !auth.token) return;
    setCallSpeaking(true);
    try {
      const response = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, conversationId, message: text, detectedLanguage: detectedLang }),
      });
      if (!response.ok || !response.body) throw new Error('Call failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
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
          if (payload.type === 'chunk') fullResponse += payload.content;
          if (payload.type === 'done') {
            if (payload.conversationId && !conversationId) {
              setConversationId(payload.conversationId);
              conversationIdRef.current = payload.conversationId;
            }
            const parts = parseAssistantResponse(fullResponse);
            const speechText = parts.filter(p => p.type === 'speech').map(p => p.content).join('\n');
            // Speak the response via TTS
            if (speechText && !callMuted) {
              await speakTTS(speechText);
            }
          }
          if (payload.type === 'error') throw new Error(payload.message);
        }
      }
    } catch { /* call error */ }
    setCallSpeaking(false);
  }

  async function speakTTS(text: string) {
    try {
      const res = await fetch(`${API}/ai/tts`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: character?.voiceId || 'Cherry' }),
      });
      if (!res.ok) return;
      const data = await res.json() as any;
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        ttsAudioRef.current = audio;
        await audio.play();
      }
    } catch { /* TTS error */ }
  }

  function endVoiceCall() {
    setCallActive(false);
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch { /* ignore */ }
      speechRecognitionRef.current = null;
    }
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    setCallDuration(0);
    setCallTranscript('');
    setCallSpeaking(false);
    setCallMuted(false);
  }

  function toggleCallMute() {
    setCallMuted(m => !m);
    if (ttsAudioRef.current && !callMuted) {
      ttsAudioRef.current.pause();
    }
  }

  // Format duration as mm:ss
  const callDurationStr = `${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`;

  if (!auth.token) return <main className="chat-auth-required">Sign in to continue this conversation.</main>;

  return (
    <main className="real-chat-shell">
      <header className="real-chat-header safe-top">
        <button type="button" className="chat-header-button" aria-label="Go back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <Link to={`/ai/profile/${characterId}`} className="chat-identity">
          <img
            src={avatarUrl}
            alt={`${name} profile`}
            className="w-[2.65rem] h-[2.65rem] rounded-xl object-cover bg-surface-elevated shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackAvatar(name);
            }}
          />
          <span>
            <strong>{name}</strong>
            <small><i aria-hidden="true" /> {relationship?.label || t('char.gettingToKnow')}</small>
          </span>
        </Link>
        <div className="relative">
          <button type="button" className="chat-header-button" aria-label={`Call ${name}`}
            onClick={() => void startVoiceCall()}
          >
            <Phone size={19} />
          </button>
        </div>
        <div className="relative">
          <button type="button" className="chat-header-button" aria-label="Conversation options"
            onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
          >
            <MoreHorizontal size={20} />
          </button>
          {headerMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setHeaderMenuOpen(false)} />
              <div className="chat-header-dropdown">
                <button
                  onClick={() => { setHeaderMenuOpen(false); void updateMode('chat'); }}
                >
                  <MessageCircle size={14} />
                  {t('chat.switchChat')}
                </button>
                <button
                  onClick={() => { setHeaderMenuOpen(false); void updateMode('roleplay'); }}
                >
                  <Sparkles size={14} />
                  {t('chat.switchRoleplay')}
                </button>
                <button
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    if (conversationId) dispatch(deleteConv(conversationId) as any);
                    navigate('/chats');
                  }}
                  className="text-danger"
                >
                  <Trash2 size={14} />
                  {t('chat.deleteConversation')}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <nav className="conversation-mode" aria-label="Conversation mode">
        <button type="button" aria-pressed={mode === 'chat'} onClick={() => void updateMode('chat')}>{t('char.chat')}</button>
        <button type="button" aria-pressed={mode === 'roleplay'} onClick={() => void updateMode('roleplay')}>{t('char.roleplay')}</button>
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
          <MessageBubble
            key={message.id}
            message={message}
            onReact={react}
            onPlay={playVoice}
            playing={playingId === message.id}
            onApproveMedia={handleApproveMedia}
            onDenyMedia={handleDenyMedia}
            characterName={name}
            characterId={characterId || undefined}
            creditBalance={creditBalance}
            characterAvatarUrl={avatarUrl}
            userAvatarUrl={userAvatar}
          />
        ))}
        {streaming && <div className="character-typing"><span /><span /><span /></div>}
        <div ref={bottomRef} />
      </section>

      <input ref={uploadRef} type="file" accept="image/*" hidden />

      {/* Cooldown message */}
      {(cooldownMessage || cooldownUntil) && (
        <div className="px-4 pt-3 pb-1">
          {cooldownMessage ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm text-amber-400 text-center animate-fade-in">
              {cooldownMessage}
            </div>
          ) : cooldownUntil && new Date() < cooldownUntil ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm text-amber-400 text-center animate-fade-in">
              They need some space right now. Try again in a few minutes.
            </div>
          ) : null}
        </div>
      )}

      {/* ── Voice Call Overlay ── */}
      {callActive && (
        <div className="voice-call-overlay">
          <div className="voice-call-card">
            <div className="voice-call-avatar">
              <img src={avatarUrl} alt={name} />
            </div>
            <h2 className="voice-call-name">{name}</h2>
            <p className="voice-call-status">
              {callSpeaking ? 'Speaking...' : callMuted ? 'Muted' : 'Connected'}
            </p>
            <p className="voice-call-duration">{callDurationStr}</p>
            {callTranscript && (
              <p className="voice-call-transcript">{callTranscript}</p>
            )}
            <div className="voice-call-controls">
              <button
                className={`voice-call-btn ${callMuted ? 'voice-call-btn-active' : ''}`}
                onClick={toggleCallMute}
                aria-label={callMuted ? 'Unmute' : 'Mute'}
              >
                {callMuted ? '🔇 Muted' : '🎤 Mute'}
              </button>
              <button
                className="voice-call-btn voice-call-btn-hangup"
                onClick={endVoiceCall}
                aria-label="End call"
              >
                📞 End
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatComposer
        characterName={name}
        value={input}
        disabled={busy || (cooldownUntil !== null && new Date() < cooldownUntil)}
        error={error}
        recording={recording}
        recordingDuration={recordingDuration}
        onChange={setInput}
        onSend={() => void send()}
        onVoicePressStart={() => void startVoiceRecording()}
        onVoicePressEnd={stopVoiceRecording}
        onImage={() => uploadRef.current?.click()}
      />
    </main>
  );
}
