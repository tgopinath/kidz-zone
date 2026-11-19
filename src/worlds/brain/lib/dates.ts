export function dateKey(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${x.getFullYear()}-${m}-${day}`
}

export function daysAgoKey(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return dateKey(d)
}

export function msUntilMidnight(): number {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Consecutive-day streak ending today (or yesterday, so the streak survives until the day is over). */
export function computeStreak(playedDays: string[]): number {
  const set = new Set(playedDays)
  let start = 0
  if (!set.has(daysAgoKey(0))) {
    if (!set.has(daysAgoKey(1))) return 0
    start = 1
  }
  let n = 0
  while (set.has(daysAgoKey(start + n))) n++
  return n
}

/** Monday-based week key. */
export function weekStart(d = new Date()): number {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.getTime()
}
