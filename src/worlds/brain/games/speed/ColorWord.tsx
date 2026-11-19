import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sample, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { useLatest, useTimeout } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'
import { speedPoints, useGameClock } from './clock'

/** Ink colours tuned to stay readable on white. */
const COLORS = [
  { name: 'red', hex: '#E0324F' },
  { name: 'blue', hex: '#2F7FE0' },
  { name: 'green', hex: '#1FA971' },
  { name: 'yellow', hex: '#E0A800' },
  { name: 'purple', hex: '#6A45E8' },
  { name: 'orange', hex: '#F07420' },
] as const

const ROUNDS = 20

interface Q {
  word: number
  ink: number
  ask: 'ink' | 'word'
  options: number[]
}

function makeQ(d: number, rng: Rng, prev?: Q): Q {
  const nOpts = d <= 3 ? 3 : d <= 7 ? 4 : 6
  const conflictP = d <= 3 ? 0 : d <= 6 ? 0.5 : 0.8
  let ink = Math.floor(rng() * COLORS.length)
  if (prev && ink === prev.ink) ink = (ink + 1 + Math.floor(rng() * (COLORS.length - 1))) % COLORS.length
  let word = ink
  if (rng() < conflictP) word = (ink + 1 + Math.floor(rng() * (COLORS.length - 1))) % COLORS.length
  const ask: Q['ask'] = d >= 10 && rng() < 0.3 ? 'word' : 'ink'
  const others = [...Array(COLORS.length).keys()].filter((i) => i !== ink && i !== word)
  const options = shuffle([...new Set([ink, word]), ...sample(others, nOpts - (ink === word ? 1 : 2), rng)], rng)
  return { word, ink, ask, options }
}

type Phase = 'ask' | 'feedback'

function ColorWord({ diff, rng, paused, api }: GameProps) {
  const [round, setRound] = useState(0)
  const [q, setQ] = useState(() => makeQ(diff.d, rng))
  const [phase, setPhase] = useState<Phase>('ask')
  const [picked, setPicked] = useState<number | null>(null)
  const clock = useGameClock(paused)
  const t0 = useRef(clock.now())
  const done = useRef(false)
  const answer = q.ask === 'ink' ? q.ink : q.word

  useEffect(() => api.progress(round, ROUNDS), [round, api])

  useEffect(() => {
    api.onHint(() =>
      q.ask === 'ink'
        ? 'Ignore what the word says. Squint so you only see the colour of the letters.'
        : 'This time read the word itself and ignore its colour.',
    )
    return () => api.onHint(null)
  }, [api, q])

  const choose = (c: number) => {
    if (paused || phase !== 'ask') return
    const ms = Math.round(clock.now() - t0.current)
    api.reaction(ms)
    setPicked(c)
    setPhase('feedback')
    if (c === answer) {
      play('correct')
      api.correct(speedPoints(diff.d, ms, 500, 2200 * diff.time))
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
    setQ(makeQ(diff.d, rng, q))
    setPicked(null)
    setPhase('ask')
    t0.current = clock.now()
  }
  useTimeout(next, phase === 'feedback' ? (picked === answer ? 450 : 1000) : null, paused)

  const chooseRef = useLatest(choose)
  const optsRef = useLatest(q.options)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = Number(e.key)
      if (k >= 1 && k <= optsRef.current.length) chooseRef.current(optsRef.current[k - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chooseRef, optsRef])

  const askText =
    q.ask === 'ink'
      ? diff.young
        ? 'What colour are the letters?'
        : 'Tap the colour of the INK'
      : 'Tap the colour the WORD says'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      <div className="bcard flex w-full flex-col items-center gap-3 px-4 py-6">
        <span className={`bchip ${q.ask === 'word' ? 'bg-accent text-ink' : 'bg-primary-soft text-primary'} text-sm`}>{askText}</span>
        <span
          className="font-display text-6xl font-bold tracking-wide uppercase sm:text-7xl"
          style={{ color: COLORS[q.ink].hex, textShadow: '0 2px 0 rgba(0,0,0,0.08)' }}
          role="img"
          aria-label={`The word ${COLORS[q.word].name} written in ${COLORS[q.ink].name} ink`}
        >
          {COLORS[q.word].name}
        </span>
        <div className="h-7" aria-live="polite">
          {phase === 'feedback' && (
            <span className={`flex items-center gap-1 font-bold ${picked === answer ? 'text-[#1d8a5c]' : 'text-[#c22d4b]'}`}>
              {picked === answer ? <Check size={18} /> : <X size={18} />}
              {picked === answer ? 'Correct!' : `It was ${COLORS[answer].name}`}
            </span>
          )}
        </div>
      </div>
      <div role="group" aria-label="Colour choices" className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {q.options.map((c, i) => {
          const state = phase !== 'feedback' ? 'idle' : c === answer ? 'right' : c === picked ? 'wrong' : 'dim'
          return (
            <button
              key={c}
              type="button"
              onClick={() => choose(c)}
              disabled={phase !== 'ask'}
              aria-label={`${i + 1}: ${COLORS[c].name}${state === 'right' ? ', correct answer' : state === 'wrong' ? ', wrong' : ''}`}
              className={`btile relative flex min-h-16 items-center justify-center gap-3 px-3 text-lg ${state === 'right' ? '!border-success bg-success/10' : ''} ${
                state === 'wrong' ? 'animate-shake !border-danger bg-danger/10' : ''
              } ${state === 'dim' ? 'opacity-50' : ''}`}
            >
              <span aria-hidden className="size-8 shrink-0 rounded-full border-2 border-black/10" style={{ background: COLORS[c].hex }} />
              <span className="capitalize">{COLORS[c].name}</span>
              <span aria-hidden className="absolute top-1 left-2 text-xs text-muted">
                {i + 1}
              </span>
              {state === 'right' && <Check className="absolute top-1.5 right-1.5 text-success" size={18} strokeWidth={3} aria-hidden />}
              {state === 'wrong' && <X className="absolute top-1.5 right-1.5 text-danger" size={18} strokeWidth={3} aria-hidden />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const colorWord: GameDef = {
  id: 'color-word',
  category: 'speed',
  skill: 'speed',
  title: 'Colour Words',
  emoji: '🎨',
  blurb: 'Name the ink colour, not the word.',
  instructions: [
    'A colour word appears, printed in a coloured ink.',
    'Tap the colour of the INK, not what the word says.',
    'At higher levels the word and ink disagree – and sometimes you must read the word instead. Watch the label!',
    'Number keys 1–6 also work.',
  ],
  kidInstructions: ['Look at the colour of the letters.', 'Tap that colour!'],
  timeLimit: (d) => Math.round(70 * d.time),
  component: ColorWord,
}
