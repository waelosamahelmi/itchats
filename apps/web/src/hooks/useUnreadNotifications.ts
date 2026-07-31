import { useEffect, useState, useCallback } from 'react';

const REFRESH_EVENT = 'notification-bell-refresh';

/**
 * Dispatch a custom event to force-refresh the notification bell counter
 * immediately (without waiting for the 30s poll interval).
 */
export function refreshNotificationBell() {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

/**
 * Polls GET /v1/notifications/unread-count for the top-bar bell badge.
 * Silent on failure; refreshes every `intervalMs` (default 30s).
 * Also listens for 'notification-bell-refresh' custom events to force an immediate refresh.
 */
export function useUnreadNotifications(intervalMs = 30000): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    let mounted = true;
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch('/v1/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (mounted) setCount(Number(data?.count ?? 0));
    } catch { /* silent — badge is non-critical */ }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    fetchCount().then((c) => { cleanup = c; });
    const interval = setInterval(fetchCount, intervalMs);
    const onRefresh = () => { fetchCount(); };
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      cleanup?.();
      clearInterval(interval);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [intervalMs, fetchCount]);

  return count;
}
