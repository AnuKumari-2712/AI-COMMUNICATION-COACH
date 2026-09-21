import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { CommunicationOrb } from '@/components/three/CommunicationOrb';
import { Reveal } from '@/components/shared/Reveal';

export function AuthLayout({ children, tagline }: { children: ReactNode; tagline: string }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16">
        <Link to="/" className="mb-10 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-azure-500">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-display text-sm font-semibold text-base-50">Communication Coach</span>
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-white/5 bg-base-900/60 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-700/10 via-transparent to-azure-600/10" />
        <Reveal className="relative flex flex-col items-center px-10 text-center">
          <CommunicationOrb active className="h-72 w-72" />
          <h2 className="mt-4 font-display text-xl font-semibold text-base-50">{tagline}</h2>
          <p className="mt-2 max-w-sm text-sm text-base-300">
            Adaptive voice and text analysis that builds a learning plan around you, not a generic curriculum.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
