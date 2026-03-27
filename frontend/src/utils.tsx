import type { ReactNode } from 'react'

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

export const GitBranchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
  </svg>
)

const VSCodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M11.5 1L5.5 7L2.5 4.5L1 5.5L5.5 9.5L13 2.5L11.5 1Z" fill="#007ACC" />
    <path d="M1 5.5V10.5L2.5 11.5L5.5 9L11.5 15L13 13.5V2.5L11.5 1L5.5 7L2.5 4.5L1 5.5Z" fill="#007ACC" opacity="0.8" />
  </svg>
)

const CursorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M3 1L3 13L6 10L9 14L11 13L8 9L12 8L3 1Z" fill="#58A6FF" />
  </svg>
)

const PyCharmIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#21D789" />
    <rect x="4" y="11" width="5" height="1.5" fill="#000" />
    <text x="4.5" y="9" fontSize="7" fontWeight="bold" fill="#000" fontFamily="sans-serif">P</text>
  </svg>
)

const IntelliJIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#087CFA" />
    <rect x="4" y="11" width="5" height="1.5" fill="#FFF" />
    <text x="4.5" y="9" fontSize="7" fontWeight="bold" fill="#FFF" fontFamily="sans-serif">IJ</text>
  </svg>
)

const GoLandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#078D6E" />
    <rect x="4" y="11" width="5" height="1.5" fill="#FFF" />
    <text x="4" y="9" fontSize="7" fontWeight="bold" fill="#FFF" fontFamily="sans-serif">GL</text>
  </svg>
)

const WebStormIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="#00CDD7" />
    <rect x="4" y="11" width="5" height="1.5" fill="#000" />
    <text x="3.5" y="9" fontSize="7" fontWeight="bold" fill="#000" fontFamily="sans-serif">WS</text>
  </svg>
)

const ZedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M8 1L6 6H7.5L5 15L10 8H8L10 1H8Z" fill="#F5A623" />
  </svg>
)

const WindsurfIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 10C3 7 5 9 7 7C9 5 11 8 13 6C14 5.3 15 4 15 4" stroke="#3FBFA0" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M1 13C3 10 5 12 7 10C9 8 11 11 13 9C14 8.3 15 7 15 7" stroke="#3FBFA0" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
  </svg>
)

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="1" y="2" width="14" height="12" rx="2" stroke="#7d8590" strokeWidth="1.5" fill="none" />
    <path d="M4 6L7 8L4 10" stroke="#7d8590" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="10" x2="12" y2="10" stroke="#7d8590" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export function getClientIcon(client: string): ReactNode {
  const c = client.toLowerCase()
  if (c.includes('cursor')) return <CursorIcon />
  if (c.includes('code')) return <VSCodeIcon />
  if (c.includes('pycharm')) return <PyCharmIcon />
  if (c.includes('intellij')) return <IntelliJIcon />
  if (c.includes('goland')) return <GoLandIcon />
  if (c.includes('webstorm')) return <WebStormIcon />
  if (c.includes('zed')) return <ZedIcon />
  if (c.includes('windsurf')) return <WindsurfIcon />
  return <TerminalIcon />
}

export function ideDeepLink(client: string, cwd: string): string | null {
  const c = client.toLowerCase()
  if (c.includes('cursor')) return `cursor://file/${cwd}`
  if (c.includes('code')) return `vscode://file/${cwd}`
  if (c.includes('windsurf')) return `windsurf://file/${cwd}`
  if (c.includes('zed')) return `zed://file/${cwd}`
  if (c.includes('pycharm')) return `pycharm://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('intellij')) return `idea://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('goland')) return `goland://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('webstorm')) return `webstorm://open?file=${encodeURIComponent(cwd)}`
  return null
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}
