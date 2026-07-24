import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-md bg-surface-glass', className)}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';
