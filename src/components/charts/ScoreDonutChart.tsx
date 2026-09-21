import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { chartColors } from '@/lib/chartTheme';

export function ScoreDonutChart({ value, size = 160, tone = chartColors.accent }: { value: number; size?: number; tone?: string }) {
  const data = [
    { name: 'score', value },
    { name: 'rest', value: 100 - value },
  ];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={tone} />
            <Cell fill="rgba(255,255,255,0.06)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-base-50">{value}</span>
        <span className="text-[11px] uppercase tracking-wide text-base-400">score</span>
      </div>
    </div>
  );
}
