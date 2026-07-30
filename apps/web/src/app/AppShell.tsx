import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MessageCircle, Compass, Home, Radio, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import { t } from '@/lib/i18n';

const tabs = [
  { to: '/chats', icon: MessageCircle, labelKey: 'nav.chats' as const },
  { to: '/discover', icon: Compass, labelKey: 'nav.discover' as const },
  { to: '/', icon: Home, labelKey: 'nav.feed' as const, isMain: true },
  { to: '/live', icon: Radio, labelKey: 'nav.live' as const },
  { to: '/profile', icon: User, labelKey: 'nav.profile' as const },
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
  const activeIdx = activeTabIndex(loc.pathname);

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

            {tabs.map(({ to, icon: Icon, labelKey, isMain }) => {
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
                        {t(labelKey)}
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
