import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-950 px-4 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-400">
        <Compass className="size-8" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-base-50">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-base-300">The page you're looking for doesn't exist or has moved.</p>
      <Button className="mt-6" onClick={() => navigate('/')}>
        Back to Home
      </Button>
    </div>
  );
}
