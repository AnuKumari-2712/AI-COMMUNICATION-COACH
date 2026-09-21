import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-accent-500 text-white shadow-soft-md hover:bg-accent-400 active:bg-accent-600 disabled:bg-accent-500/50',
  secondary:
    'bg-base-800 text-base-50 border border-base-600 hover:bg-base-700 active:bg-base-800',
  ghost: 'bg-transparent text-base-100 hover:bg-white/5 active:bg-white/10',
  outline: 'bg-transparent border border-base-500 text-base-50 hover:bg-white/5',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-soft-md',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'h-10 w-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium tracking-tight transition-all duration-200 focus-ring disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
