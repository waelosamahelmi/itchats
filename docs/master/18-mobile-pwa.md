# 18 — Mobile PWA Strategy

## Overview

ItChats targets mobile-first users who interact with AI characters primarily on their phones. The Progressive Web App (PWA) strategy ensures a native-app-like experience without requiring App Store distribution.

---

## PWA Features

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Install to Home Screen | P0 | Phase 1 | Web App Manifest + install prompt |
| Responsive Design | P0 | Current | Mobile-first Tailwind breakpoints |
| Push Notifications | P1 | Phase 2 | Service Worker + Web Push API |
| Camera Access | P1 | Current | MediaDevices getUserMedia |
| Offline Support | P2 | Phase 3 | Service Worker caching |
| Background Sync | P3 | Phase 4 | Retry failed messages when online |
| Splash Screen | P1 | Phase 1 | Custom splash on PWA launch |
| Native Share | P2 | Phase 2 | Web Share API integration |
| Touch Gestures | P1 | Current | Swipe actions, pull-to-refresh |

---

## 1. Web App Manifest

### `apps/web/public/manifest.json`

```json
{
  "name": "ItChats — AI Characters",
  "short_name": "ItChats",
  "description": "Chat with AI characters that live their own lives",
  "start_url": "/?utm_source=pwa",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#ff48d2",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Home screen with AI characters"
    },
    {
      "src": "/screenshots/chat.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Chat with Luna"
    }
  ],
  "categories": ["social", "entertainment"],
  "lang": "en",
  "display_override": ["standalone", "minimal-ui"]
}
```

### Manifest Link in HTML

```html
<!-- apps/web/index.html -->
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#ff48d2" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="ItChats" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

---

## 2. Responsive Design Strategy

### Breakpoints

```css
/* Tailwind defaults + custom */
sm:  640px   /* Small phones (iPhone SE) */
md:  768px   /* Large phones (iPhone Pro Max) / Small tablets */
lg:  1024px  /* Tablets landscape / Small desktops */
xl:  1280px  /* Desktops */
```

### Mobile-First Patterns

**Navigation:** Bottom tab bar on mobile (`< BottomNav />`), sidebar on desktop.

```
Mobile (<768px):           Desktop (≥768px):
┌──────────┐              ┌────┬──────────────┐
│          │              │    │              │
│ Content  │              │Nav │   Content    │
│          │              │    │              │
├──────────┤              │    │              │
│ 📷 💬 🤖 🔍 👤 │       └────┴──────────────┘
└──────────┘
```

**Chat Layout:**
```
Mobile:                   Desktop:
┌──────────────┐          ┌──────────────┬──────────┐
│ ← Luna       │          │  Chat List   │  Chat    │
├──────────────┤          │  ┌────────┐  │  Detail  │
│ Messages     │          │  │ Luna   │  │          │
│              │          │  │ Kai    │  │          │
│              │          │  │ Yuki   │  │          │
├──────────────┤          │  └────────┘  │          │
│ [Input bar]  │          └──────────────┴──────────┘
└──────────────┘
```

**Character Grid:**
- Mobile: 2 columns
- Tablet: 3 columns
- Desktop: 4 columns

### Safe Area Handling

iOS notch/home indicator safe areas:

```css
/* apps/web/src/styles/global.css */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

.pb-safe {
  padding-bottom: calc(1rem + var(--safe-area-bottom));
}

.pt-safe {
  padding-top: var(--safe-area-top);
}
```

### Touch Targets

Minimum touch target size: 44×44px (Apple HIG). All interactive elements (buttons, links, tabs) use `min-h-[44px] min-w-[44px]`.

### Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
```

---

## 3. Camera Access

### Implementation

```typescript
// apps/web/src/features/camera/CameraPage.tsx

// Camera stream management
async function startCamera(mode: 'user' | 'environment'): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: mode,
      width: { ideal: 1080 },
      height: { ideal: 1920 },
    },
    audio: false,
  });
  return stream;
}

// Photo capture
function capturePhoto(videoElement: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d')!;
  // Mirror if front camera
  if (mode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoElement, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85);
}
```

### Permissions Flow

```
1. User navigates to CameraPage
2. Check: navigator.mediaDevices?.getUserMedia exists?
   → No: Show "Camera not supported" message
3. Check: navigator.permissions.query({ name: 'camera' })
   → 'granted': Start camera immediately
   → 'prompt': Show "Allow camera access" UI first
   → 'denied': Show "Camera access denied — enable in Settings"
4. On stream acquired: Video preview in viewfinder
5. On error: Graceful fallback (file picker input)
```

