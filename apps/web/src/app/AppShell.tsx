import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MessageCircle, Compass, Home, Radio, User } from 'lucide-react';
import CookieBanner from '@/components/CookieBanner';

const tabs = [
  { to: '/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/', icon: Home, label: 'Feed', isMain: true },
  { to: '/live', icon: Radio, label: 'Live' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function AppShell() {
  const loc = useLocation();
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
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="safe-bottom shrink-0 px-2 pb-3 pt-1">
          <div className="glass-strong rounded-[22px] flex items-center justify-around h-[66px] px-1 mx-auto max-w-lg relative">
            {tabs.map(({ to, icon: Icon, label, isMain }) => {
              const isActive = to === '/'
                ? loc.pathname === '/' || loc.pathname === ''
                : loc.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive: active }) =>
                    `relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 rounded-2xl ${
                      isMain
                        ? 'scale-110'
                        : ''
                    } ${
                      active
                        ? 'text-brand-primary'
                        : 'text-text-muted hover:text-text-secondary'
                    }`
                  }
                >
                  <div className={`relative ${isMain ? '-mt-5' : ''}`}>
                    {/* Glow indicator for active tab */}
                    {isActive && !isMain && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(255,72,210,0.4)]" />
                    )}
                    {/* Main tab highlight */}
                    {isMain && (
                      <div className="absolute inset-0 rounded-full bg-brand-primary/20 blur-xl animate-pulse" />
                    )}
                    <Icon
                      size={isMain ? 26 : 22}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className="relative z-10"
                    />
                  </div>
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* Cookie consent banner — renders above bottom nav */}
      <CookieBanner />
    </div>
  );
}
