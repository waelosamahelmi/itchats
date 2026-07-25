import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Image, Mic, Video, Camera, Music, Wand2, Upload,
  ArrowLeft, Send, Play, Download, RefreshCw, Zap, Square, Clock
} from 'lucide-react';
import type { RootState } from '@/app/store';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

const TABS = [
  { id: 'llm', label: 'LLM Chat', icon: MessageSquare },
  { id: 'tts', label: 'TTS', icon: Music },
  { id: 'stt', label: 'STT', icon: Mic },
  { id: 'tti', label: 'Text→Image', icon: Image },
  { id: 'iti', label: 'Image→Image', icon: Camera },
  { id: 'ttv', label: 'Text→Video', icon: Video },
  { id: 'itv', label: 'Image→Video', icon: Wand2 },
];

interface LogEntry { time: number; delta: number; message: string; type: 'info' | 'success' | 'error' | 'warn' | 'data'; }

const PRESETS: Record<string, { label: string; content: string }[]> = {
  llm: [
    { label: 'Friendly greeting', content: 'Hello! How are you doing today?' },
    { label: 'Roleplay intro', content: 'You are a wise old wizard in a fantasy tavern. A traveler approaches you and asks for advice about a dangerous quest.' },
    { label: 'Story prompt', content: 'Write a short story about a robot who discovers emotions for the first time.' },
    { label: 'Code help', content: 'Explain how async/await works in JavaScript with a simple example.' },
  ],
  tts: [
    { label: 'Welcome', content: 'Welcome to ItChats AI! This is a text to speech test.' },
    { label: 'Narration', content: 'The sun set behind the mountains, painting the sky in shades of orange and purple. A gentle breeze carried the scent of pine through the valley.' },
    { label: 'Short', content: 'Hello world, this is a quick test.' },
  ],
  stt: [
    { label: 'Record', content: 'Click Play and speak into your microphone' },
  ],
  tti: [
    { label: 'Portrait', content: 'A beautiful portrait of a woman with flowing red hair, cinematic lighting, 8k, photorealistic' },
    { label: 'Landscape', content: 'A serene mountain lake at sunrise, mist rising from the water, pine trees on the shore, ultra detailed' },
    { label: 'Fantasy', content: 'A majestic dragon perched on a crystal castle floating in the clouds, fantasy art, vibrant colors' },
    { label: 'Abstract', content: 'Abstract digital art representing the flow of time, swirling colors of gold and deep blue, 4k' },
  ],
  iti: [
    { label: 'Enhance', content: 'Enhance this image with better lighting and sharper details' },
    { label: 'Stylize', content: 'Transform this image into a watercolor painting style' },
  ],
  ttv: [
    { label: 'Nature', content: 'A waterfall in a lush green forest, gentle water flow, birds flying, 5 seconds, cinematic' },
    { label: 'Abstract', content: 'Colorful particles swirling and forming geometric shapes, 3 seconds, smooth motion' },
  ],
  itv: [
    { label: 'Animate', content: 'Animate this image with subtle motion, slow pan and zoom effect' },
  ],
};

