import type { ReactNode } from 'react'

interface SectionTitleProps {
  children: ReactNode
  className?: string
}

export function SectionTitle({ children, className = '' }: SectionTitleProps) {
  return (
    <h3 className={`text-base font-semibold text-[var(--text-bright)] mb-3 flex items-center gap-1.5 ${className}`}>
      {children}
    </h3>
  )
}
