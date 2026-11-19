import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { DraggableTile } from '../shared/DraggableTile'
import { useTimeout } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'

interface Round {
  /** Equation tokens; the string '__' is the blank. */
  tokens: string[]
  answer: number
  tiles: number[]
  hint: string
  spoken: string
}

const ROUNDS = 10

function makeTiles(answer: number, count: number, max: number, rng: Rng): number[] {
  const set = new Set<number>([answer])
  let guard = 0
  while (set.size < count && guard++ < 300) {
    const near = guard < 150 ? answer + randInt(-5, 5, rng) : randInt(0, max, rng)
    if (near >= 0 && near !== answer) set.add(near)
  }
  return shuffle([...set], rng)
}

function makeRound(diff: Difficulty, rng: Rng): Round {
  const d = diff.d
  const tileCount = d <= 2 ? 4 : d <= 5 ? 5 : 6
  // Beginner: 1–10
  if (d <= 2) {
    const c = randInt(3, 10, rng)
    const a = randInt(1, c - 1, rng)
    const b = c - a
    const blankFirst = rng() < 0.4
    return {
      tokens: blankFirst ? ['__', '+', String(b), '=', String(c)] : [String(a), '+', '__', '=', String(c)],
      answer: blankFirst ? a : b,
      tiles: makeTiles(blankFirst ? a : b, tileCount, 10, rng),
      hint: blankFirst ? `Count up from ${b} to ${c}.` : `Count up from ${a} to ${c}.`,
      spoken: blankFirst ? `blank plus ${b} equals ${c}` : `${a} plus blank equals ${c}`,
    }
  }
  // Easy: 1–50, + and −
  if (d <= 5) {
    const op = pick(['+', '−'], rng)
    if (op === '+') {
      const c = randInt(10, 50, rng)
      const a = randInt(1, c - 1, rng)
      return { tokens: [String(a), '+', '__', '=', String(c)], answer: c - a, tiles: makeTiles(c - a, tileCount, 50, rng), hint: `What is ${c} − ${a}?`, spoken: `${a} plus blank equals ${c}` }
    }
    const a = randInt(10, 50, rng)
    const b = randInt(1, a - 1, rng)
    const blankFirst = rng() < 0.4
    return blankFirst
      ? { tokens: ['__', '−', String(b), '=', String(a - b)], answer: a, tiles: makeTiles(a, tileCount, 60, rng), hint: `Add ${b} back on to ${a - b}.`, spoken: `blank minus ${b} equals ${a - b}` }
      : { tokens: [String(a), '−', '__', '=', String(a - b)], answer: b, tiles: makeTiles(b, tileCount, 50, rng), hint: `What is ${a} − ${a - b}?`, spoken: `${a} minus blank equals ${a - b}` }
  }
  // Medium: 1–100, all four operations
  if (d <= 8) {
    const op = pick(['+', '−', '×', '÷'], rng)
    if (op === '+') {
      const c = randInt(30, 100, rng)
      const a = randInt(5, c - 5, rng)
      return { tokens: ['__', '+', String(a), '=', String(c)], answer: c - a, tiles: makeTiles(c - a, tileCount, 100, rng), hint: `What is ${c} − ${a}?`, spoken: `blank plus ${a} equals ${c}` }
    }
    if (op === '−') {
      const a = randInt(30, 100, rng)
      const b = randInt(5, a - 5, rng)
      return { tokens: [String(a), '−', '__', '=', String(a - b)], answer: b, tiles: makeTiles(b, tileCount, 100, rng), hint: `What is ${a} − ${a - b}?`, spoken: `${a} minus blank equals ${a - b}` }
    }
    const x = randInt(2, 12, rng)
    const y = randInt(2, 9, rng)
    if (op === '×')
      return { tokens: ['__', '×', String(y), '=', String(x * y)], answer: x, tiles: makeTiles(x, tileCount, 12, rng), hint: `What is ${x * y} ÷ ${y}?`, spoken: `blank times ${y} equals ${x * y}` }
    return { tokens: [String(x * y), '÷', '__', '=', String(x)], answer: y, tiles: makeTiles(y, tileCount, 12, rng), hint: `Which number times ${x} makes ${x * y}?`, spoken: `${x * y} divided by blank equals ${x}` }
  }
  // Advanced: multi-step
  const form = pick(['axb', 'paren', 'axmb'], rng)
  const a = randInt(2, d >= 11 ? 9 : 6, rng)
  const x = randInt(2, d >= 11 ? 15 : 10, rng)
  const b = randInt(1, 20, rng)
  if (form === 'axb') {
    const c = a * x + b
    return { tokens: ['(', String(a), '×', '__', ')', '+', String(b), '=', String(c)], answer: x, tiles: makeTiles(x, tileCount, 20, rng), hint: `Take ${b} off ${c} first, then divide by ${a}.`, spoken: `open bracket ${a} times blank close bracket plus ${b} equals ${c}` }
  }
  if (form === 'paren') {
    const c = (x + b) * a
    return { tokens: ['(', '__', '+', String(b), ')', '×', String(a), '=', String(c)], answer: x, tiles: makeTiles(x, tileCount, 20, rng), hint: `Divide ${c} by ${a} first, then take away ${b}.`, spoken: `open bracket blank plus ${b} close bracket times ${a} equals ${c}` }
  }
  const bb = randInt(1, a * x - 1, rng)
  const c = a * x - bb
  return { tokens: [String(a), '×', '__', '−', String(bb), '=', String(c)], answer: x, tiles: makeTiles(x, tileCount, 20, rng), hint: `Add ${bb} to ${c} first, then divide by ${a}.`, spoken: `${a} times blank minus ${bb} equals ${c}` }
}

