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

async function callImageGen(model: string, request: TextToImageRequest, config: ReturnType<typeof getConfig>): Promise<ImageResult> {
  const response = await fetchWithRetry(`${config.ALIBABA_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ALIBABA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: request.prompt, n: request.n ?? 1, size: request.size ?? '1024x1024' }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Image ${model} (${response.status}): ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error(`Image ${model}: no URL in response`);
  return { url, model };
}

/** Try image models in fallback order until one succeeds */
export async function alibabaTextToImageWithFallback(request: TextToImageRequest): Promise<ImageResult & { usedModel: string }> {
  const config = getConfig();
  const tried: string[] = [];
  for (const model of IMAGE_FALLBACK_MODELS) {
    try {
      const result = await callImageGen(model, request, config);
      return { ...result, usedModel: model };
    } catch (err: any) {
      tried.push(`${model}: ${err.message.slice(0, 80)}`);
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

export function getTTSVoices() { return TTS_VOICES; }

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

/** Text-to-Image models in fallback order — best quality first */
const IMAGE_FALLBACK_MODELS = [
  'qwen-image-2.0-pro',
  'qwen-image-2.0-pro-2026-03-03',
  'qwen-image-2.0-pro-2026-04-22',
  'qwen-image-2.0-pro-2026-06-22',
  'qwen-image-max',
  'qwen-image-max-2025-12-30',
  'qwen-image-plus',
  'qwen-image-plus-2026-01-09',
  'qwen-image-2.0',
  'qwen-image-2.0-2026-03-03',
  'qwen-image',
  'z-image-turbo',
  'wan2.7-image-pro',
  'wan2.7-image',
  'wan2.6-image',
  'wan2.2-t2i-plus',
  'wan2.2-t2i-flash',
  'wan2.6-t2i',
  'wan2.5-t2i-preview',
  'wan2.1-t2i-plus',
  'wan2.1-t2i-turbo',
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

const TTS_FALLBACK_MODELS = ['qwen-audio-3.0-tts-flash', 'qwen-audio-3.0-tts-plus'];

/**
 * Non-streaming TTS via WebSocket (DashScope native protocol).
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
  return callTTS(request.model || TTS_FALLBACK_MODELS[0], request, getConfig().ALIBABA_API_KEY, '');
}

/** Try TTS models in fallback order until one succeeds */
export async function alibabaTTSWithFallback(request: TTSRequest): Promise<AudioResult & { usedModel: string }> {
  const config = getConfig();
  const tried: string[] = [];

  for (const model of TTS_FALLBACK_MODELS) {
    try {
      const result = await callTTS(model, request, config.ALIBABA_API_KEY, config.ALIBABA_BASE_URL);
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
