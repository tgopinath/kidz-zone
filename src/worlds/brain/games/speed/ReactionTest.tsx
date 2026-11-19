import { Hourglass, Zap, X, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { randInt, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { useLatest, useTimeout } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'
import { speedPoints, useGameClock } from './clock'

type Phase = 'wait' | 'go' | 'early' | 'result'

function trialsFor(d: number) {
  if (d <= 4) return 5
  if (d <= 8) return 6
  return 7
}

function delayFor(d: number, rng: Rng) {
  return randInt(1000, 2800 + d * 180, rng)
}

function ReactionTest({ diff, rng, paused, api }: GameProps) {
  const total = trialsFor(diff.d)
  const [trial, setTrial] = useState(0)
  const [phase, setPhase] = useState<Phase>('wait')
  const [delay, setDelay] = useState(() => delayFor(diff.d, rng))
  const [last, setLast] = useState<number | null>(null)
  const [times, setTimes] = useState<number[]>([])
  const clock = useGameClock(paused)
  const goAt = useRef(0)
  const done = useRef(false)

  useEffect(() => api.progress(trial, total), [trial, total, api])

  useEffect(() => {
    api.onHint(() => 'Keep your finger ready, but wait until the pad turns into the green star that says TAP!')
    return () => api.onHint(null)
  }, [api])

  useTimeout(
    () => {
      goAt.current = clock.now()
      setPhase('go')
      play('tick')
    },
    phase === 'wait' ? delay : null,
    paused,
  )

  const advance = () => {
    const t = trial + 1
    if (t >= total) {
      if (!done.current) {
        done.current = true
        api.progress(total, total)
        api.finish({ completed: true })
      }
      return
    }
    setTrial(t)
    setDelay(delayFor(diff.d, rng))
    setPhase('wait')
  }
  useTimeout(advance, phase === 'early' || phase === 'result' ? 1200 : null, paused)

  const tap = () => {
    if (paused) return
    if (phase === 'wait') {
      play('wrong')
      api.wrong()
      setPhase('early')
    } else if (phase === 'go') {
      const ms = Math.round(clock.now() - goAt.current)
      if (ms < 100) {
        // Faster than humanly possible: it was a guess.
        play('wrong')
        api.wrong()
        setPhase('early')
        return
      }
      api.reaction(ms)
      api.correct(speedPoints(diff.d, ms, 220, 700 * diff.time))
      play('correct')
      setLast(ms)
      setTimes((t) => [...t, ms])
      setPhase('result')
    }
  }
  const tapRef = useLatest(tap)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Leave keyboard activation of real buttons (pause, hint…) alone.
      if ((e.target as HTMLElement | null)?.closest?.('button, a, input, textarea, select')) return
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        if (!e.repeat) tapRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tapRef])

  const best = times.length ? Math.min(...times) : null
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null

  const look = {
    wait: { cls: 'bg-[#ffe9b8] border-accent rounded-full', icon: <Hourglass size={56} aria-hidden />, text: 'Wait…', sub: diff.young ? 'Not yet!' : 'Wait for the green star' },
    go: { cls: 'bg-success border-[#1d8a5c] text-white rounded-[2.5rem] scale-105', icon: <Zap size={72} aria-hidden fill="currentColor" />, text: 'TAP!', sub: 'Now!' },
    early: { cls: 'bg-danger/15 border-danger rounded-3xl', icon: <X size={56} aria-hidden />, text: 'Too soon!', sub: 'Wait for the star next time' },
    result: { cls: 'bg-primary-soft border-primary rounded-3xl', icon: <Check size={56} aria-hidden />, text: `${last ?? 0} ms`, sub: last !== null && last < 300 ? 'Lightning fast!' : 'Nice!' },
  }[phase]

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2 text-sm font-bold">
        <span className="bchip bg-white text-ink">
          Try {Math.min(trial + 1, total)} of {total}
        </span>
        {best !== null && <span className="bchip bg-white text-ink">Best: {best} ms</span>}
        {avg !== null && <span className="bchip bg-white text-ink">Average: {avg} ms</span>}
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Reaction pad: ${look.text}. Tap or press Space when it says TAP.`}
        onPointerDown={(e) => {
          e.preventDefault()
          tap()
        }}
        className={`relative flex aspect-square w-full max-w-sm cursor-pointer touch-none flex-col items-center justify-center gap-3 border-4 font-display shadow-soft transition-all duration-150 select-none ${look.cls}`}
      >
        {phase === 'go' && (
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 m-auto size-[92%] opacity-25" aria-hidden>
            <path d="M50 4l13.5 29 31.5 3.7-23.3 21.6 6.2 31.2L50 74 22.1 89.5l6.2-31.2L5 36.7l31.5-3.7Z" fill="#fff" />
          </svg>
        )}
        {look.icon}
        <span className="text-4xl font-bold sm:text-5xl" aria-live="assertive">
          {look.text}
        </span>
        <span className="text-base font-semibold opacity-80">{look.sub}</span>
      </div>
      <p className="text-center text-sm text-muted">Tap the pad, or press Space.</p>
    </div>
  )
}

export const reactionTest: GameDef = {
  id: 'reaction-test',
  category: 'speed',
  skill: 'speed',
  title: 'Reaction Test',
  emoji: '⚡',
  blurb: 'Wait for green, then tap as fast as you can.',
  instructions: [
    'The pad shows "Wait…" in a round yellow shape.',
    'When it turns into a green square with a star and "TAP!", tap it (or press Space) immediately.',
    'Tapping too early counts as a mistake.',
    'Faster reactions earn more points.',
  ],
  kidInstructions: ['Wait for the green star.', 'Then tap as fast as you can!', 'Do not tap too early.'],
  component: ReactionTest,
}
