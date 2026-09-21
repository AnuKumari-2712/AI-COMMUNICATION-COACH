import { cn } from '@/lib/utils';

export interface RadialProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  label?: string;
  sublabel?: string;
  className?: string;
}

const toneStroke: Record<NonNullable<RadialProgressProps['tone']>, string> = {
  accent: 'stroke-accent-400',
  success: 'stroke-success-400',
  warning: 'stroke-warning-400',
  danger: 'stroke-danger-400',
};

export function RadialProgress({ value, size = 96, strokeWidth = 8, tone = 'accent', label, sublabel, className }: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="fill-none stroke-base-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('fill-none transition-[stroke-dashoffset] duration-700 ease-out', toneStroke[tone])}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold text-base-50">{Math.round(value)}</span>
        {sublabel && <span className="text-[10px] uppercase tracking-wide text-base-400">{sublabel}</span>}
      </div>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
