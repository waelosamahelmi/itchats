/**
 * Skeleton loader components for data-loading screens (Section 22).
 * Provides consistent shimmer placeholders.
 */
export function SkeletonLine({ width = '100%', height = 16, className = '' }: { width?: string | number; height?: number; className?: string }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width, height }}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton rounded-xl ${className}`} style={{ height: 120 }}>
      <div className="flex items-center gap-3 p-4">
        <div className="skeleton rounded-full" style={{ width: 40, height: 40 }} />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="40%" height={14} />
          <SkeletonLine width="70%" height={12} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <div className="skeleton rounded-full" style={{ width: size, height: size }} />;
}

export function SkeletonList({ count = 5, variant = 'row' }: { count?: number; variant?: 'row' | 'card' }) {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: count }).map((_, i) =>
        variant === 'card' ? (
          <SkeletonCard key={i} />
        ) : (
          <div key={i} className="flex items-center gap-3 py-2">
            <SkeletonAvatar />
            <div className="flex-1 space-y-2">
              <SkeletonLine width="50%" height={14} />
              <SkeletonLine width="80%" height={12} />
            </div>
          </div>
        ),
      )}
    </div>
  );
}
