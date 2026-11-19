import { useEffect, useRef } from 'react'

/** setInterval that pauses while `paused` is true and always calls the latest callback. */
export function useInterval(cb: () => void, ms: number | null, paused = false) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (ms === null || paused) return
    const id = window.setInterval(() => ref.current(), ms)
    return () => window.clearInterval(id)
  }, [ms, paused])
}

/** setTimeout that is cancelled on unmount / dependency change; freezes while paused. */
export function useTimeout(cb: () => void, ms: number | null, paused = false) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (ms === null || paused) return
    const id = window.setTimeout(() => ref.current(), ms)
    return () => window.clearTimeout(id)
  }, [ms, paused])
}

/** Returns a stable ref to the latest value (handy inside timers). */
export function useLatest<T>(v: T) {
  const r = useRef(v)
  r.current = v
  return r
}
