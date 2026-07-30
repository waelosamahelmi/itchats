import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { Search, ChevronLeft, ChevronRight, Shield, Ban, Trash2, Eye, Edit3 } from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  credits: number;
  characterCount: number;
  createdAt: string;
  avatarMediaId?: string;
  score?: number;
}

export default function UsersTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const limit = 15;

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}` } });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const res = await fetchAuth(`/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [token, page, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleEdit = (u: User) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    await fetchAuth(`/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editRole, status: editStatus }),
    });
    setSaving(false);
    setEditUser(null);
    loadUsers();
  };

  const handleStatusToggle = async (u: User) => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    await fetchAuth(`/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await fetchAuth(`/admin/users/${id}`, { method: 'DELETE' });
    loadUsers();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Users</h2>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
          <Search size={14} className="text-zinc-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..." className="bg-transparent text-xs text-white outline-none w-40 placeholder:text-zinc-600" />
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left py-2.5 px-3 font-medium">User</th>
                <th className="text-left py-2.5 px-3 font-medium hidden md:table-cell">Email</th>
                <th className="text-left py-2.5 px-3 font-medium">Role</th>
                <th className="text-left py-2.5 px-3 font-medium hidden sm:table-cell">Credits</th>
                <th className="text-left py-2.5 px-3 font-medium hidden sm:table-cell">Chars</th>
                <th className="text-left py-2.5 px-3 font-medium">Status</th>
                <th className="text-left py-2.5 px-3 font-medium hidden lg:table-cell">Joined</th>
                <th className="text-right py-2.5 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-zinc-600">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-zinc-600">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-[10px] font-medium">
                        {u.username?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-zinc-200 font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 hidden md:table-cell">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 hidden sm:table-cell">{u.credits?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-zinc-400 hidden sm:table-cell">{u.characterCount}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      u.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      u.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>{u.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500 hidden lg:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(u)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300" title="Edit"><Edit3 size={13} /></button>
                      <button onClick={() => handleStatusToggle(u)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-amber-400" title={u.status === 'active' ? 'Suspend' : 'Activate'}>
                        <Ban size={13} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-600">{total} users</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronLeft size={14} /></button>
            <span className="text-xs text-zinc-500 px-2">{page} / {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 text-zinc-400"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditUser(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-4">Edit User: {editUser.username}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditUser(null)} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 px-3 py-2 rounded-lg bg-violet-600 text-xs text-white hover:bg-violet-500 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
