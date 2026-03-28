import type { Turn } from '../../types'
import { formatDuration } from '../../utils'
import { TaskNotificationContent } from './TaskNotificationContent'

interface TurnCardProps {
  turn: Turn
}

export function TurnCard({ turn }: TurnCardProps) {
  const ts = turn.timestamp ? new Date(turn.timestamp) : null
  const timeStr = ts && !isNaN(ts.getTime())
    ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(88,166,255,0.15)] text-[var(--accent-cyan)] text-[11px] font-mono font-semibold shrink-0">
          {turn.index}
        </span>
        {timeStr && (
          <span className="text-[var(--text-secondary)] text-xs font-mono">{timeStr}</span>
        )}
        {turn.durationMs > 0 && (
          <span className="text-[var(--text-secondary)] text-[11px] font-mono ml-auto">
            {formatDuration(turn.durationMs)}
          </span>
        )}
      </div>

      {turn.userPrompt && (
        <div className="text-sm text-[var(--text-primary)] mb-2 break-words">
          <TaskNotificationContent text={turn.userPrompt} />
        </div>
      )}

      {turn.events.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {turn.events.map((ev, i) =>
            ev.kind === 'tool' ? (
              <div key={i} className="flex items-center gap-1.5 text-sm font-mono truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] shrink-0" />
                <span className="text-[var(--text-primary)] font-bold shrink-0">{ev.toolName}</span>
                {ev.toolDetail && (
                  <span className="text-[var(--text-secondary)] truncate">{ev.toolDetail}</span>
                )}
              </div>
            ) : (
              <div key={i} className="flex gap-1.5 text-sm text-[var(--text-primary)] break-words">
                <span className="flex items-center shrink-0 h-[1.5em] leading-[1.5em]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" /></span>
                <TaskNotificationContent text={ev.text} />
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