### Fallback: File Upload

When camera is unavailable or denied:
```html
<input type="file" accept="image/*" capture="environment" />
```

`capture="environment"` triggers the camera on mobile even as a fallback.

### Photo Storage

Photos captured via camera are stored as:
1. **In-memory (Redux):** `camera.photos[]` for immediate viewing
2. **Base64 data URLs:** For sending to AI endpoints (image-to-image, selfies)
3. **Future:** Upload to S3 for persistent storage

---

## 4. Push Notifications

### Architecture

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ Browser │    │ Service  │    │  Push    │    │ Backend │
│  (PWA)  │◄───│  Worker  │◄───│  Service │◄───│  (API)  │
└─────────┘    └──────────┘    └──────────┘    └─────────┘
     │               │                │              │
     │  1. Subscribe │                │              │
     │──────────────►│                │              │
     │               │  2. Register   │              │
     │               │───────────────►│              │
     │               │  3. Send       │              │
     │               │  subscription  │              │
     │               │────────────────┼─────────────►│
     │               │                │              │
     │               │  4. Push event │              │
     │               │◄───────────────┼──────────────│
     │  5. Show      │                │              │
     │  notification │                │              │
     │◄──────────────│                │              │
```

### Step 1: Service Worker Registration

```typescript
// apps/web/src/sw/register.ts

if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
  });
  
  // Wait for SW to be ready
  await navigator.serviceWorker.ready;
}
```

### Step 2: Push Subscription

```typescript
async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  
  // Check existing subscription
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) return subscription;
  
  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  
  // Subscribe with VAPID public key
  const vapidPublicKey = 'BN...'; // From backend or env
  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  
  // Send subscription to backend
  await fetch('/v1/notifications/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(subscription),
  });
  
  return subscription;
}
```

### Step 3: Service Worker (`sw.js`)

```javascript
// apps/web/public/sw.js

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'ItChats', body: 'New notification' };
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'default',
    data: {
      url: data.url || '/',
      conversationId: data.conversationId,
      characterId: data.characterId,
    },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

### Notification Types

| Type | Trigger | Title | Body | Action |
|------|---------|-------|------|--------|
| `new_message` | AI character sends message | "Luna 💬" | "Hey! I just finished my painting..." | Open chat |
| `story_posted` | Followed character posts story | "Kai posted a story" | "Evening run vibes 🏃" | Open story |
| `story_like` | Someone likes user's story | "New like" | "Luna liked your story" | Open story |
| `relationship_milestone` | Relationship level up | "You and Luna are closer!" | "Your relationship reached level 5" | Open chat |
| `credit_low` | Balance below threshold | "Credits running low" | "You have 50 credits left" | Open billing |
| `character_online` | Character becomes active | "Luna is online" | "She just woke up and is available" | Open chat |

### Backend Push Sending

```typescript
// apps/api/src/notifications/push.service.ts

// Uses web-push library
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@itchats.ai',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPush(userId: string, notification: PushNotification) {
  const subscriptions = await getSubscriptions(userId);
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(notification));
    } catch (err) {
      if (err.statusCode === 410) {
        // Subscription expired — remove it
        await removeSubscription(sub.endpoint);
      }
    }
  }
}
```

### Permission UX

```
┌──────────────────────────┐
│  Stay Connected with Luna │
│                          │
│  🔔 Get notified when:   │
│  • Luna sends a message  │
│  • New stories posted    │
│  • Relationship updates  │
│                          │
│  [Enable Notifications]  │
│  [Not Now]              │
└──────────────────────────┘
```

- Shown after first meaningful interaction (e.g., after first chat message)
- NOT on first visit (avoid immediate rejection)
- Soft ask first (in-app modal), then browser native prompt
- "Not Now" sets a cooldown (7 days) before re-prompting

---

## 5. Offline Support

### Caching Strategy (Service Worker)

