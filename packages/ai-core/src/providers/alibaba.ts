import { getConfig } from '@itchats/config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface ChatResponse {
  content: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export async function alibabaChat(request: ChatRequest): Promise<ChatResponse> {
  const config = getConfig();
  const model = request.model || 'qwen3.5-flash';

  const response = await fetchWithRetry(`${config.ALIBABA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.maxTokens ?? 500,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Alibaba chat error (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? model,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined,
  };
}

export async function* alibabaChatStream(
  request: ChatRequest,
): AsyncIterable<string> {
  const config = getConfig();
  const model = request.model || 'qwen3.5-flash';

  const response = await fetchWithRetry(`${config.ALIBABA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.8,
      max_tokens: request.maxTokens ?? 500,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Alibaba stream error (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // Skip unparseable chunks
      }
    }
  }
}

interface TextToImageRequest {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
}

interface ImageResult {
  url: string;
  model: string;
}

export async function alibabaTextToImage(request: TextToImageRequest): Promise<ImageResult> {
  const config = getConfig();
  const model = request.model || IMAGE_FALLBACK_MODELS[0];
  return callImageGen(model, request, config);
}

function getNativeBase() {
  const config = getConfig();
  // Dedicated workspaces: native API available for TTS/ASR/Video (not images)
  const base = config.ALIBABA_BASE_URL;
  if (base.includes('maas.aliyuncs.com')) {
    return base.replace('/compatible-mode/v1', '/api/v1/services');
  }
  return 'https://dashscope-intl.aliyuncs.com/api/v1/services';
}

/** Check if we're using a dedicated workspace key */
function isWorkspaceKey() {
  return getConfig().ALIBABA_API_KEY?.startsWith('sk-ws-');
}

/** Try image generation via compatible-mode chat endpoint (multimodal content format) */
async function callImageGenCompat(model: string, request: TextToImageRequest, config: ReturnType<typeof getConfig>): Promise<ImageResult> {
  const size = request.size ?? '1024*1024';
  const [w, h] = size.replace(/\*/g, 'x').split('x').map(Number);
  const response = await fetchWithRetry(`${config.ALIBABA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: [{ type: 'text', text: request.prompt }] }],
      max_tokens: 2000,
    }),
  }, 2, 60000);
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Image ${model} compat (${response.status}): ${errText.slice(0, 200)}`);
  }
  const data: any = await response.json();
  // Alibaba multimodal chat response format: output.choices[0].message.content[0].image
  const content = data.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    const imagePart = content.find((c: any) => c.image);
    if (imagePart?.image) return { url: imagePart.image, model };
  }
  // Fallback: standard OpenAI format data[0].url
  const url = data.data?.[0]?.url;
  if (url) return { url, model };
  throw new Error(`Image ${model} compat: no image in response — ${JSON.stringify(data).slice(0, 200)}`);
}

