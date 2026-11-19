import { useEffect, useMemo, useRef } from 'react'

/**
 * A clock that stops while the game is paused, so reaction times never
 * include time spent on the pause screen.
 */
export function useGameClock(paused: boolean) {
  const pausedTotal = useRef(0)
  const pauseStart = useRef<number | null>(null)
  useEffect(() => {
    if (paused) {
      if (pauseStart.current === null) pauseStart.current = performance.now()
    } else if (pauseStart.current !== null) {
      pausedTotal.current += performance.now() - pauseStart.current
      pauseStart.current = null
    }
  }, [paused])
  return useMemo(
    () => ({
      now() {
        const t = performance.now()
        const extra = pauseStart.current !== null ? t - pauseStart.current : 0
        return t - pausedTotal.current - extra
      },
    }),
    [],
  )
}

/** Points for a correct speed answer: base 10 × d plus up to 100% bonus for fast replies. */
export function speedPoints(d: number, ms: number, fastMs: number, slowMs: number) {
  const base = 10 * d
  const f = Math.min(1, Math.max(0, (slowMs - ms) / (slowMs - fastMs)))
  return Math.round(base + base * f)
}
