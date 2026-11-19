import type { ReactNode } from 'react'
import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, shuffle } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { createQuizGame } from '../shared/QuizEngine'
import type { QuizQuestion } from '../shared/QuizEngine'
import { PALETTE, Shape } from '../shared/Shape'
import type { ShapeKind } from '../shared/Shape'
import type { GameDef } from '../types'

const POLY_NAMES: Record<number, string> = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' }

/** Regular polygon with n sides (flat bottom). */
function Polygon({ n, color, size = 48 }: { n: number; color: string; size?: number }) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n + (n % 2 === 0 ? Math.PI / n : 0)
    return `${(50 + 42 * Math.cos(a)).toFixed(1)},${(52 + 42 * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <polygon points={pts} fill={color} stroke="rgba(0,0,0,0.12)" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}

/** A frame in the sequence: rendered node + key + spoken description. */
interface Frame {
  id: string
  node: (big: boolean) => ReactNode
  aria: string
}

interface Built {
  frames: Frame[]
  answer: Frame
  distractors: Frame[]
  rule: string
  hint: string
  key: string
}

function sizeFrame(kind: ShapeKind, color: string, cname: string, pct: number): Frame {
  return {
    id: `s${pct}`,
    node: (big) => (
      <span className="grid place-items-center" style={{ width: big ? 72 : 56, height: big ? 72 : 56 }}>
        <Shape kind={kind} color={color} size={`${pct}%`} />
      </span>
    ),
    aria: `${pct >= 85 ? 'very large' : pct >= 65 ? 'large' : pct >= 45 ? 'medium' : 'small'} ${cname} ${kind}, size ${pct}`,
  }
}

function growPattern(d: number, rng: Rng): Built {
  const kind = pick<ShapeKind>(['circle', 'square', 'star', 'heart', 'diamond', 'triangle'], rng)
  const c = pick(PALETTE, rng)
  const step = d <= 3 ? 16 : d <= 6 ? 13 : 10
  const shrink = d >= 5 && rng() < 0.4
  const start = shrink ? 100 - randInt(0, 4, rng) * 2 : 22 + randInt(0, 4, rng) * 2
  const vals = Array.from({ length: 5 }, (_, i) => start + (shrink ? -1 : 1) * i * step)
  const frames = vals.slice(0, 4).map((v) => sizeFrame(kind, c.hex, c.name, v))
  const answer = sizeFrame(kind, c.hex, c.name, vals[4])
  const wrongVals = [vals[3], vals[4] + (shrink ? -1 : 1) * step, vals[2]].filter((v) => v > 8 && v <= 110)
  return {
    frames,
    answer,
    distractors: wrongVals.map((v) => sizeFrame(kind, c.hex, c.name, v)),
    rule: `The ${kind} gets ${shrink ? 'smaller' : 'bigger'} by the same amount each time.`,
    hint: `Is it growing or shrinking? Keep the same step.`,
    key: `grow${kind}${start}${step}${shrink}`,
  }
}

function polyFrame(n: number, color: string): Frame {
  return {
    id: `p${n}${color}`,
    node: (big) => <Polygon n={n} color={color} size={big ? 64 : 52} />,
    aria: `${POLY_NAMES[n] ?? `${n}-sided shape`} with ${n} sides`,
  }
}

function sidesPattern(d: number, rng: Rng): Built {
  const step = d >= 8 && rng() < 0.5 ? 2 : 1
  const startMax = 10 - step * 4
  const start = randInt(3, Math.max(3, Math.min(d <= 3 ? 3 : 5, startMax)), rng)
  const ns = Array.from({ length: 5 }, (_, i) => start + i * step)
  // At higher d the colour also alternates between two colours.
  const alt = d >= 6
  const cols = shuffle(PALETTE, rng).slice(0, 2)
  const colorAt = (i: number) => (alt ? cols[i % 2] : cols[0])
  const frames = ns.slice(0, 4).map((n, i) => {
    const f = polyFrame(n, colorAt(i).hex)
    return alt ? { ...f, aria: `${colorAt(i).name} ${f.aria}` } : f
  })
  const mk = (n: number, i: number) => {
    const f = polyFrame(n, colorAt(i).hex)
    return alt ? { ...f, aria: `${colorAt(i).name} ${f.aria}` } : f
  }
  const answer = mk(ns[4], 4)
  const distractors = [mk(ns[3], 4), mk(ns[4] + step, 4), alt ? mk(ns[4], 5) : mk(ns[2], 4)]
  return {
    frames,
    answer,
    distractors,
    rule: `Each shape has ${step} more side${step > 1 ? 's' : ''} than the one before${alt ? ', and the colours take turns' : ''}.`,
    hint: 'Count the sides (corners) of each shape.',
    key: `sides${start}${step}${alt}${cols[0].name}`,
  }
}

function countFrame(kind: ShapeKind, color: string, cname: string, n: number): Frame {
  return {
    id: `c${n}`,
    node: (big) => (
      <span className="flex flex-wrap items-center justify-center gap-0.5" style={{ width: big ? 80 : 60 }}>
        {Array.from({ length: n }, (_, i) => (
          <Shape key={i} kind={kind} color={color} size={n > 6 ? (big ? 18 : 14) : n > 3 ? (big ? 24 : 18) : big ? 30 : 24} />
        ))}
      </span>
    ),
    aria: `${n} ${cname} ${kind}${n === 1 ? '' : 's'}`,
  }
}

function countPattern(d: number, rng: Rng): Built {
  const kind = pick<ShapeKind>(['star', 'circle', 'heart', 'triangle', 'square'], rng)
  const c = pick(PALETTE, rng)
  const step = d <= 3 ? 1 : d <= 7 ? pick([1, 2], rng) : pick([2, 3], rng)
  const down = d >= 6 && rng() < 0.35
  const start = down ? 4 * step + randInt(1, 2, rng) : randInt(1, d <= 3 ? 1 : 2, rng)
  const vals = Array.from({ length: 5 }, (_, i) => start + (down ? -1 : 1) * i * step)
  const frames = vals.slice(0, 4).map((v) => countFrame(kind, c.hex, c.name, v))
  const answer = countFrame(kind, c.hex, c.name, vals[4])
  const cand = [vals[4] + 1, vals[4] - 1, vals[3], vals[4] + step, vals[4] + 2].filter((v) => v >= 1 && v <= 14 && v !== vals[4])
  const uniq = [...new Set(cand)].slice(0, 3)
  return {
    frames,
    answer,
    distractors: uniq.map((v) => countFrame(kind, c.hex, c.name, v)),
    rule: `The number of ${kind}s ${down ? 'goes down' : 'goes up'} by ${step} each time: ${vals.join(', ')}.`,
    hint: `Count the ${kind}s in each box.`,
    key: `count${kind}${start}${step}${down}`,
  }
}

function gen(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const types = d <= 2 ? [countPattern, growPattern] : [countPattern, growPattern, sidesPattern]
  const b = pick(types, rng)(d, rng)
  const opts = new Map<string, Frame>([[b.answer.id, b.answer]])
  for (const f of b.distractors) if (opts.size < 4) opts.set(f.id, f)
  const options = shuffle([...opts.values()], rng)
  return {
    key: b.key,
    prompt: (
      <div className="flex flex-col items-center gap-3">
        <span className="text-base font-semibold text-muted">{diff.young ? 'What comes next?' : 'Which shape comes next?'}</span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {b.frames.map((f, i) => (
            <span key={i} className="grid min-h-16 min-w-16 place-items-center rounded-2xl border-2 border-line bg-white p-1">
              {f.node(false)}
            </span>
          ))}
          <span className="grid size-16 place-items-center rounded-2xl border-2 border-dashed border-primary bg-primary-soft font-display text-2xl text-primary">?</span>
        </div>
      </div>
    ),
    promptAria: `Sequence: ${b.frames.map((f) => f.aria).join(', then ')}. What comes next?`,
    options: options.map((f) => ({ id: f.id, label: f.node(true), aria: f.aria })),
    answerId: b.answer.id,
    explanation: b.rule,
    hint: b.hint,
    big: true,
    columns: 4,
  }
}

export const shapePatterns: GameDef = {
  id: 'shape-patterns',
  category: 'pattern',
  skill: 'pattern',
  title: 'Shape Patterns',
  emoji: '⭐',
  blurb: 'Shapes grow, gain sides or multiply – what comes next?',
  instructions: [
    'Each row of shapes changes by a rule.',
    'They might grow, shrink, gain sides or increase in number.',
    'Pick the shape that comes next.',
  ],
  kidInstructions: ['Look how the shapes change.', 'What comes next?'],
  component: createQuizGame('shape-patterns', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate: gen }),
}
