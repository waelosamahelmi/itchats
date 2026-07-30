import { useState, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronDown, HelpCircle, FileText, Shield, Cookie, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/legal/faq', icon: HelpCircle, label: 'FAQ' },
  { to: '/legal/terms', icon: FileText, label: 'Terms of Service' },
  { to: '/legal/privacy', icon: Shield, label: 'Privacy Policy' },
  { to: '/legal/cookies', icon: Cookie, label: 'Cookie Policy' },
] as const;

export default function LegalPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPage = useMemo(() => {
    return NAV_ITEMS.find((item) => loc.pathname === item.to) ?? NAV_ITEMS[0];
  }, [loc.pathname]);

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => nav(-1)}
            className="p-1.5 rounded-full glass hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Legal</h1>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mt-1 ml-1 text-xs">
          <button
            onClick={() => nav('/')}
            className="text-text-muted hover:text-text-secondary transition-colors"
          >
            Home
          </button>
          <ChevronRight size={12} className="text-text-muted" />
          <span className="text-text-muted">Legal</span>
          <ChevronRight size={12} className="text-text-muted" />
          <span className="text-brand-primary font-medium">{currentPage.label}</span>
        </nav>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-border-subtle overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile dropdown */}
        <div className="md:hidden px-4 py-3 shrink-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl glass text-sm font-medium text-text-primary"
          >
            <span className="flex items-center gap-3">
              {(() => {
                const Icon = currentPage.icon;
                return <Icon size={18} className="text-brand-primary shrink-0" />;
              })()}
              {currentPage.label}
            </span>
            <ChevronDown
              size={16}
              className={`text-text-muted transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {mobileOpen && (
            <div className="mt-1 glass rounded-xl overflow-hidden animate-fade-in">
              {NAV_ITEMS.map((item, idx) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }${idx < NAV_ITEMS.length - 1 ? ' border-b border-border-subtle' : ''}`
                  }
                >
                  <item.icon size={18} className="shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
