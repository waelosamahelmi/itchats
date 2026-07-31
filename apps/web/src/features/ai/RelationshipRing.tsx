import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/lib/i18n';

export interface RelationshipInfo {
  level: number;
  label: string;
  familiarity?: number;
  trust?: number;
  warmth?: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Derive progress toward the next relationship stage as a 0-1 fraction.
 * The API exposes an integer level (1-10, rounded from a continuous visibleLevel)
 * plus 0-1 dimension scores that grow alongside it. We map the average dimension
 * score onto the 9 level bands and take the position inside the current band.
 */
export function relationshipProgress(rel: RelationshipInfo | null): number {
  if (!rel) return 0;
  const level = Math.min(10, Math.max(1, Math.round(rel.level) || 1));
  if (level >= 10) return 1;
  const avg = clamp01(((rel.familiarity ?? 0) + (rel.trust ?? 0) + (rel.warmth ?? 0)) / 3);
  // Position of avg within the [level-1, level] band of a 9-band 0..1 scale.
  return clamp01(avg * 9 - (level - 1));
}

interface ProgressRingProps {
  /** 0-1 fraction */
  progress: number;
  /** Outer size in px */
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}

/** SVG circular progress ring with a gradient stroke, wrapping its children (avatar). */
export function ProgressRing({ progress, size = 40, stroke = 2.5, children }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamp01(progress));
  const gradientId = useRef(`rel-ring-grad-${Math.random().toString(36).slice(2, 9)}`).current;

  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-gradient-1, #ec4899)" />
            <stop offset="55%" stopColor="var(--color-accent-gradient-2, #f472b6)" />
            <stop offset="100%" stopColor="var(--color-accent-gradient-3, #f59e0b)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={`url(#${gradientId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {children}
    </span>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[4.5rem] text-[0.68rem] text-text-secondary capitalize">{label}</span>
      <span className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--color-accent-gradient-1, #ec4899), var(--color-accent-gradient-3, #f59e0b))',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </span>
      <span className="w-7 text-right text-[0.65rem] tabular-nums text-text-secondary">{pct}%</span>
    </div>
  );
}

interface RelationshipRingProps {
  relationship: RelationshipInfo | null;
  avatarUrl: string;
  name: string;
}

/**
 * Character avatar wrapped in a relationship progress ring. Tapping it opens a
 * glass popover with the stage name, level, progress bar and dimension bars.
 */
export function RelationshipRing({ relationship, avatarUrl, name }: RelationshipRingProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const level = Math.min(10, Math.max(1, Math.round(relationship?.level ?? 1)));
  const label = relationship?.label || t('char.gettingToKnow');
  const progress = relationshipProgress(relationship);

  function toggle() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
      });
    }
    setOpen((v) => !v);
  }

  const dims: Array<{ key: string; value: number }> = [
    { key: 'familiarity', value: relationship?.familiarity ?? 0 },
    { key: 'trust', value: relationship?.trust ?? 0 },
    { key: 'warmth', value: relationship?.warmth ?? 0 },
  ];

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={toggle}
        aria-label={`Relationship with ${name}: ${label}, level ${level} of 10`}
        aria-expanded={open}
        className="flex items-center justify-center w-11 h-11 shrink-0 bg-transparent border-0 p-0 cursor-pointer"
      >
        <ProgressRing progress={progress} size={40} stroke={2.5}>
          <img
            src={avatarUrl}
            alt=""
            className="w-[2rem] h-[2rem] rounded-full object-cover bg-surface-elevated"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(name)}`;
            }}
          />
        </ProgressRing>
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[var(--z-dropdown,1000)]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[var(--z-dropdown,1000)] rounded-xl border border-border-subtle shadow-xl animate-fade-in px-4 py-3.5"
            role="dialog"
            aria-label={`Relationship details for ${name}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: 260,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              background: 'rgba(30, 30, 48, 0.95)',
            }}
          >
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <strong className="text-sm text-text-primary">{label}</strong>
              <span className="text-[0.68rem] text-text-secondary whitespace-nowrap">Level {level} of 10</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-1">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: 'linear-gradient(90deg, var(--color-accent-gradient-1, #ec4899), var(--color-accent-gradient-2, #f472b6), var(--color-accent-gradient-3, #f59e0b))',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
            <div className="text-[0.65rem] text-text-secondary mb-3">
              {level >= 10 ? 'Max stage reached' : `${Math.round(progress * 100)}% to next stage`}
            </div>
            <div className="flex flex-col gap-1.5">
              {dims.map((d) => <MiniBar key={d.key} label={d.key} value={d.value} />)}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
