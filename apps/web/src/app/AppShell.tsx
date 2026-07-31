import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MessageCircle, Compass, Home, Plus, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import CreateSheet from '@/components/CreateSheet';
import { t } from '@/lib/i18n';

// 5 slots: 4 route tabs + the center "Create" action button (not a route)
const tabs = [
  { to: '/', icon: Home, labelKey: 'nav.feed' as const },
  { to: '/discover', icon: Compass, labelKey: 'nav.discover' as const },
  null, // Create action slot
  { to: '/chats', icon: MessageCircle, labelKey: 'nav.chats' as const },
  { to: '/profile', icon: User, labelKey: 'nav.profile' as const },
];

/** Compute which slot index is active based on the current path */
function activeTabIndex(pathname: string): number {
  if (pathname === '/' || pathname === '') return 0; // Feed
  if (pathname.startsWith('/discover')) return 1;
  if (pathname.startsWith('/chats')) return 3;
  if (pathname.startsWith('/profile')) return 4;
  return -1;
}

export default function AppShell() {
  const loc = useLocation();
  const activeIdx = activeTabIndex(loc.pathname);
  const [showCreate, setShowCreate] = useState(false);

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

            {tabs.map((tab, slot) => {
              // Center "Create" action button — not a route tab
              if (!tab) {
                return (
                  <div key="create" className="flex items-center justify-center z-10" style={{ flex: 1, height: '100%' }}>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowCreate(true)}
                      aria-label="Create"
                      className="relative w-12 h-12 min-w-[44px] min-h-[44px] rounded-full bg-gradient-to-br from-brand-500 to-brand-secondary text-white flex items-center justify-center shadow-[0_4px_20px_rgba(236,72,153,0.35)] hover:brightness-110 transition-all"
                    >
                      <Plus size={24} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                );
              }

              const { to, icon: Icon, labelKey } = tab;
              const isActive = activeIdx === slot;

              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={`relative flex flex-col items-center justify-center gap-0.5 z-10 transition-colors duration-200 ${
                    isActive ? 'text-brand-500' : 'text-text-muted hover:text-text-secondary'
                  }`}
                  style={{ flex: 1, height: '100%', minWidth: 44 }}
                >
                  {/* Icon with bounce animation on active */}
                  <motion.div
                    animate={isActive ? { scale: [0.85, 1.1, 1] } : { scale: 1 }}
                    transition={isActive ? { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.2 }}
                    className="relative flex items-center justify-center"
                  >
                    <Icon
                      size={22}
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

      {/* ── Create bottom sheet (portal) ── */}
      <CreateSheet open={showCreate} onClose={() => setShowCreate(false)} />

      {/* ── Cookie consent banner ── */}
      <CookieBanner />
    </div>
  );
}
