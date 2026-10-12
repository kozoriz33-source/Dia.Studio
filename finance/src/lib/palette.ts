// Оранжевый зарезервирован под предупреждения, поэтому в диаграмме его нет
export const CHART_COLORS = [
  '#02d2e3', '#3b82f6', '#8b5cf6', '#22c55e', '#eab308', '#ec4899', '#64748b', '#14b8a6',
]
export const colorFor = (i: number) => CHART_COLORS[i % CHART_COLORS.length]
