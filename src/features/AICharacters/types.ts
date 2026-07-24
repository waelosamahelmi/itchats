export type AICharacter = {
  id: string;
  name: string;
  avatar: string | null;
  personality: string;
  description: string;
  backstory: string;
  age: string;
  gender: string;
  relationshipLevel: number;
  emotions: string[];
  lastMessage: string;
  timestamp: string;
  unread: number;
  createdAt: string;
  memories: CharacterMemory[];
};

export type CharacterMemory = {
  id: string;
  content: string;
  importance: number;
  timestamp: string;
};

export type ChatMessage = {
  id: string;
  characterId: string;
  sender: 'user' | 'character';
  content: string;
  type: 'text' | 'image' | 'voice';
  imageUrl?: string;
  timestamp: string;
};
