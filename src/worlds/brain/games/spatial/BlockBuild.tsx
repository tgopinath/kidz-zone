import { Check, Eraser, RotateCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { pick, randInt, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { DraggableTile } from '../shared/DraggableTile'
import { PALETTE } from '../shared/Shape'
import type { GameDef, GameProps } from '../types'

const BLOCKS = [
  { name: 'red', hex: PALETTE[0].hex, sym: '●' },
  { name: 'blue', hex: PALETTE[1].hex, sym: '■' },
  { name: 'green', hex: PALETTE[2].hex, sym: '▲' },
  { name: 'yellow', hex: PALETTE[3].hex, sym: '◆' },
  { name: 'purple', hex: PALETTE[4].hex, sym: '★' },
]
const ROUNDS = 3

type Piece = [number, number][]
const PIECES: { min: number; cells: Piece }[] = [
  { min: 1, cells: [[0, 0]] },
  { min: 1, cells: [[0, 0], [1, 0]] },
  { min: 1, cells: [[0, 0], [0, 1]] },
  { min: 3, cells: [[0, 0], [1, 0], [2, 0]] },
  { min: 3, cells: [[0, 0], [0, 1], [0, 2]] },
  { min: 5, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { min: 8, cells: [[0, 0], [0, 1], [1, 1]] },
  { min: 8, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
]

interface Round {
  size: number
  colors: number
  target: number[]
  shown: number[]
  rotated: boolean
}

function rotateCW(grid: number[], s: number): number[] {
  // new[r][c] = old[s-1-c][r]
  return grid.map((_, i) => {
    const r = Math.floor(i / s)
    const c = i % s
    return grid[(s - 1 - c) * s + r]
  })
}

function makeRound(d: number, rng: Rng): Round {
  const size = d <= 3 ? 4 : d <= 7 ? 5 : 6
  const colors = d <= 2 ? 2 : d <= 5 ? 3 : d <= 8 ? 4 : 5
  const blocks = Math.min(9, 2 + Math.ceil(d / 2))
  const pieces = PIECES.filter((p) => p.min <= d)
  let target: number[] = []
  for (let tries = 0; tries < 40; tries++) {
    target = Array(size * size).fill(0)
    for (let b = 0; b < blocks; b++) {
      const p = pick(pieces, rng).cells
      const w = Math.max(...p.map((c) => c[0])) + 1
      const h = Math.max(...p.map((c) => c[1])) + 1
      const ox = randInt(0, size - w, rng)
      const oy = randInt(0, size - h, rng)
      const col = randInt(1, colors, rng)
      for (const [x, y] of p) target[(oy + y) * size + ox + x] = col
    }
    const filled = target.filter(Boolean).length
    // Keep it interesting: at least 4 squares and at least 2 colours used.
    if (filled >= 4 && new Set(target.filter(Boolean)).size >= 2) break
  }
  const rotated = d >= 9
  return { size, colors, target, shown: rotated ? rotateCW(target, size) : target, rotated }
}

function BlockBuild({ diff, rng, paused, api }: GameProps) {
  const [roundNo, setRoundNo] = useState(0)
  const [round, setRound] = useState(() => makeRound(diff.d, rng))
  const [board, setBoard] = useState<number[]>(() => Array(round.size * round.size).fill(0))
  const [sel, setSel] = useState(1)
  const [wrongCells, setWrongCells] = useState<Set<number>>(new Set())
  const [solved, setSolved] = useState(false)
  const [msg, setMsg] = useState('')
  const done = useRef(false)

  useEffect(() => api.progress(roundNo + (solved ? 1 : 0), ROUNDS), [roundNo, solved, api])

  useEffect(() => {
    api.onHint(() => {
      const idx = board.findIndex((v, i) => v !== round.target[i])
      if (idx < 0) return 'It looks finished – press Check!'
      setBoard((b) => b.map((v, i) => (i === idx ? round.target[i] : v)))
      setWrongCells((w) => {
        const n = new Set(w)
        n.delete(idx)
        return n
      })
      const r = Math.floor(idx / round.size) + 1
      const c = (idx % round.size) + 1
      return `Row ${r}, column ${c} has been fixed for you.${round.rotated ? ' Remember to turn the picture back a quarter turn anticlockwise.' : ''}`
    })
    return () => api.onHint(null)
  }, [api, board, round])

  const paint = (i: number, color: number) => {
    if (paused || solved) return
    play('tap')
    setBoard((b) => b.map((v, k) => (k === i ? (v === color ? 0 : color) : v)))
    setWrongCells((w) => {
      if (!w.has(i)) return w
      const n = new Set(w)
      n.delete(i)
      return n
    })
    setMsg('')
  }

  const check = () => {
    if (paused || solved) return
    const wrong = new Set<number>()
    board.forEach((v, i) => {
      if (v !== round.target[i]) wrong.add(i)
    })
    setWrongCells(wrong)
    if (wrong.size === 0) {
      play('correct')
      api.correct(15 * diff.d)
      setSolved(true)
      setMsg('Built perfectly!')
      window.setTimeout(() => {
        if (roundNo + 1 >= ROUNDS) {
          if (!done.current) {
            done.current = true
            api.progress(ROUNDS, ROUNDS)
            api.finish({ completed: true })
          }
          return
        }
        const r = makeRound(diff.d, rng)
        setRound(r)
        setBoard(Array(r.size * r.size).fill(0))
        setWrongCells(new Set())
        setSolved(false)
        setMsg('')
        setRoundNo(roundNo + 1)
      }, 1000)
    } else {
      play('wrong')
      api.wrong()
      setMsg(`${wrong.size} square${wrong.size > 1 ? 's' : ''} to fix – see the ✗ marks.`)
    }
  }

  const name = (v: number) => (v ? BLOCKS[v - 1].name : 'empty')
  const block = (v: number, small = false) =>
    v ? (
      <span
        className={`grid size-full place-items-center rounded-md text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] ${small ? 'text-[10px]' : 'text-sm'}`}
        style={{ background: BLOCKS[v - 1].hex }}
      >
        {BLOCKS[v - 1].sym}
      </span>
    ) : null

  const s = round.size
  const refCell = `min(${s >= 6 ? 26 : 30}px, calc((100vw - 64px) / ${s * 2.4}))`
  const boardCell = `min(${s >= 6 ? 48 : 56}px, calc((100vw - 48px) / ${s}))`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center font-semibold text-muted">
        {diff.young ? 'Build the same picture with blocks.' : 'Copy the model onto the empty grid.'}
        <span className="block text-sm">
          Round {roundNo + 1} of {ROUNDS}
        </span>
      </p>
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
        <div className="bcard flex flex-col items-center gap-2 p-3">
          <h3 className="font-display text-lg">Model</h3>
          {round.rotated && (
            <p className="flex max-w-48 items-center gap-1 text-center text-xs font-bold text-primary">
              <RotateCw size={14} aria-hidden /> This model is turned a quarter turn clockwise. Build it the right way up!
            </p>
          )}
          <div
            role="img"
            aria-label={`Model ${s} by ${s}${round.rotated ? ', shown rotated a quarter turn clockwise' : ''}: ${round.shown.map(name).join(', ')}`}
            className="grid gap-0.5 rounded-xl bg-line/60 p-1"
            style={{ gridTemplateColumns: `repeat(${s}, ${refCell})` }}
          >
            {round.shown.map((v, i) => (
              <div key={i} className="aspect-square rounded-md bg-white">
                {block(v, true)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div role="group" aria-label="Your build" className="grid gap-1 rounded-2xl bg-line/60 p-1.5" style={{ gridTemplateColumns: `repeat(${s}, ${boardCell})` }}>
            {board.map((v, i) => {
              const bad = wrongCells.has(i)
              return (
                <button
                  key={i}
                  type="button"
                  data-dropzone={`cell-${i}`}
                  onClick={() => paint(i, sel)}
                  aria-label={`Row ${Math.floor(i / s) + 1}, column ${(i % s) + 1}, ${name(v)}${bad ? ', wrong' : ''}`}
                  className={`relative aspect-square rounded-lg border-2 bg-white p-0.5 transition hover:border-primary ${
                    bad ? 'border-danger' : solved ? 'border-success' : 'border-transparent'
                  }`}
                >
                  {block(v)}
                  {bad && (
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-danger text-white">
                      <X size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div role="group" aria-label="Blocks" className="flex flex-wrap justify-center gap-2">
        {BLOCKS.slice(0, round.colors).map((b, k) => (
          <DraggableTile
            key={b.name}
            label={`${b.name} block${sel === k + 1 ? ', selected' : ''}`}
            selected={sel === k + 1}
            disabled={paused || solved}
            onActivate={() => setSel(k + 1)}
            onDrop={(zone) => {
              if (zone.startsWith('cell-')) paint(Number(zone.slice(5)), k + 1)
            }}
            className="flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-xs"
          >
            <span className="size-8">{block(k + 1)}</span>
            {b.name}
          </DraggableTile>
        ))}
        <button
          type="button"
          aria-pressed={sel === 0}
          aria-label="Eraser"
          onClick={() => setSel(0)}
          className={`btile flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-xs ${sel === 0 ? 'border-primary ring-4 ring-primary/25' : ''}`}
        >
          <Eraser size={24} aria-hidden />
          eraser
        </button>
      </div>
      <div className="flex flex-col items-center gap-2" aria-live="polite">
        {msg && (
          <p className={`flex items-center gap-2 font-bold ${solved ? 'text-[#1d8a5c]' : 'text-[#c22d4b]'}`}>
            {solved ? <Check size={18} /> : <X size={18} />} {msg}
          </p>
        )}
        <button type="button" className="bbtn-primary" onClick={check} disabled={solved || paused}>
          <Check size={18} /> Check
        </button>
      </div>
    </div>
  )
}

export const blockBuild: GameDef = {
  id: 'block-build',
  category: 'spatial',
  skill: 'spatial',
  title: 'Block Builder',
  emoji: '🧱',
  blurb: 'Copy a block model onto an empty grid.',
  instructions: [
    'Look at the model made of coloured blocks.',
    'Pick a block colour, then tap squares on your grid – or drag a block onto a square.',
    'Tap a square again (or use the eraser) to remove a block.',
    'Press Check. At high levels the model is shown rotated – build it upright.',
  ],
  kidInstructions: ['Look at the model.', 'Pick a colour and tap the squares.', 'Make it look the same, then press Check!'],
  component: BlockBuild,
}