async function callImageGen(model: string, request: TextToImageRequest, config: ReturnType<typeof getConfig>): Promise<ImageResult> {
  const response = await fetchWithRetry(`${getNativeBase()}/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: { prompt: request.prompt },
      parameters: { size: request.size ?? '1024*1024', n: request.n ?? 1 },
    }),
  }, 2, 30000);
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Image ${model} (${response.status}): ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  const url = data.output?.results?.[0]?.url || data.data?.[0]?.url;
  if (!url) throw new Error(`Image ${model}: no URL in response — ${JSON.stringify(data).slice(0, 200)}`);
  return { url, model };
}

/** Try image models in fallback order — compat-mode first, then native (if not workspace key) */
export async function alibabaTextToImageWithFallback(request: TextToImageRequest): Promise<ImageResult & { usedModel: string }> {
  const config = getConfig();
  const tried: string[] = [];

  // Phase 1: Try compatible-mode (OpenAI format) — works with dedicated workspaces
  for (const model of IMAGE_FALLBACK_MODELS_COMPAT) {
    try {
      const result = await callImageGenCompat(model, request, config);
      return { ...result, usedModel: model };
    } catch (err: any) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
    }
  }
  // Phase 2: Try native DashScope endpoints as fallback (only for non-workspace keys)
  if (!isWorkspaceKey()) {
    for (const model of IMAGE_FALLBACK_MODELS) {
      try {
        const result = await callImageGen(model, request, config);
        return { ...result, usedModel: model };
      } catch (err: any) {
        tried.push(`${model}: ${err.message.slice(0, 80)}`);
      }
    }
  }
  throw new Error(`All image models exhausted. Tried: ${tried.join(' | ')}`);
}

interface TTSRequest {
  text: string;
  voice?: string;
  model?: string;
  emotion?: 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted' | 'neutral';
  speed?: number;
}

interface AudioResult {
  audioBase64: string;
  format: string;
}

const TTS_VOICES: Record<string, { label: string; gender: string; style: string; desc: string }> = {
  longanlingxi: { label: 'Emily',    gender: 'female', style: 'Warm',    desc: 'Soft, natural — warm companion' },
  longxiaochun:  { label: 'Claire',  gender: 'female', style: 'Gentle',  desc: 'Calm, tender — close listener' },
  longxiaoxia:   { label: 'Maya',   gender: 'female', style: 'Bright',   desc: 'Cheerful, lively — social spark' },
  longxiaobai:   { label: 'Lily',   gender: 'female', style: 'Cute',     desc: 'Sweet, playful — youthful charm' },
  longyuer:      { label: 'Sophie', gender: 'female', style: 'Mature',   desc: 'Elegant, calm — narrative voice' },
  longshu:       { label: 'James',  gender: 'male',   style: 'Deep',     desc: 'Rich, smooth — commanding tone' },
  longshao:      { label: 'Daniel', gender: 'male',   style: 'Warm',     desc: 'Friendly, welcoming — easy talk' },
  longcheng:     { label: 'Alex',   gender: 'male',   style: 'Clear',    desc: 'Crisp, professional — business voice' },
};

/** Chat / LLM models in fallback order — general-purpose fast models only */
const CHAT_FALLBACK_MODELS = [
  'qwen3.6-flash',
  'qwen3.6-flash-2026-04-16',
  'qwen3.5-flash',
  'qwen3.5-flash-2026-02-23',
  'qwen-flash',
  'qwen-flash-2025-07-28',
  'qwen-flash-character',
  'qwen-plus',
  'qwen-plus-latest',
  'qwen-plus-2025-09-11',
  'qwen-plus-2025-07-28',
  'qwen-plus-2025-07-14',
  'qwen-plus-2025-04-28',
  'qwen-plus-character',
  'qwen-turbo',
  'deepseek-v4-flash',
];

/** Text-to-Image models — compatible-mode (OpenAI format) first, tried in priority order */
const IMAGE_FALLBACK_MODELS_COMPAT = [
  'qwen-image-2.0-pro',
  'qwen-image-2.0-pro-2026-06-22',
  'qwen-image-2.0-pro-2026-04-22',
  'qwen-image-2.0-pro-2026-03-03',
  'qwen-image-max',
  'qwen-image-max-2025-12-30',
  'qwen-image-plus',
  'qwen-image-plus-2026-01-09',
  'qwen-image-2.0',
  'qwen-image-2.0-2026-03-03',
  'wan2.7-image-pro',
  'wan2.7-image',
  'z-image-turbo',
];

/** Text-to-Image models — native DashScope format (fallback) */
const IMAGE_FALLBACK_MODELS = [
  'qwen-image-2.0-pro',
  'qwen-image-max',
  'qwen-image-plus',
  'qwen-image-2.0',
  'qwen-image',
  'wan2.7-image-pro',
  'wan2.7-image',
  'z-image-turbo',
];

/** Fetch with timeout and retry for unreliable connections */
async function fetchWithRetry(url: string, init: RequestInit, retries = 2, timeoutMs = 8000): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      return res;
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // backoff
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Unreachable');
}

const TTS_FALLBACK_MODELS = ['qwen3-tts-instruct-flash', 'qwen3-tts-flash'];
const TTS_COMPAT_VOICES = ['cherry', 'stella'];

/** Voice profiles for qwen3-tts-instruct-flash — instruction-based natural voices */
const TTS_VOICE_PROFILES: Record<string, { label: string; gender: string; accent: string; instruction: string }> = {
  aria:    { label: 'Aria',    gender: 'female', accent: 'American', instruction: 'bright, energetic, young American female voice, cheerful and bubbly, modern Gen-Z style' },
  stella:  { label: 'Stella',  gender: 'female', accent: 'British',  instruction: 'elegant, refined British female voice, calm and sophisticated, like a BBC presenter' },
  luna:    { label: 'Luna',    gender: 'female', accent: 'American', instruction: 'soft, gentle, whispery female voice, warm and intimate, ASMR quality, slow pace' },
  iris:    { label: 'Iris',    gender: 'female', accent: 'American', instruction: 'mature, wise female voice, motherly and reassuring, clear American accent, calm tone' },
  sage:    { label: 'Sage',    gender: 'female', accent: 'American', instruction: 'casual, laid-back female voice, slightly husky, California style, relaxed and cool' },
  marcus:  { label: 'Marcus',  gender: 'male',   accent: 'American', instruction: 'warm, friendly male voice, deep and resonant, natural American accent, like a podcast host' },
  james:   { label: 'James',   gender: 'male',   accent: 'British',  instruction: 'deep, authoritative male voice, British accent, commanding and confident, like a movie narrator' },
  theo:    { label: 'Theo',    gender: 'male',   accent: 'American', instruction: 'young, energetic male voice, upbeat American accent, friendly and approachable, Gen-Z style' },
  oliver:  { label: 'Oliver',  gender: 'male',   accent: 'British',  instruction: 'warm, gentle male voice, soft British accent, kind and thoughtful, like a teacher' },
};

export function getTTSVoices() {
  return Object.entries(TTS_VOICE_PROFILES).map(([id, p]) => ({
    id, label: p.label, gender: p.gender, accent: p.accent, desc: p.instruction.substring(0, 80),
  }));
}

/** TTS via native DashScope API — uses instruct model for natural voices */
async function callTTSCompat(model: string, request: TTSRequest, config: ReturnType<typeof getConfig>): Promise<AudioResult> {
  const nativeBase = getNativeBase();

  // Use qwen3-tts-instruct-flash with voice profiles for natural English speech
  if (request.voice && TTS_VOICE_PROFILES[request.voice]) {
    const profile = TTS_VOICE_PROFILES[request.voice];
    const instructText = `[Voice: ${profile.instruction}] [Style: ${request.emotion || 'neutral'}] Speak naturally: ${request.text}`;
    const response = await fetchWithRetry(`${nativeBase}/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen3-tts-instruct-flash', input: { text: instructText }, parameters: { format: 'mp3', speed: request.speed ?? 1.0 } }),
    }, 1, 30000);
    if (!response.ok) { const errText = await response.text().catch(() => ''); throw new Error(`TTS instruct (${response.status}): ${errText.slice(0, 200)}`); }
    const data: any = await response.json();
    const audioUrl = data.output?.audio?.url;
    if (!audioUrl) throw new Error(`TTS instruct: no audio URL`);
    const audioRes = await fetchWithRetry(audioUrl, {}, 1, 15000);
    if (!audioRes.ok) throw new Error(`TTS instruct: download failed (${audioRes.status})`);
    const arrayBuffer = await audioRes.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error(`TTS instruct: empty audio`);
    return { audioBase64: Buffer.from(arrayBuffer).toString('base64'), format: 'mp3' };
  }

  // Fallback: qwen3-tts-flash with cherry/stella voices
  const voice = request.voice && TTS_COMPAT_VOICES.includes(request.voice) ? request.voice : TTS_COMPAT_VOICES[0];
  const response = await fetchWithRetry(`${nativeBase}/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen3-tts-flash', input: { text: request.text }, parameters: { voice, format: 'mp3' } }),
  }, 1, 30000);
  if (!response.ok) { const errText = await response.text().catch(() => ''); throw new Error(`TTS flash (${response.status}): ${errText.slice(0, 200)}`); }
  const data: any = await response.json();
  const audioUrl = data.output?.audio?.url;
  if (!audioUrl) throw new Error(`TTS flash: no audio URL`);
  const audioRes = await fetchWithRetry(audioUrl, {}, 1, 15000);
  if (!audioRes.ok) throw new Error(`TTS flash: download failed (${audioRes.status})`);
  const arrayBuffer = await audioRes.arrayBuffer();
  if (arrayBuffer.byteLength === 0) throw new Error(`TTS flash: empty audio`);
  return { audioBase64: Buffer.from(arrayBuffer).toString('base64'), format: 'mp3' };
}

/**
 * Non-streaming TTS via WebSocket (DashScope native protocol) — fallback only.
 * Establishes WS connection, sends run-task + continue-task + finish-task, collects binary audio.
 */
async function callTTS(model: string, request: TTSRequest, apiKey: string, _baseUrlCompat: string): Promise<AudioResult> {
  const { WebSocket } = await import('ws');
  const taskId = crypto.randomUUID();
  const wsUrl = 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=' + model;
  const text = request.text;
  const voice = request.voice ?? 'longanlingxi';

  return new Promise((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    let resolved = false;

    const ws = new WebSocket(wsUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; ws.close(); reject(new Error(`TTS ${model}: WS timeout`)); }
    }, 25000);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: {
          task_group: 'audio', task: 'tts', function: 'SpeechSynthesizer', model,
          parameters: { text_type: 'PlainText', voice, format: 'mp3', sample_rate: 22050, volume: 50, rate: 1.0, pitch: 1.0 },
          input: {},
        },
      }));
    });

    ws.on('message', (data: any) => {
      if (data instanceof Buffer || data instanceof ArrayBuffer) {
        audioChunks.push(Buffer.from(data));
        return;
      }
      try {
        const msg = JSON.parse(data.toString());
        const action = msg?.header?.action;
        if (action === 'task-started') {
          ws.send(JSON.stringify({
            header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
            payload: { input: { text } },
          }));
          ws.send(JSON.stringify({
            header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
            payload: { input: {} },
          }));
        } else if (action === 'task-finished') {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            ws.close();
            const full = Buffer.concat(audioChunks);
            if (full.length === 0) reject(new Error(`TTS ${model}: empty audio`));
            else resolve({ audioBase64: full.toString('base64'), format: 'mp3' });
          }
        } else if (action === 'error' || msg?.type === 'error') {
          clearTimeout(timeout);
          resolved = true; ws.close();
          reject(new Error(`TTS ${model}: ${msg?.error?.message || JSON.stringify(msg).slice(0, 200)}`));
        }
      } catch {}
    });
    ws.on('error', (err) => { clearTimeout(timeout); if (!resolved) { resolved = true; reject(new Error(`TTS ${model}: ${err.message}`)); } });
    ws.on('close', () => clearTimeout(timeout));
  });
}

export async function alibabaTTS(request: TTSRequest): Promise<AudioResult> {
  const config = getConfig();
  const model = request.model || TTS_FALLBACK_MODELS[0];
  return callTTSCompat(model, request, config);
}

/** Try TTS models in fallback order */
export async function alibabaTTSWithFallback(request: TTSRequest): Promise<AudioResult & { usedModel: string }> {
  const config = getConfig();
  const tried: string[] = [];
  for (const model of TTS_FALLBACK_MODELS) {
    try {
      const result = await callTTSCompat(model, request, config);
      return { ...result, usedModel: model };
    } catch (err: any) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
    }
  }
  throw new Error(`All TTS models exhausted. Tried: ${tried.join(' | ')}`);
}

/** Try chat models in fallback order until one succeeds */
export async function alibabaChatWithFallback(request: ChatRequest): Promise<ChatResponse & { usedModel: string }> {
  const tried: string[] = [];
  for (const model of CHAT_FALLBACK_MODELS) {
    try {
      const result = await alibabaChat({ ...request, model });
      return { ...result, usedModel: model };
    } catch (err: any) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
    }
  }
  throw new Error(`All chat models exhausted. Tried: ${tried.join(' | ')}`);
}

interface EmbeddingRequest {
  input: string[];
  model?: string;
}

export async function alibabaEmbedText(request: EmbeddingRequest): Promise<number[][]> {
  const config = getConfig();
  const model = request.model || 'text-embedding-v4';

  const response = await fetchWithRetry(`${config.ALIBABA_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: request.input }),
  });

  if (!response.ok) {
    throw new Error(`Alibaba embedding error (${response.status})`);
  }

  const data = await response.json();
  return data.data?.map((d: { embedding: number[] }) => d.embedding) ?? [];
}

