import { useState, useEffect, useRef, useCallback } from 'react'
import type { SessionDetail } from '../types'

interface UseSessionDetailResult {
  detail: SessionDetail | null
  loading: boolean
  error: string | null
}

export function useSessionDetail(sessionId: string): UseSessionDetailResult {
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws/sessions/${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      backoffRef.current = 1000
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.error) {
          setError(data.error)
          setLoading(false)
          return
        }
        setDetail(data as SessionDetail)
        setError(null)
        setLoading(false)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, 10000)
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [sessionId])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return { detail, loading, error }
}
