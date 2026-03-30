export function timeAgo(timestamp: string): string {
  if (!timestamp) return ''
  const ms = new Date(timestamp).getTime()
  if (Number.isNaN(ms)) return ''
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K`
  }
  return `${tokens}`
}

export function contextColor(tokens: number, max: number): 'default' | 'warning' | 'danger' {
  if (max === 0) return 'default'
  const pct = (tokens / max) * 100
  if (pct > 90) return 'danger'
  if (pct >= 70) return 'warning'
  return 'default'
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

export function formatElapsed(startTimestamp: string, endTimestamp: string): string {
  if (!startTimestamp || !endTimestamp) return ''
  const startMs = new Date(startTimestamp).getTime()
  const endMs = new Date(endTimestamp).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return ''
  const diff = endMs - startMs
  if (diff < 0) return ''
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
