import { forwardRef } from 'react';
import { cn } from './cn';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt = '', fallback, size = 'md', className }, ref) => {
    const initials = fallback
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    if (src) {
      return (
        <img
          src={src}
          alt={alt}
          className={cn('rounded-full object-cover', sizeClasses[size], className)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-full bg-bg-elevated flex items-center justify-center font-medium text-text-muted',
          sizeClasses[size],
          className,
        )}
      >
        {initials || '?'}
      </div>
    );
  },
);
Avatar.displayName = 'Avatar';
