import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'ai';
}

const variantClasses: Record<string, string> = {
  default: 'bg-bg-elevated text-text-secondary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-danger/20 text-danger',
  ai: 'bg-brand-primary/20 text-brand-primary',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';
