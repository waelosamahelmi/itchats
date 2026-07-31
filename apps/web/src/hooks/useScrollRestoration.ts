import { useEffect, useRef, type RefObject } from 'react';

/**
 * Preserves a scroll container's position across navigation (Section: UX polish).
 * - Saves scrollTop to sessionStorage (throttled) while scrolling and on unmount.
 * - Restores it once, after `ready` becomes true (i.e. after data has loaded).
 *
 * Usage:
 *   const scrollRef = useScrollRestoration('feed', !loading);
 *   <div ref={scrollRef} className="overflow-y-auto">…</div>
 */
export function useScrollRestoration(key: string, ready = true): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const restoredRef = useRef(false);
  const storageKey = `scroll:${key}`;

  // Save (throttled) on scroll + save on unmount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.setTimeout(() => {
        ticking = false;
        try { sessionStorage.setItem(storageKey, String(el.scrollTop)); } catch {}
      }, 150);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      try { sessionStorage.setItem(storageKey, String(el.scrollTop)); } catch {}
    };
  }, [storageKey]);

  // Restore once, after data is ready
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    const el = ref.current;
    if (!el) return;
    restoredRef.current = true;
    let saved = 0;
    try { saved = Number(sessionStorage.getItem(storageKey) ?? 0); } catch {}
    if (saved > 0) {
      // Next frame so layout (list items) has been painted
      requestAnimationFrame(() => { el.scrollTop = saved; });
    }
  }, [ready, storageKey]);

  return ref;
}
