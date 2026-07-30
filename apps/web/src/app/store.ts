import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';

const API = '/v1';
const getToken = () => localStorage.getItem('accessToken');
const getRefresh = () => localStorage.getItem('refreshToken');
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  const r = getRefresh();
  if (!r) return null;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: r }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.accessToken;
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
}

async function api(path: string, opts?: RequestInit) {
  const t = getToken();
  const hasBody = opts?.body != null;
  const headers: Record<string, string> = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(opts?.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${API}${path}`, { ...opts, headers });

  if (res.status === 401 && getRefresh()) {
    if (!refreshPromise) refreshPromise = refreshToken();
    const newToken = await refreshPromise;
    refreshPromise = null;
    if (newToken) {
      const retry = await fetch(`${API}${path}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}), ...opts?.headers },
      });
      if (!retry.ok) { const e = await retry.json().catch(() => ({})); throw new Error(e.message || 'Request failed'); }
      return retry.json();
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/auth';
    throw new Error('Session expired');
  }

  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw new Error('Session expired — please sign in');
  }

  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Request failed'); }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ── Types ──
export interface Character {
  id: string; name: string; handle?: string; avatarUrl?: string;
  personality: string; description: string; backstory: string;
  ageDisplay?: string; gender?: string; visibility: string; status: string;
  followersCount?: number; score?: number; online?: boolean;
  voiceId?: string; city?: string; interests?: string[];
  occupation?: string; speakingStyle?: string; humorStyle?: string;
}
export interface Post {
  id: string; authorId: string; authorName: string; authorAvatar: string;
  authorIsAI: boolean; content: string; mediaUrl?: string; mediaType?: 'image' | 'video';
  createdAt: string; privacy: 'public' | 'friends';
  likes: number; liked: boolean;
  topReactions: { emoji: string; count: number }[];
  comments: Comment[]; commentCount: number; shares: number;
}
export interface Comment {
  id: string; authorName: string; authorAvatar: string; authorIsAI: boolean;
  content: string; createdAt: string; likes: number; liked: boolean; replies: Comment[];
}
export interface UserProfile {
  id: string; username: string; email: string; avatarUrl: string;
  coverUrl: string; bio: string; website: string; location: string;
  joinDate: string; score: number; rank: string; friendCount: number;
  characterCount: number; followerCount: number;
}
export interface Voice {
  id: string; name: string; gender: 'male' | 'female';
  style: string; description: string; previewUrl: string;
}
export interface Story {
  id: string; authorId: string; authorName: string; authorAvatar: string;
  isAI: boolean; viewed: boolean; isLive: boolean;
}
export interface Msg {
  id: string; conversationId: string; senderType: string; content: string; createdAt: string;
}

// ── Auth ──
export const registerUser = createAsyncThunk('auth/register', async (d: { email: string; username: string; password: string }) => {
  const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(d) });
  localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken);
  return data;
});
export const loginUser = createAsyncThunk('auth/login', async (d: { email: string; password: string }) => {
  const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(d) });
  localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken);
  return data;
});
const auth = createSlice({
  name: 'auth', initialState: { user: null as any, token: getToken(), loading: false, error: null as string | null },
  reducers: { logout(s) { s.user = null; s.token = null; localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); } },
  extraReducers: (b) => {
    b.addCase(registerUser.fulfilled, (s, a) => { s.user = a.payload.user; s.token = a.payload.accessToken; s.error = null; });
    b.addCase(loginUser.fulfilled, (s, a) => { s.user = a.payload.user; s.token = a.payload.accessToken; s.error = null; });
    b.addCase(registerUser.rejected, (s, a) => { s.error = a.error.message || 'Register failed'; });
    b.addCase(loginUser.rejected, (s, a) => { s.error = a.error.message || 'Login failed'; });
    b.addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload; });
  },
});
export const fetchMe = createAsyncThunk('auth/me', async () => await api('/users/me'));
export const { logout } = auth.actions;

