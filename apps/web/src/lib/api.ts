// ── Clean API client — no mock fallbacks ──
// All API calls go through this utility or Redux thunks.
// Errors propagate so UI can show proper error/loading/empty states.

const API = '/v1';

function getToken() {
  return localStorage.getItem('accessToken');
}
function getRefresh() {
  return localStorage.getItem('refreshToken');
}

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

/**
 * Authenticated fetch wrapper.
 * - Attaches Bearer token from localStorage
 * - Parses JSON response
 * - Handles 401 with automatic token refresh
 * - Throws meaningful errors on failure
 */
export async function apiFetch<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const t = getToken();
  const hasBody = opts?.body != null;
  const headers: Record<string, string> = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(opts?.headers as Record<string, string> || {}),
  };

  const doFetch = (tokenOverride?: string) => {
    const h = { ...headers };
    if (tokenOverride) h.Authorization = `Bearer ${tokenOverride}`;
    return fetch(`${API}${path}`, { ...opts, headers: h });
  };

  let res = await doFetch();

  // 401 — try token refresh
  if (res.status === 401 && getRefresh()) {
    if (!refreshPromise) refreshPromise = refreshToken();
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      res = await doFetch(newToken);
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/auth';
      throw new Error('Session expired');
    }
  }

  // Still 401 after refresh — redirect to auth
  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/auth';
    throw new Error('Session expired — please sign in');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const e = await res.json();
      if (e.message) message = e.message;
    } catch {}
    throw new Error(message);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : {} as T;
}

// ── Convenience methods ──
export async function apiGet<T = any>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}

// ── Shared utility helpers ──
export function genId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏', '🎉', '💯'];
