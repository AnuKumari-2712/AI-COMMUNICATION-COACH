import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface WaveformProps {
  active?: boolean;
  bars?: number;
  className?: string;
  color?: string;
}

export function Waveform({ active = true, bars = 40, className, color = 'bg-accent-400' }: WaveformProps) {
  const heights = useMemo(() => Array.from({ length: bars }, () => 0.2 + Math.random() * 0.8), [bars]);

  return (
    <div className={cn('flex h-16 items-center justify-center gap-1', className)}>
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className={cn('w-1 rounded-full', color)}
          initial={{ height: '10%' }}
          animate={
            active
              ? { height: [`${h * 30}%`, `${h * 100}%`, `${h * 40}%`] }
              : { height: '14%' }
          }
          transition={
            active
              ? { duration: 0.8 + (i % 5) * 0.08, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: i * 0.02 }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
