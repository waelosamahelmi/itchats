import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { DollarSign, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

export default function FinanceTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [overview, setOverview] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}` } });

  const load = useCallback(async () => {
    setLoading(true);
    const [ovRes, snapRes, swRes] = await Promise.all([
      fetchAuth('/admin/finance/overview'),
      fetchAuth('/admin/finance/snapshots?days=14'),
      fetchAuth('/admin/finance/safe-withdrawable'),
    ]);
    setOverview(await ovRes.json());
    setSnapshots(await snapRes.json().then(d => Array.isArray(d) ? d : []));
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSnapshot = async () => {
    await fetchAuth('/admin/finance/snapshot', { method: 'POST' });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Finance</h2>
        <button onClick={handleSnapshot} className="px-3 py-1.5 rounded-lg bg-violet-600 text-xs text-white hover:bg-violet-500">Take Snapshot</button>
      </div>

      {/* Treasury Overview */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Gross Revenue', value: overview.grossRevenue ?? '—', icon: DollarSign, color: 'text-emerald-400' },
            { label: 'Net Revenue', value: overview.netRevenue ?? '—', icon: TrendingUp, color: 'text-violet-400' },
            { label: 'Provider Payable', value: overview.providerPayable ?? '—', icon: AlertTriangle, color: 'text-amber-400' },
            { label: 'Safe Withdrawable', value: overview.safeWithdrawable ?? '—', icon: Activity, color: 'text-blue-400' },
          ].map(card => (
            <div key={card.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <card.icon size={14} className={card.color} />
                <p className="text-[10px] text-zinc-500">{card.label}</p>
              </div>
              <p className="text-lg font-bold text-white">{typeof card.value === 'number' ? `€${(card.value / 100).toLocaleString()}` : card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Provider Breakdown */}
      {overview?.providers && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Provider Cost Breakdown</h3>
          <div className="space-y-2">
            {overview.providers.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{p.provider || p.name || 'Unknown'}</span>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-500">24h: €{(p.spend24hMinor ?? p.spend24h ?? 0) / 100}</span>
                  <span className="text-zinc-500">30d: €{(p.spend30dMinor ?? p.spend30d ?? 0) / 100}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    (p.reserveStatus === 'healthy') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>{p.reserveStatus ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshots History */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <h3 className="text-sm font-medium text-zinc-400 p-4 pb-2">Snapshot History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-2.5 px-3 font-medium">Date</th>
                <th className="text-right py-2.5 px-3 font-medium">Gross</th>
                <th className="text-right py-2.5 px-3 font-medium">Net</th>
                <th className="text-right py-2.5 px-3 font-medium">Provider</th>
                <th className="text-right py-2.5 px-3 font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map(s => (
                <tr key={s.id} className="border-b border-zinc-800/50">
                  <td className="py-2 px-3 text-zinc-300">{s.date}</td>
                  <td className="py-2 px-3 text-zinc-400 text-right">€{((s.grossRevenue ?? 0) / 100).toLocaleString()}</td>
                  <td className="py-2 px-3 text-zinc-400 text-right">€{((s.netRevenue ?? 0) / 100).toLocaleString()}</td>
                  <td className="py-2 px-3 text-zinc-400 text-right">€{((s.providerAccrued ?? 0) / 100).toLocaleString()}</td>
                  <td className="py-2 px-3 text-zinc-400 text-right">{s.grossMarginPercent ? `${s.grossMarginPercent}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
