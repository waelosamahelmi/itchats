import { cn } from './cn';
import { forwardRef, type HTMLAttributes } from 'react';

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, items, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex gap-1 rounded-full bg-surface-elevated p-1', className)}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onValueChange(item.value)}
          className={cn(
            'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            value === item.value
              ? 'bg-brand-primary text-white'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
);
Tabs.displayName = 'Tabs';
