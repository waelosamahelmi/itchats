import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import { apiFetch } from '@/lib/api';

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
  likes: number; liked: boolean; likeCount?: number;
  topReactions: { emoji: string; count: number }[];
  comments: Comment[]; commentCount: number; shares: number;
  shareCount?: number; viewCount?: number;
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
  caption?: string; storyType?: string; mediaUrl?: string;
  authorCharacterId?: string; authorUserId?: string;
}
export interface Msg {
  id: string; conversationId: string; senderType: string; content: string; createdAt: string;
}

// ── Auth ──
export const registerUser = createAsyncThunk('auth/register', async (d: { email: string; username: string; password: string; dateOfBirth?: string; agreedToTerms?: boolean }) => {
  const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(d) });
  localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken);
  return data;
});
export const loginUser = createAsyncThunk('auth/login', async (d: { email: string; password: string }) => {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(d) });
  localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken);
  return data;
});
const auth = createSlice({
  name: 'auth', initialState: { user: null as any, token: localStorage.getItem('accessToken'), loading: false, error: null as string | null },
  reducers: { logout(s) { s.user = null; s.token = null; localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); } },
  extraReducers: (b) => {
    b.addCase(registerUser.fulfilled, (s, a) => { s.user = a.payload.user; s.token = a.payload.accessToken; s.error = null; });
    b.addCase(loginUser.fulfilled, (s, a) => { s.user = a.payload.user; s.token = a.payload.accessToken; s.error = null; });
    b.addCase(registerUser.rejected, (s, a) => { s.error = a.error.message || 'Register failed'; });
    b.addCase(loginUser.rejected, (s, a) => { s.error = a.error.message || 'Login failed'; });
    b.addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload; });
    b.addCase(saveWizard.fulfilled, (s, a) => {
      if (s.user) s.user = { ...s.user, wizardCompleted: (a.payload as any).wizardCompleted, firstLogin: false };
    });
  },
});
export const fetchMe = createAsyncThunk('auth/me', async () => await apiFetch('/users/me'));
export const saveWizard = createAsyncThunk('auth/saveWizard', async (data: {
  displayName?: string; country?: string; referrer?: string; avatarUrl?: string;
  preferredLanguage?: string; autoTranslate?: boolean; theme?: string;
  followedCharacterIds?: string[]; wizardCompleted?: boolean;
}) => {
  return await apiFetch('/users/me/wizard', { method: 'PATCH', body: JSON.stringify(data) });
});
export const fetchSuggestedCharacters = createAsyncThunk('chars/suggested', async (limit?: number) => {
  return (await apiFetch(`/characters/suggested?limit=${limit ?? 8}`)) as Character[];
});
export const { logout } = auth.actions;

// ── Characters (updated) ──
export const fetchMine = createAsyncThunk('chars/mine', async () => (await apiFetch('/characters/mine')) as Character[]);
export const fetchDiscover = createAsyncThunk('chars/discover', async (p?: number) => {
  const page = p ?? 1;
  return (await apiFetch(`/characters/discover?page=${page}&limit=20`)) as Character[];
});
export const followChar = createAsyncThunk('chars/follow', async (id: string) => {
  await apiFetch(`/characters/${id}/follow`, { method: 'POST' }); return id;
});
export const unfollowChar = createAsyncThunk('chars/unfollow', async (id: string) => {
  await apiFetch(`/characters/${id}/follow`, { method: 'DELETE' }); return id;
});
const chars = createSlice({
  name: 'chars',
  initialState: {
    mine: [] as Character[],
    discover: [] as Character[],
    discoverCharacters: [] as Character[],
    myCharacters: [] as Character[],
    suggestedCharacters: [] as Character[],
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
    b.addCase(fetchSuggestedCharacters.fulfilled, (s, a) => { s.suggestedCharacters = a.payload; });
  },
});
export const { setDiscoverCharacters, appendDiscoverCharacters, setMyCharacters, setCurrentCharacter, setFollowers } = chars.actions;

