import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameDef, GameProps } from '../types'

// Wall bits
const N = 1
const E = 2
const S = 4
const W = 8
type Dir = 'up' | 'down' | 'left' | 'right'
const DIRS: Record<Dir, { dr: number; dc: number; wall: number; opp: number }> = {
  up: { dr: -1, dc: 0, wall: N, opp: S },
  down: { dr: 1, dc: 0, wall: S, opp: N },
  left: { dr: 0, dc: -1, wall: W, opp: E },
  right: { dr: 0, dc: 1, wall: E, opp: W },
}

function sizeFor(d: number) {
  return 5 + Math.round(((Math.min(12, Math.max(1, d)) - 1) * 10) / 11)
}

/** Perfect maze via iterative recursive backtracker. Each cell stores its remaining walls. */
function makeMaze(n: number, rng: Rng): number[] {
  const walls = Array(n * n).fill(N | E | S | W)
  const seen = Array(n * n).fill(false)
  const stack = [0]
  seen[0] = true
  while (stack.length) {
    const cur = stack[stack.length - 1]
    const r = Math.floor(cur / n)
    const c = cur % n
    const opts = shuffle(Object.values(DIRS), rng).filter((d) => {
      const nr = r + d.dr
      const nc = c + d.dc
      return nr >= 0 && nr < n && nc >= 0 && nc < n && !seen[nr * n + nc]
    })
    if (!opts.length) {
      stack.pop()
      continue
    }
    const d = opts[0]
    const nxt = (r + d.dr) * n + c + d.dc
    walls[cur] &= ~d.wall
    walls[nxt] &= ~d.opp
    seen[nxt] = true
    stack.push(nxt)
  }
  return walls
}

function bfsPath(walls: number[], n: number, from: number, to: number): number[] {
  const prev = Array(n * n).fill(-1)
  prev[from] = from
  const q = [from]
  while (q.length) {
    const cur = q.shift()!
    if (cur === to) break
    const r = Math.floor(cur / n)
    const c = cur % n
    for (const d of Object.values(DIRS)) {
      if (walls[cur] & d.wall) continue
      const nxt = (r + d.dr) * n + c + d.dc
      if (prev[nxt] === -1) {
        prev[nxt] = cur
        q.push(nxt)
      }
    }
  }
  const path: number[] = []
  for (let at = to; at !== from; at = prev[at]) path.unshift(at)
  return path
}

const CS = 40