export default function AdminPanelPage() {
  const nav = useNavigate();
  const { token, user } = useSelector((s: RootState) => s.auth);
  const [tab, setTab] = useState('llm');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const startTimeRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = Date.now();
    const delta = startTimeRef.current ? now - startTimeRef.current : 0;
    setLogs(prev => [...prev, { time: now, delta, message, type }]);
    setTimeout(() => logsRef.current?.scrollTo(0, logsRef.current.scrollHeight), 50);
  };

  const resetDebug = () => {
    setLogs([]); setOutput(''); setResultUrl(''); setAudioUrl(''); setError('');
    startTimeRef.current = Date.now();
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      // Strip the data:...;base64, prefix for API
      const b64 = dataUrl.split(',')[1] || dataUrl;
      setImageBase64(b64);
      addLog(`Image loaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`, 'success');
    };
    reader.onerror = () => setError('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setImageBase64(''); setImagePreview(''); };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-text-muted">Access denied</p>
      </div>
    );
  }

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
    });

  const abort = () => { abortRef.current?.abort(); setStreaming(false); setLoading(false); addLog('Aborted by user', 'warn'); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  // ── LLM Stream ──
  const runLLM = async () => {
    if (!prompt.trim()) return;
    resetDebug(); setStreaming(true);
    abortRef.current = new AbortController();
    const t0 = Date.now();
    addLog(`Starting LLM request: "${prompt.slice(0, 80)}..."`, 'info');
    try {
      addLog('POST /ai/chat/stream — connecting...', 'info');
      const res = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: prompt }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} ${res.statusText} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const reader = res.body?.getReader();
      if (!reader) { addLog('No readable stream in response body', 'error'); setStreaming(false); return; }
      addLog('Stream opened, reading chunks...', 'info');
      const decoder = new TextDecoder();
      let buffer = ''; let chunkCount = 0; let charCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) { addLog(`Stream ended — ${chunkCount} chunks, ${charCount} chars, ${Date.now() - t0}ms total`, 'success'); break; }
        chunkCount++; charCount += value?.length || 0;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.type === 'context') addLog(`Context: ${json.characterName || 'system'}`, 'data');
              else if (json.type === 'error') { setError(json.message); addLog(`Stream error: ${json.message}`, 'error'); }
              else if (json.type === 'done') addLog(`Done — credits: ${json.creditsUsed}, msgId: ${json.messageId?.slice(0,8)}`, 'success');
              else if (json.content) setOutput(prev => prev + json.content);
            } catch { setOutput(prev => prev + data); }
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') addLog('Stream aborted', 'warn');
      else { setError(e.message); addLog(`LLM error: ${e.message}`, 'error'); }
    }
    setStreaming(false);
  };

  // ── TTS ──
  const runTTS = async () => {
    if (!prompt.trim()) return;
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    addLog(`Starting TTS: "${prompt.slice(0, 80)}..."`, 'info');
    const t0 = Date.now();
    try {
      addLog('POST /ai/tts — generating...', 'info');
      const res = await fetch(`${API}/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: prompt, voice: 'default' }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} ${res.statusText} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); addLog(`TTS error: ${data.error}`, 'error'); }
      else if (data.audioBase64 || data.audioUrl || data.audio) {
        setAudioUrl(data.audioBase64 || data.audioUrl || data.audio);
        addLog(`Audio ready — format: ${data.format || 'mp3'} (${Date.now() - t0}ms total)`, 'success');
      } else { setError('No audio returned'); addLog('No audio in response', 'error'); }
    } catch (e: any) {
      if (e.name === 'AbortError') addLog('TTS aborted', 'warn');
      else { setError(e.message); addLog(`TTS error: ${e.message}`, 'error'); }
    }
    setLoading(false);
  };

  // ── TTI ──
  const runTTI = async () => {
    if (!prompt.trim()) return;
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    addLog(`Starting TTI: "${prompt.slice(0, 80)}..."`, 'info');
    const t0 = Date.now();
    try {
      addLog('POST /ai/image — generating...', 'info');
      const res = await fetch(`${API}/ai/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} ${res.statusText} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); addLog(`TTI error: ${data.error}`, 'error'); }
      else if (data.url || data.imageUrl) {
        setResultUrl(data.url || data.imageUrl);
        addLog(`Image ready — model: ${data.model || 'unknown'}, ${Date.now() - t0}ms total`, 'success');
      } else { setError('No URL returned'); addLog('No URL in response', 'error'); }
    } catch (e: any) {
      if (e.name === 'AbortError') addLog('TTI aborted', 'warn');
      else { setError(e.message); addLog(`TTI error: ${e.message}`, 'error'); }
    }
    setLoading(false);
  };

  // ── ITI ──
  const runITI = async () => {
    if (!prompt.trim()) return;
    if (!imageBase64) { setError('Please upload an image first'); addLog('No image uploaded', 'warn'); return; }
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    addLog(`Starting ITI: "${prompt.slice(0, 80)}..."`, 'info');
    const t0 = Date.now();
    try {
      addLog('POST /ai/image-to-image — generating...', 'info');
      const res = await fetch(`${API}/ai/image-to-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, imageBase64 }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} ${res.statusText} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); addLog(`ITI error: ${data.error}`, 'error'); }
      else if (data.url) {
        setResultUrl(data.url);
        addLog(`Image ready — model: ${data.model || 'unknown'}, ${Date.now() - t0}ms total`, 'success');
      } else { setError('No URL'); addLog('No URL in response', 'error'); }
    } catch (e: any) {
      if (e.name === 'AbortError') addLog('ITI aborted', 'warn');
      else { setError(e.message); addLog(`ITI error: ${e.message}`, 'error'); }
    }
    setLoading(false);
  };

  // ── TTV ──
  const runTTV = async () => {
    if (!prompt.trim()) return;
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    addLog(`Starting TTV: "${prompt.slice(0, 80)}..."`, 'info');
    const t0 = Date.now();
    try {
      addLog('POST /ai/text-to-video — submitting...', 'info');
      const res = await fetch(`${API}/ai/text-to-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} ${res.statusText} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); addLog(`TTV error: ${data.error}`, 'error'); }
      else {
        setOutput(JSON.stringify(data, null, 2));
        addLog(`Task submitted — id: ${data.taskId}, status: ${data.status} (${Date.now() - t0}ms)`, 'success');
        if (data.taskId) pollVideoResult(data.taskId, t0);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') addLog('TTV aborted', 'warn');
      else { setError(e.message); addLog(`TTV error: ${e.message}`, 'error'); }
    }
    setLoading(false);
  };

  // ── ITV ──
  const runITV = async () => {
    if (!prompt.trim()) return;
    if (!imageBase64) { setError('Please upload an image first'); addLog('No image uploaded', 'warn'); return; }
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    addLog(`Starting ITV: "${prompt.slice(0, 80)}..."`, 'info');
    const t0 = Date.now();
    try {
      addLog('POST /ai/image-to-video — submitting...', 'info');
      const res = await fetch(`${API}/ai/image-to-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, imageBase64 }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} ${res.statusText} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); addLog(`ITV error: ${data.error}`, 'error'); }
      else {
        setOutput(JSON.stringify(data, null, 2));
        addLog(`Task submitted — id: ${data.taskId}, status: ${data.status} (${Date.now() - t0}ms)`, 'success');
        if (data.taskId) pollVideoResult(data.taskId, t0);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') addLog('ITV aborted', 'warn');
      else { setError(e.message); addLog(`ITV error: ${e.message}`, 'error'); }
    }
    setLoading(false);
  };

  const pollVideoResult = async (taskId: string, startT0: number) => {
    addLog(`Polling video result for ${taskId}...`, 'info');
    let attempts = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API}/ai/video/result/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortRef.current?.signal,
        });
        const data = await res.json();
        addLog(`Poll #${attempts}: status=${data.status} (${Date.now() - startT0}ms)`, data.url ? 'success' : 'info');
        if (data.url) {
          setResultUrl(data.url);
          addLog(`Video ready! ${Date.now() - startT0}ms total`, 'success');
          clearInterval(poll); pollRef.current = null;
        }
        if (data.status === 'failed' || data.status === 'error') {
          setError(data.error || 'Video generation failed');
          addLog('Video failed', 'error');
          clearInterval(poll); pollRef.current = null;
        }
        if (attempts > 60) { addLog('Timed out after 60 polls (3 min)', 'warn'); clearInterval(poll); pollRef.current = null; }
      } catch { /* poll continues */ }
    }, 3000);
    pollRef.current = poll;
    abortRef.current?.signal?.addEventListener('abort', () => { clearInterval(poll); pollRef.current = null; });
  };

  // ── STT ──
  const startSTT = async () => {
    resetDebug();
    abortRef.current = new AbortController();
    addLog('Starting STT: requesting microphone...', 'info');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog('Microphone granted, recording...', 'success');
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        addLog(`Recording stopped — ${blob.size} bytes`, 'info');
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setLoading(true);
          addLog('POST /ai/asr — transcribing...', 'info');
          const t0 = Date.now();
          try {
            const res = await fetch(`${API}/ai/asr`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ audioBase64: base64 }),
              signal: abortRef.current?.signal,
            });
            addLog(`ASR response: ${res.status} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
            const data = await res.json();
            if (data.error) { setError(data.error); addLog(`ASR error: ${data.error}`, 'error'); }
            else {
              setOutput(data.text || JSON.stringify(data));
              addLog(`Transcription: "${(data.text || '').slice(0, 60)}..."`, 'success');
            }
          } catch (e: any) { addLog(`ASR error: ${e.message}`, 'error'); }
          setLoading(false);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setRecording(true);
    } catch (e: any) { setError(e.message); addLog(`Mic error: ${e.message}`, 'error'); }
  };
  const stopSTT = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const stop = () => { abort(); };

  const activeTab = TABS.find(t => t.id === tab)!;
  const presets = PRESETS[tab] || [];

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => nav('/profile')} className="p-1.5 rounded-full glass"><ArrowLeft size={20} className="text-text-secondary" /></button>
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Admin Panel</h1>
          <p className="text-text-muted text-xs">AI Engine Testing</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-3 pb-2 flex gap-1 overflow-x-auto scrollbar-none mask-linear-fade">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setOutput(''); setResultUrl(''); setAudioUrl(''); setError(''); setImageBase64(''); setImagePreview(''); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              tab === t.id ? 'bg-brand-primary text-white' : 'glass text-text-muted hover:text-white'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Presets */}
        {presets.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {presets.map(p => (
              <button key={p.label} onClick={() => setPrompt(p.content)}
                className="text-[10px] px-2 py-1 rounded-full bg-brand-glow/20 text-brand-secondary hover:bg-brand-glow/40 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Image upload for ITI / ITV */}
        {(tab === 'iti' || tab === 'itv') && (
          <div className="space-y-2">
            <label className="flex flex-col items-center gap-1 p-4 rounded-xl border-2 border-dashed border-border-subtle hover:border-brand-primary/50 cursor-pointer transition-colors bg-bg-surface/50">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg object-contain" />
              ) : (
                <>
                  <Upload size={20} className="text-text-muted" />
                  <span className="text-[11px] text-text-muted">Click to upload image (max 10MB)</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {imagePreview && (
              <button onClick={clearImage} className="text-[10px] text-text-muted hover:text-danger underline self-start">
                Remove image
              </button>
            )}
          </div>
        )}

        {/* Input area */}
        {tab !== 'stt' ? (
          <div className="flex gap-2">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder={`Enter ${activeTab.label} prompt...`}
              className="flex-1 bg-bg-surface rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted outline-none ring-1 ring-border-subtle focus:ring-brand-primary resize-none"
              rows={3} />
            <div className="flex flex-col gap-1.5">
              <button onClick={
                tab === 'llm' ? runLLM : tab === 'tts' ? runTTS :
                tab === 'tti' ? runTTI : tab === 'stt' ? startSTT :
                tab === 'iti' ? runITI : tab === 'ttv' ? runTTV : runITV
              } disabled={loading || streaming}
                className="p-2.5 rounded-xl bg-brand-primary text-white hover:brightness-110 disabled:opacity-50 transition-all">
                {streaming || loading ? <Zap size={18} className="animate-pulse" /> : <Send size={18} />}
              </button>
              {(streaming || loading) && (
                <button onClick={abort} className="p-2.5 rounded-xl bg-danger/20 text-danger hover:bg-danger/30 transition-all">
                  <Square size={18} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <button
              onPointerDown={startSTT}
              onPointerUp={stopSTT}
              onPointerLeave={stopSTT}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                recording ? 'bg-danger scale-110 animate-pulse' : 'bg-brand-primary'
              }`}>
              <Mic size={32} className="text-white" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs">{error}</div>
        )}

        {/* Output: stream text */}
        {(tab === 'llm' || tab === 'stt') && output && (
          <div ref={outputRef} className="p-4 rounded-xl bg-bg-surface border border-border-subtle text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed max-h-[50vh] overflow-y-auto">
            {output}
            {streaming && <span className="animate-pulse ml-0.5 text-brand-primary">▌</span>}
          </div>
        )}

        {/* Output: image */}
        {(tab === 'tti' || tab === 'iti') && resultUrl && (
          <div className="rounded-xl overflow-hidden border border-border-subtle">
            <img src={resultUrl} alt="Generated" className="w-full object-cover" />
          </div>
        )}

        {/* Output: video (TTV/ITV show task ID + poll) */}

        {/* Output: audio */}
        {(tab === 'tts') && audioUrl && (
          <div className="p-3 rounded-xl bg-bg-surface border border-border-subtle">
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        )}

        {/* ── Debug Log ── */}
        <div className="rounded-xl border border-border-subtle overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-bg-surface border-b border-border-subtle">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Clock size={12} /> Debug Log
            </span>
            <span className="text-[10px] text-text-muted">{logs.length} events</span>
          </div>
          <div ref={logsRef} className="max-h-[30vh] overflow-y-auto bg-black/30">
            {logs.length === 0 ? (
              <p className="text-[10px] text-text-muted text-center py-6">Run a test to see debug output</p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-1.5 text-[11px] font-mono border-b border-white/[0.02] ${
                  l.type === 'error' ? 'bg-danger/10 text-danger' :
                  l.type === 'success' ? 'text-success' :
                  l.type === 'warn' ? 'text-amber-400' :
                  l.type === 'data' ? 'text-brand-secondary' : 'text-text-muted'
                }`}>
                  <span className="text-[10px] opacity-50 shrink-0 w-12 text-right">+{l.delta}ms</span>
                  <span>{l.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
