import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Story } from '@/app/store';

/** A single story item shown inside the viewer */
interface ViewerItem {
  id: string;
  caption?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  storyType?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}

const IMAGE_DURATION_MS = 5000;

/**
 * Full-screen story viewer.
 * - Tap right 2/3 to advance, left 1/3 to go back
 * - Per-story progress bars at top; images auto-advance after 5s, videos on end
 * - Marks each story viewed via POST /v1/stories/:id/view
 */
export default function StoryViewer({ story, onClose }: { story: Story; onClose: () => void }) {
  const [items, setItems] = useState<ViewerItem[]>([
    {
      id: story.id,
      caption: story.caption,
      mediaUrl: story.mediaUrl,
      storyType: story.storyType,
    },
  ]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 for the current item
  const viewedRef = useRef<Set<string>>(new Set());

  // Load all active stories for this author (endpoint exists for AI characters)
  useEffect(() => {
    const charId = story.authorCharacterId;
    if (!charId) return;
    apiFetch<ViewerItem[]>(`/stories/character/${charId}`)
      .then(list => {
        if (Array.isArray(list) && list.length > 0) {
          // Endpoint returns newest first — reverse for natural viewing order
          setItems([...list].reverse());
          setIndex(0);
          setProgress(0);
        }
      })
      .catch(() => { /* keep the single story from the bar */ });
  }, [story]);

  const current = items[Math.min(index, items.length - 1)];
  const isVideo = current?.mediaType === 'video';

  // Mark current story viewed (once per story)
  useEffect(() => {
    if (!current || viewedRef.current.has(current.id)) return;
    viewedRef.current.add(current.id);
    apiFetch(`/stories/${current.id}/view`, { method: 'POST' }).catch(() => {});
  }, [current]);

  const goNext = useCallback(() => {
    setProgress(0);
    if (index + 1 >= items.length) {
      onClose();
    } else {
      setIndex(index + 1);
    }
  }, [index, items.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (index > 0) setIndex(index - 1);
  }, [index]);

  // Auto-advance timer for non-video stories
  useEffect(() => {
    if (isVideo) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const p = (Date.now() - started) / IMAGE_DURATION_MS;
      if (p >= 1) {
        clearInterval(timer);
        goNext();
      } else {
        setProgress(p);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [index, items.length, isVideo, goNext]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const avatarSrc = story.authorAvatar
    || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(story.authorName || 'story')}`;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal,1200)] bg-black animate-fade-in">
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3 safe-top">
          {items.map((it, i) => (
            <div key={it.id} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: i < index ? '100%' : i === index ? `${Math.min(progress * 100, 100)}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Author header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2.5 px-4 pt-8 safe-top">
          <img src={avatarSrc} alt={story.authorName} className="w-8 h-8 rounded-full object-cover border border-white/30" />
          <span className="text-sm font-semibold text-white drop-shadow">{story.authorName}</span>
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Close story"
          >
            <X size={18} />
          </button>
        </div>

        {/* Media */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {current?.mediaUrl ? (
            isVideo ? (
              <video
                key={current.id}
                src={current.mediaUrl}
                autoPlay
                playsInline
                onEnded={goNext}
                className="w-full h-full object-contain"
              />
            ) : (
              <img key={current.id} src={current.mediaUrl} alt={current.caption || 'Story'} className="w-full h-full object-contain" />
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-primary/50 via-bg-elevated to-brand-secondary/50 flex items-center justify-center p-8">
              <p className="text-white text-lg font-medium text-center leading-relaxed overflow-guard">
                {current?.caption || 'Story'}
              </p>
            </div>
          )}

          {/* Tap zones */}
          <button aria-label="Previous story" className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={goPrev} />
          <button aria-label="Next story" className="absolute right-0 top-0 bottom-0 w-2/3 z-10" onClick={goNext} />
        </div>

        {/* Caption overlay (when media is shown) */}
        {current?.mediaUrl && current?.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8 bg-gradient-to-t from-black/70 to-transparent safe-bottom pointer-events-none">
            <p className="text-sm text-white leading-relaxed overflow-guard">{current.caption}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
