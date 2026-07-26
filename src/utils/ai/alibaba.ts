const API_BASE = process.env.REACT_APP_API_URL || '/v1';

export const MODEL_ROUTES = {
  LLM_CHAT: ['qwen3.5-flash', 'qwen3.6-flash', 'deepseek-v4-flash', 'qwen-flash'],
  TEXT_TO_IMAGE: ['wan2.2-t2i-plus', 'qwen-image-2.0', 'wan2.1-t2i-plus'],
  IMAGE_TO_IMAGE: ['qwen-image-edit-plus', 'wan2.5-i2i-preview'],
  TTS: ['qwen3-tts-flash', 'cosyvoice-v3-flash'],
  STT: ['qwen3-asr-flash'],
};

async function callBackend<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || data?.error) {
    throw new Error(data?.error || 'AI request failed');
  }
  return data as T;
}

export async function chatWithLLM(messages: any[], character?: any) {
  const lastMessage = [...messages].reverse().find((message) => message?.role === 'user')?.content ?? '';
  const response = await callBackend<{ content?: string; message?: string }>('/ai/chat', {
    message: lastMessage,
    characterId: character?.id,
  });
  return response.content ?? response.message ?? '';
}

export async function generateCharacterSuggestions(name: string, hints: string) {
  return callBackend('/characters/autofill', { name, concept: hints || 'be creative' });
}

export async function generateImage(prompt: string) {
  const response = await callBackend<{ url: string }>('/ai/image', { prompt });
  return response.url;
}

export async function editImage(imageUrl: string, prompt: string) {
  const response = await callBackend<{ url: string }>('/ai/image-to-image', { prompt, imageBase64: imageUrl });
  return response.url;
}

export async function textToSpeech(text: string) {
  const response = await callBackend<{ audioBase64: string }>('/ai/tts', { text });
  return response.audioBase64;
}
