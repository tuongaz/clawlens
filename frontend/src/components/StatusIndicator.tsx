const PULSE_STYLE = { animation: 'pulse-blink 2s ease-in-out infinite' }

/**
 * Status indicator for session state.
 *
 * - active + working → green blinking dot
 * - active + waiting → green dot + amber ring
 * - inactive → grey dot
 */
export function StatusIndicator({
  isActive,
  isWaiting,
  size = 7,
}: {
  isActive: boolean
  isWaiting: boolean
  size?: number
}) {
  if (isActive && isWaiting) {
    return (
      <span
        className="inline-block rounded-full bg-warning shrink-0"
        style={{ width: size, height: size, boxShadow: '0 0 8px rgba(234,179,8,0.5)', ...PULSE_STYLE }}
        title="Waiting for input"
      />
    )
  }

  if (isActive) {
    return (
      <span
        className="inline-block rounded-full bg-success shrink-0"
        style={{ width: size, height: size, boxShadow: '0 0 8px rgba(63,185,80,0.5)', ...PULSE_STYLE }}
        title="Working"
      />
    )
  }

  return (
    <span
      className="inline-block rounded-full bg-[var(--text-secondary)] opacity-40 shrink-0"
      style={{ width: size, height: size }}
      title="Inactive"
    />
  )
}

/** Three staggered blinking dots with a status label. */
export function TypingDots({ isWaiting }: { isWaiting: boolean }) {
  return (
    <div className="mt-3 flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <div className="flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" style={{ animation: 'dot-blink 1.4s ease-in-out infinite' }} />
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" style={{ animation: 'dot-blink 1.4s ease-in-out 0.2s infinite' }} />
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" style={{ animation: 'dot-blink 1.4s ease-in-out 0.4s infinite' }} />
      </div>
      <span className="text-base text-[var(--text-secondary)]">
        {isWaiting ? 'Waiting for input\u2026' : 'Claude is working\u2026'}
      </span>
    </div>
  )
}

/** Small "Live" badge with pulsing dot. */
export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-base font-normal text-success" style={PULSE_STYLE}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
      Live
    </span>
  )
}

/** Small blinking dot for inline use (e.g. last action indicator). */
export function ActiveDot({ size = 6, color = 'bg-yellow-400', glow = 'rgba(250,204,21,0.5)' }: { size?: number; color?: string; glow?: string }) {
  return (
    <span
      className={`inline-block rounded-full ${color} shrink-0`}
      style={{ width: size, height: size, boxShadow: `0 0 6px ${glow}`, ...PULSE_STYLE }}
    />
  )
}
