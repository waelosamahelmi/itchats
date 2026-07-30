// ── Extended API client for the social platform ──
// Falls back to mock data when the real API is unavailable

import {
  mockPosts, mockCharacters, mockVoices, mockStories,
  mockCurrentUser, mockFriends, fakeDelay,
  type MockPost, type MockCharacter, type MockVoice, type MockUser, type MockStory, type MockComment,
  genId,
} from './mockData';

const API = '/v1';

function token() {
  return localStorage.getItem('accessToken');
}

function headers(): Record<string, string> {
  const t = token();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function realFetch<T>(path: string, opts?: RequestInit): Promise<T | null> {
  try {
    const t = token();
    if (!t) return null;
    const h: Record<string, string> = { ...headers(), ...opts?.headers as Record<string, string> || {} };
    const res = await fetch(`${API}${path}`, { ...opts, headers: h });
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return null;
  }
}

// ── Posts API ──
export async function fetchFeedPosts(page = 1): Promise<MockPost[]> {
  const real = await realFetch<MockPost[]>(`/feed?page=${page}&limit=10`);
  if (real && real.length > 0) return real;
  await fakeDelay();
  return mockPosts.map(p => ({ ...p }));
}

export async function createPost(content: string, mediaUrl?: string): Promise<MockPost> {
  const real = await realFetch<MockPost>('/feed', { method: 'POST', body: JSON.stringify({ content, mediaUrl }) });
  if (real) return real;
  await fakeDelay(600);
  return {
    id: genId(), authorId: 'user-me', authorName: mockCurrentUser.username, authorAvatar: mockCurrentUser.avatarUrl,
    authorIsAI: false, content, mediaUrl, mediaType: mediaUrl ? 'image' : undefined,
    createdAt: new Date().toISOString(), privacy: 'public',
    likes: 0, liked: false, topReactions: [], comments: [], commentCount: 0, shares: 0,
  };
}

export async function deletePost(postId: string): Promise<boolean> {
  const real = await realFetch(`/feed/${postId}`, { method: 'DELETE' });
  if (real) return true;
  await fakeDelay(300);
  return true;
}

export async function reactToPost(postId: string, emoji: string): Promise<void> {
  await realFetch(`/feed/${postId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
  await fakeDelay(100);
}

export async function addComment(postId: string, content: string): Promise<MockComment> {
  const real = await realFetch<MockComment>(`/feed/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
  if (real) return real;
  await fakeDelay(300);
  return {
    id: genId(), authorName: mockCurrentUser.username, authorAvatar: mockCurrentUser.avatarUrl,
    authorIsAI: false, content, createdAt: 'just now', likes: 0, liked: false, replies: [],
  };
}

export async function likeComment(postId: string, commentId: string): Promise<void> {
  await realFetch(`/feed/${postId}/comments/${commentId}/like`, { method: 'POST' });
  await fakeDelay(100);
}

// ── Characters API (enhanced) ──
export async function fetchDiscoverCharacters(page = 1): Promise<MockCharacter[]> {
  const real = await realFetch<MockCharacter[]>(`/characters/discover?page=${page}&limit=20`);
  if (real && real.length > 0) return real;
  await fakeDelay();
  return mockCharacters.filter(c => c.visibility === 'public');
}

export async function fetchMyCharacters(): Promise<MockCharacter[]> {
  const real = await realFetch<MockCharacter[]>('/characters/mine');
  if (real && real.length > 0) return real;
  await fakeDelay();
  return mockCharacters.filter(c => c.visibility === 'private');
}

export async function followCharacter(charId: string): Promise<void> {
  await realFetch(`/characters/${charId}/follow`, { method: 'POST' });
  await fakeDelay(200);
}

export async function unfollowCharacter(charId: string): Promise<void> {
  await realFetch(`/characters/${charId}/follow`, { method: 'DELETE' });
  await fakeDelay(200);
}

// ── Profile API ──
export async function fetchProfile(): Promise<MockUser> {
  const real = await realFetch<MockUser>('/users/me');
  if (real) return real;
  await fakeDelay();
  return mockCurrentUser;
}

export async function updateProfile(data: Partial<MockUser>): Promise<MockUser> {
  const real = await realFetch<MockUser>('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
  if (real) return real;
  await fakeDelay(400);
  return { ...mockCurrentUser, ...data };
}

export async function fetchFriends(): Promise<MockUser[]> {
  const real = await realFetch<MockUser[]>('/users/friends');
  if (real && real.length > 0) return real;
  await fakeDelay();
  return mockFriends;
}

// ── Voices API ──
export async function fetchVoices(): Promise<MockVoice[]> {
  const real = await realFetch<MockVoice[]>('/characters/voices');
  if (real && real.length > 0) return real;
  await fakeDelay(300);
  return mockVoices;
}

// ── Stories API ──
export async function fetchStories(): Promise<MockStory[]> {
  const real = await realFetch<MockStory[]>('/stories');
  if (real && real.length > 0) return real;
  await fakeDelay(250);
  return mockStories;
}

// ── User posts ──
export async function fetchUserPosts(userId: string): Promise<MockPost[]> {
  const real = await realFetch<MockPost[]>(`/users/${userId}/posts`);
  if (real && real.length > 0) return real;
  await fakeDelay();
  return mockPosts.filter(p => p.authorId === userId || userId === 'user-me');
}

export async function fetchPhotos(userId: string): Promise<{ id: string; url: string }[]> {
  await fakeDelay(300);
  return mockPosts
    .filter(p => (p.authorId === userId || userId === 'user-me') && p.mediaUrl)
    .map(p => ({ id: p.id, url: p.mediaUrl! }));
}
