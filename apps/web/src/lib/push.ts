// Push notification subscription management

// Convert base64 → Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request push notification subscription.
 * Returns the subscription data or null if denied/unsupported.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] Push notifications not supported');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  try {
    // Get VAPID public key from server
    const token = localStorage.getItem('accessToken');
    const keyRes = await fetch('/v1/push/vapid-public-key', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      console.warn('[push] VAPID public key not configured on server');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    } as PushSubscriptionOptionsInit);

    // Register subscription on server
    await registerSubscription(subscription);
    return subscription;
  } catch (err: any) {
    console.warn('[push] Subscription failed:', err.message);
    return null;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  // Unregister on server
  try {
    const token = localStorage.getItem('accessToken');
    await fetch('/v1/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (err) {
    console.warn('[push] Failed to unregister subscription:', err);
  }

  // Unsubscribe locally
  await subscription.unsubscribe();
}

/**
 * Register a push subscription on the server.
 */
async function registerSubscription(subscription: PushSubscription): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  const sub = subscription.toJSON();
  if (!sub.keys?.p256dh || !sub.keys?.auth) return;

  await fetch('/v1/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    }),
  });
}

/**
 * Refresh push subscription (call after access token change).
 */
export async function refreshPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await registerSubscription(subscription);
  }
}

/**
 * Check if push notifications are currently subscribed.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
}

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
