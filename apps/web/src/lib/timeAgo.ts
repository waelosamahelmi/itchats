/**
 * Formats a date string as a relative time string, auto-updating every 60 seconds.
 * Returns "just now", "Xm ago", "Xh ago", "Xd ago", "Xw ago", or a locale date for older.
 */
export function timeAgo(dateStr: string | Date): string {
  const now = Date.now();
  const date = typeof dateStr === 'string' ? new Date(dateStr).getTime() : dateStr.getTime();
  if (isNaN(date)) return '';
  const diff = now - date;

  // Future dates
  if (diff < 0) return 'just now';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1m ago';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1h ago';
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1w ago';
  if (weeks < 5) return `${weeks}w ago`;

  // Older than ~5 weeks: show formatted date
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Hook-based timeAgo that auto-updates every 60s.
 * Use in React components for live-updating timestamps.
 */
import { useState, useEffect, useCallback } from 'react';

export function useTimeAgo(dateStr: string | Date | undefined | null): string {
  const get = useCallback(() => {
    if (!dateStr) return '';
    return timeAgo(dateStr);
  }, [dateStr]);

  const [display, setDisplay] = useState(get);

  useEffect(() => {
    setDisplay(get());
    const interval = setInterval(() => setDisplay(get()), 60_000);
    return () => clearInterval(interval);
  }, [get]);

  return display;
}
