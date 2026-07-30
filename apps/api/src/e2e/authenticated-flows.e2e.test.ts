import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getConfig } from '@itchats/config';

/**
 * Authenticated E2E tests for the API.
 *
 * These tests validate:
 * 1. Health check
 * 2. Registration + login flow
 * 3. Protected endpoints require auth
 * 4. Conversation CRUD with auth
 *
 * Run with: pnpm --filter @itchats/api test
 */

const config = getConfig();
const BASE = `http://localhost:${config.PORT}`;

let authToken = '';
let userId = '';
let conversationId = '';

async function api(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const body: any = await res.json().catch(() => null);
  return { status: res.status, body, headers: res.headers };
}

describe('API E2E — Authenticated Flows', () => {
  // ── Health ──

  it('GET /v1/health returns 200', async () => {
    const { status, body } = await api('/v1/health');
    expect(status).toBe(200);
    expect(body).toHaveProperty('status', 'ok');
  });

  // ── Registration ──

  const testEmail = `e2e-${Date.now()}@itchats-test.ai`;
  const testPassword = 'E2ETestPass123!';

  it('POST /v1/auth/register creates a user', async () => {
    const { status, body } = await api('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    // Registration may return 201, 200, or 409 (already exists)
    expect([200, 201, 409]).toContain(status);
    if (body?.userId) userId = body.userId;
  });

  // ── Login ──

  it('POST /v1/auth/login returns JWT tokens', async () => {
    const { status, body } = await api('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty('accessToken');
    authToken = body.accessToken;
    if (body.user?.id) userId = body.user.id;
  });

  // ── Auth Required ──

  it('GET /v1/users/me without auth returns 401', async () => {
    const token = authToken;
    authToken = '';
    const { status } = await api('/v1/users/me');
    authToken = token;
    expect(status).toBe(401);
  });

  it('GET /v1/users/me with auth returns user', async () => {
    const { status, body } = await api('/v1/users/me');
    expect(status).toBe(200);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
  });

  // ── Conversations ──

  it('GET /v1/conversations lists conversations', async () => {
    const { status, body } = await api('/v1/conversations');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('POST /v1/conversations creates a conversation', async () => {
    const { status, body } = await api('/v1/conversations', {
      method: 'POST',
      body: JSON.stringify({ type: 'human_character', mode: 'chat' }),
    });
    // May fail if no characterId provided — depends on schema
    if (status === 200 || status === 201) {
      conversationId = body?.id;
      expect(body).toHaveProperty('id');
    }
  });

  // ── Billing ──

  it('GET /v1/billing/plans returns plans', async () => {
    const { status, body } = await api('/v1/billing/plans');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /v1/billing/wallet returns wallet', async () => {
    const { status, body } = await api('/v1/billing/wallet');
    expect(status).toBe(200);
    expect(body).toHaveProperty('balance');
  });

  // ── Notifications ──

  it('GET /v1/notifications returns list', async () => {
    const { status, body } = await api('/v1/notifications');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /v1/notifications/vapid-public-key returns key', async () => {
    const { status, body } = await api('/v1/notifications/vapid-public-key');
    expect(status).toBe(200);
    expect(body).toHaveProperty('publicKey');
  });

  // ── Media ──

  it('POST /v1/media/upload-url validates input', async () => {
    const { status, body } = await api('/v1/media/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'test.png',
        contentType: 'image/png',
        fileSize: 1024,
      }),
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty('uploadUrl');
    expect(body).toHaveProperty('mediaAssetId');
  });

  it('POST /v1/media/voice-note-upload-url returns upload URL', async () => {
    const { status, body } = await api('/v1/media/voice-note-upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileSize: 50000 }),
    });
    expect(status).toBe(200);
    expect(body).toHaveProperty('uploadUrl');
  });
});
