import { AlertOctagon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', description = 'We couldn’t load this data. Please try again.', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-danger-500/20 bg-danger-500/5 px-6 py-14 text-center', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-danger-500/15 text-danger-400">
        <AlertOctagon className="size-6" />
      </div>
      <h3 className="font-display text-base font-semibold text-base-50">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-base-300">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
