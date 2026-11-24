import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pick, randInt } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { ASYMMETRIC, PALETTE, SHAPES, Shape } from '../shared/Shape'
import type { ShapeKind } from '../shared/Shape'
import type { GameDef, GameProps } from '../types'

const ROUNDS = 8

/** Clearly different pairs (easy). */
const EASY_PAIRS: [string, string][] = [
  ['🍎', '🍌'], ['🐶', '🐱'], ['⭐', '🌙'], ['🚗', '🚀'], ['⚽', '🏀'], ['🌻', '🌵'], ['🐸', '🐷'], ['🎈', '🎁'],
]
/** Look-alike pairs (harder). */
const SIMILAR_PAIRS: [string, string][] = [
  ['🐶', '🐕'], ['🐱', '🐈'], ['🌲', '🌳'], ['🍊', '🍑'], ['🚗', '🚙'], ['⭐', '🌟'],
  ['🐭', '🐹'], ['🍏', '🍐'], ['🌑', '⚫'], ['🔵', '🫐'], ['🐻', '🧸'], ['🕐', '🕑'],
]

type Cell = { kind: 'emoji'; e: string } | { kind: 'shape'; shape: ShapeKind; color: string; rotate: number }

interface Board {
  n: number
  base: Cell
  odd: Cell
  oddIdx: number
  key: string
  describe: string
}

function gridSize(d: number) {
  if (d <= 2) return 3
  if (d <= 4) return 4
  if (d <= 6) return 5
  if (d <= 9) return 6
  return 7
}

