import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-base-700 text-base-100',
  accent: 'bg-accent-500/15 text-accent-300 border border-accent-500/30',
  success: 'bg-success-500/15 text-success-400 border border-success-500/30',
  warning: 'bg-warning-500/15 text-warning-400 border border-warning-500/30',
  danger: 'bg-danger-500/15 text-danger-400 border border-danger-500/30',
  outline: 'bg-transparent text-base-200 border border-base-500',
};

export function Badge({ className, variant = 'neutral', size = 'md', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
