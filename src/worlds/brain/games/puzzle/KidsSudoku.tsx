import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { pick, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameDef, GameProps } from '../types'

interface Layout {
  n: number
  br: number // box rows
  bc: number // box cols
}

function layoutFor(d: number): Layout {
  return d <= 6 ? { n: 4, br: 2, bc: 2 } : { n: 6, br: 2, bc: 3 }
}

function canPlace(g: number[], L: Layout, idx: number, v: number): boolean {
  const r = Math.floor(idx / L.n)
  const c = idx % L.n
  for (let i = 0; i < L.n; i++) {
    if (g[r * L.n + i] === v || g[i * L.n + c] === v) return false
  }
  const r0 = r - (r % L.br)
  const c0 = c - (c % L.bc)
  for (let i = 0; i < L.br; i++) for (let j = 0; j < L.bc; j++) if (g[(r0 + i) * L.n + c0 + j] === v) return false
  return true
}

function fillRandom(g: number[], L: Layout, rng: Rng): boolean {
  const idx = g.indexOf(0)
  if (idx < 0) return true
  for (const v of shuffle(Array.from({ length: L.n }, (_, i) => i + 1), rng)) {
    if (canPlace(g, L, idx, v)) {
      g[idx] = v
      if (fillRandom(g, L, rng)) return true
      g[idx] = 0
    }
  }
  return false
}

/** Count solutions up to `limit`. */
function countSolutions(g: number[], L: Layout, limit = 2): number {
  const idx = g.indexOf(0)
  if (idx < 0) return 1
  let total = 0
  for (let v = 1; v <= L.n; v++) {
    if (canPlace(g, L, idx, v)) {
      g[idx] = v
      total += countSolutions(g, L, limit - total)
      g[idx] = 0
      if (total >= limit) break
    }
  }
  return total
}

function removalsFor(d: number): number {
  if (d <= 6) return Math.min(11, 5 + d) // 4×4: 6..11 blanks of 16
  return Math.min(26, 14 + (d - 7) * 2) // 6×6: 14..24 blanks of 36
}

function generate(L: Layout, d: number, rng: Rng) {
  const solution = Array(L.n * L.n).fill(0)
  fillRandom(solution, L, rng)
  const puzzle = solution.slice()
  const target = removalsFor(d)
  let removed = 0
  for (const idx of shuffle(Array.from({ length: L.n * L.n }, (_, i) => i), rng)) {
    if (removed >= target) break
    const keep = puzzle[idx]
    puzzle[idx] = 0
    if (countSolutions(puzzle.slice(), L) === 1) removed++
    else puzzle[idx] = keep
  }
  return { solution, puzzle }
}

const EMOJI_SETS = [
  ['🍎', '🍌', '🍇', '🍊'],
  ['🐶', '🐱', '🐰', '🐻'],
  ['⭐', '🌙', '☀️', '☁️'],
  ['🚗', '🚀', '⛵', '🚲'],
]
const EMOJI_NAMES: Record<string, string> = {
  '🍎': 'apple', '🍌': 'banana', '🍇': 'grapes', '🍊': 'orange',
  '🐶': 'dog', '🐱': 'cat', '🐰': 'rabbit', '🐻': 'bear',
  '⭐': 'star', '🌙': 'moon', '☀️': 'sun', '☁️': 'cloud',
  '🚗': 'car', '🚀': 'rocket', '⛵': 'boat', '🚲': 'bike',
}

