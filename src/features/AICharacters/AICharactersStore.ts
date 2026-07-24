import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AICharacter, ChatMessage, CharacterMemory } from './types';
import {
  chatWithLLM,
  generateCharacterSuggestions,
  generateImage
} from 'utils/ai/alibaba';

const STORAGE_KEY = 'ai_characters';
const CHAT_STORAGE_PREFIX = 'ai_chat_';
const MEMORY_STORAGE_PREFIX = 'ai_memory_';

function loadCharacters(): AICharacter[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultCharacters();
  } catch {
    return getDefaultCharacters();
  }
}

function saveCharacters(characters: AICharacter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

function getDefaultCharacters(): AICharacter[] {
  return [
    {
      id: '1',
      name: 'Emma',
      avatar: null,
      personality: 'Friendly, creative, and outgoing. Loves art and music.',
      description: 'A creative artist who loves painting and exploring the city',
      backstory:
        'Grew up in a small coastal town, moved to the city to pursue her dream of becoming an artist. Works at a coffee shop while building her portfolio.',
      age: '24',
      gender: 'female',
      relationshipLevel: 3,
      emotions: ['happy', 'curious'],
      lastMessage: 'Hey! How are you doing today?',
      timestamp: '2 min ago',
      unread: 2,
      createdAt: new Date().toISOString(),
      memories: []
    },
    {
      id: '2',
      name: 'Alex',
      avatar: null,
      personality: 'Adventurous, bold, and energetic. Always up for trying new things.',
      description: 'A travel blogger who has visited over 30 countries',
      backstory:
        'Started traveling at 18 after a gap year that never ended. Now runs a popular travel blog and leads adventure tours.',
      age: '28',
      gender: 'male',
      relationshipLevel: 5,
      emotions: ['excited', 'energetic'],
      lastMessage: 'Just got back from an amazing trip to Bali!',
      timestamp: '1 hour ago',
      unread: 0,
      createdAt: new Date().toISOString(),
      memories: []
    },
    {
      id: '3',
      name: 'Sophia',
      avatar: null,
      personality:
        'Thoughtful, intelligent, and introspective. Loves deep conversations.',
      description: 'A philosophy PhD student who enjoys intellectual discussions',
      backstory:
        'Always been fascinated by big questions about life and consciousness. Currently writing her dissertation on the philosophy of mind.',
      age: '26',
      gender: 'female',
      relationshipLevel: 2,
      emotions: ['calm', 'reflective'],
      lastMessage: 'Have you read any good books lately?',
      timestamp: '3 hours ago',
      unread: 1,
      createdAt: new Date().toISOString(),
      memories: []
    }
  ];
}

interface AICharactersState {
  characters: AICharacter[];
  currentChat: ChatMessage[];
  currentCharacterId: string | null;
  isTyping: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AICharactersState = {
  characters: loadCharacters(),
  currentChat: [],
  currentCharacterId: null,
  isTyping: false,
  loading: false,
  error: null
};

export const sendMessage = createAsyncThunk(
  'aiCharacters/sendMessage',
  async (
    { characterId, message }: { characterId: string; message: string },
    { getState }
  ) => {
    const state = getState() as { aiCharacters: AICharactersState };
    const character = state.aiCharacters.characters.find((c) => c.id === characterId);
    if (!character) throw new Error('Character not found');

    const chatHistory = loadChatHistory(characterId);
    const messages = [
      ...chatHistory.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content
      })),
      { role: 'user' as const, content: message }
    ];

    const response = await chatWithLLM(messages, character);
    return response;
  }
);

export const generateSuggestions = createAsyncThunk(
  'aiCharacters/generateSuggestions',
  async ({ name, hints }: { name: string; hints: string }) => {
    return await generateCharacterSuggestions(name, hints);
  }
);

export const generateCharacterImage = createAsyncThunk(
  'aiCharacters/generateImage',
  async (prompt: string) => {
    return await generateImage(prompt);
  }
);

