import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartCard } from './ChartCard'
import type { InsightsUserInteractions } from '../../types'

const COLORS = ['#667eea', '#764ba2', '#48bb78', '#ef4444', '#f59e0b', '#ed8936', '#58a6ff', '#bc8cff']

interface ModelUsageChartProps {
  userInteractions: InsightsUserInteractions
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function shortenModel(name: string): string {
  // e.g. "claude-opus-4-6-20250514" → "opus-4-6"
  return name.replace(/^claude-/, '').replace(/-\d{8,}$/, '')
}

export function ModelUsageChart({ userInteractions }: ModelUsageChartProps) {
  const dist = userInteractions.model_distribution
  const data = Object.entries(dist)
    .filter(([, tokens]) => tokens > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([model, tokens]) => ({ name: shortenModel(model), fullName: model, tokens }))

  if (data.length === 0) return null

  return (
    <ChartCard title="Model Usage (by tokens)">
      <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Pie
            data={data}
            dataKey="tokens"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={120}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 15 }}
            labelStyle={{ color: 'var(--text-bright)' }}
            formatter={(value) => value != null ? fmtTokens(Number(value)) : ''}
          />
          <Legend
            wrapperStyle={{ fontSize: 14 }}
            formatter={(value: string) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
