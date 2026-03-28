import type { ReactNode } from 'react'

interface SectionCardProps {
  children: ReactNode
  className?: string
}

export function SectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 ${className}`}>
      {children}
    </div>
  )
}
