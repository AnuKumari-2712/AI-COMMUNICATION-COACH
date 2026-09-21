import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, tooltipStyle } from '@/lib/chartTheme';

export function SimpleBarChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = chartColors.accent,
  height = 240,
}: {
  data: T[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
