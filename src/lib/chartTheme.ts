export const chartColors = {
  accent: '#7c74ee',
  accentSoft: 'rgba(124, 116, 238, 0.18)',
  azure: '#56a4f4',
  azureSoft: 'rgba(86, 164, 244, 0.18)',
  success: '#3fc48f',
  warning: '#f0ac4c',
  danger: '#ea6f6f',
  grid: 'rgba(255,255,255,0.06)',
  axis: '#5b6785',
  tooltipBg: '#121828',
  tooltipBorder: 'rgba(255,255,255,0.08)',
};

export const tooltipStyle = {
  contentStyle: {
    background: chartColors.tooltipBg,
    border: `1px solid ${chartColors.tooltipBorder}`,
    borderRadius: 12,
    fontSize: 12,
    color: '#dde1ec',
    boxShadow: '0 12px 32px rgba(6,9,18,0.4)',
  },
  labelStyle: { color: '#8a93ad', marginBottom: 4 },
};
