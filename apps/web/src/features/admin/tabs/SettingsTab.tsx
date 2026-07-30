import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { Settings, Save, AlertTriangle } from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

export default function SettingsTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchAuth = (url: string, opts?: RequestInit) =>
    fetch(`${API}${url}`, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}` } });

  useEffect(() => {
    fetchAuth('/admin/settings').then(r => r.json()).then(setSettings);
  }, [token]);

  const toggleFlag = (key: string) => {
    setSettings((prev: any) => {
      const flags = { ...(prev?.featureFlags ?? {}) };
      if (!flags[key]) flags[key] = { enabled: 'false' };
      flags[key] = { ...flags[key], enabled: flags[key].enabled === 'true' ? 'false' : 'true' };
      return { ...prev, featureFlags: flags };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await fetchAuth('/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureFlags: settings?.featureFlags }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return <div className="flex items-center justify-center h-40"><div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;

  const flags = settings.featureFlags ?? {};
  const defaultFlags = {
    roleplay: { enabled: 'true', description: 'Enable roleplay mode' },
    autonomy: { enabled: 'true', description: 'AI character autonomy' },
    discover: { enabled: 'true', description: 'Discovery page' },
    stories: { enabled: 'true', description: 'Story generation' },
    liveStreaming: { enabled: 'false', description: 'Live streaming feature' },
    imageGeneration: { enabled: 'true', description: 'AI image generation' },
    videoGeneration: { enabled: 'false', description: 'AI video generation' },
    voiceCloning: { enabled: 'false', description: 'Voice cloning feature' },
    nsfwFilter: { enabled: 'true', description: 'NSFW content filtering' },
  };

  const mergedFlags = { ...defaultFlags, ...flags };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Settings size={18} className="text-zinc-400" /> Settings</h2>
        <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-lg bg-violet-600 text-xs text-white hover:bg-violet-500 disabled:opacity-50 flex items-center gap-1.5">
          <Save size={12} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Platform Info */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Platform</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Platform Name</label>
            <input defaultValue={settings.platform?.name ?? 'ItChats AI'} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Description</label>
            <input defaultValue={settings.platform?.description ?? ''} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500" />
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Feature Flags</h3>
        <div className="space-y-2">
          {Object.entries(mergedFlags).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
              <div>
                <span className="text-xs text-zinc-300">{key}</span>
                <p className="text-[10px] text-zinc-600">{value.description}</p>
              </div>
              <button onClick={() => toggleFlag(key)}
                className={`relative w-10 h-5 rounded-full transition-colors ${value.enabled === 'true' ? 'bg-violet-600' : 'bg-zinc-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value.enabled === 'true' ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Defaults */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Credit Defaults</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Signup Credits</label>
            <input type="number" defaultValue={settings.defaults?.signupCredits ?? 100} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Daily Refill</label>
            <input type="number" defaultValue={settings.defaults?.dailyRefillCredits ?? 50} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500" />
          </div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Rate Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Chat Msg/min</label>
            <input type="number" defaultValue={settings.rateLimits?.chatMessagesPerMinute ?? 30} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Image Gen/hr</label>
            <input type="number" defaultValue={settings.rateLimits?.imageGenerationsPerHour ?? 20} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Video Gen/hr</label>
            <input type="number" defaultValue={settings.rateLimits?.videoGenerationsPerHour ?? 5} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-violet-500" />
          </div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-amber-400 flex items-center gap-1.5"><AlertTriangle size={14} /> Maintenance Mode</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Disable all non-admin access</p>
          </div>
          <button onClick={() => setSettings((p: any) => ({ ...p, maintenanceMode: !p?.maintenanceMode }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${settings?.maintenanceMode ? 'bg-red-600' : 'bg-zinc-700'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings?.maintenanceMode ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
