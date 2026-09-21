import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-base-600 px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-base-800 text-accent-400">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-semibold text-base-50">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-base-300">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
