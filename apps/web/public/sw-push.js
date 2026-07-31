// ItChats Push Notification Service Worker
// This file is imported by the PWA service worker to handle push events

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, type, data, url } = payload;

    const options = {
      body: body || 'You have a new notification',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: `itchats-${type}-${Date.now()}`,
      data: {
        url: url || '/notifications',
        notificationType: type,
        ...data,
      },
      requireInteraction: false,
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(title || 'ItChats', options)
    );
  } catch (err) {
    // Fallback for non-JSON payloads
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('ItChats', {
        body: text.slice(0, 200),
        icon: '/icons/icon-192.svg',
      })
    );
  }
});

// Notification click → deep link to relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If an existing window is open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'ITCHATS_PUSH_NAVIGATE', url });
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