function loadChatHistory(characterId: string): ChatMessage[] {
  try {
    const data = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${characterId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveChatHistory(characterId: string, messages: ChatMessage[]) {
  localStorage.setItem(`${CHAT_STORAGE_PREFIX}${characterId}`, JSON.stringify(messages));
}

function saveMemories(characterId: string, memories: CharacterMemory[]) {
  localStorage.setItem(
    `${MEMORY_STORAGE_PREFIX}${characterId}`,
    JSON.stringify(memories)
  );
}

const aiCharactersSlice = createSlice({
  name: 'aiCharacters',
  initialState,
  reducers: {
    setCurrentCharacter(state, action: PayloadAction<string | null>) {
      state.currentCharacterId = action.payload;
      if (action.payload) {
        state.currentChat = loadChatHistory(action.payload);
      } else {
        state.currentChat = [];
      }
    },
    clearChat(state, action: PayloadAction<string>) {
      state.currentChat = [];
      localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${action.payload}`);
    },
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.currentChat.push(action.payload);
      if (state.currentCharacterId) {
        saveChatHistory(state.currentCharacterId, state.currentChat);
      }
    },
    addCharacter(state, action: PayloadAction<AICharacter>) {
      state.characters.push(action.payload);
      saveCharacters(state.characters);
    },
    updateCharacter(state, action: PayloadAction<AICharacter>) {
      const index = state.characters.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.characters[index] = action.payload;
        saveCharacters(state.characters);
      }
    },
    deleteCharacter(state, action: PayloadAction<string>) {
      state.characters = state.characters.filter((c) => c.id !== action.payload);
      saveCharacters(state.characters);
      localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${action.payload}`);
      localStorage.removeItem(`${MEMORY_STORAGE_PREFIX}${action.payload}`);
    },
    updateRelationship(
      state,
      action: PayloadAction<{ characterId: string; delta: number }>
    ) {
      const character = state.characters.find((c) => c.id === action.payload.characterId);
      if (character) {
        character.relationshipLevel = Math.max(
          1,
          Math.min(10, character.relationshipLevel + action.payload.delta)
        );
        saveCharacters(state.characters);
      }
    },
    addMemory(
      state,
      action: PayloadAction<{ characterId: string; memory: CharacterMemory }>
    ) {
      const character = state.characters.find((c) => c.id === action.payload.characterId);
      if (character) {
        character.memories.push(action.payload.memory);
        saveCharacters(state.characters);
        saveMemories(action.payload.characterId, character.memories);
      }
    },
    clearMemories(state, action: PayloadAction<string>) {
      const character = state.characters.find((c) => c.id === action.payload);
      if (character) {
        character.memories = [];
        saveCharacters(state.characters);
        localStorage.removeItem(`${MEMORY_STORAGE_PREFIX}${action.payload}`);
      }
    },
    setTyping(state, action: PayloadAction<boolean>) {
      state.isTyping = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isTyping = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isTyping = false;
        if (state.currentCharacterId) {
          const message: ChatMessage = {
            id: Date.now().toString(),
            characterId: state.currentCharacterId,
            sender: 'character',
            content: action.payload,
            type: 'text',
            timestamp: new Date().toISOString()
          };
          state.currentChat.push(message);
          saveChatHistory(state.currentCharacterId, state.currentChat);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isTyping = false;
        state.error = action.error.message || 'Failed to send message';
      })
      .addCase(generateSuggestions.pending, (state) => {
        state.loading = true;
      })
      .addCase(generateSuggestions.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(generateSuggestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate suggestions';
      });
  }
});

export const {
  setCurrentCharacter,
  clearChat,
  addMessage,
  addCharacter,
  updateCharacter,
  deleteCharacter,
  updateRelationship,
  addMemory,
  clearMemories,
  setTyping
} = aiCharactersSlice.actions;

export default aiCharactersSlice.reducer;
