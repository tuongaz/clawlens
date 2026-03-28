import type { CommandDetail } from '../../types'

export interface Bucket {
  label: string
  commands: CommandDetail[]
}

/**
 * Bucket command_details by dynamic time intervals.
 * < 10 days span → 4-hour buckets, >= 10 days → daily buckets.
 * Returns at most 60 buckets (last 60 if more).
 */
export function bucketCommands(commands: CommandDetail[]): Bucket[] {
  const sorted = commands
    .filter((c) => c.timestamp && !c.interrupted)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  if (sorted.length === 0) return []

  const startTime = new Date(sorted[0].timestamp).getTime()
  const endTime = new Date(sorted[sorted.length - 1].timestamp).getTime()
  const totalDays = (endTime - startTime) / (24 * 60 * 60 * 1000)
  const useHourly = totalDays < 10

  const getBucketKey = (ts: string): string => {
    const d = new Date(ts)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    if (useHourly) {
      const h = String(Math.floor(d.getHours() / 4) * 4).padStart(2, '0')
      return `${y}-${m}-${day}-${h}`
    }
    return `${y}-${m}-${day}`
  }

  const formatLabel = (key: string): string => {
    if (useHourly) {
      const [y, mo, d, h] = key.split('-').map(Number)
      return new Date(y, mo - 1, d, h).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
      })
    }
    const [y, mo, d] = key.split('-').map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const map = new Map<string, CommandDetail[]>()
  for (const cmd of sorted) {
    const key = getBucketKey(cmd.timestamp)
    const arr = map.get(key)
    if (arr) arr.push(cmd)
    else map.set(key, [cmd])
  }

  const keys = Array.from(map.keys()).sort()
  const limited = keys.slice(-60)

  return limited.map((key) => ({
    label: formatLabel(key),
    commands: map.get(key)!,
  }))
}
