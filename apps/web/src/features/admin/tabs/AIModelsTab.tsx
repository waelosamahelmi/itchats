import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { Cpu, ToggleLeft, ToggleRight, Star, Wifi, ChevronDown, ChevronUp } from 'lucide-react';

const API = '/v1';

interface ModelEntry {
  modelKey: string;
  displayName: string;
  capability: string;
  capabilityLabel: string;
  cost: string;
  isDefault: boolean;
  enabled: boolean;
  priority: number;
}

const ALL_MODELS: ModelEntry[] = [
  // Chat / LLM
  { modelKey: 'qwen3.6-flash', displayName: 'Qwen 3.6 Flash', capability: 'llm_chat', capabilityLabel: 'Chat', cost: '$0.25 / $1.50', isDefault: true, enabled: true, priority: 1 },
  { modelKey: 'qwen3.5-flash', displayName: 'Qwen 3.5 Flash', capability: 'llm_chat', capabilityLabel: 'Chat', cost: '$0.10 / $0.40', isDefault: false, enabled: true, priority: 2 },
  { modelKey: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', capability: 'llm_chat', capabilityLabel: 'Chat', cost: '$0.20 / $0.40', isDefault: false, enabled: true, priority: 3 },
  { modelKey: 'qwen-flash', displayName: 'Qwen Flash (Budget)', capability: 'llm_chat', capabilityLabel: 'Chat', cost: '$0.05 / $0.40', isDefault: false, enabled: true, priority: 4 },
  // Image Generation
  { modelKey: 'qwen-image-2.0-pro', displayName: 'Qwen Image 2.0 Pro', capability: 'text_to_image', capabilityLabel: 'Image Gen', cost: '$0.075 / image', isDefault: true, enabled: true, priority: 1 },
  { modelKey: 'qwen-image-2.0', displayName: 'Qwen Image 2.0', capability: 'text_to_image', capabilityLabel: 'Image Gen', cost: '$0.035 / image', isDefault: false, enabled: true, priority: 2 },
  { modelKey: 'qwen-image-max', displayName: 'Qwen Image Max', capability: 'text_to_image', capabilityLabel: 'Image Gen', cost: '~$0.08 / image', isDefault: false, enabled: true, priority: 3 },
  { modelKey: 'wan2.7-image-pro', displayName: 'Wan 2.7 Image Pro', capability: 'text_to_image', capabilityLabel: 'Image Gen', cost: 'varies', isDefault: false, enabled: true, priority: 4 },
  // Image-to-Image / Edit
  { modelKey: 'qwen-image-edit-plus', displayName: 'Qwen Image Edit Plus', capability: 'image_to_image', capabilityLabel: 'Image Edit', cost: '$0.03 / image', isDefault: true, enabled: true, priority: 1 },
  { modelKey: 'qwen-image-edit-max', displayName: 'Qwen Image Edit Max', capability: 'image_to_image', capabilityLabel: 'Image Edit', cost: 'varies', isDefault: false, enabled: false, priority: 2 },
  // TTS
  { modelKey: 'qwen3-tts-flash', displayName: 'Qwen 3 TTS Flash', capability: 'tts', capabilityLabel: 'TTS', cost: '$0.13 / 10K chars', isDefault: true, enabled: true, priority: 1 },
  { modelKey: 'qwen3-tts-flash-realtime', displayName: 'Qwen 3 TTS Realtime', capability: 'tts', capabilityLabel: 'TTS', cost: '$0.13 / 10K chars', isDefault: false, enabled: true, priority: 2 },
  // ASR
  { modelKey: 'qwen3-asr-flash', displayName: 'Qwen 3 ASR Flash', capability: 'asr', capabilityLabel: 'ASR', cost: '$0.000035 / sec', isDefault: true, enabled: true, priority: 1 },
  // Video
  { modelKey: 'wan2.6-i2v-flash', displayName: 'Wan 2.6 I2V Flash', capability: 'text_to_video', capabilityLabel: 'Video', cost: '$0.025-0.075 / sec', isDefault: true, enabled: true, priority: 1 },
  { modelKey: 'wan2.7-i2v', displayName: 'Wan 2.7 I2V', capability: 'text_to_video', capabilityLabel: 'Video', cost: '$0.10-0.15 / sec', isDefault: false, enabled: true, priority: 2 },
  // Embedding
  { modelKey: 'text-embedding-v4', displayName: 'Text Embedding V4', capability: 'embedding', capabilityLabel: 'Embedding', cost: '$0.07 / 1M tokens', isDefault: true, enabled: true, priority: 1 },
];

export default function AIModelsTab() {
  const { token } = useSelector((s: RootState) => s.auth);
  const [models, setModels] = useState<ModelEntry[]>(() => {
    const saved = localStorage.getItem('admin-models');
    if (saved) try { const data = JSON.parse(saved); if (Array.isArray(data)) return data.map((m: any) => ({ ...ALL_MODELS.find(d => d.modelKey === m.modelKey) || m, enabled: m.enabled, priority: m.priority, isDefault: m.isDefault })); } catch {}
    return ALL_MODELS;
  });
  const [expandedCapability, setExpandedCapability] = useState<string | null>(null);
  const [testingModel, setTestingModel] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('admin-models', JSON.stringify(models)); }, [models]);

  const toggleModel = (key: string) => {
    setModels(prev => prev.map(m => m.modelKey === key ? { ...m, enabled: !m.enabled } : m));
  };

  const setAsDefault = (key: string) => {
    setModels(prev => prev.map(m => ({ ...m, isDefault: m.capability === prev.find(x => x.modelKey === key)!.capability ? m.modelKey === key : m.isDefault })));
  };

  const movePriority = (key: string, dir: number) => {
    setModels(prev => {
      const cap = prev.find(m => m.modelKey === key)!.capability;
      const capModels = prev.filter(m => m.capability === cap).sort((a,b) => a.priority - b.priority);
      const idx = capModels.findIndex(m => m.modelKey === key);
      if (idx < 0 || (dir < 0 && idx === 0) || (dir > 0 && idx >= capModels.length - 1)) return prev;
      const other = capModels[idx + dir];
      if (!other) return prev;
      const swapped = prev.map(m => {
        if (m.modelKey === key) return { ...m, priority: other.priority };
        if (m.modelKey === other.modelKey) return { ...m, priority: capModels[idx]!.priority };
        return m;
      });
      return swapped;
    });
  };

  const capabilities = [...new Set(models.map(m => m.capability))];

  const testModel = async (modelKey: string) => {
    setTestingModel(modelKey);
    try {
      const res = await fetch(`/v1/admin/ai-models/test/${modelKey}`, { headers: { Authorization: `Bearer ${token}` } });
      const ok = res.ok;
      alert(ok ? `${modelKey}: Connected ✓` : `${modelKey}: Failed (${res.status})`);
    } catch { alert(`${modelKey}: Connection error`); }
    setTestingModel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">AI Models</h2>
      </div>

      {capabilities.map(cap => {
        const capModels = models.filter(m => m.capability === cap).sort((a, b) => a.priority - b.priority);
        const label = capModels[0]?.capabilityLabel || cap;
        const isExpanded = expandedCapability === cap;

        return (
          <div key={cap} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <button
              onClick={() => setExpandedCapability(isExpanded ? null : cap)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Cpu size={16} className="text-violet-400" />
                <span className="text-sm font-medium text-white">{label}</span>
                <span className="text-xs text-zinc-500">{capModels.length} models</span>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-800">
                {capModels.map((m, i) => (
                  <div key={m.modelKey} className={`flex items-center gap-3 px-4 py-2.5 ${i < capModels.length - 1 ? 'border-b border-zinc-800/50' : ''} ${!m.enabled ? 'opacity-40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white truncate">{m.displayName}</span>
                        {m.isDefault && <Star size={12} className="text-amber-400 shrink-0" />}
                        {!m.enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">Disabled</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-zinc-500 font-mono">{m.modelKey}</span>
                        <span className="text-[11px] text-zinc-600">{m.cost}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => movePriority(m.modelKey, -1)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300" title="Move up">
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => movePriority(m.modelKey, 1)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300" title="Move down">
                        <ChevronDown size={14} />
                      </button>
                      {!m.isDefault && (
                        <button onClick={() => setAsDefault(m.modelKey)} className="px-2 py-1 rounded text-[10px] bg-zinc-800 text-zinc-400 hover:bg-amber-600/20 hover:text-amber-400" title="Set as default">
                          Default
                        </button>
                      )}
                      <button onClick={() => toggleModel(m.modelKey)} className="p-1 rounded hover:bg-zinc-700" title={m.enabled ? 'Disable' : 'Enable'}>
                        {m.enabled ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} className="text-zinc-600" />}
                      </button>
                      <button onClick={() => testModel(m.modelKey)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300" title="Test connectivity">
                        {testingModel === m.modelKey ? <div className="w-3.5 h-3.5 animate-spin rounded-full border border-violet-400 border-t-transparent" /> : <Wifi size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="text-xs text-zinc-600 text-center mt-4">
        Changes are saved locally. Star ⭐ = default model for capability. Drag reorder affects fallback priority.
      </div>
    </div>
  );
}
