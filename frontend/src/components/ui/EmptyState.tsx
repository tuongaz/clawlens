interface EmptyStateProps {
  message: string
  className?: string
}

export function EmptyState({ message, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center text-[var(--text-secondary)] py-12 text-base bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg ${className}`}>
      {message}
    </div>
  )
}
