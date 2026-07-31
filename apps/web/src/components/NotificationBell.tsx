import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

/**
 * Top-bar notifications bell with unread badge.
 * 44x44px hit area; navigates to /notifications.
 */
export default function NotificationBell({ className = '' }: { className?: string }) {
  const nav = useNavigate();
  const unreadCount = useUnreadNotifications();

  return (
    <button
      onClick={() => nav('/notifications')}
      className={`relative w-11 h-11 rounded-full bg-bg-glass-strong backdrop-blur-xl border border-border-subtle flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 ${className}`}
      aria-label="Notifications"
    >
      <Bell size={18} className="text-text-secondary" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full bg-danger flex items-center justify-center px-1">
          <span className="text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </span>
      )}
    </button>
  );
}
