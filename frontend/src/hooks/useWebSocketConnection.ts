import { useEffect, useRef, useCallback } from 'react'

interface UseWebSocketConnectionOptions<T> {
  onMessage: (data: T) => void
  onError?: (error: string) => void
  onOpen?: () => void
}

export function useWebSocketConnection<T>(
  path: string,
  options: UseWebSocketConnectionOptions<T>,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}${path}`)
    wsRef.current = ws

    ws.onopen = () => {
      backoffRef.current = 1000
      optionsRef.current.onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T
        optionsRef.current.onMessage(data)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (!mountedRef.current) return
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, 10000)
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [path])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])
}
