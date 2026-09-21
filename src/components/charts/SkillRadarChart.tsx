import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { chartColors, tooltipStyle } from '@/lib/chartTheme';
import type { SkillDistributionPoint } from '@/types';

export function SkillRadarChart({ data }: { data: SkillDistributionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke={chartColors.grid} />
        <PolarAngleAxis dataKey="skill" stroke={chartColors.axis} fontSize={12} />
        <Tooltip {...tooltipStyle} />
        <Radar dataKey="value" name="Skill Score" stroke={chartColors.accent} fill={chartColors.accent} fillOpacity={0.3} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
