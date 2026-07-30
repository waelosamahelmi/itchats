import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCog, FileText, DollarSign,
  Cpu, Flag, Settings, FlaskConical, ScrollText,
  Menu, X, LogOut, Shield, ChevronLeft
} from 'lucide-react';
import type { RootState } from '@/app/store';
import DashboardTab from './tabs/DashboardTab';
import UsersTab from './tabs/UsersTab';
import CharactersTab from './tabs/CharactersTab';
import ContentTab from './tabs/ContentTab';
import FinanceTab from './tabs/FinanceTab';
import AIModelsTab from './tabs/AIModelsTab';
import ReportsTab from './tabs/ReportsTab';
import SettingsTab from './tabs/SettingsTab';
import AITestingTab from './tabs/AITestingTab';

const SECTIONS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'characters', label: 'Characters', icon: UserCog },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'ai-models', label: 'AI Models', icon: Cpu },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'ai-testing', label: 'AI Testing', icon: FlaskConical },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: DashboardTab,
  users: UsersTab,
  characters: CharactersTab,
  content: ContentTab,
  finance: FinanceTab,
  'ai-models': AIModelsTab,
  reports: ReportsTab,
  settings: SettingsTab,
  'ai-testing': AITestingTab,
  logs: LogsPlaceholder,
};

function LogsPlaceholder() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Audit Logs</h2>
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-12 text-center">
        <ScrollText size={32} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Audit logs will appear here</p>
        <p className="text-xs text-zinc-600 mt-1">Admin actions are automatically logged</p>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    nav('/auth');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="text-center">
          <Shield size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg font-medium">Access Denied</p>
          <p className="text-zinc-600 text-sm mt-1">Admin privileges required</p>
          <button onClick={() => nav('/')} className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700">
            Back to App
          </button>
        </div>
      </div>
    );
  }

  const ActiveComponent = TAB_COMPONENTS[activeTab] || DashboardTab;

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-dvh bg-zinc-950 text-white overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo / Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-800">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ItChats Admin</p>
            <p className="text-[10px] text-zinc-500">Management Panel</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => handleTabClick(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === s.id
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <s.icon size={15} />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200">
              <Menu size={18} />
            </button>
            <button onClick={() => nav('/profile')} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200" title="Back to app">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium text-zinc-500 hidden sm:block">
              {SECTIONS.find(s => s.id === activeTab)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-400 text-[10px] font-medium border border-violet-600/30">
              Admin
            </span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                {user.username?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <span className="text-xs text-zinc-400 hidden sm:block">{user.username}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
