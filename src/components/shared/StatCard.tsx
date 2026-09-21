import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  index?: number;
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  accent: 'bg-accent-500/15 text-accent-400',
  success: 'bg-success-500/15 text-success-400',
  warning: 'bg-warning-500/15 text-warning-400',
  danger: 'bg-danger-500/15 text-danger-400',
};

export function StatCard({ icon, label, value, suffix, trend, tone = 'accent', index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card interactive className="p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex size-10 items-center justify-center rounded-xl', toneClasses[tone])}>{icon}</div>
          {trend !== undefined && (
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', trend >= 0 ? 'text-success-400' : 'text-danger-400')}>
              {trend >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="mt-4 font-display text-2xl font-semibold text-base-50">
          {value}
          {suffix && <span className="ml-1 text-sm font-normal text-base-400">{suffix}</span>}
        </p>
        <p className="mt-1 text-sm text-base-300">{label}</p>
      </Card>
    </motion.div>
  );
}
