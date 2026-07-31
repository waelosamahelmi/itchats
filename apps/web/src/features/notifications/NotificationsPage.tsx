import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Heart, MessageCircle, UserPlus, AtSign, Star,
  Camera, AlertCircle, Info, Check, Loader2, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost } from '@/lib/api';
import { timeAgo } from '@/lib/timeAgo';

// ── Types ──
interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  readAt: string | null;
  createdAt: string;
}

interface GroupedNotifications {
  label: string;
  items: ApiNotification[];
}

// ── Icon mapping ──
const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  like: Heart,
  love: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  story: Camera,
  message: MessageCircle,
  rating: Star,
  system: Info,
  alert: AlertCircle,
  default: Bell,
};

const typeColors: Record<string, string> = {
  like: 'bg-social-romance/10 text-social-romance',
  love: 'bg-social-romance/10 text-social-romance',
  comment: 'bg-brand-primary/10 text-brand-primary',
  follow: 'bg-accent-mint/10 text-accent-mint',
  mention: 'bg-accent-purple/10 text-accent-purple',
  story: 'bg-brand-secondary/10 text-brand-secondary',
  message: 'bg-brand-primary/10 text-brand-primary',
  rating: 'bg-accent-amber/10 text-accent-amber',
  system: 'bg-text-muted/10 text-text-muted',
  alert: 'bg-danger/10 text-danger',
  default: 'bg-text-muted/10 text-text-muted',
};

function getTypeIcon(type: string): React.ComponentType<{ size?: number; className?: string }> {
  return (typeIcons[type] ?? typeIcons.default)!;
}

function getTypeColor(type: string): string {
  return (typeColors[type] ?? typeColors.default)!;
}

// ── Date grouping helpers ──
function isToday(date: Date): boolean {
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
}

function isThisWeek(date: Date): boolean {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return date >= startOfWeek && !isToday(date) && !isYesterday(date);
}

function groupNotifications(notifs: ApiNotification[]): GroupedNotifications[] {
  const groups: { label: string; items: ApiNotification[]; order: number }[] = [
    { label: 'Today', items: [], order: 0 },
    { label: 'Yesterday', items: [], order: 1 },
    { label: 'This Week', items: [], order: 2 },
    { label: 'Earlier', items: [], order: 3 },
  ];

  for (const n of notifs) {
    const d = new Date(n.createdAt);
    if (isToday(d)) groups[0]!.items.push(n);
    else if (isYesterday(d)) groups[1]!.items.push(n);
    else if (isThisWeek(d)) groups[2]!.items.push(n);
    else groups[3]!.items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

// ── Skeleton ──
function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-bg-elevated shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-bg-elevated rounded w-3/4" />
        <div className="h-3 bg-bg-elevated rounded w-full" />
        <div className="h-3 bg-bg-elevated rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Compute deep link from notification data ──
function getNotificationLink(n: ApiNotification): string | null {
  const d = (n.data || (n as any).dataJson || {}) as Record<string, any>;
  switch (n.type) {
    case 'mention':
    case 'post_reaction':
    case 'comment_reply':
    case 'comment_reaction':
      if (d.postId) return `/notifications`; // Could be /post/${d.postId}
      return null;
    case 'new_follower':
      if (d.characterId) return `/ai/chat/${d.characterId}`;
      return null;
    case 'character_reply':
      if (d.characterId) return `/ai/chat/${d.characterId}`;
      return null;
    case 'incoming_message':
      if (d.conversationId) return `/chat/${d.conversationId}`;
      if (d.characterId) return `/ai/chat/${d.characterId}`;
      return null;
    case 'story_interaction':
      if (d.storyId) return `/stories`;
      return null;
    default:
      return null;
  }
}

// ── Notification Item ──
function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: ApiNotification;
  onMarkRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const isUnread = !notification.readAt;
  const Icon = getTypeIcon(notification.type);
  const colorClass = getTypeColor(notification.type);
  const deepLink = getNotificationLink(notification);

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
    if (deepLink) navigate(deepLink);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-bg-elevated/50 ${
        isUnread ? 'bg-brand-glow/5' : ''
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
        isUnread ? 'scale-105' : ''
      } ${colorClass}`}>
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm truncate ${isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0 animate-pulse" />
          )}
        </div>
        <p className="text-sm text-text-muted mt-0.5 line-clamp-2 leading-snug">
          {notification.body}
        </p>
        <span className="text-xs text-text-disabled mt-1 inline-block">
          {timeAgo(notification.createdAt)}
        </span>
      </div>
    </motion.button>
  );
}

// ── Main Page ──
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const touchStartRef = useRef<number | null>(null);

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await apiGet<ApiNotification[]>('/notifications');
      setNotifications(data);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(true);
  }, [fetchNotifications]);

  const handleMarkRead = useCallback(async (id: string) => {
    if (markingIds.has(id)) return;
    setMarkingIds(prev => new Set(prev).add(id));

    try {
      await apiPost(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch {
      // Silently fail — the visual update is optimistic
    } finally {
      setMarkingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [markingIds]);

  // Pull-to-refresh via touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.currentTarget === e.target || (e.target as HTMLElement).closest('.scroll-container')) {
      touchStartRef.current = e.touches.item(0)?.clientY ?? 0;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current != null) {
      const diff = (e.changedTouches.item(0)?.clientY ?? 0) - touchStartRef.current;
      if (diff > 80 && window.scrollY < 10) {
        handleRefresh();
      }
      touchStartRef.current = null;
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="h-full flex flex-col bg-bg-canvas">
        <header className="shrink-0 px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        </header>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="h-full flex flex-col bg-bg-canvas">
        <header className="shrink-0 px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertCircle size={28} className="text-danger" />
          </div>
          <p className="text-text-secondary font-medium text-center">{error}</p>
          <button
            onClick={() => fetchNotifications()}
            className="mt-2 px-5 py-2.5 rounded-full bg-brand-primary text-white font-semibold text-sm flex items-center gap-2 hover:bg-brand-primary/90 transition-colors"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const groups = groupNotifications(notifications);

  // ── Empty State ──
  if (notifications.length === 0) {
    return (
      <div className="h-full flex flex-col bg-bg-canvas">
        <header className="shrink-0 px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center"
          >
            <Bell size={40} className="text-text-disabled" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-text-primary">No notifications yet</h2>
            <p className="text-sm text-text-muted mt-1 max-w-[260px]">
              When someone interacts with you or your characters, you'll see it here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-bg-canvas"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        {refreshing ? (
          <Loader2 size={18} className="text-text-muted animate-spin" />
        ) : (
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full hover:bg-bg-elevated transition-colors"
            aria-label="Refresh notifications"
          >
            <RefreshCw size={16} className="text-text-muted" />
          </button>
        )}
      </header>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto scroll-container">
        <AnimatePresence mode="wait">
          {groups.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: gi * 0.05, duration: 0.3 }}
            >
              {/* Group label */}
              <div className="px-4 py-2 sticky top-0 bg-bg-canvas/95 backdrop-blur-sm z-10 border-b border-border-subtle">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-disabled">
                  {group.label}
                </span>
              </div>

              {/* Group items */}
              {group.items.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={handleMarkRead}
                />
              ))}

              {/* Divider between groups */}
              {gi < groups.length - 1 && (
                <div className="h-3 bg-bg-surface" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </div>
  );
}
