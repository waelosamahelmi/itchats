import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Camera, MessageCircle, Sparkles, Map, User } from 'lucide-react';

const tabs = [
  { to: '/', icon: Camera, label: 'Camera' },
  { to: '/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/ai', icon: Sparkles, label: 'AI World' },
  { to: '/map', icon: Map, label: 'Nearby' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function AppShell() {
  const loc = useLocation();
  const hideNav = loc.pathname.startsWith('/ai/chat/') || loc.pathname.includes('/auth');

  return (
    <div className="flex flex-col h-screen bg-bg-canvas overflow-hidden">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="safe-bottom shrink-0 px-2 pb-1 pt-1">
          <div className="glass rounded-[20px] flex items-center justify-around h-16 px-1 mx-auto max-w-lg">
            {tabs.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-0.5 px-4 py-1.5 text-[10px] font-medium transition-all duration-200 rounded-2xl ${
                    isActive
                      ? 'text-brand-primary scale-105'
                      : 'text-text-muted hover:text-text-secondary'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-primary shadow-[0_0_12px_rgba(109,106,246,0.5)]" />}
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
