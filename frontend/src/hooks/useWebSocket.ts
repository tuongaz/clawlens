import { useState, useCallback } from 'react'
import type { ProjectGroup, TokenStats } from '../types'
import { useWebSocketConnection } from './useWebSocketConnection'

interface WebSocketPayload {
  groups: ProjectGroup[]
  stats: TokenStats
}

interface UseWebSocketResult {
  groups: ProjectGroup[]
  stats: TokenStats | null
  connected: boolean
  lastUpdated: Date | null
}

export function useWebSocket(): UseWebSocketResult {
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const onMessage = useCallback((data: WebSocketPayload) => {
    setGroups(data.groups)
    setStats(data.stats)
    setLastUpdated(new Date())
  }, [])

  const onOpen = useCallback(() => {
    setConnected(true)
  }, [])

  useWebSocketConnection<WebSocketPayload>('/ws', {
    onMessage,
    onOpen,
  })

  return { groups, stats, connected, lastUpdated }
}
