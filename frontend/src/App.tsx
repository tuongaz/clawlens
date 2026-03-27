import { useState, useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useWebSocket } from './hooks/useWebSocket'
import { Header } from './components/Header'
import { ProjectBox } from './components/ProjectBox'
import { SessionDetailPage } from './pages/SessionDetailPage'
import './App.css'

function Dashboard() {
  const { groups, stats, connected } = useWebSocket()
  const [activeOnly, setActiveOnly] = useState(false)

  const filteredGroups = useMemo(() => {
    if (!activeOnly) return groups
    return groups
      .map((g) => ({ ...g, sessions: g.sessions.filter((s) => s.isActive) }))
      .filter((g) => g.sessions.length > 0)
  }, [groups, activeOnly])

  return (
    <div className="w-full px-8 py-6 max-sm:px-4 max-sm:py-4">
      <Header
        groups={groups}
        stats={stats}
        connected={connected}
        activeOnly={activeOnly}
        onToggleActiveOnly={setActiveOnly}
      />
      <main className="flex flex-col gap-7">
        {filteredGroups.map((group) => (
          <ProjectBox
            key={group.projectName}
            group={group}
          />
        ))}
        {filteredGroups.length === 0 && connected && (
          <div className="text-center text-[var(--text-secondary)] py-20 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
            {activeOnly ? 'No running sessions.' : 'No sessions found.'}
          </div>
        )}
        {!connected && groups.length === 0 && (
          <div className="text-center text-[var(--text-secondary)] py-20 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
            Connecting to server...
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:sessionId" element={<SessionDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
