import { useState, useMemo } from 'react'
import { Switch } from '@heroui/react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Header } from '../components/Header'
import { ProjectBox } from '../components/ProjectBox'
import { EmptyState } from '../components/ui'
import { formatTokens } from '../utils'

export function Dashboard() {
  const { groups, stats, connected } = useWebSocket()
  const [activeOnly, setActiveOnly] = useState(false)

  const filteredGroups = useMemo(() => {
    if (!activeOnly) return groups
    return groups
      .map((g) => ({ ...g, sessions: g.sessions.filter((s) => s.isActive) }))
      .filter((g) => g.sessions.length > 0)
  }, [groups, activeOnly])

  const totalSessions = groups.reduce((sum, g) => sum + g.sessions.length, 0)
  const activeSessions = groups.reduce(
    (sum, g) => sum + g.sessions.filter((s) => s.isActive).length,
    0
  )
  const projectCount = groups.length

  return (
    <>
      <Header>
        <span className="text-[var(--text-secondary)] text-[13px] pl-3.5 border-l border-[var(--border)]">
          {totalSessions} session{totalSessions !== 1 ? 's' : ''}
          {activeSessions > 0 && <> &middot; {activeSessions} active</>}
          {' '}&middot; {projectCount} project{projectCount !== 1 ? 's' : ''}
        </span>

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
                  {formatTokens(period.inputTokens + period.outputTokens)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Switch
            size="lg"
            isSelected={activeOnly}
            onChange={setActiveOnly}
          >
            <Switch.Control className={activeOnly ? 'bg-[var(--accent-green)]' : undefined}>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </div>
      </Header>

      <div className="w-full px-8 py-6 max-sm:px-4 max-sm:py-4">
        <main className="flex flex-col gap-7">
          {filteredGroups.map((group) => (
            <ProjectBox
              key={group.projectName}
              group={group}
            />
          ))}
          {filteredGroups.length === 0 && connected && (
            <EmptyState message={activeOnly ? 'No running sessions.' : 'No sessions found.'} className="py-20" />
          )}
          {!connected && groups.length === 0 && (
            <EmptyState message="Connecting to server..." className="py-20" />
          )}
        </main>
      </div>
    </>
  )
}
