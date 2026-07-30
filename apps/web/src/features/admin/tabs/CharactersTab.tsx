import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { Search, ChevronLeft, ChevronRight, Eye, Edit3, Trash2, Ban } from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

interface Character {
  id: string;
  name: string;
  handle?: string;
  ownerUserId: string;
  visibility: string;
  status: string;
  avatarUrl?: string;
  followerCount: number;
  characterScore: number;
  moderationStatus: string;
  createdAt: string;
  ownerUsername?: string;
}

export default function CharactersTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [chars, setChars] = useState<Character[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVis, setFilterVis] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}` } });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterVis) params.set('visibility', filterVis);
    const res = await fetchAuth(`/admin/characters?${params}`);
    const data = await res.json();
    setChars(data.characters ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [token, page, search, filterStatus, filterVis]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: string) => {
    if (action === 'delete' && !confirm('Delete this character?')) return;
    const body = action === 'suspend' ? { status: 'suspended' } : action === 'activate' ? { status: 'ready' } : {};
    if (action === 'delete') await fetchAuth(`/admin/characters/${id}`, { method: 'DELETE' });
    else await fetchAuth(`/admin/characters/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Characters</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-zinc-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search..." className="bg-transparent text-xs text-white outline-none w-28 placeholder:text-zinc-600" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-400 outline-none">
            <option value="">All Status</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
            <option value="suspended">Suspended</option>
            <option value="draft">Draft</option>
          </select>
          <select value={filterVis} onChange={e => { setFilterVis(e.target.value); setPage(1); }}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-400 outline-none">
            <option value="">All Visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-2.5 px-3 font-medium">Character</th>
                <th className="text-left py-2.5 px-3 font-medium hidden md:table-cell">Owner</th>
                <th className="text-left py-2.5 px-3 font-medium">Type</th>
                <th className="text-left py-2.5 px-3 font-medium">Status</th>
                <th className="text-left py-2.5 px-3 font-medium hidden sm:table-cell">Followers</th>
                <th className="text-left py-2.5 px-3 font-medium hidden lg:table-cell">Created</th>
                <th className="text-right py-2.5 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-zinc-600">Loading...</td></tr>
              ) : chars.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-zinc-600">No characters found</td></tr>
              ) : chars.map(c => (
                <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-[10px] overflow-hidden">
                        {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" /> : c.name?.[0] ?? '?'}
                      </div>
                      <div>
                        <span className="text-zinc-200 font-medium">{c.name}</span>
                        {c.handle && <span className="text-zinc-600 ml-1">@{c.handle}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 hidden md:table-cell">{c.ownerUsername ?? '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.visibility === 'public' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {c.visibility}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      c.status === 'published' || c.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                      c.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>{c.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 hidden sm:table-cell">{c.followerCount?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-zinc-500 hidden lg:table-cell">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleAction(c.id, c.status === 'suspended' ? 'activate' : 'suspend')} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-amber-400" title={c.status === 'suspended' ? 'Activate' : 'Suspend'}>
                        <Ban size={13} />
                      </button>
                      <button onClick={() => handleAction(c.id, 'delete')} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-600">{total} characters</span>
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
