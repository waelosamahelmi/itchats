import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';

const API = 'http://localhost:3092/v1';
const token = () => localStorage.getItem('accessToken');
const refresh = () => localStorage.getItem('refreshToken');
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  const r = refresh();
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
  const t = token();
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...opts?.headers } });

  // Auto-refresh on 401 — try once, then redirect if still failing
  if (res.status === 401 && refresh()) {
    if (!refreshPromise) refreshPromise = refreshToken();
    const newToken = await refreshPromise;
    refreshPromise = null;
    if (newToken) {
      const retry = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}), ...opts?.headers } });
      if (!retry.ok) { const e = await retry.json().catch(() => ({})); throw new Error(e.message || 'Request failed'); }
      return retry.json();
    }
    // Refresh failed — force logout
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/auth';
    throw new Error('Session expired');
  }

  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/auth';
    throw new Error('Session expired');
  }

  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Request failed'); }
  return res.json();
}

// Auth
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
  name: 'auth', initialState: { user: null as any, token: token(), loading: false, error: null as string | null },
  reducers: { logout(s) { s.user = null; s.token = null; localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); } },
  extraReducers: (b) => {
    b.addCase(registerUser.fulfilled, (s, a) => { s.user = a.payload.user; s.token = a.payload.accessToken; s.error = null; });
    b.addCase(loginUser.fulfilled, (s, a) => { s.user = a.payload.user; s.token = a.payload.accessToken; s.error = null; });
    b.addCase(registerUser.rejected, (s, a) => { s.error = a.error.message || 'Register failed'; });
    b.addCase(loginUser.rejected, (s, a) => { s.error = a.error.message || 'Login failed'; });
  },
});
export const { logout } = auth.actions;

// Characters
interface Character { id: string; name: string; handle?: string; avatarUrl?: string; personality: string; description: string; backstory: string; ageDisplay?: string; gender?: string; visibility: string; status: string; }
export const fetchMine = createAsyncThunk('chars/mine', async () => (await api('/characters/mine')) as Character[]);
export const fetchDiscover = createAsyncThunk('chars/discover', async (p?: number) => {
  const page = p ?? 1;
  return (await api(`/characters/discover?page=${page}&limit=20`)) as Character[];
});
const chars = createSlice({
  name: 'chars', initialState: { mine: [] as Character[], discover: [] as Character[] },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMine.fulfilled, (s, a) => { s.mine = a.payload; });
    b.addCase(fetchDiscover.fulfilled, (s, a) => { s.discover = a.payload; });
  },
});

// Chat
interface Msg { id: string; conversationId: string; senderType: string; content: string; createdAt: string; }
export const fetchConvs = createAsyncThunk('chat/convs', async () => (await api('/conversations')) as any[]);
export const fetchMsgs = createAsyncThunk('chat/msgs', async (cid: string) => (await api(`/conversations/${cid}/messages`)) as Msg[]);
const chat = createSlice({
  name: 'chat', initialState: { convs: [] as any[], msgs: [] as Msg[], active: null as string | null },
  reducers: { setActive(s, a) { s.active = a.payload; } },
  extraReducers: (b) => {
    b.addCase(fetchConvs.fulfilled, (s, a) => { s.convs = a.payload; });
    b.addCase(fetchMsgs.fulfilled, (s, a) => { s.msgs = a.payload; });
  },
});
export const { setActive } = chat.actions;

// Camera
const camera = createSlice({
  name: 'camera', initialState: { mode: 'user' as 'user' | 'environment', photos: [] as { id: string; url: string; month: string; year: number }[] },
  reducers: {
    addPhoto(s, a) { const d = new Date(); s.photos.unshift({ id: crypto.randomUUID(), url: a.payload, month: d.toLocaleString('default', { month: 'long' }), year: d.getFullYear() }); },
    toggleCameraMode(s) { s.mode = s.mode === 'user' ? 'environment' : 'user'; },
  },
});
export const { addPhoto, toggleCameraMode } = camera.actions;

export const store = configureStore({ reducer: { auth: auth.reducer, characters: chars.reducer, chat: chat.reducer, camera: camera.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
