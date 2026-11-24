/**
 * One round flow for every game in every world:
 *
 *   play ── success() ──▶ celebrate (input locked, cheer + sound) ──(~1.5 s)──▶ next round … ──▶ done (big cheer + Replay)
 *     └──── miss() ────▶ retry (gentle "Try again!", short lock so taps cannot pile up) ──▶ play
 *
 * No Next buttons between rounds: the flow moves on by itself. While a round is being evaluated or celebrated every
 * further success()/miss() is ignored, so a quick double tap can never skip a round.
 *
 * `createRoundFlow` is plain TypeScript (Word Garden's vanilla JS uses it directly); `useRoundFlow` is the React hook.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { record, type WorldId } from '../shared/store'
import { burst, cue } from './feedback'

export type RoundPhase = 'play' | 'celebrate' | 'retry' | 'done'

export interface RoundState {
  /** 0-based index of the current round */
  round: number
  total: number
  phase: RoundPhase
  /** true while evaluating / celebrating / showing "Try again": ignore taps */
  locked: boolean
  /** rounds won so far */
  wins: number
  /** misses this game (for stars) */
  misses: number
}

export interface RoundFlowOptions {
  /** number of rounds in a game (Infinity for endless games: they never reach "done") */
  total: number
  /** wait on the celebration before the next round loads (ms). Default 1500. */
  advanceMs?: number
  /** how long "Try again!" locks input (ms). Default 700. */
  retryMs?: number
  /** called when the next round should load (receives the new round index) */
  onAdvance?: (round: number) => void
  /** called once when the last round is won */
  onComplete?: (s: RoundState) => void
  /** report the finished game to the shared progress (Home, Progress, grown-ups) */
  record?: { world: WorldId; id: string; title: string }
  /** sounds, vibration and confetti (default true; tests turn it off) */
  effects?: boolean
}

export interface RoundFlow {
  get(): RoundState
  subscribe(fn: () => void): () => void
  /** the child got this round right */
  success(): boolean
  /** a wrong try: gentle feedback, the round stays */
  miss(): boolean
  /** lock input while the game checks an answer (call success/miss after) */
  lock(): void
  /** start again from round 1 */
  replay(): void
  /** change the number of rounds (e.g. difficulty changed) */
  setTotal(n: number): void
  /** stars for the finished game: 3 with no misses, 2 with a few, 1 otherwise */
  stars(): number
  destroy(): void
}

export function starsFor(wins: number, misses: number): number {
  if (wins === 0) return 0
  const r = misses / Math.max(1, wins)
  return r === 0 ? 3 : r <= 0.5 ? 2 : 1
}

export function createRoundFlow(opts: RoundFlowOptions): RoundFlow {
  let o = opts
  const fx = opts.effects !== false
  let s: RoundState = { round: 0, total: opts.total, phase: 'play', locked: false, wins: 0, misses: 0 }
  const subs = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | null = null
  const set = (p: Partial<RoundState>) => {
    s = { ...s, ...p }
    subs.forEach((f) => f())
  }
  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const flow: RoundFlow = {
    get: () => s,
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    success() {
      if (s.phase === 'celebrate' || s.phase === 'done' || (s.locked && s.phase !== 'play')) return false
      clear()
      const wins = s.wins + 1
      const last = s.round + 1 >= s.total
      set({ phase: 'celebrate', locked: true, wins })
      if (fx) {
        cue('success')
        burst(false)
      }
      timer = setTimeout(() => {
        timer = null
        if (last) {
          set({ phase: 'done', locked: true })
          if (fx) {
            cue('cheer')
            burst(true)
          }
          const st = flow.stars()
          if (o.record) {
            try {
              record(o.record.world, { id: o.record.id, title: o.record.title, stars: st })
            } catch {
              /* store not ready (tests) */
            }
          }
          o.onComplete?.(s)
        } else {
          const round = s.round + 1
          set({ round, phase: 'play', locked: false })
          o.onAdvance?.(round)
        }
      }, o.advanceMs ?? 1500)
      return true
    },
    miss() {
      if (s.locked) return false
      clear()
      set({ phase: 'retry', locked: true, misses: s.misses + 1 })
      if (fx) cue('gentle')
      timer = setTimeout(() => {
        timer = null
        set({ phase: 'play', locked: false })
      }, o.retryMs ?? 700)
      return true
    },
    lock() {
      if (s.phase === 'play') set({ locked: true })
    },
    replay() {
      clear()
      set({ round: 0, phase: 'play', locked: false, wins: 0, misses: 0 })
      o.onAdvance?.(0)
    },
    setTotal(n) {
      set({ total: n })
    },
    stars: () => starsFor(s.wins, s.misses),
    destroy() {
      clear() // timers only: React re-subscribes after StrictMode's test unmount
    },
  }
  // keep callbacks fresh without recreating the flow
  ;(flow as RoundFlow & { _opts: (n: RoundFlowOptions) => void })._opts = (n) => {
    o = n
  }
  return flow
}

/** React: one flow for the component's lifetime; callbacks always see the latest props. */
export function useRoundFlow(opts: RoundFlowOptions): RoundState & { flow: RoundFlow } {
  const ref = useRef<RoundFlow | null>(null)
  ref.current ??= createRoundFlow(opts)
  const flow = ref.current
  ;(flow as RoundFlow & { _opts: (n: RoundFlowOptions) => void })._opts(opts)
  useEffect(() => {
    if (flow.get().total !== opts.total) flow.setTotal(opts.total)
  }, [flow, opts.total])
  useEffect(() => () => flow.destroy(), [flow])
  const state = useSyncExternalStore(flow.subscribe, flow.get, flow.get)
  return { ...state, flow }
}
