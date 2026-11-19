import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { randInt, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { PALETTE } from '../shared/Shape'
import type { GameDef, GameProps } from '../types'

const COLORS = [
  { name: 'purple', hex: PALETTE[4].hex, sym: '●' },
  { name: 'blue', hex: PALETTE[1].hex, sym: '▲' },
  { name: 'orange', hex: PALETTE[5].hex, sym: '■' },
]
const ROUNDS = 3

function dims(d: number) {
  const half = d <= 3 ? 2 : d <= 7 ? 3 : 4
  const rows = d <= 2 ? 4 : d <= 4 ? 5 : d <= 7 ? 6 : d <= 9 ? 7 : 8
  const colors = d >= 11 ? 3 : d >= 8 ? 2 : 1
  return { half, rows, colors }
}

interface Round {
  half: number
  rows: number
  colors: number
  /** Left half, row-major, 0 = empty, k = COLORS[k-1]. */
  left: number[]
  /** Expected right half. Right column j mirrors left column half-1-j. */
  target: number[]
}

function makeRound(d: number, rng: Rng): Round {
  const { half, rows, colors } = dims(d)
  let left: number[] = []
  for (let tries = 0; tries < 50; tries++) {
    left = Array.from({ length: rows * half }, () => (rng() < 0.45 ? randInt(1, colors, rng) : 0))
    const filled = left.filter(Boolean).length
    if (filled >= Math.max(3, Math.round(rows * half * 0.3)) && filled <= rows * half - 2) break
  }
  const target = left.map((_, i) => {
    const r = Math.floor(i / half)
    const j = i % half
    return left[r * half + (half - 1 - j)]
  })
  return { half, rows, colors, left, target }
}

function MirrorImage({ diff, rng, paused, api }: GameProps) {
  const [roundNo, setRoundNo] = useState(0)
  const [round, setRound] = useState(() => makeRound(diff.d, rng))
  const [cells, setCells] = useState<number[]>(() => Array(round.rows * round.half).fill(0))
  const [wrongCells, setWrongCells] = useState<Set<number>>(new Set())
  const [solved, setSolved] = useState(false)
  const [msg, setMsg] = useState('')
  const done = useRef(false)

  useEffect(() => api.progress(roundNo + (solved ? 1 : 0), ROUNDS), [roundNo, solved, api])

  useEffect(() => {
    api.onHint(() => {
      const idx = cells.findIndex((v, i) => v !== round.target[i])
      if (idx < 0) return 'Your mirror looks complete – press Check!'
      setCells((c) => c.map((v, i) => (i === idx ? round.target[i] : v)))
      setWrongCells((w) => {
        const n = new Set(w)
        n.delete(idx)
        return n
      })
      return `One square fixed for you (row ${Math.floor(idx / round.half) + 1}). Remember: the square next to the mirror line copies the square on the other side of the line.`
    })
    return () => api.onHint(null)
  }, [api, cells, round])

  const toggle = (i: number) => {
    if (paused || solved) return
    play('tap')
    setCells((c) => c.map((v, k) => (k === i ? (v + 1) % (round.colors + 1) : v)))
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
    cells.forEach((v, i) => {
      if (v !== round.target[i]) wrong.add(i)
    })
    setWrongCells(wrong)
    if (wrong.size === 0) {
      play('correct')
      api.correct(15 * diff.d)
      setSolved(true)
      setMsg('Perfect mirror!')
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
        setCells(Array(r.rows * r.half).fill(0))
        setWrongCells(new Set())
        setSolved(false)
        setMsg('')
        setRoundNo(roundNo + 1)
      }, 1000)
    } else {
      play('wrong')
      api.wrong()
      setMsg(`${wrong.size} square${wrong.size > 1 ? 's are' : ' is'} not right yet – look for the ✗ marks.`)
    }
  }

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const { half } = round
    const r = Math.floor(i / half)
    const c = i % half
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    const nr = Math.min(round.rows - 1, Math.max(0, r + m[0]))
    const nc = Math.min(half - 1, Math.max(0, c + m[1]))
    ;(document.querySelector(`[data-mcell="${nr * half + nc}"]`) as HTMLElement | null)?.focus()
  }

  const cellSize = `min(${round.half >= 4 ? 44 : 52}px, calc((100vw - 72px) / ${round.half * 2}))`
  const colorName = (v: number) => (v ? COLORS[v - 1].name : 'empty')

  const renderCell = (v: number) =>
    v ? (
      <span className="grid size-full place-items-center rounded-md text-white" style={{ background: COLORS[v - 1].hex }}>
        {round.colors > 1 && <span className="text-sm leading-none">{COLORS[v - 1].sym}</span>}
      </span>
    ) : null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center font-semibold text-muted">
        {diff.young ? 'Make the right side look like a mirror of the left side.' : 'Complete the right half so the picture is mirror-symmetric.'}
        {round.colors > 1 && <span className="block text-sm">Tap a square again to change its colour.</span>}
        <span className="block text-sm">
          Round {roundNo + 1} of {ROUNDS}
        </span>
      </p>
      {round.colors > 1 && (
        <div className="flex flex-wrap justify-center gap-2" aria-label="Colour order">
          <span className="bchip bg-white text-muted">Tap order:</span>
          {COLORS.slice(0, round.colors).map((c) => (
            <span key={c.name} className="bchip bg-white text-ink">
              <span className="grid size-4 place-items-center rounded text-[10px] text-white" style={{ background: c.hex }}>
                {c.sym}
              </span>
              {c.name}
            </span>
          ))}
          <span className="bchip bg-white text-ink">→ empty</span>
        </div>
      )}
      <div className="bcard flex items-stretch gap-1 p-3">
        <div
          role="img"
          aria-label={`Left half pattern: ${round.left.map(colorName).join(', ')}`}
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${round.half}, ${cellSize})` }}
        >
          {round.left.map((v, i) => (
            <div key={i} className="aspect-square rounded-lg border-2 border-line bg-white p-0.5">
              {renderCell(v)}
            </div>
          ))}
        </div>
        <div
          aria-hidden
          className="mx-1 w-1 rounded-full"
          style={{ background: 'repeating-linear-gradient(to bottom, var(--color-primary) 0 8px, transparent 8px 14px)' }}
        />
        <div role="group" aria-label="Right half – your mirror" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${round.half}, ${cellSize})` }}>
          {cells.map((v, i) => {
            const bad = wrongCells.has(i)
            return (
              <button
                key={i}
                type="button"
                data-mcell={i}
                onClick={() => toggle(i)}
                onKeyDown={(e) => onKey(e, i)}
                aria-label={`Row ${Math.floor(i / round.half) + 1}, column ${(i % round.half) + 1} from the mirror, ${colorName(v)}${bad ? ', wrong' : ''}`}
                className={`relative aspect-square rounded-lg border-2 bg-white p-0.5 transition hover:border-primary ${
                  bad ? 'border-danger' : solved ? 'border-success' : 'border-line'
                }`}
              >
                {renderCell(v)}
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

export const mirrorImage: GameDef = {
  id: 'mirror-image',
  category: 'spatial',
  skill: 'spatial',
  title: 'Mirror Image',
  emoji: '🪞',
  blurb: 'Complete the other half of a symmetric pattern.',
  instructions: [
    'The left half of a pattern is shown; the right half is empty.',
    'Tap squares on the right to build its mirror image across the dashed line.',
    'Press Check. Wrong squares get a ✗ mark so you can fix them.',
    'Higher levels use bigger grids and more colours.',
  ],
  kidInstructions: ['Copy the picture like a mirror.', 'Tap squares on the right side.', 'Then press Check!'],
  component: MirrorImage,
}
