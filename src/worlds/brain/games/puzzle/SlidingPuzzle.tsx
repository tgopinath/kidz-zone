import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameDef, GameProps } from '../types'

type Board = number[] // 0 = gap; solved = [1..n*n-1, 0]

function sizeFor(d: number) {
  return d <= 6 ? 3 : 4
}

function shuffleMovesFor(d: number) {
  return d <= 6 ? 10 + d * 4 : 30 + (d - 7) * 10
}

function neighbours(gap: number, n: number): number[] {
  const r = Math.floor(gap / n)
  const c = gap % n
  const out: number[] = []
  if (r > 0) out.push(gap - n)
  if (r < n - 1) out.push(gap + n)
  if (c > 0) out.push(gap - 1)
  if (c < n - 1) out.push(gap + 1)
  return out
}

function solvedBoard(n: number): Board {
  return [...Array.from({ length: n * n - 1 }, (_, i) => i + 1), 0]
}

function isSolved(b: Board) {
  for (let i = 0; i < b.length - 1; i++) if (b[i] !== i + 1) return false
  return true
}

/** Random walk from solved state without immediate backtracking. Returns board + walk length (upper bound on optimal). */
function scramble(n: number, moves: number, rng: Rng): Board {
  let b = solvedBoard(n)
  let gap = b.length - 1
  let prev = -1
  let done = 0
  while (done < moves || isSolved(b)) {
    const opts = neighbours(gap, n).filter((t) => t !== prev)
    const t = opts[Math.floor(rng() * opts.length)]
    b = b.slice()
    b[gap] = b[t]
    b[t] = 0
    prev = gap
    gap = t
    done++
  }
  return b
}

function manhattan(b: Board, n: number): number {
  let h = 0
  for (let i = 0; i < b.length; i++) {
    const v = b[i]
    if (!v) continue
    const goal = v - 1
    h += Math.abs(Math.floor(i / n) - Math.floor(goal / n)) + Math.abs((i % n) - (goal % n))
  }
  return h
}

/**
 * IDA* with Manhattan distance. Returns the optimal list of btile indices to
 * slide (each index is the btile moved into the gap), or null if the node budget runs out.
 */
function solve(start: Board, n: number, budget: number): number[] | null {
  const b = start.slice()
  let gap = b.indexOf(0)
  let nodes = 0
  const path: number[] = []
  let bound = manhattan(b, n)
  const FOUND = -1
  const dfs = (g: number, h: number, prevGap: number): number => {
    const f = g + h
    if (f > bound) return f
    if (h === 0) return FOUND
    if (++nodes > budget) return Infinity
    let min = Infinity
    for (const t of neighbours(gap, n)) {
      if (t === prevGap) continue
      const v = b[t]
      const goal = v - 1
      const gr = Math.floor(goal / n)
      const gc = goal % n
      const before = Math.abs(Math.floor(t / n) - gr) + Math.abs((t % n) - gc)
      const after = Math.abs(Math.floor(gap / n) - gr) + Math.abs((gap % n) - gc)
      const oldGap = gap
      b[oldGap] = v
      b[t] = 0
      gap = t
      path.push(t)
      const res = dfs(g + 1, h - before + after, oldGap)
      if (res === FOUND) return FOUND
      path.pop()
      gap = oldGap
      b[t] = v
      b[oldGap] = 0
      if (res < min) min = res
      if (nodes > budget) return Infinity
    }
    return min
  }
  for (let iter = 0; iter < 80; iter++) {
    const res = dfs(0, manhattan(b, n), -1)
    if (res === FOUND) {
      // path holds btile *positions* at time of move; convert to a fresh list
      return path.slice()
    }
    if (res === Infinity) return null
    bound = res
  }
  return null
}

/** Greedy fallback: the legal move that reduces Manhattan distance most (avoiding undo). */
function greedyMove(b: Board, n: number, lastGap: number): number {
  const gap = b.indexOf(0)
  let best = -1
  let bestH = Infinity
  for (const t of neighbours(gap, n)) {
    if (t === lastGap) continue
    const nb = b.slice()
    nb[gap] = nb[t]
    nb[t] = 0
    const h = manhattan(nb, n)
    if (h < bestH) {
      bestH = h
      best = t
    }
  }
  return best >= 0 ? best : neighbours(gap, n)[0]
}

const DIR_NAMES = { up: 'up', down: 'down', left: 'left', right: 'right' } as const

function directionOf(tile: number, gap: number, n: number): keyof typeof DIR_NAMES {
  if (tile === gap - n) return 'down'
  if (tile === gap + n) return 'up'
  if (tile === gap - 1) return 'right'
  return 'left'
}

