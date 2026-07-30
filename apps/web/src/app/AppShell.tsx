import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Compass, Home, Radio, User, Sun, Moon, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import CookieBanner from '@/components/CookieBanner';
import { getStoredTheme, toggleAndNotify } from './theme';
import type { Theme } from './theme';
import { apiGet } from '@/lib/api';

const tabs = [
  { to: '/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/', icon: Home, label: 'Feed', isMain: true },
  { to: '/live', icon: Radio, label: 'Live' },
  { to: '/profile', icon: User, label: 'Profile' },
];

/** Compute which tab index is active based on the current path */
function activeTabIndex(pathname: string): number {
  if (pathname === '/' || pathname === '') return 2; // Feed
  if (pathname.startsWith('/chats')) return 0;
  if (pathname.startsWith('/discover')) return 1;
  if (pathname.startsWith('/live')) return 3;
  if (pathname.startsWith('/profile')) return 4;
  return -1;
}

export default function AppShell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const activeIdx = activeTabIndex(loc.pathname);
  const [unreadCount, setUnreadCount] = useState(0);
  const [justArrived, setJustArrived] = useState(false);
  const prevCountRef = useRef(0);

  // Fetch unread notifications count
  useEffect(() => {
    let mounted = true;
    const getToken = () => localStorage.getItem('accessToken');

    const fetchCount = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const data = await apiGet<{ count: number }>('/notifications/unread-count');
        if (mounted) {
          const newCount = data?.count ?? 0;
          if (newCount > prevCountRef.current) {
            setJustArrived(false);
            // Trigger re-animation
            requestAnimationFrame(() => setJustArrived(true));
          }
          prevCountRef.current = newCount;
          setUnreadCount(newCount);
        }
      } catch {
        // Silently ignore — user might not be authenticated yet
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Listen for external theme changes (e.g. from Settings page)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<Theme>;
      setTheme(custom.detail);
    };
    window.addEventListener('themechange', handler);
    return () => window.removeEventListener('themechange', handler);
  }, []);

  const hideNav =
    loc.pathname.startsWith('/chat/') ||
    loc.pathname.startsWith('/ai/chat/') ||
    loc.pathname.startsWith('/ai/create') ||
    loc.pathname.startsWith('/characters/create') ||
    loc.pathname.startsWith('/characters/edit') ||
    loc.pathname.includes('/auth') ||
    loc.pathname.startsWith('/settings') ||
    loc.pathname.startsWith('/admin') ||
    loc.pathname.startsWith('/legal');

  const handleToggleTheme = () => {
    const next = toggleAndNotify();
    setTheme(next);
  };

  return (
    <div className="flex flex-col bg-bg-canvas overflow-hidden relative" style={{ height: '100dvh' }}>
      {/* ── Main content area with page transitions ── */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Floating theme toggle above the nav ── */}
      {!hideNav && (
        <>
          {/* Notification bell */}
          <motion.button
            onClick={() => navigate('/notifications')}
            className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-[calc(3.25rem)] z-50 w-10 h-10 rounded-full bg-bg-glass-strong backdrop-blur-xl border border-border-subtle flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.06 }}
            aria-label="Notifications"
          >
            <motion.div
              animate={justArrived ? { rotate: [0, -12, 10, -6, 0] } : {}}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <Bell size={16} className="text-text-secondary" />
            </motion.div>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger flex items-center justify-center px-1"
              >
                <span className="text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </motion.span>
            )}
          </motion.button>

          <motion.button
            onClick={handleToggleTheme}
            className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-50 w-10 h-10 rounded-full bg-bg-glass-strong backdrop-blur-xl border border-border-subtle flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.06 }}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
          <motion.div
            initial={false}
            animate={{ rotate: theme === 'dark' ? 0 : 180 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
          >
            {theme === 'dark' ? (
              <Moon size={16} className="text-text-secondary" />
            ) : (
              <Sun size={16} className="text-accent-amber" />
            )}
          </motion.div>
        </motion.button>
        </>
      )}

      {/* ── Bottom tab navigation ── */}
      {!hideNav && (
        <nav className="safe-bottom shrink-0 px-2 pb-3 pt-1 relative">
          <div className="bg-bg-glass-strong backdrop-blur-xl rounded-[22px] flex items-center h-[66px] px-1 mx-auto max-w-lg relative border border-border-subtle overflow-hidden">
            {/* Sliding pill indicator */}
            {activeIdx >= 0 && (
              <motion.div
                className="absolute top-1.5 h-[calc(100%-12px)] rounded-2xl bg-gradient-to-r from-brand-500/18 via-brand-500/12 to-brand-500/8 shadow-[0_0_24px_rgba(236,72,153,0.12)]"
                animate={{
                  left: `calc(${activeIdx * 20}% + 4px)`,
                  width: `calc(${100 / tabs.length}% - 8px)`,
                }}
                transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.8 }}
              />
            )}

            {tabs.map(({ to, icon: Icon, label, isMain }) => {
              const isActive = to === '/'
                ? loc.pathname === '/' || loc.pathname === ''
                : loc.pathname.startsWith(to);

              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={`relative flex flex-col items-center justify-center gap-0.5 z-10 transition-colors duration-200 ${
                    isActive ? 'text-brand-500' : 'text-text-muted hover:text-text-secondary'
                  }`}
                  style={{ flex: 1, height: '100%' }}
                >
                  {/* Icon with bounce animation on active */}
                  <motion.div
                    animate={isActive ? { scale: [0.85, 1.1, 1] } : { scale: 1 }}
                    transition={isActive ? { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.2 }}
                    className={`relative flex items-center justify-center ${isMain && isActive ? '-mt-0.5' : ''}`}
                  >
                    {/* Elevated center tab glow */}
                    {isMain && isActive && (
                      <div className="absolute inset-0 rounded-full bg-brand-500/25 blur-xl animate-glow-pulse scale-150" />
                    )}
                    <Icon
                      size={isMain ? 26 : 22}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className="relative z-10 transition-all duration-200"
                    />
                  </motion.div>

                  {/* Label — only visible on active tab */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, y: 4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: 2, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="text-[10px] font-semibold leading-none overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* ── Cookie consent banner ── */}
      <CookieBanner />
    </div>
  );
}