// ── Characters (updated) ──
export const fetchMine = createAsyncThunk('chars/mine', async () => (await api('/characters/mine')) as Character[]);
export const fetchDiscover = createAsyncThunk('chars/discover', async (p?: number) => {
  const page = p ?? 1;
  return (await api(`/characters/discover?page=${page}&limit=20`)) as Character[];
});
export const followChar = createAsyncThunk('chars/follow', async (id: string) => {
  await api(`/characters/${id}/follow`, { method: 'POST' }); return id;
});
export const unfollowChar = createAsyncThunk('chars/unfollow', async (id: string) => {
  await api(`/characters/${id}/follow`, { method: 'DELETE' }); return id;
});
const chars = createSlice({
  name: 'chars',
  initialState: {
    mine: [] as Character[],
    discover: [] as Character[],
    discoverCharacters: [] as Character[],  // for the new grid discover
    myCharacters: [] as Character[],        // for the new my-characters page
    currentCharacter: null as Character | null,
    followers: {} as Record<string, number>,
    discoverPage: 1,
    hasMore: true,
  },
  reducers: {
    setDiscoverCharacters(s, a) { s.discoverCharacters = a.payload; },
    appendDiscoverCharacters(s, a) { s.discoverCharacters = [...s.discoverCharacters, ...a.payload]; },
    setMyCharacters(s, a) { s.myCharacters = a.payload; },
    setCurrentCharacter(s, a) { s.currentCharacter = a.payload; },
    setFollowers(s, a) { s.followers = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchMine.fulfilled, (s, a) => { s.mine = a.payload; s.myCharacters = a.payload; });
    b.addCase(fetchDiscover.fulfilled, (s, a) => { s.discover = a.payload; s.discoverCharacters = a.payload; });
    b.addCase(followChar.fulfilled, (s, id) => {
      const char = s.discoverCharacters.find(c => c.id === id.payload);
      if (char) char.followersCount = (char.followersCount || 0) + 1;
    });
    b.addCase(unfollowChar.fulfilled, (s, id) => {
      const char = s.discoverCharacters.find(c => c.id === id.payload);
      if (char && char.followersCount) char.followersCount = Math.max(0, char.followersCount - 1);
    });
  },
});
export const { setDiscoverCharacters, appendDiscoverCharacters, setMyCharacters, setCurrentCharacter, setFollowers } = chars.actions;

// ── Posts ──
export const fetchFeed = createAsyncThunk('posts/feed', async (page?: number) => {
  return (await api(`/feed?page=${page ?? 1}&limit=10`)) as Post[];
});
export const createNewPost = createAsyncThunk('posts/create', async (data: { content: string; mediaUrl?: string }) => {
  return (await api('/feed', { method: 'POST', body: JSON.stringify(data) })) as Post;
});
export const reactToPostThunk = createAsyncThunk('posts/react', async ({ postId, emoji }: { postId: string; emoji: string }) => {
  await api(`/feed/${postId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
  return { postId, emoji };
});
export const addCommentThunk = createAsyncThunk('posts/comment', async ({ postId, content }: { postId: string; content: string }) => {
  return { postId, comment: (await api(`/feed/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) })) as Comment };
});
export const deletePostThunk = createAsyncThunk('posts/delete', async (postId: string) => {
  await api(`/feed/${postId}`, { method: 'DELETE' }); return postId;
});
const posts = createSlice({
  name: 'posts',
  initialState: {
    feedPosts: [] as Post[],
    userPosts: {} as Record<string, Post[]>,
    currentPost: null as Post | null,
    loading: false,
    error: null as string | null,
    feedPage: 1,
    hasMore: true,
  },
  reducers: {
    setFeedPosts(s, a) { s.feedPosts = a.payload; },
    appendFeedPosts(s, a) { s.feedPosts = [...s.feedPosts, ...a.payload]; },
    setUserPosts(s, a) { s.userPosts = { ...s.userPosts, [a.payload.userId]: a.payload.posts }; },
  },
  extraReducers: (b) => {
    b.addCase(fetchFeed.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchFeed.fulfilled, (s, a) => { s.loading = false; s.feedPosts = a.payload; });
    b.addCase(fetchFeed.rejected, (s, a) => { s.loading = false; s.error = a.error.message || 'Failed to load feed'; });
    b.addCase(createNewPost.fulfilled, (s, a) => { s.feedPosts.unshift(a.payload); });
    b.addCase(reactToPostThunk.fulfilled, (s, a) => {
      const post = s.feedPosts.find(p => p.id === a.payload.postId);
      if (post) {
        post.liked = true;
        post.likes += 1;
        const existing = post.topReactions.find(r => r.emoji === a.payload.emoji);
        if (existing) existing.count += 1;
        else post.topReactions.push({ emoji: a.payload.emoji, count: 1 });
      }
    });
    b.addCase(addCommentThunk.fulfilled, (s, a) => {
      const post = s.feedPosts.find(p => p.id === a.payload.postId);
      if (post) { post.comments.push(a.payload.comment); post.commentCount += 1; }
    });
    b.addCase(deletePostThunk.fulfilled, (s, id) => {
      s.feedPosts = s.feedPosts.filter(p => p.id !== id.payload);
    });
  },
});
export const { setFeedPosts, appendFeedPosts, setUserPosts } = posts.actions;

