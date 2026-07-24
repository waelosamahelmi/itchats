import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface-elevated p-4',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';
