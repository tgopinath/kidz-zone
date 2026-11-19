import { Check, Eye, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { pick, sample, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { useLatest, useTimeout } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'
import { speedPoints, useGameClock } from './clock'

interface Sym {
  c: string
  name: string
}
const set = (s: string): Sym[] =>
  s.split('|').map((p) => {
    const [c, name] = p.split(':')
    return { c, name }
  })

const EASY = [
  set('🍎:apple|🚗:car|⭐:star|🐶:dog|🌙:moon|⚽:ball|🎈:balloon|🌸:flower|🔔:bell|🍕:pizza|🐟:fish|🚀:rocket'),
  set('❤️:heart|🔺:triangle|🔵:blue circle|🟩:green square|⭐:star|🔶:orange diamond|🟣:purple circle|🟨:yellow square'),
]
const MEDIUM = [
  set('♠:spade|♣:club|♥:heart|♦:diamond|★:star|☀:sun|☂:umbrella|♪:note|✿:flower|☯:yin yang'),
  set('▲:up triangle|▶:right triangle|▼:down triangle|◀:left triangle|■:square|●:circle|◆:diamond|★:star'),
  set('A:A|E:E|F:F|H:H|K:K|M:M|N:N|R:R|W:W|X:X|Y:Y|Z:Z'),
]
/** Look-alikes for high levels. */
const HARD = [
  set('↑:up arrow|↗:up-right arrow|→:right arrow|↘:down-right arrow|↓:down arrow|↙:down-left arrow|←:left arrow|↖:up-left arrow'),
  set('◐:left half circle|◑:right half circle|◒:bottom half circle|◓:top half circle|◔:quarter circle|◕:three-quarter circle'),
  set('b:b|d:d|p:p|q:q|6:6|9:9'),
  set('▲:filled up triangle|△:outline up triangle|▼:filled down triangle|▽:outline down triangle|▶:filled right triangle|▷:outline right triangle|◀:filled left triangle|◁:outline left triangle'),
  set('♠:spade|♤:outline spade|♣:club|♧:outline club|♥:heart|♡:outline heart|♦:diamond|♢:outline diamond'),
]

const ROUNDS = 15

function optionCount(d: number) {
  return d <= 4 ? 4 : d <= 8 ? 5 : 6
}

interface Q {
  target: Sym
  options: Sym[]
}
function makeQ(d: number, rng: Rng, prev?: string): Q {
  const n = optionCount(d)
  const groups = (d <= 3 ? EASY : d <= 7 ? MEDIUM : d <= 9 ? [...MEDIUM, ...HARD] : HARD).filter((g) => g.length >= n)
  const g = pick(groups, rng)
  let opts = sample(g, n, rng)
  let target = pick(opts, rng)
  if (target.c === prev) {
    opts = shuffle(opts, rng)
    target = opts.find((o) => o.c !== prev) ?? target
  }
  return { target, options: opts }
}

type Phase = 'show' | 'pick' | 'feedback'

function SymbolSpot({ diff, rng, paused, api }: GameProps) {
  const displayMs = Math.round(Math.max(250, 1500 - diff.d * 105) * diff.time)
  const [round, setRound] = useState(0)
  const [q, setQ] = useState(() => makeQ(diff.d, rng))
  const [phase, setPhase] = useState<Phase>('show')
  const [picked, setPicked] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const clock = useGameClock(paused)
  const t0 = useRef(0)
  const done = useRef(false)

  useEffect(() => api.progress(round, ROUNDS), [round, api])

  useEffect(() => {
    api.onHint(() => {
      const wrong = q.options.filter((o) => o.c !== q.target.c && !hidden.has(o.c))
      if (phase === 'pick' && wrong.length > 1) setHidden((h) => new Set(h).add(wrong[0].c))
      return phase === 'pick' ? 'One wrong symbol has been removed.' : 'Look closely at the direction and fill of the symbol before it disappears.'
    })
    return () => api.onHint(null)
  }, [api, q, hidden, phase])

  useTimeout(
    () => {
      t0.current = clock.now()
      setPhase('pick')
    },
    phase === 'show' ? displayMs : null,
    paused,
  )

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
    setQ(makeQ(diff.d, rng, q.target.c))
    setPicked(null)
    setHidden(new Set())
    setPhase('show')
  }
  useTimeout(next, phase === 'feedback' ? (picked === q.target.c ? 550 : 1100) : null, paused)

  const choose = (c: string) => {
    if (paused || phase !== 'pick') return
    const ms = Math.round(clock.now() - t0.current)
    api.reaction(ms)
    setPicked(c)
    setPhase('feedback')
    if (c === q.target.c) {
      play('correct')
      api.correct(speedPoints(diff.d, ms, 400, 2000 * diff.time))
    } else {
      play('wrong')
      api.wrong()
    }
  }
  const chooseRef = useLatest(choose)
  const optsRef = useLatest(q.options)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = Number(e.key)
      if (k >= 1 && k <= optsRef.current.length) chooseRef.current(optsRef.current[k - 1].c)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chooseRef, optsRef])

  const right = picked === q.target.c

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      <div className="bcard grid h-44 w-full max-w-xs place-items-center" aria-live="assertive">
        {phase === 'show' ? (
          <span className="font-display text-8xl leading-none" role="img" aria-label={`Remember: ${q.target.name}`}>
            {q.target.c}
          </span>
        ) : phase === 'pick' ? (
          <span className="flex flex-col items-center gap-2 text-muted">
            <Eye size={40} aria-hidden />
            <span className="font-bold">{diff.young ? 'Which one was it?' : 'Which symbol flashed?'}</span>
          </span>
        ) : (
          <span className={`flex flex-col items-center gap-1 font-bold ${right ? 'text-[#1d8a5c]' : 'text-[#c22d4b]'}`} role="status">
            {right ? <Check size={40} /> : <X size={40} />}
            {right ? 'Correct!' : `It was ${q.target.c}`}
          </span>
        )}
      </div>
      <div
        role="group"
        aria-label="Symbol choices"
        className="grid w-full gap-3"
        style={{ gridTemplateColumns: `repeat(${q.options.length <= 4 ? 4 : 3}, minmax(0,1fr))` }}
      >
        {q.options.map((o, i) => {
          const isAns = o.c === q.target.c
          const state = phase !== 'feedback' ? 'idle' : isAns ? 'right' : o.c === picked ? 'wrong' : 'dim'
          if (hidden.has(o.c) && phase === 'pick') return <div key={o.c} aria-hidden className="rounded-2xl border-2 border-dashed border-line" />
          return (
            <button
              key={o.c}
              type="button"
              disabled={phase !== 'pick'}
              onClick={() => choose(o.c)}
              aria-label={`${i + 1}: ${o.name}${state === 'right' ? ', correct answer' : state === 'wrong' ? ', wrong' : ''}`}
              className={`btile relative grid aspect-square place-items-center text-4xl sm:text-5xl ${phase === 'show' ? 'opacity-30' : ''} ${
                state === 'right' ? '!border-success bg-success/10' : ''
              } ${state === 'wrong' ? 'animate-shake !border-danger bg-danger/10' : ''} ${state === 'dim' ? 'opacity-50' : ''}`}
            >
              <span aria-hidden>{phase === 'show' ? '?' : o.c}</span>
              <span className="absolute bottom-1 left-2 text-xs text-muted" aria-hidden>
                {i + 1}
              </span>
              {state === 'right' && <Check className="absolute top-1.5 right-1.5 text-success" size={18} strokeWidth={3} aria-hidden />}
              {state === 'wrong' && <X className="absolute top-1.5 right-1.5 text-danger" size={18} strokeWidth={3} aria-hidden />}
            </button>
          )
        })}
      </div>
      <p className="text-sm text-muted">Tip: press number keys 1–{q.options.length} to answer.</p>
    </div>
  )
}

export const symbolSpot: GameDef = {
  id: 'symbol-spot',
  category: 'speed',
  skill: 'speed',
  title: 'Symbol Spot',
  emoji: '👁️',
  blurb: 'A symbol flashes – pick it out fast.',
  instructions: [
    'A symbol flashes briefly in the box.',
    'Then pick the same symbol from the choices as fast as you can.',
    'Number keys work too.',
    'Higher levels flash faster and use look-alike symbols.',
  ],
  kidInstructions: ['Look at the picture.', 'It will hide quickly!', 'Tap the same picture.'],
  timeLimit: (d) => Math.round(75 * d.time),
  component: SymbolSpot,
}
