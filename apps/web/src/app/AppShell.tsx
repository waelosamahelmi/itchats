import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Camera, MessageCircle, Users, Map, User } from 'lucide-react';

const tabs = [
  { to: '/', icon: Camera, label: 'Camera' },
  { to: '/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/ai', icon: Users, label: 'AI' },
  { to: '/map', icon: Map, label: 'Nearby' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function AppShell() {
  const loc = useLocation();
  const hideNav = loc.pathname.startsWith('/ai/chat/') || loc.pathname.startsWith('/ai/create');

  return (
    <div className="flex flex-col h-screen bg-bg-canvas">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="flex items-center justify-around bg-bg-surface border-t border-border-subtle safe-bottom h-16 shrink-0">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'}`
              }>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
