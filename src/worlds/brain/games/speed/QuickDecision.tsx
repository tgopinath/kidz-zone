import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { pick, randInt, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { useInterval, useLatest, useTimeout } from '../shared/hooks'
import { Shape, type ShapeKind } from '../shared/Shape'
import type { GameDef, GameProps } from '../types'
import { speedPoints, useGameClock } from './clock'

interface Item {
  key: string
  label: ReactNode
  aria: string
}
interface Rule {
  id: string
  icon: string
  text: (young: boolean) => string
  minD: number
  gen: (yes: boolean, d: number, rng: Rng) => Item
}

const list = (s: string) => s.split(',').map((p) => p.trim().split(' ') as [string, string])
const FLY = list('🐦 bird,🦅 eagle,🦉 owl,🦋 butterfly,🐝 bee,🦆 duck,🦇 bat,🐞 ladybird,🦜 parrot,🕊️ dove,🪰 fly,🦢 swan')
const NO_FLY = list('🐶 dog,🐱 cat,🐘 elephant,🐢 turtle,🐟 fish,🐍 snake,🐄 cow,🦒 giraffe,🐌 snail,🦔 hedgehog,🐊 crocodile,🐸 frog')
const NO_FLY_TRICKY = list('🐧 penguin,🦤 dodo')
const FRUIT = list('🍎 apple,🍌 banana,🍇 grapes,🍓 strawberry,🍉 watermelon,🍒 cherries,🍑 peach,🍍 pineapple,🥝 kiwi,🍋 lemon,🍐 pear,🥭 mango')
const NOT_FRUIT = list('🥕 carrot,🥦 broccoli,🌽 corn,🍕 pizza,🍔 burger,🧀 cheese,🥨 pretzel,🍞 bread,🥚 egg,🥔 potato,🧅 onion,🍪 cookie')
const CORNERS: ShapeKind[] = ['square', 'triangle', 'diamond', 'star', 'hexagon', 'pentagon', 'cross', 'lshape', 'arrow']
const ROUND_SHAPES = [
  { id: 'circle', name: 'circle', el: <Shape kind="circle" size={110} color="#3898FF" /> },
  {
    id: 'oval-tall',
    name: 'tall oval',
    el: (
      <svg viewBox="0 0 100 100" width={110} height={110} aria-hidden>
        <ellipse cx="50" cy="50" rx="28" ry="44" fill="#35C98B" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'oval-wide',
    name: 'wide oval',
    el: (
      <svg viewBox="0 0 100 100" width={110} height={110} aria-hidden>
        <ellipse cx="50" cy="50" rx="44" ry="26" fill="#FF8A3D" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'ring',
    name: 'ring',
    el: (
      <svg viewBox="0 0 100 100" width={110} height={110} aria-hidden>
        <circle cx="50" cy="50" r="34" fill="none" stroke="#7557F6" strokeWidth="14" />
      </svg>
    ),
  },
]
const SHAPE_COLORS = ['#F0506E', '#3898FF', '#35C98B', '#7557F6', '#FF8A3D', '#19B5B0']

const big = (s: string) => <span className="text-7xl leading-none sm:text-8xl">{s}</span>

const RULES: Rule[] = [
  {
    id: 'even',
    icon: '🔢',
    minD: 1,
    text: (y) => (y ? 'Is the number EVEN? (2, 4, 6…)' : 'Is the number EVEN?'),
    gen: (yes, d, rng) => {
      const max = d <= 3 ? 20 : d <= 7 ? 99 : 999
      let n = randInt(1, max, rng)
      if ((n % 2 === 0) !== yes) n = n + 1 > max ? n - 1 : n + 1
      return { key: `n${n}`, label: <span className="font-display text-7xl font-bold sm:text-8xl">{n}</span>, aria: String(n) }
    },
  },
  {
    id: 'fly',
    icon: '🪽',
    minD: 1,
    text: (y) => (y ? 'Can this animal fly?' : 'Can this animal FLY?'),
    gen: (yes, d, rng) => {
      const pool = yes ? FLY : d >= 6 && rng() < 0.4 ? NO_FLY_TRICKY : NO_FLY
      const [e, name] = pick(pool, rng)
      return { key: `a${name}`, label: big(e), aria: name }
    },
  },
  {
    id: 'corners',
    icon: '📐',
    minD: 3,
    text: (y) => (y ? 'Does the shape have pointy corners?' : 'Does the shape have CORNERS?'),
    gen: (yes, _d, rng) => {
      if (yes) {
        const k = pick(CORNERS, rng)
        return { key: `s${k}`, label: <Shape kind={k} size={110} color={pick(SHAPE_COLORS, rng)} rotate={randInt(0, 3, rng) * 90} />, aria: k === 'lshape' ? 'L shape' : k }
      }
      const s = pick(ROUND_SHAPES, rng)
      return { key: `s${s.id}`, label: s.el, aria: s.name }
    },
  },
  {
    id: 'fruit',
    icon: '🍎',
    minD: 2,
    text: (y) => (y ? 'Is it a fruit?' : 'Is it a FRUIT?'),
    gen: (yes, _d, rng) => {
      const [e, name] = pick(yes ? FRUIT : NOT_FRUIT, rng)
      return { key: `f${name}`, label: big(e), aria: name }
    },
  },
  {
    id: 'vowel',
    icon: '🔤',
    minD: 8,
    text: () => 'Is the letter a VOWEL? (A E I O U)',
    gen: (yes, _d, rng) => {
      const l = yes ? pick([...'AEIOU'], rng) : pick([...'BCDFGHJKLMNPRSTVWXYZ'], rng)
      return { key: `l${l}`, label: <span className="font-display text-8xl font-bold">{l}</span>, aria: `letter ${l}` }
    },
  },
]

const ITEMS = 20

interface Q {
  rule: Rule
  item: Item
  yes: boolean
  changed: boolean
}

function rulesFor(d: number, young: boolean) {
  return RULES.filter((r) => r.minD <= d && !(young && r.id === 'vowel'))
}

function makeQ(d: number, young: boolean, rng: Rng, index: number, prev?: Q): Q {
  const rules = rulesFor(d, young)
  let rule = prev?.rule ?? pick(rules, rng)
  if (prev) {
    const switchNow = d >= 9 ? rng() < 0.35 : d >= 5 ? index % 5 === 0 : false
    if (switchNow) rule = pick(rules.filter((r) => r.id !== prev.rule.id), rng)
  }
  const yes = rng() < 0.5
  let item = rule.gen(yes, d, rng)
  for (let i = 0; i < 5 && prev && item.key === prev.item.key; i++) item = rule.gen(yes, d, rng)
  return { rule, item, yes, changed: !!prev && rule.id !== prev.rule.id }
}

type Phase = 'ask' | 'feedback'

function QuickDecision({ diff, rng, paused, api }: GameProps) {
  const windowMs = Math.round(Math.max(1100, 4200 - diff.d * 250) * diff.time)
  const [round, setRound] = useState(0)
  const [q, setQ] = useState(() => makeQ(diff.d, diff.young, rng, 0))
  const [phase, setPhase] = useState<Phase>('ask')
  const [result, setResult] = useState<'right' | 'wrong' | 'slow' | null>(null)
  const [frac, setFrac] = useState(1)
  const clock = useGameClock(paused)
  const t0 = useRef(clock.now())
  const itemWindow = useRef(windowMs)
  const done = useRef(false)

  useEffect(() => api.progress(round, ITEMS), [round, api])

  useEffect(() => {
    api.onHint(() => `The rule right now: “${q.rule.text(diff.young)}” Read the rule bcard whenever it flashes NEW.`)
    return () => api.onHint(null)
  }, [api, q, diff.young])

  const answer = (said: boolean | null) => {
    if (paused || phase !== 'ask') return
    const ms = Math.round(clock.now() - t0.current)
    setPhase('feedback')
    if (said === null) {
      api.reaction(itemWindow.current)
      play('wrong')
      api.wrong()
      setResult('slow')
      return
    }
    api.reaction(ms)
    if (said === q.yes) {
      play('correct')
      api.correct(speedPoints(diff.d, ms, 450, itemWindow.current))
      setResult('right')
    } else {
      play('wrong')
      api.wrong()
      setResult('wrong')
    }
  }
  const answerRef = useLatest(answer)

  // Per-item time window that freezes during pause.
  useEffect(() => {
    if (phase !== 'ask' || paused) return
    const remaining = Math.max(0, itemWindow.current - (clock.now() - t0.current))
    const id = window.setTimeout(() => answerRef.current(null), remaining)
    return () => window.clearTimeout(id)
  }, [phase, paused, round, clock, answerRef])

  useInterval(() => setFrac(Math.max(0, 1 - (clock.now() - t0.current) / itemWindow.current)), phase === 'ask' ? 80 : null, paused)

  const next = () => {
    const r = round + 1
    if (r >= ITEMS) {
      if (!done.current) {
        done.current = true
        api.progress(ITEMS, ITEMS)
        api.finish({ completed: true })
      }
      return
    }
    const nq = makeQ(diff.d, diff.young, rng, r, q)
    setRound(r)
    setQ(nq)
    setResult(null)
    setFrac(1)
    setPhase('ask')
    // Give a little extra time to read a brand-new rule.
    itemWindow.current = windowMs + (nq.changed ? 700 : 0)
    t0.current = clock.now()
  }
  useTimeout(next, phase === 'feedback' ? (result === 'right' ? 450 : 1000) : null, paused)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'y' || e.key === 'ArrowLeft') {
        e.preventDefault()
        answerRef.current(true)
      } else if (k === 'n' || e.key === 'ArrowRight') {
        e.preventDefault()
        answerRef.current(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answerRef])

  const fb =
    result === 'right'
      ? { cls: 'text-[#1d8a5c]', icon: <Check size={20} />, text: 'Correct!' }
      : result === 'slow'
        ? { cls: 'text-[#c22d4b]', icon: <X size={20} />, text: `Too slow! The answer was ${q.yes ? 'Yes' : 'No'}.` }
        : result === 'wrong'
          ? { cls: 'text-[#c22d4b]', icon: <X size={20} />, text: `Oops – the answer was ${q.yes ? 'Yes' : 'No'}.` }
          : null

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
      <div
        key={q.rule.id + (q.changed ? round : '')}
        className={`bcard flex w-full items-center gap-3 px-4 py-3 ${q.changed ? 'animate-pop ring-4 ring-accent' : ''}`}
        aria-live="polite"
      >
        <span className="text-3xl" aria-hidden>
          {q.rule.icon}
        </span>
        <span className="font-display text-lg font-semibold sm:text-xl">{q.rule.text(diff.young)}</span>
        {q.changed && <span className="bchip ml-auto bg-accent text-ink">NEW RULE</span>}
      </div>
      <div className="bcard relative grid h-52 w-full place-items-center overflow-hidden">
        <div role="img" aria-label={q.item.aria}>
          {q.item.label}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-2 bg-line" aria-hidden>
          <div className={`h-full ${frac < 0.3 ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${frac * 100}%` }} />
        </div>
      </div>
      <div className="h-7" aria-live="assertive">
        {fb && (
          <span className={`flex items-center gap-1 font-bold ${fb.cls}`}>
            {fb.icon}
            {fb.text}
          </span>
        )}
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => answer(true)}
          disabled={phase !== 'ask'}
          aria-label="Yes"
          className="btile flex min-h-20 items-center justify-center gap-2 text-2xl hover:!border-success"
        >
          <span className="grid size-10 place-items-center rounded-full bg-success text-white">
            <Check size={24} strokeWidth={3} />
          </span>
          Yes
        </button>
        <button
          type="button"
          onClick={() => answer(false)}
          disabled={phase !== 'ask'}
          aria-label="No"
          className="btile flex min-h-20 items-center justify-center gap-2 text-2xl hover:!border-danger"
        >
          <span className="grid size-10 place-items-center rounded-full bg-danger text-white">
            <X size={24} strokeWidth={3} />
          </span>
          No
        </button>
      </div>
      <p className="text-sm text-muted">Keys: Y or ← for Yes, N or → for No.</p>
    </div>
  )
}

export const quickDecision: GameDef = {
  id: 'quick-decision',
  category: 'speed',
  skill: 'speed',
  title: 'Quick Decision',
  emoji: '🚦',
  blurb: 'Yes or no? Follow the rule before time runs out.',
  instructions: [
    'A rule bcard tells you what to look for, e.g. "Is the number EVEN?".',
    'Answer Yes or No for each item before the bar runs out.',
    'Running out of time counts as a mistake.',
    'At higher levels the rule changes – watch for NEW RULE!',
  ],
  kidInstructions: ['Read the question.', 'Tap Yes or No – quickly!'],
  component: QuickDecision,
}
