import { Card } from '@/components/ui';
import { RadialProgress } from '@/components/ui/RadialProgress';
import { scoreTone } from '@/lib/utils';

export interface SkillScoreCardProps {
  label: string;
  value: number;
  description?: string;
}

export function SkillScoreCard({ label, value, description }: SkillScoreCardProps) {
  const tone = scoreTone(value);
  return (
    <Card interactive className="flex flex-col items-center gap-2.5 p-4 text-center">
      <RadialProgress value={value} size={60} strokeWidth={6} tone={tone} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-base-50">{label}</p>
        {description && <p className="mt-0.5 truncate text-xs text-base-400">{description}</p>}
      </div>
    </Card>
  );
}
