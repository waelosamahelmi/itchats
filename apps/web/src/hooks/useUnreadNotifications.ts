import { useEffect, useState } from 'react';

/**
 * Polls GET /v1/notifications/unread-count for the top-bar bell badge.
 * Silent on failure; refreshes every `intervalMs` (default 30s).
 */
export function useUnreadNotifications(intervalMs = 30000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
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
    };
    fetchCount();
    const interval = setInterval(fetchCount, intervalMs);
    return () => { mounted = false; clearInterval(interval); };
  }, [intervalMs]);

  return count;
}
