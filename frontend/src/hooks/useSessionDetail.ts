import { useState, useCallback } from 'react'
import type { SessionDetail } from '../types'
import { useWebSocketConnection } from './useWebSocketConnection'

interface UseSessionDetailResult {
  detail: SessionDetail | null
  loading: boolean
  error: string | null
}

export function useSessionDetail(sessionId: string): UseSessionDetailResult {
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onMessage = useCallback((data: SessionDetail & { error?: string }) => {
    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }
    setDetail(data)
    setError(null)
    setLoading(false)
  }, [])

  useWebSocketConnection<SessionDetail & { error?: string }>(
    `/ws/sessions/${sessionId}`,
    { onMessage },
  )

  return { detail, loading, error }
}