// ── Speech-to-Text (ASR) ──

interface ASRRequest { audioBase64: string; model?: string; }

const ASR_FALLBACK_MODELS = ['qwen3-asr-flash', 'qwen3-asr-flash-2026-02-10', 'paraformer-realtime-v2'];

export async function alibabaASR(request: ASRRequest): Promise<{ text: string; language?: string }> {
  const config = getConfig();
  const tried: string[] = [];

  // Phase 1: Compatible-mode HTTP (OpenAI audio/transcriptions format)
  for (const model of ASR_FALLBACK_MODELS) {
    try {
      const audioBuffer = Buffer.from(request.audioBase64, 'base64');
      // Build multipart/form-data manually for Node.js compatibility
      const boundary = '----AlibabaASRBoundary' + Math.random().toString(36).slice(2);
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`;
      const footer = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n--${boundary}--\r\n`;
      const headerBytes = Buffer.from(header, 'utf-8');
      const footerBytes = Buffer.from(footer, 'utf-8');
      const body = Buffer.concat([headerBytes, audioBuffer, footerBytes]);

      const response = await fetchWithRetry(`${config.ALIBABA_BASE_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      }, 1, 15000);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`ASR ${model} compat (${response.status}): ${errText.slice(0, 200)}`);
      }
      const data = await response.json();
      const text = data.text || '';
      if (!text) throw new Error(`ASR ${model} compat: empty transcript`);
      return { text, language: data.language };
    } catch (err: any) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
    }
  }

  // Phase 2: Native DashScope multimodal generation (fallback, only for non-workspace keys)
  if (!isWorkspaceKey()) {
    for (const model of ASR_FALLBACK_MODELS) {
      try {
        const nativeBase = getNativeBase();
        if (!nativeBase) continue;
        const response = await fetchWithRetry(`${nativeBase}/aigc/multimodal-generation/generation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: { audio: request.audioBase64 },
        }),
      }, 2, 15000);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`ASR ${model} native (${response.status}): ${errText.slice(0, 200)}`);
      }
      const data = await response.json();
      const text = data.output?.text || data.output?.transcript || data.text || '';
      if (text) return { text, language: data.output?.language };
      tried.push(`${model}: empty transcript`);
    } catch (err: any) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
    }
  }
  }

  throw new Error(`All ASR models exhausted. Tried: ${tried.join(' | ')}`);
}