/** Mix a hex colour towards white (amt > 0) or black (amt < 0). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function makeBoard(d: number, rng: Rng): Board {
  const n = gridSize(d)
  const oddIdx = randInt(0, n * n - 1, rng)
  const types = d <= 3 ? ['easy', 'shape'] : d <= 6 ? ['similar', 'shape', 'rotate'] : ['similar', 'rotate', 'shade']
  const t = pick(types, rng)
  if (t === 'easy' || t === 'similar') {
    const pair = pick(t === 'easy' ? EASY_PAIRS : SIMILAR_PAIRS, rng)
    const [a, b] = rng() < 0.5 ? pair : [pair[1], pair[0]]
    return { n, oddIdx, base: { kind: 'emoji', e: a }, odd: { kind: 'emoji', e: b }, key: `${a}${b}${oddIdx}`, describe: `a different picture (${b})` }
  }
  const color = pick(PALETTE, rng)
  if (t === 'shape') {
    const [s1, s2] = [pick(SHAPES, rng), pick(SHAPES, rng)]
    const s2b = s1 === s2 ? SHAPES[(SHAPES.indexOf(s2) + 1) % SHAPES.length] : s2
    return {
      n,
      oddIdx,
      base: { kind: 'shape', shape: s1, color: color.hex, rotate: 0 },
      odd: { kind: 'shape', shape: s2b, color: color.hex, rotate: 0 },
      key: `${s1}${s2b}${oddIdx}`,
      describe: `a different shape (${s2b})`,
    }
  }
  if (t === 'rotate') {
    const s = pick(ASYMMETRIC, rng)
    const angle = Math.max(15, 90 - d * 7) * (rng() < 0.5 ? -1 : 1)
    const baseRot = pick([0, 90, 180, 270], rng)
    return {
      n,
      oddIdx,
      base: { kind: 'shape', shape: s, color: color.hex, rotate: baseRot },
      odd: { kind: 'shape', shape: s, color: color.hex, rotate: baseRot + angle },
      key: `${s}r${angle}${oddIdx}`,
      describe: 'a shape turned slightly',
    }
  }
  const s = pick(SHAPES, rng)
  const amt = Math.max(0.16, 0.45 - (d - 7) * 0.06) * (rng() < 0.5 ? 1 : -0.7)
  return {
    n,
    oddIdx,
    base: { kind: 'shape', shape: s, color: color.hex, rotate: 0 },
    odd: { kind: 'shape', shape: s, color: shade(color.hex, amt), rotate: 0 },
    key: `${s}c${amt.toFixed(2)}${oddIdx}`,
    describe: `a slightly ${amt > 0 ? 'lighter' : 'darker'} colour`,
  }
}

function CellView({ c }: { c: Cell }) {
  if (c.kind === 'emoji') return <span className="leading-none">{c.e}</span>
  return <Shape kind={c.shape} color={c.color} rotate={c.rotate} size="70%" />
}

function FindDifferent({ diff, rng, paused, api }: GameProps) {
  const [round, setRound] = useState(0)
  const [board, setBoard] = useState<Board>(() => makeBoard(diff.d, rng))
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const [hintRow, setHintRow] = useState<number | null>(null)
  const start = useRef(performance.now())
  const lastKey = useRef(board.key)
  const finished = useRef(false)

  useEffect(() => api.progress(round, ROUNDS), [round, api])

  useEffect(() => {
    api.onHint(() => {
      const row = Math.floor(board.oddIdx / board.n)
      setHintRow(row)
      return `Look in row ${row + 1}. The odd one has ${board.describe}.`
    })
    return () => api.onHint(null)
  }, [api, board])

  const tap = (i: number) => {
    if (paused || solved) return
    if (i === board.oddIdx) {
      play('correct')
      api.reaction(performance.now() - start.current)
      api.correct(10 * diff.d)
      api.found(1)
      setSolved(true)
      window.setTimeout(() => {
        const r = round + 1
        if (r >= ROUNDS) {
          if (!finished.current) {
            finished.current = true
            api.progress(ROUNDS, ROUNDS)
            api.finish({ completed: true })
          }
          return
        }
        let b = makeBoard(diff.d, rng)
        for (let k = 0; k < 10 && b.key.slice(0, 4) === lastKey.current.slice(0, 4); k++) b = makeBoard(diff.d, rng)
        lastKey.current = b.key
        setBoard(b)
        setRound(r)
        setSolved(false)
        setHintRow(null)
        start.current = performance.now()
      }, 650)
    } else {
      play('wrong')
      api.wrong()
      setWrongIdx(i)
      window.setTimeout(() => setWrongIdx((x) => (x === i ? null : x)), 500)
    }
  }

  const cells = useMemo(() => Array.from({ length: board.n * board.n }, (_, i) => i), [board])
  const fontSize = board.n <= 4 ? 'text-4xl sm:text-5xl' : board.n <= 5 ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <div role="status" aria-live="polite" className="flex min-h-8 items-center gap-2 font-display text-lg font-bold">
        {solved ? (
          <span className="flex items-center gap-2 text-[#1d8a5c]">
            <Check size={20} /> Found it!
          </span>
        ) : (
          <span className="text-primary">{diff.young ? 'Which one is different?' : `Round ${round + 1} of ${ROUNDS}: tap the odd one out`}</span>
        )}
      </div>
      <div className="grid w-full gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${board.n}, minmax(0,1fr))` }} role="group" aria-label="Grid of items">
        {cells.map((i) => {
          const isOdd = i === board.oddIdx
          const c = isOdd ? board.odd : board.base
          const row = Math.floor(i / board.n)
          return (
            <button
              key={`${board.key}-${i}`}
              type="button"
              onClick={() => tap(i)}
              aria-label={`Item ${i + 1}, row ${row + 1}${solved && isOdd ? ', the odd one' : ''}${wrongIdx === i ? ', not this one' : ''}`}
              className={`btile relative grid aspect-square place-items-center ${fontSize} ${hintRow === row && !solved ? 'bg-accent/15' : ''} ${
                solved && isOdd ? '!border-success bg-success/10' : ''
              } ${wrongIdx === i ? 'animate-shake !border-danger bg-danger/10' : ''}`}
            >
              <CellView c={c} />
              {solved && isOdd && (
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-success text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              {wrongIdx === i && (
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-danger text-white">
                  <X size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const findDifferent: GameDef = {
  id: 'find-different',
  category: 'focus',
  skill: 'attention',
  title: 'Find the Different One',
  emoji: '🔍',
  blurb: 'Spot the one item that is not like the others.',
  instructions: [
    'Every grid has one item that is slightly different.',
    'Tap it as quickly as you can.',
    'At higher levels the difference is tiny – a look-alike picture, a small turn or a lighter colour.',
  ],
  kidInstructions: ['All the pictures look the same…', 'but one is different!', 'Tap the different one.'],
  component: FindDifferent,
}
