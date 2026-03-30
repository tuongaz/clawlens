import { useRef, useEffect, useState, useCallback } from 'react'
import type { Turn } from '../../types'

interface TurnTimelineProps {
  turns: Turn[]
  isActive: boolean
  onRequestShowAll?: () => void
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatRelativeTime(ms: number): string {
  if (ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds > 0 ? `${minutes}m${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return remainMinutes > 0 ? `${hours}h${remainMinutes}m` : `${hours}h`
}

export function TurnTimeline({ turns, isActive, onRequestShowAll }: TurnTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeTurnIndex, setActiveTurnIndex] = useState<number | null>(null)
  const visibleMapRef = useRef<Map<number, DOMRectReadOnly>>(new Map())

  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragScrollLeftRef = useRef(0)

  const firstTimestamp = turns.length > 0 ? new Date(turns[0].timestamp).getTime() : 0

  // Mouse wheel → horizontal scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Click-and-drag scrolling
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    isDraggingRef.current = true
    dragStartXRef.current = e.clientX
    dragScrollLeftRef.current = el.scrollLeft
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return
    const dx = e.clientX - dragStartXRef.current
    scrollRef.current.scrollLeft = dragScrollLeftRef.current - dx
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false
    if (scrollRef.current) scrollRef.current.style.cursor = ''
    scrollRef.current?.releasePointerCapture(e.pointerId)
  }, [])

  // Track which TurnCard is currently in view using a stable visibility map
  useEffect(() => {
    visibleMapRef.current.clear()
    const turnElements = turns.map((t) => document.getElementById(`turn-${t.index}`)).filter(Boolean) as HTMLElement[]
    if (turnElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute('data-turn-index'))
          if (isNaN(idx)) continue
          if (entry.isIntersecting) {
            visibleMapRef.current.set(idx, entry.boundingClientRect)
          } else {
            visibleMapRef.current.delete(idx)
          }
        }
        if (visibleMapRef.current.size > 0) {
          const topmost = [...visibleMapRef.current.entries()]
            .sort((a, b) => a[1].top - b[1].top)[0][0]
          setActiveTurnIndex(topmost)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    )

    turnElements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [turns])

  // Auto-scroll the timeline strip to keep active circle visible
  useEffect(() => {
    if (activeTurnIndex == null || !scrollRef.current) return
    const circle = scrollRef.current.querySelector(`[data-timeline-index="${activeTurnIndex}"]`) as HTMLElement | null
    if (circle) {
      circle.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeTurnIndex])

  const handleClick = useCallback((turnIndex: number) => {
    const el = document.getElementById(`turn-${turnIndex}`)
    if (!el) {
      // Turn is not rendered yet (hidden behind "Show all" cutoff) — expand first
      onRequestShowAll?.()
      // Wait for DOM to update, then scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const elAfter = document.getElementById(`turn-${turnIndex}`)
          if (elAfter) {
            elAfter.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        })
      })
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [onRequestShowAll])

  if (turns.length === 0) return null

  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex items-center gap-1 px-8 py-3 max-sm:px-4 overflow-x-auto max-w-[1400px] 2xl:max-w-[1800px] mx-auto cursor-grab select-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {turns.map((turn, i) => {
          const turnMs = new Date(turn.timestamp).getTime() - firstTimestamp
          const isLast = i === turns.length - 1
          const isCurrent = activeTurnIndex === turn.index
          const showPulse = isActive && isLast

          const startTime = formatTime(turn.timestamp)
          const endMs = new Date(turn.timestamp).getTime() + turn.durationMs
          const endTime = turn.durationMs > 0 ? formatTime(new Date(endMs).toISOString()) : '—'

          return (
            <div key={turn.index} className="flex items-center shrink-0">
              <div className="relative group/tip">
                <button
                  data-timeline-index={turn.index}
                  onClick={() => handleClick(turn.index)}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer group
                    ${isCurrent ? 'bg-[rgba(88,166,255,0.12)]' : 'hover:bg-[rgba(88,166,255,0.06)]'}`}
                >
                  <div className="relative">
                    <div
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center text-[11px] font-mono font-semibold
                        ${isCurrent
                          ? 'bg-[var(--accent-cyan)] text-[var(--bg-primary)] scale-110'
                          : 'bg-[rgba(88,166,255,0.15)] text-[var(--text-secondary)] group-hover:bg-[rgba(88,166,255,0.25)]'
                        }
                        ${showPulse ? 'animate-pulse' : ''}`}
                    >
                      {turn.index}
                    </div>
                    {showPulse && (
                      <div className="absolute inset-0 w-7 h-7 rounded-full bg-[var(--accent-cyan)] animate-ping opacity-30" />
                    )}
                  </div>
                  <span className={`text-[11px] font-mono leading-none whitespace-nowrap
                    ${isCurrent ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)] opacity-60'}`}>
                    {formatRelativeTime(turnMs)}
                  </span>
                </button>

                {/* Hover popover */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tip:block z-50 pointer-events-none">
                  <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg whitespace-nowrap text-[12px] font-mono">
                    <div className="text-[var(--text-bright)] font-semibold mb-1">Turn {turn.index}</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">Start</span>
                      <span className="text-[var(--text-primary)]">{startTime}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">End</span>
                      <span className="text-[var(--text-primary)]">{endTime}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[var(--text-secondary)]">From start</span>
                      <span className="text-[var(--accent-cyan)]">{formatRelativeTime(turnMs)}</span>
                    </div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-[var(--bg-primary)] border-r border-b border-[var(--border)] rotate-45" />
                </div>
              </div>

              {!isLast && (
                <div className="w-4 h-px bg-[var(--border)] shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
