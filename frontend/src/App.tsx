import { useState, useMemo } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { Header } from './components/Header'
import { ProjectBox } from './components/ProjectBox'
import './App.css'

export function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function App() {
  const { groups, stats, connected, lastUpdated } = useWebSocket()
  const [activeOnly, setActiveOnly] = useState(false)

  const filteredGroups = useMemo(() => {
    if (!activeOnly) return groups
    return groups
      .map((g) => ({ ...g, sessions: g.sessions.filter((s) => s.isActive) }))
      .filter((g) => g.sessions.length > 0)
  }, [groups, activeOnly])

  return (
    <div className="app">
      <Header
        groups={filteredGroups}
        stats={stats}
        connected={connected}
        lastUpdated={lastUpdated}
        activeOnly={activeOnly}
        onToggleActiveOnly={() => setActiveOnly((v) => !v)}
      />
      <main className="main">
        {filteredGroups.map((group, index) => (
          <ProjectBox
            key={group.projectName}
            group={group}
            colorIndex={index}
          />
        ))}
        {filteredGroups.length === 0 && connected && (
          <div className="empty-state">
            {activeOnly ? 'No running sessions.' : 'No sessions found.'}
          </div>
        )}
        {!connected && groups.length === 0 && (
          <div className="empty-state">Connecting to server...</div>
        )}
      </main>
    </div>
  )
}

export default App
