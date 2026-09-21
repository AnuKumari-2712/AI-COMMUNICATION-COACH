import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-300',
                i < current && 'border-accent-500 bg-accent-500 text-white',
                i === current && 'border-accent-400 text-accent-300',
                i > current && 'border-base-600 text-base-500',
              )}
            >
              {i < current ? <Check className="size-4" /> : i + 1}
            </div>
            <span className={cn('hidden text-xs font-medium sm:block', i <= current ? 'text-base-100' : 'text-base-500')}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300', i < current ? 'bg-accent-500' : 'bg-base-700')} />
          )}
        </div>
      ))}
    </div>
  );
}
