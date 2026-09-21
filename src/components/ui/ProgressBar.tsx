import { cn, clamp } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  label?: string;
  showValue?: boolean;
  className?: string;
}

const toneClasses: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  accent: 'bg-accent-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

export function ProgressBar({ value, max = 100, tone = 'accent', size = 'md', label, showValue, className }: ProgressBarProps) {
  const pct = clamp((value / max) * 100, 0, 100);
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-base-300">
          {label && <span>{label}</span>}
          {showValue && <span className="font-medium text-base-100">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('w-full overflow-hidden rounded-full bg-base-700', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-out', toneClasses[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
