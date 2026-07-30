import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  MessageSquare, Image, Mic, Video, Camera, Music, Upload,
  Send, Square, Zap, Clock
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
  { id: 'itv', label: 'Image→Video', icon: Video },
];

const MODELS = {
  llm: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'deepseek-r1'],
  tts: ['cosyvoice-v2', 'cosyvoice-v1'],
  tti: ['qwen-image-2.0-pro', 'flux-dev'],
  iti: ['qwen-vl-max', 'qwen-vl-plus'],
  ttv: ['cogvideox-v2', 'cogvideox-v1'],
  itv: ['cogvideox-v2', 'cogvideox-v1'],
};

const PRESETS: Record<string, { label: string; content: string }[]> = {
  llm: [
    { label: 'Friendly greeting', content: 'Hello! How are you doing today?' },
    { label: 'Roleplay intro', content: 'You are a wise old wizard in a fantasy tavern. A traveler approaches you and asks for advice about a dangerous quest.' },
    { label: 'Story prompt', content: 'Write a short story about a robot who discovers emotions for the first time.' },
    { label: 'Code help', content: 'Explain how async/await works in JavaScript with a simple example.' },
  ],
  tts: [
    { label: 'Welcome', content: 'Welcome to ItChats AI! This is a text to speech test.' },
    { label: 'Narration', content: 'The sun set behind the mountains, painting the sky in shades of orange and purple.' },
  ],
  stt: [{ label: 'Record', content: 'Click Play and speak into your microphone' }],
  tti: [
    { label: 'Portrait', content: 'A beautiful portrait of a woman with flowing red hair, cinematic lighting, 8k, photorealistic' },
    { label: 'Landscape', content: 'A serene mountain lake at sunrise, mist rising from the water, pine trees on the shore, ultra detailed' },
    { label: 'Fantasy', content: 'A majestic dragon perched on a crystal castle floating in the clouds, fantasy art, vibrant colors' },
  ],
  iti: [
    { label: 'Enhance', content: 'Enhance this image with better lighting and sharper details' },
    { label: 'Stylize', content: 'Transform this image into a watercolor painting style' },
  ],
  ttv: [
    { label: 'Nature', content: 'A waterfall in a lush green forest, gentle water flow, birds flying, 5 seconds, cinematic' },
    { label: 'Abstract', content: 'Colorful particles swirling and forming geometric shapes, 3 seconds, smooth motion' },
  ],
  itv: [{ label: 'Animate', content: 'Animate this image with subtle motion, slow pan and zoom effect' }],
};

interface LogEntry { time: number; delta: number; message: string; type: 'info' | 'success' | 'error' | 'warn' | 'data'; }