```javascript
// apps/web/public/sw.js

const CACHE_NAME = 'itchats-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip API requests (handle separately)
  if (event.request.url.includes('/v1/')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

### Offline UI States

| Scenario | UI Response |
|----------|-------------|
| No network — navigating | Show cached version of the page |
| No network — sending message | Queue message, show "Sending..." with retry indicator |
| No network — loading new data | Show stale data with "Offline" banner |
| No network — AI generation | "AI features require internet" message |
| Back online | Sync queued messages, refresh data |

### Offline Detection

```typescript
// apps/web/src/hooks/useOnlineStatus.ts

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return online;
}
```

### Offline Banner

```tsx
function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  
  return (
    <div className="bg-amber-600 text-white text-center py-2 text-sm">
      You're offline. Messages will be sent when you reconnect.
    </div>
  );
}
```

### Message Queue (Background Sync Phase 4)

```typescript
// Queue messages when offline
async function sendMessage(data: MessageData) {
  if (!navigator.onLine) {
    await queueMessage(data); // Store in IndexedDB
    await registerSync();      // Register background sync
    return { queued: true };
  }
  return api('/conversations/.../messages', { method: 'POST', body: JSON.stringify(data) });
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-messages') {
    event.waitUntil(processMessageQueue());
  }
});
```

---

## 6. Installation Flow

### Install Prompt

```typescript
// Show install prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show custom "Add to Home Screen" button
  showInstallButton();
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  if (result.outcome === 'accepted') {
    console.log('PWA installed');
  }
  deferredPrompt = null;
}
```

### Install Banner UI

```
┌──────────────────────────────┐
│  📱 Add ItChats to           │
│     your Home Screen         │
│                              │
│  Chat with AI characters     │
│  anytime, anywhere.          │
│                              │
│  [Add to Home Screen]  [✕]  │
└──────────────────────────────┘
```

Shown at bottom of screen on:
- 3rd visit
- After first AI chat interaction
- Not on first visit

Dismissed with "✕" → cooldown 14 days.

---

## 7. Native Share Integration

```typescript
async function shareCharacter(character: Character) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Meet ${character.name} on ItChats`,
        text: character.description,
        url: `https://itchats.ai/ai/profile/${character.id}`,
      });
    } catch (err) {
      // User cancelled — no action needed
    }
  } else {
    // Fallback: copy link to clipboard
    await navigator.clipboard.writeText(`https://itchats.ai/ai/profile/${character.id}`);
    showToast('Link copied!');
  }
}
```

Share targets:
- Character profiles
- Interesting AI responses
- Generated images

---

## 8. PWA Configuration (Vite)

```typescript
// apps/web/vite.config.ts

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'ItChats — AI Characters',
        short_name: 'ItChats',
        theme_color: '#ff48d2',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.itchats\.ai\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
});
```

---

## 9. Performance Budget

| Metric | Target | Why |
|--------|--------|-----|
| First Contentful Paint | < 1.5s | Fast perceived load |
| Time to Interactive | < 3.0s | Quick interaction readiness |
| Total Bundle Size | < 500KB gzipped | Mobile data-friendly |
| Image Sizes | < 200KB per image | Fast image loading |
| Lighthouse PWA Score | > 90 | PWA best practices |

---

## 10. Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| PWA Install | ✅ | ✅ (16.4+) | ❌ (partial) | ✅ |
| Push Notifications | ✅ | ✅ (16.4+) | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Camera (getUserMedia) | ✅ | ✅ | ✅ | ✅ |
| Web Share API | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

Safari PWA support improved significantly in iOS 16.4+. Push notifications work in standalone mode. Firefox does not support PWA installation on desktop.

---

## 11. Testing Checklist

- [ ] Install to home screen on iOS (Safari)
- [ ] Install to home screen on Android (Chrome)
- [ ] Push notification permission flow
- [ ] Push notification received when app is closed
- [ ] Click notification → opens correct page in PWA
- [ ] Camera access works in standalone mode
- [ ] Offline: cached pages load
- [ ] Offline: message queue works
- [ ] Reconnect: queued messages send
- [ ] Splash screen displays correctly
- [ ] Safe areas respected (notch, home indicator)
- [ ] Touch targets minimum 44×44px
- [ ] Orientation lock works (portrait)
- [ ] Share button works (native + clipboard fallback)
- [ ] Lighthouse PWA score > 90

---

## 12. Deployment

### Nginx Configuration for PWA

```nginx
# Serve PWA with correct headers
location / {
    add_header Service-Worker-Allowed /;
}

location /sw.js {
    add_header Cache-Control "no-cache, must-revalidate";
    add_header Service-Worker-Allowed /;
}

location /manifest.json {
    add_header Content-Type application/manifest+json;
}
```

### HTTPS Requirement

PWA features (service worker, push, camera) require HTTPS in production. Development is exempt on `localhost`.

---

## Phase Roadmap

| Phase | Features | Timeline |
|-------|----------|----------|
| Phase 1 | Web App Manifest, install prompt, splash screen | Week 1-2 |
| Phase 2 | Push notifications, native share, notification preferences | Week 3-4 |
| Phase 3 | Offline caching, offline UI states, stale-while-revalidate | Week 5-6 |
| Phase 4 | Background sync, message queue, IndexedDB for offline data | Week 7-8 |
