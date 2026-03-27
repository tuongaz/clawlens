import { Brain } from 'lucide-react'
import { Card, Chip, Tooltip, Meter } from '@heroui/react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '../types'
import { timeAgo, formatTokens, contextColor, GitBranchIcon, getClientIcon, ideDeepLink } from '../utils'

interface SessionCardProps {
  session: Session
  projectPath: string
}

export function SessionCard({ session, projectPath }: SessionCardProps) {
  const navigate = useNavigate()
  const slug = session.sessionId.slice(0, 8)
  const isActive = session.isActive
  const isWaiting = session.waitingForInput
  const hasFooter = session.gitBranch || session.usesMemory || session.client || session.contextTokens > 0

  const borderClass = isActive
    ? isWaiting
      ? 'border-warning'
      : 'border-success'
    : 'border-[var(--border)]'

  const pct = session.maxContextTokens > 0
    ? Math.round((session.contextTokens / session.maxContextTokens) * 100)
    : 0

  return (
    <Card
      className={`bg-[var(--bg-primary)] border ${borderClass} hover:bg-[var(--bg-card)] shadow-md shadow-black/20 cursor-pointer ${isActive ? 'bg-[var(--bg-card)]' : ''}`}
      onClick={() => navigate(`/session/${session.sessionId}`)}
    >
      <Card.Header className="flex-row items-center gap-2 px-4 pt-3 pb-0">
        {isActive && !isWaiting ? (
          <span className="inline-block w-[7px] h-[7px] rounded-full bg-success shadow-[0_0_8px_rgba(63,185,80,0.5)] animate-pulse-blink shrink-0" />
        ) : isActive && isWaiting ? (
          <span className="inline-flex items-center text-warning animate-pulse-blink" title="Waiting for input">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.75-1a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </span>
        ) : (
          <span className="inline-block w-[7px] h-[7px] rounded-full bg-[var(--text-secondary)] opacity-40 shrink-0" />
        )}
        {session.name ? (
          <>
            <span className={`font-semibold text-xs truncate max-w-[160px] ${isActive ? 'text-[var(--text-bright)]' : 'text-[var(--text-primary)]'}`}>
              {session.name}
            </span>
            <span className="text-[var(--text-secondary)] font-mono text-[11px]">
              {slug}
            </span>
          </>
        ) : (
          <span className={`font-mono font-semibold text-xs tracking-wider ${isActive ? 'text-[var(--text-bright)]' : 'text-[var(--text-secondary)]'}`}>
            {slug}
          </span>
        )}
        <span className="ml-auto text-[var(--text-secondary)] text-[11px] font-mono">
          {timeAgo(session.timestamp)}
        </span>
      </Card.Header>

      <Card.Content className="flex flex-col gap-2.5 px-4 py-2">
        {session.lastUserPrompt && (
          <div className="text-[var(--text-primary)] text-xs leading-[1.4] whitespace-pre-wrap break-words line-clamp-3">
            {session.lastUserPrompt.startsWith('/') ? (
              <><span className="text-[11px] opacity-60 mr-0.5">&#8984;</span> {session.lastUserPrompt}</>
            ) : (
              session.lastUserPrompt
            )}
          </div>
        )}

        {session.lastAction && (
          <div className="flex items-center gap-1.5 text-warning text-[11px] font-mono bg-warning/[0.08] py-1 px-2.5 rounded-[var(--radius-sm)] line-clamp-2 break-words">
            {isActive && !isWaiting ? (
              <span className="inline-block w-[6px] h-[6px] rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)] animate-pulse-blink shrink-0" />
            ) : (
              <span className="text-[11px] shrink-0">&#9889;</span>
            )}
            {session.lastAction}
          </div>
        )}
      </Card.Content>

      {hasFooter && (
        <Card.Footer className="flex items-center gap-2 px-4 pt-3 pb-3 border-t border-[var(--border-light)] mt-auto">
          {session.gitBranch && (
            <Tooltip>
              <Tooltip.Trigger>
                <Chip size="sm" variant="secondary" className="bg-transparent border-0 text-[var(--text-secondary)] font-mono text-[11px] px-0 gap-1 max-w-[200px]">
                  <GitBranchIcon />
                  <span className="truncate">{session.gitBranch}</span>
                </Chip>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                Branch: {session.gitBranch}
              </Tooltip.Content>
            </Tooltip>
          )}
          {session.usesMemory && (
            <Tooltip>
              <Tooltip.Trigger>
                <Chip size="sm" variant="soft" color="accent" className="font-mono text-[10px] text-[var(--accent-magenta)] bg-[rgba(188,140,255,0.1)] border border-[rgba(188,140,255,0.2)] gap-1">
                  <Brain size={12} /> Memory
                </Chip>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                This session uses memory files
              </Tooltip.Content>
            </Tooltip>
          )}
          {session.client && (
            <Tooltip>
              <Tooltip.Trigger>
                {(() => {
                  const link = ideDeepLink(session.client, projectPath)
                  return link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Chip size="sm" variant="soft" className="font-mono text-[10px] text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] gap-1 cursor-pointer hover:bg-[rgba(88,166,255,0.2)] hover:border-[rgba(88,166,255,0.4)] transition-all">
                        {getClientIcon(session.client)} {session.client}
                      </Chip>
                    </a>
                  ) : (
                    <Chip size="sm" variant="soft" className="font-mono text-[10px] text-[var(--accent-cyan)] bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] gap-1">
                      {getClientIcon(session.client)} {session.client}
                    </Chip>
                  )
                })()}
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                {ideDeepLink(session.client, projectPath) ? `Open in ${session.client}` : session.client}
              </Tooltip.Content>
            </Tooltip>
          )}
          <div className="flex-1" />
          {session.contextTokens > 0 && (
            <Tooltip>
              <Tooltip.Trigger>
                <div className="cursor-default min-w-[100px] max-w-[140px]">
                  <Meter
                    value={pct}
                    minValue={0}
                    maxValue={100}
                    color={contextColor(session.contextTokens, session.maxContextTokens)}
                    className="w-full"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                        {formatTokens(session.contextTokens)} / {formatTokens(session.maxContextTokens)}
                      </span>
                      {session.maxContextTokens > 0 && (
                        <Meter.Output className="text-[10px] font-mono text-[var(--text-secondary)] opacity-70" />
                      )}
                    </div>
                    <Meter.Track className="h-1 bg-white/10 rounded-full">
                      <Meter.Fill className="rounded-full" />
                    </Meter.Track>
                  </Meter>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <Tooltip.Arrow />
                Context: {formatTokens(session.contextTokens)} / {formatTokens(session.maxContextTokens)} ({pct}%)
              </Tooltip.Content>
            </Tooltip>
          )}
        </Card.Footer>
      )}
    </Card>
  )
}
