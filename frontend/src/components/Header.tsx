import { Card, Button, Chip } from '@heroui/react'
import type { ProjectGroup, TokenStats } from '../types'

interface HeaderProps {
  groups: ProjectGroup[]
  stats: TokenStats | null
  connected: boolean
  lastUpdated: Date | null
  activeOnly: boolean
  onToggleActiveOnly: () => void
}

function formatStatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`
  }
  return `${tokens}`
}

export function Header({ groups, stats, connected, lastUpdated, activeOnly, onToggleActiveOnly }: HeaderProps) {
  const totalSessions = groups.reduce((sum, g) => sum + g.sessions.length, 0)
  const activeSessions = groups.reduce(
    (sum, g) => sum + g.sessions.filter((s) => s.isActive).length,
    0
  )
  const projectCount = groups.length

  return (
    <Card className="mb-7">
      <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4">
        {/* Left: title + stats */}
        <div className="flex items-center gap-3.5">
          <span className="text-[var(--accent-cyan)] text-[22px] leading-none">&#9670;</span>
          <h1 className="font-[var(--font-mono)] text-lg font-bold text-white tracking-wide">ClawHawk</h1>
          <span className="text-[var(--text-secondary)] text-[13px] pl-3.5 border-l border-[var(--border)]">
            {totalSessions} session{totalSessions !== 1 ? 's' : ''}
            {activeSessions > 0 && <> &middot; {activeSessions} active</>}
            {' '}&middot; {projectCount} project{projectCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Center: token stats */}
        {stats && (
          <div className="flex items-center gap-4 px-4 border-l border-r border-[var(--border)] max-sm:border-none max-sm:px-0">
            {([
              ['Today', stats.today],
              ['Week', stats.thisWeek],
              ['Month', stats.thisMonth],
            ] as const).map(([label, period]) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-[var(--font-mono)] text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
                <span className="text-sm font-[var(--font-mono)] font-semibold text-[var(--text-primary)]">
                  {formatStatTokens(period.inputTokens + period.outputTokens)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Right: filter + connection status */}
        <div className="flex items-center gap-2.5 text-xs">
          <Button
            size="sm"
            variant={activeOnly ? 'primary' : 'outline'}
            onPress={onToggleActiveOnly}
            className={`font-[var(--font-mono)] text-[11px] mr-2 ${
              activeOnly
                ? 'bg-[rgba(63,185,80,0.08)] text-[var(--accent-green)] border-[var(--accent-green)]'
                : ''
            }`}
          >
            {activeOnly ? 'Running only' : 'All sessions'}
          </Button>
          <Chip
            size="sm"
            variant="soft"
            className="font-[var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] gap-1.5"
          >
            <span
              className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                connected
                  ? 'bg-[var(--accent-green)] shadow-[0_0_8px_rgba(63,185,80,0.4)]'
                  : 'bg-[var(--accent-red)]'
              }`}
            />
            {connected ? 'live' : 'disconnected'}
          </Chip>
          {lastUpdated && (
            <span className="text-[var(--text-secondary)] text-[11px] ml-1 opacity-70">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </Card.Header>
    </Card>
  )
}