export default function AITestingTab() {
  const { token } = useSelector((s: RootState) => s.auth);
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
  const [model, setModel] = useState('qwen-turbo');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const startTimeRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = Date.now();
    const delta = startTimeRef.current ? now - startTimeRef.current : 0;
    setLogs(prev => [...prev, { time: now, delta, message, type }]);
  };

  const resetDebug = () => {
    setLogs([]); setOutput(''); setResultUrl(''); setAudioUrl(''); setError('');
    startTimeRef.current = Date.now();
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers } });

  const abort = () => { abortRef.current?.abort(); setStreaming(false); setLoading(false); addLog('Aborted by user', 'warn'); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  // ── LLM Stream ──
  const runLLM = async () => {
    if (!prompt.trim()) return;
    resetDebug(); setStreaming(true);
    abortRef.current = new AbortController();
    const t0 = Date.now();
    addLog(`Starting LLM request: "${prompt.slice(0, 80)}..." - model: ${model}`, 'info');
    try {
      const res = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: prompt, model, temperature, maxTokens }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const reader = res.body?.getReader();
      if (!reader) { addLog('No readable stream', 'error'); setStreaming(false); return; }
      const decoder = new TextDecoder();
      let buffer = ''; let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) { addLog(`Stream ended — ${chunkCount} chunks, ${Date.now() - t0}ms total`, 'success'); break; }
        chunkCount++;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.type === 'error') { setError(json.message); addLog(`Stream error: ${json.message}`, 'error'); }
              else if (json.type === 'done') addLog(`Done — credits: ${json.creditsUsed}`, 'success');
              else if (json.content) setOutput(prev => prev + json.content);
            } catch { setOutput(prev => prev + data); }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') { setError(e.message); addLog(`LLM error: ${e.message}`, 'error'); }
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
      const res = await fetch(`${API}/ai/tts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: prompt, voice: 'default' }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); addLog(`TTS error: ${data.error}`, 'error'); }
      else if (data.audioBase64 || data.audioUrl || data.audio) {
        setAudioUrl(data.audioBase64 || data.audioUrl || data.audio);
        addLog(`Audio ready (${Date.now() - t0}ms total)`, 'success');
      } else { setError('No audio returned'); }
    } catch (e: any) { if (e.name !== 'AbortError') { setError(e.message); } }
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
      const res = await fetch(`${API}/ai/image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, model }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); addLog(`TTI error: ${data.error}`, 'error'); }
      else if (data.url || data.imageUrl) { setResultUrl(data.url || data.imageUrl); addLog(`Image ready (${Date.now() - t0}ms total)`, 'success'); }
      else { setError('No URL returned'); }
    } catch (e: any) { if (e.name !== 'AbortError') { setError(e.message); } }
    setLoading(false);
  };

  // ── ITI ──
  const runITI = async () => {
    if (!prompt.trim()) return;
    if (!imageBase64) { setError('Please upload an image first'); return; }
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    const t0 = Date.now();
    try {
      const res = await fetch(`${API}/ai/image-to-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, imageBase64, model }),
        signal: abortRef.current.signal,
      });
      addLog(`Response: ${res.status} (${Date.now() - t0}ms)`, res.ok ? 'success' : 'warn');
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else if (data.url) { setResultUrl(data.url); addLog(`Image ready`, 'success'); }
      else { setError('No URL'); }
    } catch (e: any) { if (e.name !== 'AbortError') { setError(e.message); } }
    setLoading(false);
  };

  // ── TTV ──
  const runTTV = async () => {
    if (!prompt.trim()) return;
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    const t0 = Date.now();
    try {
      const res = await fetch(`${API}/ai/text-to-video`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, model }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setOutput(JSON.stringify(data, null, 2));
        addLog(`Task submitted — id: ${data.taskId}`, 'success');
        if (data.taskId) pollVideoResult(data.taskId, t0);
      }
    } catch (e: any) { if (e.name !== 'AbortError') { setError(e.message); } }
    setLoading(false);
  };

  // ── ITV ──
  const runITV = async () => {
    if (!prompt.trim() || !imageBase64) { setError('Please upload an image first'); return; }
    resetDebug(); setLoading(true);
    abortRef.current = new AbortController();
    const t0 = Date.now();
    try {
      const res = await fetch(`${API}/ai/image-to-video`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, imageBase64, model }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setOutput(JSON.stringify(data, null, 2));
        addLog(`Task submitted — id: ${data.taskId}`, 'success');
        if (data.taskId) pollVideoResult(data.taskId, t0);
      }
    } catch (e: any) { if (e.name !== 'AbortError') { setError(e.message); } }
    setLoading(false);
  };

  const pollVideoResult = async (taskId: string, startT0: number) => {
    addLog(`Polling video result for ${taskId}...`, 'info');
    let attempts = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API}/ai/video/result/${taskId}`, { headers: { Authorization: `Bearer ${token}` }, signal: abortRef.current?.signal });
        const data = await res.json();
        if (data.url) { setResultUrl(data.url); addLog(`Video ready! ${Date.now() - startT0}ms total`, 'success'); clearInterval(poll); pollRef.current = null; }
        if (data.status === 'failed' || data.status === 'error') { setError(data.error || 'Video generation failed'); clearInterval(poll); pollRef.current = null; }
        if (attempts > 60) { addLog('Timed out', 'warn'); clearInterval(poll); pollRef.current = null; }
      } catch {}
    }, 3000);
    pollRef.current = poll;
  };

  // ── STT ──
  const startSTT = async () => {
    resetDebug();
    abortRef.current = new AbortController();
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
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setLoading(true);
          try {
            const res = await fetch(`${API}/ai/asr`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ audioBase64: base64 }),
            });
            const data = await res.json();
            if (data.error) { setError(data.error); }
            else { setOutput(data.text || JSON.stringify(data)); addLog(`Transcription: "${(data.text || '').slice(0, 60)}..."`, 'success'); }
          } catch (e: any) { addLog(`ASR error: ${e.message}`, 'error'); }
          setLoading(false);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setRecording(true);
    } catch (e: any) { setError(e.message); }
  };

  const stopSTT = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1] || dataUrl);
      addLog(`Image loaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const activeTab = TABS.find(t => t.id === tab)!;
  const presets = PRESETS[tab] || [];
  const availableModels = MODELS[tab as keyof typeof MODELS] || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">AI Testing</h2>

      {/* Model & Parameters */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-500">Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500">
            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-500">Temp</label>
          <input type="number" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value) || 0)}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500 text-center" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-500">Max Tokens</label>
          <input type="number" min={1} max={8192} value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value) || 1024)}
            className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500 text-center" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setOutput(''); setResultUrl(''); setAudioUrl(''); setError(''); setImageBase64(''); setImagePreview(''); setModel(MODELS[t.id as keyof typeof MODELS]?.[0] ?? ''); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-violet-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Presets */}
      {presets.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {presets.map(p => (
            <button key={p.label} onClick={() => setPrompt(p.content)}
              className="text-[10px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Image upload for ITI / ITV */}
      {(tab === 'iti' || tab === 'itv') && (
        <div className="space-y-2">
          <label className="flex flex-col items-center gap-1 p-4 rounded-xl border-2 border-dashed border-zinc-800 hover:border-violet-500/50 cursor-pointer transition-colors">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg object-contain" />
            ) : (
              <>
                <Upload size={20} className="text-zinc-500" />
                <span className="text-[11px] text-zinc-600">Click to upload image (max 10MB)</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          {imagePreview && (
            <button onClick={() => { setImageBase64(''); setImagePreview(''); }}
              className="text-[10px] text-zinc-500 hover:text-red-400 underline">Remove image</button>
          )}
        </div>
      )}

      {/* Input area */}
      {tab !== 'stt' ? (
        <div className="flex gap-2">
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder={`Enter ${activeTab.label} prompt...`}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none"
            rows={3} />
          <div className="flex flex-col gap-1.5">
            <button onClick={
              tab === 'llm' ? runLLM : tab === 'tts' ? runTTS :
              tab === 'tti' ? runTTI : tab === 'iti' ? runITI :
              tab === 'ttv' ? runTTV : runITV
            } disabled={loading || streaming}
              className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-all">
              {streaming || loading ? <Zap size={18} className="animate-pulse" /> : <Send size={18} />}
            </button>
            {(streaming || loading) && (
              <button onClick={abort} className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
                <Square size={18} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <button onPointerDown={startSTT} onPointerUp={stopSTT} onPointerLeave={stopSTT}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-violet-600'}`}>
            <Mic size={32} className="text-white" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>
      )}

      {/* Output: text */}
      {(tab === 'llm' || tab === 'stt') && output && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed max-h-[50vh] overflow-y-auto">
          {output}
          {streaming && <span className="animate-pulse ml-0.5 text-violet-400">▌</span>}
        </div>
      )}

      {/* Output: image */}
      {(tab === 'tti' || tab === 'iti') && resultUrl && (
        <div className="rounded-xl overflow-hidden border border-zinc-800"><img src={resultUrl} alt="Generated" className="w-full" /></div>
      )}

      {/* Output: audio */}
      {tab === 'tts' && audioUrl && (
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800"><audio src={audioUrl} controls className="w-full" /></div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
      )}

      {/* Debug Log */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"><Clock size={12} /> Debug Log</span>
          <span className="text-[10px] text-zinc-600">{logs.length} events</span>
        </div>
        <div ref={logsRef} className="max-h-[30vh] overflow-y-auto bg-black/40">
          {logs.length === 0 ? (
            <p className="text-[10px] text-zinc-600 text-center py-6">Run a test to see debug output</p>
          ) : logs.map((l, i) => (
            <div key={i} className={`flex items-start gap-2 px-3 py-1.5 text-[11px] font-mono border-b border-white/[0.02] ${
              l.type === 'error' ? 'bg-red-500/10 text-red-400' :
              l.type === 'success' ? 'text-emerald-400' :
              l.type === 'warn' ? 'text-amber-400' :
              l.type === 'data' ? 'text-violet-400' : 'text-zinc-500'
            }`}>
              <span className="text-[10px] opacity-50 shrink-0 w-12 text-right">+{l.delta}ms</span>
              <span>{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