function KidsSudoku({ diff, rng, paused, api }: GameProps) {
  const L = layoutFor(diff.d)
  const { solution, puzzle } = useMemo(() => generate(L, diff.d, rng), []) // eslint-disable-line react-hooks/exhaustive-deps
  const symbols = useMemo(() => (diff.young && L.n === 4 ? pick(EMOJI_SETS, rng) : null), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [grid, setGrid] = useState<number[]>(puzzle)
  const [hinted, setHinted] = useState<Set<number>>(new Set())
  const [sel, setSel] = useState(() => Math.max(0, puzzle.indexOf(0)))
  const [bad, setBad] = useState<{ idx: number; v: number } | null>(null)
  const [msg, setMsg] = useState('')
  const finished = useRef(false)
  const blanks = useMemo(() => puzzle.filter((v) => v === 0).length, [puzzle])
  const filled = grid.filter((v, i) => v !== 0 && puzzle[i] === 0).length

  const sym = (v: number) => (symbols ? symbols[v - 1] : String(v))
  const symName = (v: number) => (symbols ? EMOJI_NAMES[symbols[v - 1]] : String(v))

  useEffect(() => api.progress(filled, blanks), [filled, blanks, api])

  const checkDone = (g: number[]) => {
    if (g.every((v) => v !== 0) && !finished.current) {
      finished.current = true
      window.setTimeout(() => {
        play('win')
        api.finish({ completed: true })
      }, 600)
    }
  }

  const place = (v: number) => {
    if (paused || finished.current) return
    if (puzzle[sel] !== 0 || grid[sel] !== 0) {
      setMsg(puzzle[sel] !== 0 ? 'That square is part of the puzzle – pick an empty one.' : 'That square is already solved.')
      return
    }
    if (solution[sel] === v) {
      play('correct')
      api.correct()
      const g = grid.slice()
      g[sel] = v
      setGrid(g)
      setMsg(`${symName(v)} is right!`)
      checkDone(g)
    } else {
      play('wrong')
      api.wrong()
      setBad({ idx: sel, v })
      setMsg(`${symName(v)} does not fit there. Check the row, column and box.`)
      window.setTimeout(() => setBad((b) => (b && b.idx === sel ? null : b)), 800)
    }
  }

  useEffect(() => {
    api.onHint(() => {
      const empties = grid.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)
      if (!empties.length) return 'The puzzle is complete!'
      const idx = grid[sel] === 0 ? sel : empties[0]
      const g = grid.slice()
      g[idx] = solution[idx]
      setGrid(g)
      setHinted((h) => new Set(h).add(idx))
      setSel(idx)
      ;(document.querySelector(`[data-sudoku="${idx}"]`) as HTMLElement | null)?.focus()
      checkDone(g)
      return `Revealed: row ${Math.floor(idx / L.n) + 1}, column ${(idx % L.n) + 1} is ${symName(solution[idx])}.`
    })
    return () => api.onHint(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, grid, sel, solution])

  const moveTo = (i: number) => {
    setSel(i)
    ;(document.querySelector(`[data-sudoku="${i}"]`) as HTMLElement | null)?.focus()
  }

  const onKey = (e: KeyboardEvent, idx: number) => {
    const r = Math.floor(idx / L.n)
    const c = idx % L.n
    let n = -1
    if (e.key === 'ArrowRight') n = r * L.n + Math.min(L.n - 1, c + 1)
    else if (e.key === 'ArrowLeft') n = r * L.n + Math.max(0, c - 1)
    else if (e.key === 'ArrowDown') n = Math.min(L.n - 1, r + 1) * L.n + c
    else if (e.key === 'ArrowUp') n = Math.max(0, r - 1) * L.n + c
    if (n >= 0) {
      e.preventDefault()
      moveTo(n)
      return
    }
    const v = Number(e.key)
    if (Number.isInteger(v) && v >= 1 && v <= L.n) {
      e.preventDefault()
      place(v)
    }
  }

  const cellPx = L.n === 4 ? 'min(84px, 20vw)' : 'min(64px, 14vw)'

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
      <p className="text-center text-sm font-semibold text-muted">
        {diff.young
          ? `Every row, column and box needs each ${symbols ? 'picture' : 'number'} once.`
          : `Fill the grid so each row, column and ${L.br}×${L.bc} box has 1–${L.n} exactly once.`}
      </p>
      <div
        role="grid"
        aria-label={`Sudoku ${L.n} by ${L.n}, ${filled} of ${blanks} blanks filled`}
        className="grid overflow-hidden rounded-2xl border-[3px] border-ink/70 bg-white shadow-soft"
        style={{ gridTemplateColumns: `repeat(${L.n}, ${cellPx})`, gridAutoRows: cellPx }}
      >
        {grid.map((v, i) => {
          const r = Math.floor(i / L.n)
          const c = i % L.n
          const given = puzzle[i] !== 0
          const isSel = sel === i
          const isBad = bad?.idx === i
          const sameRowColBox =
            !isSel &&
            (Math.floor(sel / L.n) === r ||
              sel % L.n === c ||
              (Math.floor(Math.floor(sel / L.n) / L.br) === Math.floor(r / L.br) && Math.floor((sel % L.n) / L.bc) === Math.floor(c / L.bc)))
          const borders = [
            c % L.bc === L.bc - 1 && c !== L.n - 1 ? 'border-r-[3px] border-r-ink/70' : c !== L.n - 1 ? 'border-r border-r-line' : '',
            r % L.br === L.br - 1 && r !== L.n - 1 ? 'border-b-[3px] border-b-ink/70' : r !== L.n - 1 ? 'border-b border-b-line' : '',
          ].join(' ')
          return (
            <motion.button
              key={i}
              type="button"
              data-sudoku={i}
              role="gridcell"
              tabIndex={isSel ? 0 : -1}
              onClick={() => setSel(i)}
              onFocus={() => setSel(i)}
              onKeyDown={(e) => onKey(e, i)}
              animate={isBad ? { x: [0, -5, 5, -5, 5, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              aria-label={`Row ${r + 1}, column ${c + 1}: ${v ? symName(v) : 'empty'}${given ? ', given' : hinted.has(i) ? ', revealed' : v ? ', solved' : ''}${
                isBad ? `, ${symName(bad.v)} is wrong here` : ''
              }`}
              className={`relative grid place-items-center font-display ${L.n === 4 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} ${borders} ${
                isSel ? 'z-10 bg-primary/15 ring-4 ring-primary ring-inset' : sameRowColBox ? 'bg-primary-soft/50' : ''
              } ${given ? 'font-bold text-ink' : hinted.has(i) ? 'text-accent' : 'text-primary'}`}
            >
              {isBad ? (
                <span className="relative">
                  <span className="opacity-40">{sym(bad.v)}</span>
                  <span className="absolute -top-2 -right-4 grid size-6 place-items-center rounded-full bg-danger text-sm font-bold text-white" aria-hidden>
                    ✗
                  </span>
                </span>
              ) : v ? (
                sym(v)
              ) : (
                ''
              )}
            </motion.button>
          )
        })}
      </div>

      <div role="group" aria-label="Number pad" className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: L.n }, (_, k) => k + 1).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => place(v)}
            disabled={paused}
            aria-label={`Place ${symName(v)}${symbols ? ` (key ${v})` : ''}`}
            className="btile relative grid size-14 place-items-center text-2xl sm:size-16 sm:text-3xl"
          >
            {sym(v)}
            {symbols && <span className="absolute right-1 bottom-0.5 text-[10px] text-muted">{v}</span>}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-semibold text-muted">
        {msg || 'Pick a square, then a number. Arrow keys move, number keys place.'}
      </p>
    </div>
  )
}

export const kidsSudoku: GameDef = {
  id: 'kids-sudoku',
  category: 'puzzle',
  skill: 'logic',
  title: 'Mini Sudoku',
  emoji: '🔢',
  blurb: 'Small sudoku grids with pictures or numbers.',
  instructions: [
    'Each row, column and box must contain every number exactly once.',
    'Select a square, then tap a number on the pad (or press a number key).',
    'Arrow keys move around the grid.',
    'Wrong numbers are rejected and count as a miss.',
  ],
  kidInstructions: ['Tap a square, then tap a picture.', 'Each row and each box needs every picture once.', 'No repeats!'],
  timeLimit: (d) => Math.round((d.d <= 6 ? 180 : 420) * d.time),
  timeoutCompletes: false,
  component: KidsSudoku,
}