function DragMath({ diff, rng, paused, api }: GameProps) {
  const [round, setRound] = useState(0)
  const [r, setR] = useState<Round>(() => makeRound(diff, rng))
  const [placed, setPlaced] = useState<number | null>(null)
  const [phase, setPhase] = useState<'play' | 'right' | 'wrong' | 'reveal'>('play')
  const [used, setUsed] = useState<Set<number>>(new Set())
  const [misses, setMisses] = useState(0)
  const lock = useRef(false)
  const start = useRef(performance.now())
  const finished = useRef(false)
  const lastKey = useRef(r.tokens.join(''))

  useEffect(() => api.progress(round, ROUNDS), [round, api])

  useEffect(() => {
    api.onHint(() => r.hint)
    return () => api.onHint(null)
  }, [r, api])

  const place = (n: number) => {
    // A drag can also fire a click – the lock stops a double answer.
    if (paused || phase !== 'play' || used.has(n) || lock.current) return
    lock.current = true
    setPlaced(n)
    if (n === r.answer) {
      play('correct')
      api.reaction(performance.now() - start.current)
      api.correct(misses === 0 ? 10 * diff.d : 5 * diff.d)
      setPhase('right')
    } else {
      play('wrong')
      api.wrong()
      const m = misses + 1
      setMisses(m)
      setUsed((u) => new Set(u).add(n))
      setPhase(m >= 2 ? 'reveal' : 'wrong')
    }
  }

  const advance = () => {
    const nr = round + 1
    if (nr >= ROUNDS) {
      if (!finished.current) {
        finished.current = true
        api.progress(ROUNDS, ROUNDS)
        api.finish({ completed: true })
      }
      return
    }
    let next = makeRound(diff, rng)
    for (let i = 0; i < 10 && next.tokens.join('') === lastKey.current; i++) next = makeRound(diff, rng)
    lastKey.current = next.tokens.join('')
    setRound(nr)
    setR(next)
    setPlaced(null)
    setUsed(new Set())
    setMisses(0)
    setPhase('play')
    lock.current = false
    start.current = performance.now()
  }

  useTimeout(advance, phase === 'right' ? 900 : phase === 'reveal' ? 2200 : null, paused)
  useTimeout(
    () => {
      setPlaced(null)
      setPhase('play')
      lock.current = false
    },
    phase === 'wrong' ? 900 : null,
    paused,
  )

  const shown = phase === 'reveal' ? r.answer : placed
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
      <div className="bcard w-full px-3 py-8 text-center">
        <p className="sr-only" aria-live="polite">
          Round {round + 1}: {r.spoken}.
        </p>
        <div aria-hidden className="flex flex-wrap items-center justify-center gap-2 font-display text-3xl font-semibold sm:gap-3 sm:text-5xl">
          {r.tokens.map((t, i) =>
            t === '__' ? (
              <motion.span
                key={`${round}-${i}`}
                data-dropzone="blank"
                animate={phase === 'wrong' ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                className={`relative grid min-h-16 min-w-16 place-items-center rounded-2xl border-4 px-2 sm:min-h-20 sm:min-w-20 ${
                  phase === 'right' ? 'border-success bg-success/10' : phase === 'wrong' ? 'border-danger bg-danger/10' : phase === 'reveal' ? 'border-accent bg-accent/15' : 'border-dashed border-primary bg-primary-soft'
                }`}
              >
                {shown ?? <span className="text-primary/50">?</span>}
                {phase === 'right' && (
                  <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-success text-white">
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
                {phase === 'wrong' && (
                  <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-danger text-white">
                    <X size={16} strokeWidth={3} />
                  </span>
                )}
              </motion.span>
            ) : (
              <span key={i}>{t}</span>
            ),
          )}
        </div>
      </div>

      <div role="status" aria-live="polite" className="min-h-8 text-center font-bold">
        {phase === 'right' && (
          <span className="inline-flex items-center gap-2 text-[#1d8a5c]">
            <Check size={20} /> Correct!
          </span>
        )}
        {phase === 'wrong' && (
          <span className="inline-flex items-center gap-2 text-[#c22d4b]">
            <X size={20} /> Not {placed} – try another tile.
          </span>
        )}
        {phase === 'reveal' && (
          <span className="inline-flex items-center gap-2 text-[#b06a10]">
            <X size={20} /> The answer was {r.answer}.
          </span>
        )}
        {phase === 'play' && <span className="text-sm text-muted">{diff.young ? 'Drag a number into the box, or tap it.' : 'Drag a btile into the blank, or tap a btile to place it.'}</span>}
      </div>

      <div role="group" aria-label="Number tiles" className="flex flex-wrap justify-center gap-3">
        {r.tiles.map((n) => (
          <DraggableTile
            key={`${round}-${n}`}
            label={`Number ${n}${used.has(n) ? ', already tried' : ''}`}
            disabled={paused || phase !== 'play' || used.has(n)}
            onDrop={(zone) => zone === 'blank' && place(n)}
            onActivate={() => place(n)}
            className={`grid size-16 place-items-center text-2xl sm:size-20 sm:text-3xl ${used.has(n) ? 'line-through opacity-40' : ''}`}
          >
            {n}
          </DraggableTile>
        ))}
      </div>
    </div>
  )
}

export const dragMath: GameDef = {
  id: 'drag-math',
  category: 'number',
  skill: 'logic',
  title: 'Drag Maths',
  emoji: '🧮',
  blurb: 'Drag the right number btile into the equation.',
  instructions: [
    'Each equation has one blank.',
    'Drag a number btile into the blank – or just tap the tile.',
    'You get two tries per equation. First-try answers score more.',
    'Advanced levels use two-step equations with brackets.',
  ],
  kidInstructions: ['Find the missing number.', 'Drag it into the box or tap it!'],
  timeLimit: (d) => Math.round(150 * d.time),
  component: DragMath,
}
