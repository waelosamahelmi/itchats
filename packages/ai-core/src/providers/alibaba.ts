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
  const model = request.model || 'qwen-image-2.0';

  const response = await fetch(`${config.ALIBABA_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: request.prompt,
      n: request.n ?? 1,
      size: request.size ?? '1024x1024',
    }),
  });

  if (!response.ok) {
    throw new Error(`Alibaba image error (${response.status})`);
  }

  const data = await response.json();
  return { url: data.data?.[0]?.url ?? '', model };
}

interface TTSRequest {
  text: string;
  voice?: string;
  model?: string;
}

interface AudioResult {
  audioBase64: string;
  format: string;
}

export async function alibabaTTS(request: TTSRequest): Promise<AudioResult> {
  const config = getConfig();
  const model = request.model || 'qwen3-tts-flash';

  const response = await fetch(`${config.ALIBABA_BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.ALIBABA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: request.text,
      voice: request.voice ?? 'default',
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    throw new Error(`Alibaba TTS error (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return { audioBase64: base64, format: 'mp3' };
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
