import { useEffect } from 'react'
import { dailyMix } from './dailyMix'
import { dayKey, isMixDone, shared, useShared, type MixItem } from './store'

/** Next unfinished Word Garden level, read from Word Garden's own save. */
export function gardenNextLevel(): number {
  try {
    const p = JSON.parse(localStorage.getItem('word-garden-v2') ?? 'null') as { stars?: Record<string, number> } | null
    let n = 1
    while (p?.stars?.[n]) n++
    return Math.min(n, 40)
  } catch {
    return 1
  }
}

/** Today's mix, generated once per day and kept in the shared store. */
export function useTodayMix(): { items: (MixItem & { done: boolean })[]; done: number } {
  const s = useShared()
  const today = dayKey()
  const stale = !s.mix || s.mix.day !== today
  useEffect(() => {
    if (stale && s.profile) shared.setMix(today, dailyMix({ day: today, name: s.profile.name, ageBand: s.profile.ageBand, gardenNext: gardenNextLevel() }))
  }, [stale, today, s.profile])
  const items = (stale || !s.mix ? [] : s.mix.items).map((it) => ({ ...it, done: isMixDone(s, it, today) }))
  return { items, done: items.filter((i) => i.done).length }
}
