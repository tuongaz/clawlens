import { useState, useCallback } from 'react'
import type { MemoryFile } from '../types'
import { useWebSocketConnection } from './useWebSocketConnection'

interface UseMemoryFilesResult {
  files: MemoryFile[]
  loading: boolean
  error: string | null
}

export function useMemoryFiles(sessionId: string): UseMemoryFilesResult {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onMessage = useCallback((data: MemoryFile[]) => {
    setFiles(data)
    setError(null)
    setLoading(false)
  }, [])

  useWebSocketConnection<MemoryFile[]>(
    `/ws/sessions/${sessionId}/memory`,
    { onMessage },
  )

  return { files, loading, error }
}
