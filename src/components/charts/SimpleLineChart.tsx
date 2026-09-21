import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, tooltipStyle } from '@/lib/chartTheme';

export function SimpleLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = chartColors.azure,
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
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey={xKey} stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
