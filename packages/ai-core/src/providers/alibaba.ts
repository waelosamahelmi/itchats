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

  const response = await fetch(`${config.ALIBABA_BASE_URL}/chat/completions`, {
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

  const response = await fetch(`${config.ALIBABA_BASE_URL}/chat/completions`, {
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
  const response = await fetch(`${config.ALIBABA_BASE_URL}/images/generations`, {
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

const TTS_VOICES: Record<string, { label: string; gender: string; style: string }> = {
  Cherry:  { label: 'Cherry', gender: 'female', style: 'Warm, friendly' },
  Rosa:    { label: 'Rosa',   gender: 'female', style: 'Soft, gentle' },
  Stella:  { label: 'Stella', gender: 'female', style: 'Bright, energetic' },
  Rita:    { label: 'Rita',   gender: 'female', style: 'Calm, mature' },
  Bella:   { label: 'Bella',  gender: 'female', style: 'Young, cheerful' },
  Luca:    { label: 'Luca',   gender: 'male',   style: 'Deep, smooth' },
  Ryan:    { label: 'Ryan',   gender: 'male',   style: 'Warm, friendly' },
  Jack:    { label: 'Jack',   gender: 'male',   style: 'Professional, clear' },
};

export function getTTSVoices() { return TTS_VOICES; }

/** TTS models in fallback order — most realistic first */
const TTS_FALLBACK_MODELS = [
  'cosyvoice-v3-plus',
  'cosyvoice-v3-flash',
  'qwen3-tts-instruct-flash',
  'qwen3-tts-instruct-flash-realtime',
  'qwen-audio-3.0-tts-plus',
  'qwen-audio-3.0-tts-flash',
  'qwen3-tts-flash',
  'qwen3-tts-flash-realtime',
  'qwen3-tts-flash-2025-09-18',
  'qwen3-tts-flash-realtime-2025-09-18',
  'qwen3-tts-flash-2025-11-27',
  'qwen3-tts-flash-realtime-2025-11-27',
  'qwen3-tts-vd-2026-01-26',
  'qwen3-tts-vd-realtime-2025-12-16',
  'qwen3-tts-vd-realtime-2026-01-15',
  'qwen3-tts-vc-2026-01-22',
  'qwen3-tts-vc-realtime-2025-11-27',
  'qwen3-tts-vc-realtime-2026-01-15',
];

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

async function callTTS(model: string, request: TTSRequest, apiKey: string, baseUrl: string): Promise<AudioResult> {
  const body: any = {
    model,
    input: { text: request.text },
    parameters: {
      voice: request.voice ?? 'Cherry',
      format: 'mp3',
      speed: request.speed ?? 1.0,
    },
  };
  if (request.emotion) body.parameters.emotion = request.emotion;

  const response = await fetch(`${baseUrl}/api/v1/services/aigc/text-to-speech/stream-synthesis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-DashScope-Async': 'disable' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`TTS ${model} (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const audioUrl = data?.output?.audio?.url ?? data?.output?.audio_url;
  if (!audioUrl) throw new Error(`TTS ${model}: no audio URL in response`);

  const audioRes = await fetch(audioUrl);
  const buffer = await audioRes.arrayBuffer();
  return { audioBase64: Buffer.from(buffer).toString('base64'), format: 'mp3' };
}

export async function alibabaTTS(request: TTSRequest): Promise<AudioResult> {
  const config = getConfig();
  const baseUrl = config.ALIBABA_BASE_URL.replace('/compatible-mode/v1', '');
  const model = request.model || TTS_FALLBACK_MODELS[0];
  return callTTS(model, request, config.ALIBABA_API_KEY, baseUrl);
}

/** Try TTS models in fallback order until one succeeds */
export async function alibabaTTSWithFallback(request: TTSRequest): Promise<AudioResult & { usedModel: string }> {
  const config = getConfig();
  const baseUrl = config.ALIBABA_BASE_URL.replace('/compatible-mode/v1', '');
  const tried: string[] = [];

  for (const model of TTS_FALLBACK_MODELS) {
    try {
      const result = await callTTS(model, request, config.ALIBABA_API_KEY, baseUrl);
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

  const response = await fetch(`${config.ALIBABA_BASE_URL}/embeddings`, {
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
