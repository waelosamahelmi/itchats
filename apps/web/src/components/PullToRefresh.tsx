import { useCallback, useRef, useEffect, useState, type ReactNode } from 'react';

/**
 * Pull-to-Refresh wrapper for scroll containers (Section 22).
 * Works on touch devices by detecting overscroll at the top.
 * Provides haptic feedback on pull activation where available.
 *
 * Usage:
 * <PullToRefresh onRefresh={async () => { await refetch(); }}>
 *   <div className="overflow-y-auto h-full">
 *     {content}
 *   </div>
 * </PullToRefresh>
 */
export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  className = '',
}: {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const threshold = 64; // px to trigger refresh

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || refreshing) return;
    const el = containerRef.current;
    if (!el || !e.touches[0] || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, [disabled, refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullingRef.current || disabled || refreshing) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dy = touch.clientY - startYRef.current;
    if (dy > 0) {
      // Dampen the pull distance (1/3 ratio)
      setPullDistance(Math.min(dy * 0.35, threshold + 20));
    }
  }, [disabled, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullDistance >= threshold && !disabled && !refreshing) {
      setRefreshing(true);
      // Haptic feedback
      try { navigator?.vibrate?.(10); } catch {}
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, threshold, disabled, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const indicatorHeight = Math.min(pullDistance, threshold);
  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Pull indicator */}
      <div
        className="ptr-indicator"
        style={{
          height: refreshing ? 48 : indicatorHeight,
          opacity: refreshing ? 1 : progress,
        }}
      >
        <div
          className={`w-6 h-6 rounded-full border-2 border-brand-primary ${
            refreshing ? 'animate-spin border-t-transparent' : ''
          }`}
          style={{
            transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