// ── Posts ──
export const fetchFeed = createAsyncThunk('posts/feed', async (page?: number) => {
  return (await apiFetch(`/posts/feed?page=${page ?? 1}&limit=10`)) as Post[];
});
export const createNewPost = createAsyncThunk('posts/create', async (data: { content: string; mediaUrl?: string; mediaType?: string; feeling?: string }) => {
  return (await apiFetch('/posts', { method: 'POST', body: JSON.stringify(data) })) as Post;
});
// Map frontend emojis to backend reactionType enum values
const EMOJI_TO_REACTION: Record<string, string> = {
  '👍': 'like', '❤️': 'love', '😂': 'haha', '😮': 'wow', '😢': 'sad', '😡': 'angry', '🔥': 'care',
  '👏': 'like', '🎉': 'like', '💯': 'like',
};
export const reactToPostThunk = createAsyncThunk('posts/react', async ({ postId, emoji }: { postId: string; emoji: string }) => {
  const reactionType = EMOJI_TO_REACTION[emoji] || 'like';
  await apiFetch(`/posts/${postId}/react`, { method: 'POST', body: JSON.stringify({ reactionType }) });
  return { postId, emoji };
});
export const addCommentThunk = createAsyncThunk('posts/comment', async ({ postId, content }: { postId: string; content: string }) => {
  return { postId, comment: (await apiFetch(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) })) as Comment };
});
export const deletePostThunk = createAsyncThunk('posts/delete', async (postId: string) => {
  await apiFetch(`/posts/${postId}`, { method: 'DELETE' }); return postId;
});
export const editPostThunk = createAsyncThunk('posts/edit', async ({ postId, content }: { postId: string; content: string }) => {
  return (await apiFetch(`/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ content }) })) as Post;
});
export const reportPostThunk = createAsyncThunk('posts/report', async ({ postId, reason }: { postId: string; reason: string }) => {
  await apiFetch(`/posts/${postId}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
  return postId;
});
export const shareToFeedThunk = createAsyncThunk('posts/share', async ({ content, repostOfPostId }: { content: string; repostOfPostId: string }) => {
  return (await apiFetch('/posts', { method: 'POST', body: JSON.stringify({ content, repostOfPostId }) })) as Post;
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
      if (!Array.isArray(s.feedPosts)) s.feedPosts = [];
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
      if (!Array.isArray(s.feedPosts)) s.feedPosts = [];
      const post = s.feedPosts.find(p => p.id === a.payload.postId);
      if (post) {
        post.comments = post.comments || [];
        post.comments.push(a.payload.comment);
        post.commentCount = (post.commentCount || 0) + 1;
      }
    });
    b.addCase(deletePostThunk.fulfilled, (s, id) => {
      s.feedPosts = s.feedPosts.filter(p => p.id !== id.payload);
    });
  },
});
export const { setFeedPosts, appendFeedPosts, setUserPosts } = posts.actions;

// ── Profile ──
export const fetchProfile = createAsyncThunk('profile/fetch', async () => {
  return (await apiFetch('/users/me')) as UserProfile;
});
export const updateProfileThunk = createAsyncThunk('profile/update', async (data: Partial<UserProfile>) => {
  return (await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(data) })) as UserProfile;
});
export const fetchFriendsThunk = createAsyncThunk('profile/friends', async () => {
  const data = await apiFetch('/users/friends');
  // Backend returns { friends: [...], count: N } — extract array if wrapped
  if (data && Array.isArray(data.friends)) return data.friends as UserProfile[];
  if (Array.isArray(data)) return data as UserProfile[];
  return [] as UserProfile[];
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
  return (await apiFetch('/voices')) as Voice[];
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
  return (await apiFetch('/stories')) as Story[];
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
export const fetchConvs = createAsyncThunk('chat/convs', async () => (await apiFetch('/conversations')) as any[]);
export const fetchMsgs = createAsyncThunk('chat/msgs', async (cid: string) => (await apiFetch(`/conversations/${cid}/messages`)) as Msg[]);
export const deleteConv = createAsyncThunk('chat/deleteConv', async (cid: string) => { await apiFetch(`/conversations/${cid}`, { method: 'DELETE' }); return cid; });
export const deleteMsg = createAsyncThunk('chat/deleteMsg', async ({ convId, msgId }: { convId: string; msgId: string }) => { await apiFetch(`/conversations/${convId}/messages/${msgId}`, { method: 'DELETE' }); return msgId; });
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

// ── Translation / Language Settings ──
interface TranslatedPost {
  postId: string;
  translatedText: string;
  detectedLanguage: string;
}
const translation = createSlice({
  name: 'translation',
  initialState: {
    language: 'en',
    autoTranslate: false,
    translatedPosts: {} as Record<string, TranslatedPost>,
    translating: {} as Record<string, boolean>,
  },
  reducers: {
    setLanguage(s, a) {
      s.language = a.payload;
      try { localStorage.setItem('itchats-language', a.payload); } catch {}
      // RTL support
      const langDir = a.payload === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = langDir;
      document.documentElement.lang = a.payload;
    },
    setAutoTranslate(s, a) {
      s.autoTranslate = a.payload;
      try { localStorage.setItem('itchats-auto-translate', String(a.payload)); } catch {}
    },
    setTranslatedPost(s, a) {
      const { postId, translatedText, detectedLanguage } = a.payload;
      s.translatedPosts[postId] = { postId, translatedText, detectedLanguage };
      delete s.translating[postId];
    },
    setTranslating(s, a) {
      s.translating[a.payload] = true;
    },
    clearTranslation(s, a) {
      delete s.translatedPosts[a.payload];
      delete s.translating[a.payload];
    },
    initLanguageSettings(s) {
      try {
        s.language = localStorage.getItem('itchats-language') || navigator.language?.split('-')[0] || 'en';
        s.autoTranslate = localStorage.getItem('itchats-auto-translate') === 'true';
        // Validate language is in our supported set
        const supported = ['en', 'ar', 'fi', 'sv', 'de', 'fr', 'zh'];
        if (!supported.includes(s.language)) s.language = 'en';
      } catch {
        s.language = 'en';
        s.autoTranslate = false;
      }
    },
  },
});
export const { setLanguage, setAutoTranslate, setTranslatedPost, setTranslating, clearTranslation, initLanguageSettings } = translation.actions;

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
    translation: translation.reducer,
  },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