// ── Image-to-Image (ITI) ──

interface ImageToImageRequest { prompt: string; imageBase64: string; model?: string; strength?: number; }

const ITI_FALLBACK_MODELS = ['wan2.7-image-pro', 'wan2.7-image', 'qwen-image-edit-max', 'qwen-image-edit-plus'];

export async function alibabaImageToImage(request: ImageToImageRequest): Promise<ImageResult> {
  const config = getConfig();
  const tried: string[] = [];

  // Use chat completions endpoint with multimodal content (image + text)
  for (const model of ITI_FALLBACK_MODELS) {
    try {
      const imageUrl = request.imageBase64.startsWith('data:')
        ? request.imageBase64
        : `data:image/png;base64,${request.imageBase64}`;

      const response = await fetchWithRetry(`${config.ALIBABA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: request.prompt },
            ],
          }],
          max_tokens: 2000,
        }),
      }, 2, 60000);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`ITI ${model} compat (${response.status}): ${errText.slice(0, 200)}`);
      }
      const data: any = await response.json();
      // Alibaba multimodal response: output.choices[0].message.content[0].image
      const content = data.output?.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        const imagePart = content.find((c: any) => c.image);
        if (imagePart?.image) return { url: imagePart.image, model };
      }
      tried.push(`${model}: no image in response`);
    } catch (err: any) { tried.push(`${model}: ${err.message.slice(0, 80)}`); }
  }

  // Phase 2: Native DashScope (fallback, only for non-workspace keys)
  if (!isWorkspaceKey()) {
    const nativeBase = getNativeBase();
    if (nativeBase) {
      for (const model of ['qwen-image-2.0', 'qwen-image']) {
        try {
          const response = await fetchWithRetry(`${nativeBase}/aigc/text2image/image-synthesis`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              input: { prompt: request.prompt, ref_image: request.imageBase64 || undefined },
              parameters: { size: '1024*1024', n: 1 },
            }),
          }, 2, 30000);
          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`ITI ${model} native (${response.status}): ${errText.slice(0, 200)}`);
          }
          const data: any = await response.json();
          const url = data.output?.results?.[0]?.url;
          if (url) return { url, model };
          tried.push(`${model}: no URL in response`);
        } catch (err: any) { tried.push(`${model}: ${err.message.slice(0, 80)}`); }
      }
    }
  }
  throw new Error(`All ITI models exhausted. Tried: ${tried.join(' | ')}`);
}

// ── Text-to-Video (TTV) ──

interface TextToVideoRequest { prompt: string; model?: string; duration?: number; }

const TTV_FALLBACK_MODELS = ['wan2.1-t2v-turbo', 'wan2.7-t2v', 'wan2.1-t2v-plus', 'wan2.6-t2v'];

export async function alibabaTextToVideo(request: TextToVideoRequest): Promise<{ taskId: string; status: string }> {
  const config = getConfig();
  const model = request.model || TTV_FALLBACK_MODELS[0];
  const tried: string[] = [];

  // Native DashScope with async header (required for workspace keys)
  for (const m of [model, ...TTV_FALLBACK_MODELS.filter(x => x !== model)]) {
    try {
      const response = await fetchWithRetry(`${getNativeBase()}/aigc/video-generation/video-synthesis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: m,
          input: { prompt: request.prompt },
          parameters: { duration: request.duration || 5 },
        }),
      }, 2, 30000);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`TTV ${m} (${response.status}): ${errText.slice(0, 200)}`);
      }
      const data: any = await response.json();
      const taskId = data.output?.task_id || data.task_id || '';
      if (taskId) return { taskId, status: data.output?.task_status || 'PENDING' };
      tried.push(`${m}: no task_id`);
    } catch (err: any) { tried.push(`${m}: ${err.message.slice(0, 80)}`); }
  }
  throw new Error(`All TTV models exhausted. Tried: ${tried.join(' | ')}`);
}

