import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { Flag, ChevronLeft, ChevronRight, CheckCircle, XCircle, Eye } from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

export default function ReportsTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}` } });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filterStatus) params.set('status', filterStatus);
    const res = await fetchAuth(`/admin/reports?${params}`);
    const data = await res.json();
    setReports(data.reports ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [token, page, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: string, status: string) => {
    await fetchAuth(`/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Flag size={18} className="text-red-400" /> Reports
        </h2>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-400 outline-none">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-2.5 px-3 font-medium">Entity</th>
                <th className="text-left py-2.5 px-3 font-medium">Reason</th>
                <th className="text-left py-2.5 px-3 font-medium hidden sm:table-cell">Type</th>
                <th className="text-left py-2.5 px-3 font-medium">Status</th>
                <th className="text-left py-2.5 px-3 font-medium hidden lg:table-cell">Date</th>
                <th className="text-right py-2.5 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-zinc-600">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-zinc-600">No reports found</td></tr>
              ) : reports.map(r => (
                <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2.5 px-3">
                    <span className="text-zinc-300">{r.entityId?.slice(0, 8)}...</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400">{r.reason}</td>
                  <td className="py-2.5 px-3 text-zinc-500 hidden sm:table-cell">{r.entityType}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      r.status === 'open' ? 'bg-red-500/20 text-red-400' :
                      r.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>{r.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500 hidden lg:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === 'open' && (
                        <>
                          <button onClick={() => handleResolve(r.id, 'resolved')} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-emerald-400" title="Resolve">
                            <CheckCircle size={13} />
                          </button>
                          <button onClick={() => handleResolve(r.id, 'dismissed')} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400" title="Dismiss">
                            <XCircle size={13} />
                          </button>
                        </>
                      )}
                      {r.detail && (
                        <button className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300" title={r.detail}>
                          <Eye size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-600">{total} reports</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronLeft size={14} /></button>
            <span className="text-xs text-zinc-500 px-2">{page} / {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
