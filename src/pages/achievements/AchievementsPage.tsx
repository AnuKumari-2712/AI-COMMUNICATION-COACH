import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, BookOpen, Briefcase, Mic, GraduationCap, TrendingUp, Shield, Lock, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, Badge } from '@/components/ui';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DataSourceBadge } from '@/components/shared/DataSourceBadge';
import { studentService } from '@/services/studentService';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/types';

const iconMap = { flame: Flame, 'book-open': BookOpen, briefcase: Briefcase, mic: Mic, 'graduation-cap': GraduationCap, 'trending-up': TrendingUp, shield: Shield } as const;

const tierStyles: Record<Achievement['tier'], string> = {
  bronze: 'from-[#8a5a3a]/30 to-transparent border-[#8a5a3a]/40 text-[#d79c72]',
  silver: 'from-base-400/25 to-transparent border-base-400/40 text-base-100',
  gold: 'from-warning-500/30 to-transparent border-warning-500/40 text-warning-300',
  platinum: 'from-accent-500/30 to-transparent border-accent-400/40 text-accent-200',
};

export default function AchievementsPage() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [source, setSource] = useState<'real' | 'mock'>('mock');

  useEffect(() => {
    studentService.getAchievements().then((res) => {
      setItems(res.items);
      setSource(res.source);
    });
  }, []);

  const unlockedCount = items.filter((a) => a.unlocked).length;

  return (
    <div>
      <PageHeader
        eyebrow="Milestones"
        title="Achievements"
        description="Progress markers that reflect real communication growth."
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge source={source} />
            <Badge variant="accent"><Trophy className="size-3.5" /> {unlockedCount} / {items.length} Unlocked</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((a, i) => {
          const Icon = iconMap[a.icon as keyof typeof iconMap] ?? Trophy;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 16, rotateX: -8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              style={{ perspective: 800 }}
            >
              <Card
                className={cn(
                  'relative overflow-hidden bg-gradient-to-b p-5 transition-transform duration-300 hover:-translate-y-1',
                  tierStyles[a.tier],
                  !a.unlocked && 'opacity-70 grayscale-[0.4]',
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn('flex size-12 items-center justify-center rounded-2xl border', tierStyles[a.tier])}>
                    <Icon className="size-6" />
                  </div>
                  {a.unlocked ? (
                    <Badge variant="success" size="sm">Unlocked</Badge>
                  ) : (
                    <Lock className="size-4 text-base-500" />
                  )}
                </div>
                <h3 className="font-display text-base font-semibold text-base-50">{a.title}</h3>
                <p className="mt-1 text-xs text-base-300">{a.description}</p>
                <div className="mt-4">
                  <ProgressBar value={a.progress} max={a.target} tone={a.unlocked ? 'success' : 'accent'} size="sm" />
                  <p className="mt-1.5 text-[11px] text-base-400">{a.progress} / {a.target}</p>
                </div>
                <Badge variant="outline" size="sm" className="mt-3 capitalize">{a.tier}</Badge>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
