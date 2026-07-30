import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { Search, ChevronLeft, ChevronRight, Trash2, MessageSquare, FileText } from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

export default function ContentTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [subTab, setSubTab] = useState<'posts' | 'comments'>('posts');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}` } });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const endpoint = subTab === 'posts' ? '/admin/content/posts' : '/admin/content/comments';
    const res = await fetchAuth(`${endpoint}?${params}`);
    const data = await res.json();
    setItems(data[subTab] ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [token, page, search, subTab]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${subTab === 'posts' ? 'post' : 'comment'}?`)) return;
    const endpoint = subTab === 'posts' ? `/admin/content/posts/${id}` : `/admin/content/comments/${id}`;
    await fetchAuth(endpoint, { method: 'DELETE' });
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Content Moderation</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-zinc-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search..." className="bg-transparent text-xs text-white outline-none w-32 placeholder:text-zinc-600" />
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1">
        {([
          { id: 'posts', label: 'Posts', icon: FileText },
          { id: 'comments', label: 'Comments', icon: MessageSquare },
        ] as const).map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              subTab === t.id ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-300'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-2.5 px-3 font-medium">{subTab === 'posts' ? 'Author' : 'User'}</th>
                <th className="text-left py-2.5 px-3 font-medium">Content</th>
                {subTab === 'posts' && <th className="text-left py-2.5 px-3 font-medium hidden sm:table-cell">Likes</th>}
                <th className="text-left py-2.5 px-3 font-medium hidden lg:table-cell">Date</th>
                <th className="text-right py-2.5 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={subTab === 'posts' ? 5 : 4} className="py-12 text-center text-zinc-600">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={subTab === 'posts' ? 5 : 4} className="py-12 text-center text-zinc-600">No content found</td></tr>
              ) : items.map((item: any) => (
                <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2.5 px-3 text-zinc-300">{item.authorUsername || item.characterName || '—'}</td>
                  <td className="py-2.5 px-3 text-zinc-400 max-w-xs truncate">{item.content}</td>
                  {subTab === 'posts' && <td className="py-2.5 px-3 text-zinc-500 hidden sm:table-cell">{item.likeCount ?? 0}</td>}
                  <td className="py-2.5 px-3 text-zinc-500 hidden lg:table-cell">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400" title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-600">{total} items</span>
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