export async function alibabaGetVideoResult(taskId: string): Promise<{ url?: string; status: string }> {
  const config = getConfig();

  // Native DashScope with async support
  const response = await fetchWithRetry(`${getNativeBase()}/aigc/video-generation/video-synthesis/${taskId}`, {
    headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}` },
  }, 1, 10000);
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Video result (${response.status}): ${errText.slice(0, 200)}`);
  }
  const data: any = await response.json();
  const url = data.output?.video_url || data.output?.results?.[0]?.url || data.output?.results?.[0]?.video_url;
  return { url, status: data.output?.task_status || 'UNKNOWN' };
}

// ── Image-to-Video (ITV) ──

interface ImageToVideoRequest { prompt: string; imageBase64: string; model?: string; }

const ITV_FALLBACK_MODELS = ['wan2.1-i2v-turbo', 'wan2.7-i2v', 'wan2.1-i2v-plus', 'wan2.6-i2v'];

export async function alibabaImageToVideo(request: ImageToVideoRequest): Promise<{ taskId: string; status: string }> {
  const config = getConfig();
  const model = request.model || ITV_FALLBACK_MODELS[0];
  const tried: string[] = [];

  // Native DashScope with async header
  for (const m of [model, ...ITV_FALLBACK_MODELS.filter(x => x !== model)]) {
    try {
      const response = await fetchWithRetry(`${getNativeBase()}/aigc/video-generation/video-synthesis`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: m,
          input: { prompt: request.prompt, image: request.imageBase64 || undefined },
        }),
      }, 2, 30000);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`ITV ${m} (${response.status}): ${errText.slice(0, 200)}`);
      }
      const data: any = await response.json();
      const taskId = data.output?.task_id || data.task_id || '';
      if (taskId) return { taskId, status: data.output?.task_status || 'PENDING' };
      tried.push(`${m}: no task_id`);
    } catch (err: any) { tried.push(`${m}: ${err.message.slice(0, 80)}`); }
  }
  throw new Error(`All ITV models exhausted. Tried: ${tried.join(' | ')}`);
}
