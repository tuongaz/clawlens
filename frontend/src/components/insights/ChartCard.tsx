import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
      <h3 className="text-[var(--text-secondary)] text-base font-medium mb-5">{title}</h3>
      {children}
    </div>
  )
}
