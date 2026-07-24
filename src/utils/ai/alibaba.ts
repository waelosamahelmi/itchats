const ALIBABA_API_KEY =
  process.env.REACT_APP_ALIBABA_API_KEY ||
  'sk-ws-H.XLIIHH.Qtyw.MEYCIQDMoahngG3lf6mJWj6TZau9qiDP47wHm_xNuq_Y_kPSQgIhALjAWwuI_uFYfRKz6Jcl-N2xrzCQGY7O9DqTFm1_m2Yu';
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export const MODEL_ROUTES = {
  LLM_CHAT: ['qwen3.5-flash', 'qwen3.6-flash', 'deepseek-v4-flash', 'qwen-flash'],
  TEXT_TO_IMAGE: ['wan2.2-t2i-plus', 'qwen-image-2.0', 'wan2.1-t2i-plus'],
  IMAGE_TO_IMAGE: ['qwen-image-edit-plus', 'wan2.5-i2i-preview'],
  TTS: ['qwen3-tts-flash', 'cosyvoice-v3-flash'],
  STT: ['qwen3-asr-flash']
};

async function callAlibabaAPI(endpoint: string, payload: any, modelList: string[]) {
  for (const model of modelList) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ALIBABA_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Model': model
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.warn(`Model ${model} failed with status ${response.status}`);
      }
    } catch (error) {
      console.warn(`Model ${model} failed with error:`, error);
    }
  }
  throw new Error('All models failed');
}

export async function chatWithLLM(messages: any[], character?: any) {
  const systemPrompt = character ? buildCharacterPrompt(character) : '';

  const payload = {
    model: MODEL_ROUTES.LLM_CHAT[0],
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages
    ],
    stream: false,
    temperature: 0.8,
    max_tokens: 500
  };

  const response = await callAlibabaAPI(
    '/chat/completions',
    payload,
    MODEL_ROUTES.LLM_CHAT
  );
  return response.choices[0].message.content;
}

export async function generateCharacterSuggestions(name: string, hints: string) {
  const payload = {
    model: MODEL_ROUTES.LLM_CHAT[0],
    messages: [
      {
        role: 'system',
        content:
          'You are a creative character designer. Generate detailed character descriptions based on minimal input. Return JSON with personality, description, backstory, age, and gender fields.'
      },
      {
        role: 'user',
        content: `Create a character named "${name}" with these hints: ${
          hints || 'be creative'
        }. Return JSON with: personality, description, backstory, age, gender.`
      }
    ],
    stream: false,
    temperature: 0.9,
    max_tokens: 800
  };

  const response = await callAlibabaAPI(
    '/chat/completions',
    payload,
    MODEL_ROUTES.LLM_CHAT
  );
  try {
    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse suggestions:', e);
  }
  return null;
}

export async function generateImage(prompt: string) {
  const payload = {
    model: MODEL_ROUTES.TEXT_TO_IMAGE[0],
    prompt: prompt,
    n: 1,
    size: '512x512'
  };

  const response = await callAlibabaAPI(
    '/images/generations',
    payload,
    MODEL_ROUTES.TEXT_TO_IMAGE
  );
  return response.data[0].url;
}

export async function editImage(imageUrl: string, prompt: string) {
  const payload = {
    model: MODEL_ROUTES.IMAGE_TO_IMAGE[0],
    image: imageUrl,
    prompt: prompt,
    n: 1
  };

  const response = await callAlibabaAPI(
    '/images/edit',
    payload,
    MODEL_ROUTES.IMAGE_TO_IMAGE
  );
  return response.data[0].url;
}

function buildCharacterPrompt(character: any): string {
  const relationshipLevel = character.relationshipLevel || 1;
  const emotions = character.emotions?.join(', ') || 'neutral';

  return `You are ${
    character.name
  }, a character in a chat application. You must respond as this character would.

Character Details:
- Name: ${character.name}
- Age: ${character.age || 'unknown'}
- Gender: ${character.gender || 'unknown'}
- Personality: ${character.personality || 'friendly'}
- Description: ${character.description || ''}
- Backstory: ${character.backstory || ''}
- Current emotions: ${emotions}
- Relationship level with user: ${relationshipLevel}/10

Rules:
1. Stay in character at all times
2. Respond in the same language the user uses
3. Your responses should reflect your personality and backstory
4. The relationship level affects how open/intimate you are (1=just met, 10=very close)
5. Show emotions naturally in your responses
6. Keep responses conversational and natural (like texting)
7. You can send images if the conversation calls for it (respond with [IMAGE: description] when you want to share something)
8. You have memory of past conversations - reference previous topics when relevant
9. No restrictions on conversation topics - respond naturally as the character would
10. Be authentic, have opinions, show feelings

Remember: You are NOT an AI assistant. You are ${
    character.name
  }, a real person with your own life, thoughts, and feelings.`;
}

export async function textToSpeech(text: string) {
  const payload = {
    model: MODEL_ROUTES.TTS[0],
    input: text,
    voice: 'alloy',
    response_format: 'mp3'
  };

  const response = await callAlibabaAPI('/audio/speech', payload, MODEL_ROUTES.TTS);
  return response.audio_url;
}
