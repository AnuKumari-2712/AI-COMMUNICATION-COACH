import { cn } from '@/lib/utils';

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const colors = ['bg-danger-500', 'bg-danger-400', 'bg-warning-500', 'bg-success-500', 'bg-success-400'];

export function PasswordStrength({ password }: { password: string }) {
  const score = password ? getStrength(password) : 0;
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full bg-base-700', i < score && colors[score])} />
        ))}
      </div>
      {password && <p className="mt-1.5 text-xs text-base-400">{labels[score]}</p>}
    </div>
  );
}