function Maze({ diff, rng, paused, api }: GameProps) {
  const n = sizeFor(diff.d)
  const walls = useMemo(() => makeMaze(n, rng), []) // eslint-disable-line react-hooks/exhaustive-deps
  const goal = n * n - 1
  const shortest = useMemo(() => bfsPath(walls, n, 0, goal).length, [walls, n, goal])
  const [pos, setPos] = useState(0)
  const [moves, setMoves] = useState(0)
  const [trail, setTrail] = useState<Set<number>>(() => new Set([0]))
  const [hintPath, setHintPath] = useState<number[]>([])
  const [bump, setBump] = useState(0)
  const [msg, setMsg] = useState('')
  const finished = useRef(false)
  const lastBump = useRef(0)
  const r = Math.floor(pos / n)
  const c = pos % n

  const remaining = useMemo(() => bfsPath(walls, n, pos, goal).length, [walls, n, pos, goal])
  useEffect(() => api.progress(Math.max(0, shortest - remaining), shortest), [remaining, shortest, api])

  const openDirs = (Object.keys(DIRS) as Dir[]).filter((k) => !(walls[pos] & DIRS[k].wall))

  const move = useCallback(
    (dir: Dir, repeat = false) => {
      if (paused || finished.current) return
      const d = DIRS[dir]
      const cr = Math.floor(pos / n)
      const cc = pos % n
      const nr = cr + d.dr
      const nc = cc + d.dc
      if (walls[pos] & d.wall || nr < 0 || nr >= n || nc < 0 || nc >= n) {
        const now = performance.now()
        if (!repeat && now - lastBump.current > 300) {
          lastBump.current = now
          play('wrong')
          api.wrong()
          setBump((b) => b + 1)
          setMsg(`Bump! There is a wall ${dir === 'up' ? 'above' : dir === 'down' ? 'below' : `to the ${dir}`}.`)
        }
        return
      }
      const nxt = nr * n + nc
      play('tap')
      const m = moves + 1
      setPos(nxt)
      setMoves(m)
      setTrail((t) => new Set(t).add(nxt))
      setHintPath((h) => (h[0] === nxt ? h.slice(1) : []))
      setMsg('')
      if (nxt === goal) {
        finished.current = true
        const eff = Math.max(0.25, Math.min(1, shortest / m))
        api.correct(Math.round((10 * diff.d + n * 4) * 2 * eff))
        setMsg(`Cheese found in ${m} moves! Shortest path: ${shortest}.`)
        window.setTimeout(() => {
          play('win')
          api.finish({ completed: true })
        }, 700)
      }
    },
    [paused, pos, n, walls, moves, goal, shortest, api, diff.d],
  )

  useEffect(() => {
    if (paused) return
    const keys: Record<string, Dir> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const dir = keys[e.key]
      if (!dir) return
      e.preventDefault()
      move(dir, e.repeat)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paused, move])

  useEffect(() => {
    api.onHint(() => {
      const path = bfsPath(walls, n, pos, goal).slice(0, Math.max(4, Math.round(n / 2)))
      setHintPath(path)
      window.setTimeout(() => setHintPath([]), 3000)
      const first = path[0]
      const dir = first === pos - n ? 'up' : first === pos + n ? 'down' : first === pos - 1 ? 'left' : 'right'
      return `Follow the glowing dots – first go ${dir}.`
    })
    return () => api.onHint(null)
  }, [api, walls, n, pos, goal])

  const tapCell = (idx: number) => {
    const tr = Math.floor(idx / n)
    const tc = idx % n
    if (tr === r && tc === c + 1) move('right')
    else if (tr === r && tc === c - 1) move('left')
    else if (tc === c && tr === r + 1) move('down')
    else if (tc === c && tr === r - 1) move('up')
  }

  const size = n * CS
  const lines: string[] = []
  walls.forEach((w, i) => {
    const x = (i % n) * CS
    const y = Math.floor(i / n) * CS
    if (w & N) lines.push(`M${x} ${y}h${CS}`)
    if (w & W) lines.push(`M${x} ${y}v${CS}`)
    if (i % n === n - 1 && w & E) lines.push(`M${x + CS} ${y}v${CS}`)
    if (Math.floor(i / n) === n - 1 && w & S) lines.push(`M${x} ${y + CS}h${CS}`)
  })
  const dirLabel: Record<Dir, string> = { up: 'up', down: 'down', left: 'left', right: 'right' }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
      <div className="flex gap-2">
        <span className="bchip bg-primary-soft text-primary">Moves: {moves}</span>
        <span className="bchip bg-accent/20 text-ink">Shortest: {shortest}</span>
      </div>
      <motion.div key={bump} animate={bump ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.35 }} className="w-full" style={{ maxWidth: 'min(560px, 92vw)' }}>
        <svg
          viewBox={`-3 -3 ${size + 6} ${size + 6}`}
          className="w-full rounded-2xl bg-white shadow-soft"
          role="img"
          aria-label={`Maze ${n} by ${n}. Mouse at row ${r + 1}, column ${c + 1}. Cheese at the bottom-right corner.`}
        >
          {[...trail].map((t) => (
            <rect key={t} x={(t % n) * CS + 2} y={Math.floor(t / n) * CS + 2} width={CS - 4} height={CS - 4} rx="6" fill="#ece8ff" />
          ))}
          {hintPath.map((t, i) => (
            <circle key={`h${t}`} cx={(t % n) * CS + CS / 2} cy={Math.floor(t / n) * CS + CS / 2} r={7 - i * 0.6} fill="#ffaa45" opacity={1 - i * 0.1}>
              <animate attributeName="opacity" values="1;0.4;1" dur="0.9s" repeatCount="indefinite" />
            </circle>
          ))}
          {Array.from({ length: n * n }, (_, i) => (
            <rect
              key={`c${i}`}
              x={(i % n) * CS}
              y={Math.floor(i / n) * CS}
              width={CS}
              height={CS}
              fill="transparent"
              onClick={() => tapCell(i)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          <path d={lines.join('')} stroke="#3b3570" strokeWidth="4" strokeLinecap="round" fill="none" pointerEvents="none" />
          <text x={(goal % n) * CS + CS / 2} y={Math.floor(goal / n) * CS + CS * 0.72} fontSize={CS * 0.62} textAnchor="middle" pointerEvents="none">
            🧀
          </text>
          <motion.text
            animate={{ x: c * CS + CS / 2, y: r * CS + CS * 0.72 }}
            initial={false}
            transition={{ type: 'spring', stiffness: 600, damping: 40 }}
            fontSize={CS * 0.66}
            textAnchor="middle"
            pointerEvents="none"
          >
            🐭
          </motion.text>
        </svg>
      </motion.div>

      <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-semibold text-muted">
        {msg || `Open: ${openDirs.map((d) => dirLabel[d]).join(', ')}.`}
      </p>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Direction pad">
        <span />
        <button type="button" className="bbtn-ghost size-16 !p-0" onClick={() => move('up')} aria-label="Move up">
          <ArrowUp size={28} />
        </button>
        <span />
        <button type="button" className="bbtn-ghost size-16 !p-0" onClick={() => move('left')} aria-label="Move left">
          <ArrowLeft size={28} />
        </button>
        <button type="button" className="bbtn-ghost size-16 !p-0" onClick={() => move('down')} aria-label="Move down">
          <ArrowDown size={28} />
        </button>
        <button type="button" className="bbtn-ghost size-16 !p-0" onClick={() => move('right')} aria-label="Move right">
          <ArrowRight size={28} />
        </button>
      </div>
    </div>
  )
}

export const maze: GameDef = {
  id: 'maze',
  category: 'puzzle',
  skill: 'spatial',
  title: 'Mouse Maze',
  emoji: '🐭',
  blurb: 'Guide the mouse through the maze to the cheese.',
  instructions: [
    'Move the mouse 🐭 to the cheese 🧀.',
    'Use arrow keys, WASD, the direction pad, or tap a square next to the mouse.',
    'Bumping into walls counts as a miss.',
    'Reach the cheese in close to the shortest number of moves for the most points.',
  ],
  kidInstructions: ['Help the mouse find the cheese!', 'Use the arrows to move.', 'Try not to bump the walls.'],
  timeLimit: (d) => Math.round((40 + sizeFor(d.d) ** 2 * 0.8) * d.time),
  timeoutCompletes: false,
  component: Maze,
}
