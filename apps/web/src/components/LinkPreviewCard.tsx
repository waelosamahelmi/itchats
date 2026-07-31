import { Globe, X, ImageOff } from 'lucide-react';
import { useState } from 'react';

export interface LinkPreviewData {
  url: string;
  canonicalUrl?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

interface LinkPreviewCardProps {
  preview: LinkPreviewData;
  onRemove?: () => void;
  compact?: boolean;
}

/**
 * Renders a Facebook-like link preview embed card.
 * Shows site name, title, description, and image from OpenGraph metadata.
 */
export default function LinkPreviewCard({ preview, onRemove, compact = false }: LinkPreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  if (!preview.url) return null;

  const hostname = (() => {
    try { return new URL(preview.url).hostname.replace(/^www\./, ''); }
    catch { return preview.url; }
  })();

  return (
    <div className={`relative glass rounded-xl overflow-hidden border border-border-subtle transition-all ${compact ? 'max-w-[320px]' : ''}`}>
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Remove link preview"
        >
          <X size={14} />
        </button>
      )}

      {/* Image */}
      {preview.imageUrl && !imageError && (
        <div className="relative overflow-hidden" style={{ maxHeight: compact ? 150 : 200 }}>
          <img
            src={preview.imageUrl}
            alt={preview.title || 'Link preview'}
            className="w-full object-cover"
            style={{ maxHeight: compact ? 150 : 200 }}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-1.5">
        {/* Site name with favicon */}
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted uppercase tracking-wide">
          {preview.faviconUrl && !faviconError ? (
            <img
              src={preview.faviconUrl}
              alt=""
              className="w-3.5 h-3.5 rounded"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe size={12} />
          )}
          <span className="truncate">{preview.siteName || hostname}</span>
        </div>

        {/* Title */}
        {preview.title && (
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-semibold text-text-primary line-clamp-2 hover:text-brand-primary transition-colors"
          >
            {preview.title}
          </a>
        )}

        {/* Description */}
        {preview.description && (
          <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}

        {/* URL */}
        <p className="text-[10px] text-text-muted truncate">
          {hostname}
        </p>
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder shown while link preview is loading.
 */
export function LinkPreviewSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`glass rounded-xl overflow-hidden border border-border-subtle animate-pulse ${compact ? 'max-w-[320px]' : ''}`}>
      <div className="bg-bg-elevated" style={{ height: compact ? 100 : 150 }} />
      <div className="p-3 space-y-2">
        <div className="h-3 w-20 bg-bg-elevated rounded-full" />
        <div className="h-4 w-3/4 bg-bg-elevated rounded-full" />
        <div className="h-3 w-full bg-bg-elevated rounded-full" />
        <div className="h-3 w-1/2 bg-bg-elevated rounded-full" />
      </div>
    </div>
  );
}
