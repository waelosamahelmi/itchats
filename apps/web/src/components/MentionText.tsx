import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import type { Character } from '@/app/store';

// ── Character cache (handle → id, name) ──
let _mentionCharCache: Map<string, { id: string; name: string; handle: string }> | null = null;

async function getMentionCharCache(): Promise<Map<string, { id: string; name: string; handle: string }>> {
  if (_mentionCharCache) return _mentionCharCache;
  try {
    const chars = await apiFetch<Character[]>('/characters/discover?page=1&limit=200');
    _mentionCharCache = new Map();
    for (const c of chars) {
      const handle = (c.handle || c.name.toLowerCase().replace(/\s+/g, '_')).toLowerCase();
      _mentionCharCache.set(handle, { id: c.id, name: c.name, handle: c.handle || '' });
      // Also map by name
      const nameKey = c.name.toLowerCase();
      if (!_mentionCharCache.has(nameKey)) {
        _mentionCharCache.set(nameKey, { id: c.id, name: c.name, handle: c.handle || '' });
      }
    }
  } catch {
    _mentionCharCache = new Map();
  }
  return _mentionCharCache;
}

export default function MentionText({ text, className = '' }: { text: string; className?: string }) {
  const nav = useNavigate();
  const [cache, setCache] = useState<Map<string, { id: string; name: string; handle: string }> | null>(null);

  useEffect(() => {
    getMentionCharCache().then(setCache);
  }, []);

  const parts = text.split(/(@[\p{L}\p{N}_]+|#[\p{L}\p{N}_]+)/gu);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.slice(1);
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); nav(`/hashtag/${encodeURIComponent(tag)}`); }}
              className="text-brand-primary hover:underline cursor-pointer"
            >
              {part}
            </button>
          );
        }
        if (part.startsWith('@') && part.length > 1) {
          const handle = part.slice(1).toLowerCase();
          const char = cache?.get(handle);
          if (char) {
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); nav(`/ai/profile/${char.id}`); }}
                className="text-brand-primary hover:underline cursor-pointer"
              >
                @{char.name}
              </button>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
