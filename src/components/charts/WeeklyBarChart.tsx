import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, tooltipStyle } from '@/lib/chartTheme';
import type { WeeklyActivityPoint } from '@/types';

export function WeeklyBarChart({ data }: { data: WeeklyActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey="day" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="minutes" name="Minutes Practiced" fill={chartColors.accent} radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