// ── Profile ──
export const fetchProfile = createAsyncThunk('profile/fetch', async () => {
  return (await api('/users/me')) as UserProfile;
});
export const updateProfileThunk = createAsyncThunk('profile/update', async (data: Partial<UserProfile>) => {
  return (await api('/users/me', { method: 'PATCH', body: JSON.stringify(data) })) as UserProfile;
});
export const fetchFriendsThunk = createAsyncThunk('profile/friends', async () => {
  return (await api('/users/friends')) as UserProfile[];
});
const profile = createSlice({
  name: 'profile',
  initialState: {
    profile: null as UserProfile | null,
    friends: [] as UserProfile[],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProfile.pending, (s) => { s.loading = true; });
    b.addCase(fetchProfile.fulfilled, (s, a) => { s.loading = false; s.profile = a.payload; });
    b.addCase(fetchProfile.rejected, (s, a) => { s.loading = false; s.error = a.error.message || 'Failed to load profile'; });
    b.addCase(updateProfileThunk.fulfilled, (s, a) => { s.profile = a.payload; });
    b.addCase(fetchFriendsThunk.fulfilled, (s, a) => { s.friends = a.payload; });
  },
});

// ── Voices ──
export const fetchVoicesThunk = createAsyncThunk('voices/fetch', async () => {
  return (await api('/characters/voices')) as Voice[];
});
const voices = createSlice({
  name: 'voices',
  initialState: {
    voices: [] as Voice[],
    selectedVoice: null as Voice | null,
    currentlyPlaying: null as string | null,
  },
  reducers: {
    setSelectedVoice(s, a) { s.selectedVoice = a.payload; },
    setCurrentlyPlaying(s, a) { s.currentlyPlaying = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchVoicesThunk.fulfilled, (s, a) => { s.voices = a.payload; });
  },
});
export const { setSelectedVoice, setCurrentlyPlaying } = voices.actions;

// ── Stories ──
export const fetchStoriesThunk = createAsyncThunk('stories/fetch', async () => {
  return (await api('/stories')) as Story[];
});
const stories = createSlice({
  name: 'stories',
  initialState: { stories: [] as Story[], loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchStoriesThunk.pending, (s) => { s.loading = true; });
    b.addCase(fetchStoriesThunk.fulfilled, (s, a) => { s.loading = false; s.stories = a.payload; });
    b.addCase(fetchStoriesThunk.rejected, (s) => { s.loading = false; });
  },
});

// ── Chat ──
export const fetchConvs = createAsyncThunk('chat/convs', async () => (await api('/conversations')) as any[]);
export const fetchMsgs = createAsyncThunk('chat/msgs', async (cid: string) => (await api(`/conversations/${cid}/messages`)) as Msg[]);
export const deleteConv = createAsyncThunk('chat/deleteConv', async (cid: string) => { await api(`/conversations/${cid}`, { method: 'DELETE' }); return cid; });
export const deleteMsg = createAsyncThunk('chat/deleteMsg', async ({ convId, msgId }: { convId: string; msgId: string }) => { await api(`/conversations/${convId}/messages/${msgId}`, { method: 'DELETE' }); return msgId; });
const chat = createSlice({
  name: 'chat', initialState: { convs: [] as any[], msgs: [] as Msg[], active: null as string | null, error: null as string | null },
  reducers: { setActive(s, a) { s.active = a.payload; }, clearError(s) { s.error = null; } },
  extraReducers: (b) => {
    b.addCase(fetchConvs.fulfilled, (s, a) => { s.convs = a.payload; s.error = null; });
    b.addCase(fetchConvs.rejected, (s, a) => { s.error = a.error.message || 'Failed to load conversations'; });
    b.addCase(fetchMsgs.fulfilled, (s, a) => { s.msgs = a.payload; });
    b.addCase(deleteConv.fulfilled, (s, a) => { s.convs = s.convs.filter(c => c.id !== a.payload); s.msgs = []; s.error = null; });
    b.addCase(deleteConv.rejected, (s, a) => { s.error = a.error.message || 'Failed to delete conversation'; });
    b.addCase(deleteMsg.fulfilled, (s, a) => { s.msgs = s.msgs.filter(m => m.id !== a.payload); });
    b.addCase(deleteMsg.rejected, (s, a) => { s.error = a.error.message || 'Failed to delete message'; });
  },
});
export const { setActive, clearError } = chat.actions;

// ── Camera (keep) ──
const camera = createSlice({
  name: 'camera', initialState: { mode: 'user' as 'user' | 'environment', photos: [] as { id: string; url: string; month: string; year: number }[] },
  reducers: {
    addPhoto(s, a) { const d = new Date(); s.photos.unshift({ id: crypto.randomUUID(), url: a.payload, month: d.toLocaleString('default', { month: 'long' }), year: d.getFullYear() }); },
    toggleCameraMode(s) { s.mode = s.mode === 'user' ? 'environment' : 'user'; },
  },
});
export const { addPhoto, toggleCameraMode } = camera.actions;

// ── Store ──
export const store = configureStore({
  reducer: {
    auth: auth.reducer,
    characters: chars.reducer,
    posts: posts.reducer,
    profile: profile.reducer,
    voices: voices.reducer,
    stories: stories.reducer,
    chat: chat.reducer,
    camera: camera.reducer,
  },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
