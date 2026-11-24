import { AnimatePresence, motion } from 'framer-motion'
import { Check, Delete, Flag, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { useInterval, useLatest, useTimeout } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'

const RACES = 5
/** How far the pace runner moves per race (it finishes 3 of 5). */
const PACE = 0.6

type Op = '+' | '−' | '×' | '÷'
interface Step {
  op: Op
  n: number
}
interface Chain {
  start: number
  steps: Step[]
  values: number[]
}

function apply(v: number, s: Step) {
  return s.op === '+' ? v + s.n : s.op === '−' ? v - s.n : s.op === '×' ? v * s.n : v / s.n
}

function makeChain(diff: Difficulty, rng: Rng): Chain {
  const d = diff.d
  const len = Math.min(8, 2 + Math.floor(d / 2))
  const cap = diff.young ? 20 : d <= 3 ? 30 : d <= 7 ? 100 : 400
  const addMax = diff.young ? 5 : d <= 3 ? 9 : d <= 7 ? 20 : 40
  const ops: Op[] = d <= 3 ? ['+', '−'] : d <= 7 ? ['+', '−', '+', '×'] : ['+', '−', '×', '÷']
  const start = randInt(1, diff.young ? 9 : d <= 7 ? 15 : 30, rng)
  const steps: Step[] = []
  const values = [start]
  let cur = start
  while (steps.length < len) {
    const op = pick(ops, rng)
    let s: Step | null = null
    if (op === '+' && cur + 1 <= cap) s = { op, n: randInt(1, Math.min(addMax, cap - cur), rng) }
    else if (op === '−' && cur >= 2) s = { op, n: randInt(1, Math.min(addMax, cur - 1), rng) }
    else if (op === '×' && cur >= 2 && cur * 2 <= cap) {
      const maxF = Math.min(d >= 10 ? 5 : 3, Math.floor(cap / cur))
      s = { op, n: randInt(2, maxF, rng) }
    } else if (op === '÷') {
      const divs = [2, 3, 4, 5].filter((k) => cur % k === 0 && cur / k >= 1)
      if (divs.length) s = { op, n: pick(divs, rng) }
    }
    if (!s) continue
    cur = apply(cur, s)
    steps.push(s)
    values.push(cur)
  }
  return { start, steps, values }
}

/** Mouse/touch presses shouldn't steal focus, so physical Enter still submits. */
const noFocus = (e: React.MouseEvent) => e.preventDefault()

const SPOKEN: Record<Op, string> = { '+': 'add', '−': 'subtract', '×': 'times', '÷': 'divide by' }

function ArithmeticRace({ diff, rng, paused, api }: GameProps) {
  const [race, setRace] = useState(0)
  const [chain, setChain] = useState<Chain>(() => makeChain(diff, rng))
  const [shown, setShown] = useState(0) // 0 = start number, i = step i
  const [phase, setPhase] = useState<'show' | 'answer' | 'right' | 'wrong'>('show')
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const answerStart = useRef(0)
  const finished = useRef(false)
  const stepMs = Math.max(800, Math.round((2300 - diff.d * 110) * diff.time))
  const answer = chain.values[chain.values.length - 1]
  const pace = Math.min(RACES, (race + (phase === 'right' || phase === 'wrong' ? 1 : 0)) * PACE)

  useEffect(() => api.progress(race, RACES), [race, api])

  useEffect(() => {
    api.onHint(() => {
      if (phase === 'show') return 'Keep a running total in your head after every step.'
      if (phase === 'answer') {
        const mid = Math.floor(chain.steps.length / 2)
        return `Halfway through (after step ${mid}) the total was ${chain.values[mid]}.`
      }
      return 'The next race is coming.'
    })
    return () => api.onHint(null)
  }, [phase, chain, api])

  useInterval(
    () => {
      if (shown < chain.steps.length) {
        setShown((s) => s + 1)
        play('tick')
      } else {
        setPhase('answer')
        answerStart.current = performance.now()
      }
    },
    phase === 'show' ? stepMs : null,
    paused,
  )

  const submit = () => {
    if (paused || phase !== 'answer' || input === '') return
    const ms = performance.now() - answerStart.current
    if (Number(input) === answer) {
      play('correct')
      api.reaction(ms)
      const bonus = Math.max(0, Math.round(5 * diff.d * (1 - ms / (6000 * diff.time))))
      api.correct(15 * diff.d + bonus)
      setScore((s) => s + 1)
      setPhase('right')
    } else {
      play('wrong')
      api.wrong()
      setPhase('wrong')
    }
  }

  const next = () => {
    if (phase !== 'right' && phase !== 'wrong') return
    const n = race + 1
    if (n >= RACES) {
      if (!finished.current) {
        finished.current = true
        play(score > RACES * PACE ? 'win' : 'tap')
        api.progress(RACES, RACES)
        api.finish({ completed: true })
      }
      return
    }
    setRace(n)
    setChain(makeChain(diff, rng))
    setShown(0)
    setInput('')
    setPhase('show')
  }

  useTimeout(next, phase === 'right' ? 1600 : phase === 'wrong' ? 2600 : null, paused)

  const press = (k: string) => {
    if (paused) return
    if (phase === 'right' || phase === 'wrong') {
      if (k === 'Enter') next()
      return
    }
    if (phase !== 'answer') return
    if (k === 'Enter') return submit()
    if (k === 'Backspace') return setInput((s) => s.slice(0, -1))
    if (/^\d$/.test(k)) {
      play('tap')
      setInput((s) => (s.length >= 5 ? s : s === '0' ? k : s + k))
    }
  }
  const pressRef = useLatest(press)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Backspace' || /^\d$/.test(e.key)) {
        const target = e.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
        // Let Enter on a focused button do its own thing.
        if (e.key === 'Enter' && target?.tagName === 'BUTTON') return
        e.preventDefault()
        pressRef.current(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pressRef])

  const token = shown === 0 ? `Start with ${chain.start}` : `${chain.steps[shown - 1].op} ${chain.steps[shown - 1].n}`
  const spoken = shown === 0 ? `Start with ${chain.start}` : `${SPOKEN[chain.steps[shown - 1].op]} ${chain.steps[shown - 1].n}`
  const working = chain.steps.map((s, i) => `${chain.values[i]} ${s.op} ${s.n} = ${chain.values[i + 1]}`)

  const lane = (who: string, emoji: string, pos: number, color: string) => (
    <div className="flex items-center gap-2">
      <span className="w-12 text-right text-xs font-bold text-muted">{who}</span>
      <div className="relative h-10 flex-1 rounded-full bg-line/60">
        {Array.from({ length: RACES - 1 }, (_, i) => (
          <span key={i} className="absolute top-1 bottom-1 w-px bg-white" style={{ left: `${((i + 1) / RACES) * 100}%` }} />
        ))}
        <span className="absolute top-1/2 right-1 -translate-y-1/2 text-muted" aria-hidden>
          <Flag size={16} />
        </span>
        <motion.span
          className={`absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-xl ${color}`}
          animate={{ left: `calc(${(pos / RACES) * 100}% - ${(pos / RACES) * 36}px)` }}
          transition={{ type: 'spring', stiffness: 90, damping: 15 }}
          aria-hidden
        >
          {emoji}
        </motion.span>
      </div>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="bcard flex flex-col gap-2 px-4 py-3" role="img" aria-label={`Race track: you have ${score} of ${RACES}, the pace runner is at ${pace.toFixed(1)}.`}>
        {lane('You', '🏃', score, 'bg-primary text-white')}
        {lane('Pace', diff.young ? '🐢' : '🤖', pace, 'bg-accent')}
      </div>

      <div className="bcard relative grid min-h-44 place-items-center px-4 py-6 text-center">
        <span className="absolute top-3 left-4 text-xs font-bold text-muted">
          Race {race + 1} of {RACES}
        </span>
        {phase === 'show' && (
          <>
            <span className="sr-only" aria-live="assertive">
              {spoken}
            </span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={`${race}-${shown}`}
                initial={{ opacity: 0, scale: 0.6, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                aria-hidden
                className={`font-display font-bold text-primary ${shown === 0 ? 'text-3xl sm:text-4xl' : 'text-6xl sm:text-7xl'}`}
              >
                {token}
              </motion.span>
            </AnimatePresence>
            <div className="absolute bottom-3 flex gap-1.5" aria-hidden>
              {Array.from({ length: chain.steps.length + 1 }, (_, i) => (
                <span key={i} className={`size-2 rounded-full ${i <= shown ? 'bg-primary' : 'bg-line'}`} />
              ))}
            </div>
          </>
        )}
        {phase !== 'show' && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-bold text-muted">{phase === 'answer' ? 'What is the answer?' : 'Your answer'}</span>
            <span
              aria-live="polite"
              aria-label={`Your answer: ${input || 'empty'}`}
              className={`min-w-32 rounded-2xl border-4 px-4 py-2 font-display text-5xl font-bold ${
                phase === 'right' ? 'border-success bg-success/10' : phase === 'wrong' ? 'border-danger bg-danger/10' : 'border-primary bg-primary-soft'
              }`}
            >
              {input || <span className="text-primary/40">?</span>}
            </span>
          </div>
        )}
      </div>

      <div role="status" aria-live="polite">
        {phase === 'right' && (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-success/12 px-4 py-3 font-bold text-[#1d8a5c]">
            <Check size={20} /> Correct! Your runner moves ahead.
          </p>
        )}
        {phase === 'wrong' && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-center">
            <p className="flex items-center gap-2 font-bold text-[#c22d4b]">
              <X size={20} /> Not quite – the answer was {answer}.
            </p>
            <p className="text-sm font-semibold text-ink">
              Start {chain.start}: {working.join(' → ')}
            </p>
          </div>
        )}
      </div>

      {phase === 'answer' && (
        <div role="group" aria-label="Number keypad" className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
            <button key={k} type="button" onMouseDown={noFocus} className="btile h-14 text-2xl" onClick={() => press(k)} aria-label={k}>
              {k}
            </button>
          ))}
          <button type="button" onMouseDown={noFocus} className="btile grid h-14 place-items-center" onClick={() => press('Backspace')} aria-label="Delete last digit">
            <Delete size={24} />
          </button>
          <button type="button" onMouseDown={noFocus} className="btile h-14 text-2xl" onClick={() => press('0')} aria-label="0">
            0
          </button>
          <button type="button" onMouseDown={noFocus} className="bbtn-primary h-14 !px-2" onClick={() => press('Enter')} disabled={input === ''} aria-label="Submit answer">
            <Check size={24} />
          </button>
        </div>
      )}

      {phase === 'wrong' && <p className="text-center text-xl font-bold text-muted" role="status">Next race coming…</p>}
      {phase === 'show' && <p className="text-center text-sm text-muted">Watch each step and keep the total in your head…</p>}
    </div>
  )
}

export const arithmeticRace: GameDef = {
  id: 'arithmetic-race',
  category: 'number',
  skill: 'logic',
  title: 'Arithmetic Race',
  emoji: '🏁',
  blurb: 'Follow a fast chain of sums in your head and race the pace runner.',
  instructions: [
    'A starting number appears, then one operation at a time.',
    'Keep a running total in your head – earlier steps disappear.',
    'Type the final answer on the keypad (or your keyboard) and press ✓ or Enter.',
    'Each correct race moves your runner ahead. Beat the pace runner over 5 races!',
  ],
  kidInstructions: ['Watch the numbers.', 'Add and take away in your head.', 'Type the answer to make your runner go!'],
  component: ArithmeticRace,
}