function SlidingPuzzle({ diff, rng, paused, api }: GameProps) {
  const n = sizeFor(diff.d)
  const start = useMemo(() => scramble(n, shuffleMovesFor(diff.d), rng), []) // eslint-disable-line react-hooks/exhaustive-deps
  const par = useMemo(() => {
    const sol = solve(start, n, n === 3 ? 2_000_000 : 400_000)
    return sol ? sol.length : shuffleMovesFor(diff.d)
  }, [start, n, diff.d])
  const [board, setBoard] = useState<Board>(start)
  const [moves, setMoves] = useState(0)
  const [hintTile, setHintTile] = useState<number | null>(null)
  const [shake, setShake] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const lastGap = useRef(-1)
  const finished = useRef(false)
  const gap = board.indexOf(0)
  const correctCount = board.filter((v, i) => v !== 0 && v === i + 1).length

  useEffect(() => api.progress(correctCount, n * n - 1), [correctCount, n, api])

  const slide = useCallback(
    (pos: number, viaKey = false) => {
      if (paused || finished.current) return
      const g = board.indexOf(0)
      if (!neighbours(g, n).includes(pos)) {
        if (!viaKey && board[pos] !== 0) {
          play('wrong')
          api.wrong()
          setShake(pos)
          setMsg(`Tile ${board[pos]} can't move – it isn't next to the gap.`)
          window.setTimeout(() => setShake(null), 400)
        }
        return
      }
      play('tap')
      const nb = board.slice()
      nb[g] = nb[pos]
      nb[pos] = 0
      lastGap.current = g
      const m = moves + 1
      setBoard(nb)
      setMoves(m)
      setHintTile(null)
      setMsg('')
      if (isSolved(nb)) {
        finished.current = true
        const eff = Math.max(0.25, Math.min(1, par / m))
        api.correct(Math.round(20 * diff.d * (n - 1) * eff))
        setMsg(`Solved in ${m} moves (best possible about ${par}).`)
        window.setTimeout(() => {
          play('win')
          api.finish({ completed: true })
        }, 800)
      }
    },
    [board, moves, n, paused, api, par, diff.d],
  )

  // Arrow keys move the btile *into* the gap in that direction.
  useEffect(() => {
    if (paused) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const r = Math.floor(gap / n)
      const c = gap % n
      let pos = -1
      if (e.key === 'ArrowLeft' && c < n - 1) pos = gap + 1
      else if (e.key === 'ArrowRight' && c > 0) pos = gap - 1
      else if (e.key === 'ArrowUp' && r < n - 1) pos = gap + n
      else if (e.key === 'ArrowDown' && r > 0) pos = gap - n
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        return
      }
      if (pos >= 0) {
        e.preventDefault()
        slide(pos, true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paused, gap, n, slide])

  useEffect(() => {
    api.onHint(() => {
      if (isSolved(board)) return 'Already solved!'
      const sol = solve(board, n, n === 3 ? 1_500_000 : 150_000)
      const pos = sol && sol.length ? sol[0] : greedyMove(board, n, lastGap.current)
      setHintTile(board[pos])
      window.setTimeout(() => setHintTile(null), 2500)
      const dir = directionOf(pos, board.indexOf(0), n)
      return `Try sliding btile ${board[pos]} ${dir}.${sol ? ` About ${sol.length} moves to go.` : ''}`
    })
    return () => api.onHint(null)
  }, [api, board, n])

  const tilePx = n === 3 ? 'min(104px, 26vw)' : 'min(84px, 20vw)'
  const hue = (v: number) => {
    const goal = v - 1
    const r = Math.floor(goal / n)
    const c = goal % n
    return `linear-gradient(135deg, hsl(${250 - r * 28} 85% ${66 - c * 4}%), hsl(${215 - r * 22 + c * 10} 90% ${58 - c * 3}%))`
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <div className="flex gap-2">
        <span className="bchip bg-primary-soft text-primary">Moves: {moves}</span>
        <span className="bchip bg-accent/20 text-ink">Target: {par}</span>
        <span className="bchip bg-success/15 text-ink">
          {correctCount}/{n * n - 1} in place
        </span>
      </div>
      <div
        role="grid"
        aria-label={`Sliding puzzle ${n} by ${n}. Gap at row ${Math.floor(gap / n) + 1}, column ${(gap % n) + 1}.`}
        className="grid gap-1.5 rounded-2xl bg-ink/10 p-1.5"
        style={{ gridTemplateColumns: `repeat(${n}, ${tilePx})`, gridAutoRows: tilePx }}
      >
        {board.map((v, i) => {
          if (v === 0) return <div key="gap" role="gridcell" aria-label="Empty gap" className="rounded-xl bg-white/40" />
          const movable = neighbours(gap, n).includes(i)
          const home = v === i + 1
          return (
            <motion.button
              key={v}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              type="button"
              role="gridcell"
              onClick={() => slide(i)}
              animate={shake === i ? { x: [0, -5, 5, -5, 0] } : { x: 0 }}
              aria-label={`Tile ${v}${home ? ', in place' : ''}${movable ? `, can slide ${directionOf(i, gap, n)}` : ''}`}
              className={`relative grid place-items-center rounded-xl font-display text-3xl font-bold text-white shadow-soft select-none sm:text-4xl ${
                hintTile === v ? 'z-10 ring-4 ring-accent animate-pulse' : ''
              } ${movable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{ background: hue(v), textShadow: '0 2px 0 rgba(0,0,0,.2)' }}
            >
              {v}
              {home && (
                <span className="absolute right-1 bottom-0.5 text-xs font-bold text-white/90" aria-hidden>
                  ✓
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-semibold text-muted">
        {msg || (diff.young ? 'Tap a btile next to the gap to slide it.' : 'Tap a btile beside the gap, or use the arrow keys.')}
      </p>
    </div>
  )
}

export const slidingPuzzle: GameDef = {
  id: 'sliding-puzzle',
  category: 'puzzle',
  skill: 'spatial',
  title: 'Sliding Tiles',
  emoji: '🔲',
  blurb: 'Slide the numbered tiles back into order.',
  instructions: [
    'Put the tiles in order 1, 2, 3… with the gap in the bottom-right corner.',
    'Tap a btile next to the gap to slide it, or use the arrow keys.',
    'Fewer moves earn more points – try to beat the target.',
  ],
  kidInstructions: ['Slide the tiles to put the numbers in order.', 'Tap a btile next to the empty space.'],
  timeLimit: (d) => Math.round((sizeFor(d.d) === 3 ? 180 : 420) * d.time),
  timeoutCompletes: false,
  component: SlidingPuzzle,
}
