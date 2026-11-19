import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { randInt, sample, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { useLatest, useTimeout } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'
import { speedPoints, useGameClock } from './clock'

const ROUNDS = 20

interface Dot {
  x: number
  y: number
  r: number
}
interface Side {
  value: number
  dots?: Dot[]
  font?: number
}
interface Q {
  mode: 'dots' | 'numbers'
  left: Side
  right: Side
}

function rangeFor(d: number, mode: Q['mode']) {
  if (mode === 'dots') return d <= 2 ? 6 : d <= 5 ? 10 : d <= 8 ? 15 : 20
  return d <= 2 ? 9 : d <= 4 ? 20 : d <= 6 ? 50 : d <= 9 ? 99 : 999
}

function gapFor(d: number, max: number) {
  if (d <= 2) return 2
  if (d <= 5) return Math.max(1, Math.round(max * 0.15))
  if (d <= 8) return Math.max(1, Math.round(max * 0.06))
  return 1
}

function makeDots(n: number, d: number, rng: Rng): Dot[] {
  const grid = 6
  const cells = sample([...Array(grid * grid).keys()], n, rng)
  const step = 100 / grid
  return cells.map((c) => {
    const r = d >= 8 ? 3 + rng() * 3.5 : 5
    return {
      x: (c % grid) * step + step / 2 + (rng() - 0.5) * (step - 2 * r - 1),
      y: Math.floor(c / grid) * step + step / 2 + (rng() - 0.5) * (step - 2 * r - 1),
      r,
    }
  })
}

function makeQ(d: number, rng: Rng): Q {
  const mode: Q['mode'] = d <= 3 ? 'dots' : d <= 7 ? (rng() < 0.5 ? 'dots' : 'numbers') : rng() < 0.4 ? 'dots' : 'numbers'
  const max = rangeFor(d, mode)
  const gap = gapFor(d, max)
  const min = mode === 'dots' ? 1 : d >= 10 ? 100 : 1
  const small = randInt(min, max - gap, rng)
  const big = randInt(small + gap, Math.min(max, small + gap + Math.max(1, Math.round(max * (d <= 5 ? 0.4 : 0.1)))), rng)
  const leftBig = rng() < 0.5
  const a = leftBig ? big : small
  const b = leftBig ? small : big
  const side = (v: number, other: number): Side => {
    if (mode === 'dots') return { value: v, dots: makeDots(v, d, rng) }
    // At high levels the smaller number is printed bigger, to trick the eye.
    const font = d >= 9 ? (v < other ? 1.25 : 0.8) : 1
    return { value: v, font }
  }
  return { mode, left: side(a, b), right: side(b, a) }
}

type Phase = 'ask' | 'feedback'

function FastCompare({ diff, rng, paused, api }: GameProps) {
  const [round, setRound] = useState(0)
  const [q, setQ] = useState(() => makeQ(diff.d, rng))
  const [phase, setPhase] = useState<Phase>('ask')
  const [picked, setPicked] = useState<'left' | 'right' | null>(null)
  const clock = useGameClock(paused)
  const t0 = useRef(clock.now())
  const done = useRef(false)
  const answer: 'left' | 'right' = q.left.value > q.right.value ? 'left' : 'right'

  useEffect(() => api.progress(round, ROUNDS), [round, api])

  useEffect(() => {
    api.onHint(() =>
      q.mode === 'dots'
        ? 'Don’t count every dot – look at which box feels fuller. Dot size does not matter.'
        : 'Compare the number of digits first, then the first digit. Ignore how big the numbers are printed.',
    )
    return () => api.onHint(null)
  }, [api, q])

  const choose = (s: 'left' | 'right') => {
    if (paused || phase !== 'ask') return
    const ms = Math.round(clock.now() - t0.current)
    api.reaction(ms)
    setPicked(s)
    setPhase('feedback')
    if (s === answer) {
      play('correct')
      api.correct(speedPoints(diff.d, ms, 350, 1800 * diff.time))
    } else {
      play('wrong')
      api.wrong()
    }
  }

  const next = () => {
    const r = round + 1
    if (r >= ROUNDS) {
      if (!done.current) {
        done.current = true
        api.progress(ROUNDS, ROUNDS)
        api.finish({ completed: true })
      }
      return
    }
    setRound(r)
    setQ(makeQ(diff.d, rng))
    setPicked(null)
    setPhase('ask')
    t0.current = clock.now()
  }
  useTimeout(next, phase === 'feedback' ? (picked === answer ? 400 : 900) : null, paused)

  const chooseRef = useLatest(choose)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        chooseRef.current('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        chooseRef.current('right')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chooseRef])

  const renderSide = (s: 'left' | 'right') => {
    const side = q[s]
    const state = phase !== 'feedback' ? 'idle' : s === answer ? 'right' : s === picked ? 'wrong' : 'dim'
    const desc = q.mode === 'dots' ? `${side.value} dots` : String(side.value)
    return (
      <button
        type="button"
        onClick={() => choose(s)}
        disabled={phase !== 'ask'}
        aria-label={`${s === 'left' ? 'Left' : 'Right'} side: ${desc}${state === 'right' ? ', the bigger one' : state === 'wrong' ? ', wrong' : ''}`}
        className={`btile relative grid aspect-square w-full place-items-center p-3 ${state === 'right' ? '!border-success bg-success/10' : ''} ${
          state === 'wrong' ? 'animate-shake !border-danger bg-danger/10' : ''
        } ${state === 'dim' ? 'opacity-60' : ''}`}
      >
        {q.mode === 'dots' ? (
          <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
            {side.dots!.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={s === 'left' ? '#7557F6' : '#3898FF'} />
            ))}
          </svg>
        ) : (
          <span aria-hidden className="font-display font-bold" style={{ fontSize: `${(side.font ?? 1) * (side.value >= 100 ? 3.2 : 4.2)}rem` }}>
            {side.value}
          </span>
        )}
        <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 text-xs font-bold text-muted" aria-hidden>
          {s === 'left' ? <ArrowLeft size={14} /> : null}
          {s === 'left' ? 'Left' : 'Right'}
          {s === 'right' ? <ArrowRight size={14} /> : null}
        </span>
        {state === 'right' && (
          <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-success text-white">
            <Check size={16} strokeWidth={3} />
          </span>
        )}
        {state === 'wrong' && (
          <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-danger text-white">
            <X size={16} strokeWidth={3} />
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
      <p className="text-center font-display text-xl font-semibold" aria-live="polite">
        {q.mode === 'dots' ? (diff.young ? 'Which side has more dots?' : 'Which side has MORE dots?') : 'Which number is BIGGER?'}
      </p>
      <div className="grid w-full grid-cols-2 gap-3 sm:gap-5">
        {renderSide('left')}
        {renderSide('right')}
      </div>
      <p className="text-sm text-muted">Tap a side, or press ← / →.</p>
    </div>
  )
}

export const fastCompare: GameDef = {
  id: 'fast-compare',
  category: 'speed',
  skill: 'speed',
  title: 'Fast Compare',
  emoji: '⚖️',
  blurb: 'Which side has more? Decide in a flash.',
  instructions: [
    'Two groups of dots or two numbers appear.',
    'Tap the side with more (or press ← / →).',
    'Be quick – faster answers score more.',
    'Higher levels use closer values and tricky sizes.',
  ],
  kidInstructions: ['Look at both sides.', 'Tap the side with more!'],
  timeLimit: (d) => Math.round(60 * d.time),
  component: FastCompare,
}
