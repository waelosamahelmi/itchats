import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

interface Stats {
  totalUsers: number;
  activeCharacters: number;
  activeConversations: number;
  totalCredits: number;
  creditsUsedToday: number;
  openReports: number;
  recentUsers: any[];
  recentCharacters: any[];
  recentReports: any[];
  topCharacters: any[];
  userGrowth: { date: string; cnt: number }[];
  revenue: { date: string; total: number }[];
  systemHealth: { api: string; redis: string; db: string };
}

export default function DashboardTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAuth = useCallback((url: string) =>
    fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` } }),
  [token]);

  useEffect(() => {
    fetchAuth('/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false));
  }, [fetchAuth]);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (!stats) return <p className="text-gray-500">Failed to load stats</p>;

  const revenueMax = Math.max(...stats.revenue.map(d => d.total), 1);
  const growthMax = Math.max(...stats.userGrowth.map(d => d.cnt), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Users', value: stats.totalUsers?.toLocaleString() ?? '0', color: 'from-violet-500 to-purple-600' },
          { label: 'Active Characters', value: stats.activeCharacters?.toLocaleString() ?? '0', color: 'from-pink-500 to-rose-600' },
          { label: 'Credits Today', value: stats.creditsUsedToday?.toLocaleString() ?? '0', color: 'from-amber-500 to-orange-600' },
          { label: 'Active Conversations', value: stats.activeConversations?.toLocaleString() ?? '0', color: 'from-emerald-500 to-teal-600' },
          { label: 'Open Reports', value: String(stats.openReports ?? 0), color: stats.openReports > 0 ? 'from-red-500 to-rose-600' : 'from-zinc-500 to-zinc-600' },
        ].map(card => (
          <div key={card.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 overflow-hidden relative">
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color}`} />
            <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Credits Used (7 days)</h3>
          <div className="flex items-end gap-1 h-28">
            {stats.revenue.map(d => {
              const h = revenueMax > 0 ? (d.total / revenueMax) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full bg-gradient-to-t from-violet-500 to-pink-500 rounded-t-sm transition-all" style={{ height: `${Math.max(h, 2)}%` }} />
                  <span className="text-[10px] text-zinc-600">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">User Signups (30 days)</h3>
          <div className="flex items-end gap-[2px] h-28">
            {stats.userGrowth.map(d => {
              const h = growthMax > 0 ? (d.cnt / growthMax) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center min-w-0" style={{ minWidth: 6 }}>
                  <div className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-[1px] transition-all" style={{ height: `${Math.max(h, 2)}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Activity + Top Characters + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentUsers?.slice(0, 5).map((u: any) => (
              <div key={`u-${u.id}`} className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">{u.username}</span> joined
                <span className="text-zinc-600 ml-auto">{new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {stats.recentCharacters?.slice(0, 5).map((c: any) => (
              <div key={`c-${c.id}`} className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <span className="text-zinc-300">{c.name}</span> created
                <span className="text-zinc-600 ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {stats.recentReports?.map((r: any) => (
              <div key={`r-${r.id}`} className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Report: {r.reason}
                <span className="text-zinc-600 ml-auto">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Characters */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Top Characters</h3>
          <div className="space-y-2">
            {stats.topCharacters?.map((c: any, i: number) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-600 w-4">{i + 1}.</span>
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-500 overflow-hidden">
                  {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" /> : c.name?.[0] ?? '?'}
                </div>
                <span className="text-zinc-300 truncate flex-1">{c.name}</span>
                <span className="text-zinc-600">{c.followerCount} followers</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(stats.systemHealth ?? {}).map(([key, status]) => (
          <div key={key} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400 uppercase">{key}</span>
            <span className={`text-xs font-medium flex items-center gap-1.5 ${status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
