import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import type { CommunicationOrbProps } from './CommunicationOrbCore';

/**
 * The real orb (three.js + @react-three/fiber + drei) is ~900KB minified —
 * by far the largest chunk in the app. Loading it lazily means a page like
 * the Dashboard can paint its cards and charts immediately instead of
 * blocking on three.js, and pages that never render an orb never fetch it
 * at all. The fallback below is a plain CSS gradient blob shaped like the
 * orb so the layout doesn't jump once the real one streams in.
 */
const RealCommunicationOrb = lazy(() =>
  import('./CommunicationOrbCore').then((m) => ({ default: m.CommunicationOrb })),
);

function OrbFallback({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)} aria-hidden="true">
      <div className="size-4/5 animate-pulse-soft rounded-full bg-gradient-to-br from-accent-500/50 to-azure-500/40 blur-xl" />
    </div>
  );
}

export type { CommunicationOrbProps };

export function CommunicationOrb(props: CommunicationOrbProps) {
  return (
    <Suspense fallback={<OrbFallback className={props.className} />}>
      <RealCommunicationOrb {...props} />
    </Suspense>
  );
}
