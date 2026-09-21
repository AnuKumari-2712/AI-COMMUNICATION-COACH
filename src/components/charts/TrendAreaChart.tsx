import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, tooltipStyle } from '@/lib/chartTheme';
import type { TrendPoint } from '@/types';

export function TrendAreaChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.4} />
            <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey="label" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
        <Tooltip {...tooltipStyle} />
        <Area type="monotone" dataKey="overall" name="Overall Score" stroke={chartColors.accent} strokeWidth={2.5} fill="url(#overallGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
