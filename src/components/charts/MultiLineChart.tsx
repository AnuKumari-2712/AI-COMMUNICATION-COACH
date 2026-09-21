import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, tooltipStyle } from '@/lib/chartTheme';
import type { TrendPoint } from '@/types';

const lines: { key: keyof TrendPoint; color: string; name: string }[] = [
  { key: 'grammar', color: chartColors.azure, name: 'Grammar' },
  { key: 'vocabulary', color: chartColors.accent, name: 'Vocabulary' },
  { key: 'fluency', color: chartColors.warning, name: 'Fluency' },
  { key: 'confidence', color: chartColors.success, name: 'Confidence' },
];

export function MultiLineChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey="label" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: chartColors.axis }} />
        {lines.map((line) => (
          <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2.25} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
