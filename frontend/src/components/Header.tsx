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
    <header className="header">
      <div className="header-left">
        <span className="header-icon">&#9670;</span>
        <h1 className="header-title">ClawHawk</h1>
        <span className="header-stats">
          {totalSessions} session{totalSessions !== 1 ? 's' : ''}
          {activeSessions > 0 && <> &middot; {activeSessions} active</>}
          {' '}&middot; {projectCount} project{projectCount !== 1 ? 's' : ''}
        </span>
      </div>
      {stats && (
        <div className="header-tokens">
          <div className="token-period">
            <span className="token-label">Today</span>
            <span className="token-value">{formatStatTokens(stats.today.inputTokens + stats.today.outputTokens)}</span>
          </div>
          <div className="token-period">
            <span className="token-label">Week</span>
            <span className="token-value">{formatStatTokens(stats.thisWeek.inputTokens + stats.thisWeek.outputTokens)}</span>
          </div>
          <div className="token-period">
            <span className="token-label">Month</span>
            <span className="token-value">{formatStatTokens(stats.thisMonth.inputTokens + stats.thisMonth.outputTokens)}</span>
          </div>
        </div>
      )}
      <div className="header-right">
        <button
          className={`filter-btn ${activeOnly ? 'filter-active' : ''}`}
          onClick={onToggleActiveOnly}
        >
          {activeOnly ? 'Running only' : 'All sessions'}
        </button>
        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {connected ? 'live' : 'disconnected'}
        </span>
        {lastUpdated && (
          <span className="last-updated">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    </header>
  )
}
