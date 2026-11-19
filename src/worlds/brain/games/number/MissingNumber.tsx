import type { ReactNode } from 'react'
import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, type Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'
import { numberOptions } from '../logic/quizUtil'

interface Built {
  key: string
  visual: ReactNode
  question: string
  aria: string
  answer: number
  why: string
  hint: string
  allowNegative?: boolean
}

const Blank = () => (
  <span className="grid size-full place-items-center rounded-full border-2 border-dashed border-primary bg-white font-bold text-primary">?</span>
)

function Bubble({ v, big }: { v: number | null; big?: boolean }) {
  return (
    <span className={`grid place-items-center rounded-full font-display font-bold ${big ? 'size-20 text-3xl sm:size-24' : 'size-16 text-2xl sm:size-20'} ${v === null ? '' : big ? 'bg-primary text-white' : 'bg-primary-soft text-ink'}`}>
      {v === null ? <Blank /> : v}
    </span>
  )
}

/** Number bond: a whole split into parts. */
function bond(diff: Difficulty, rng: Rng): Built {
  const d = diff.d
  const parts = d >= 9 ? 3 : 2
  const total = d <= 2 ? pick([5, 10], rng) : d <= 4 ? randInt(10, 20, rng) : d <= 7 ? randInt(20, 100, rng) : randInt(30, 150, rng)
  const vals: number[] = []
  let rest = total
  for (let i = 0; i < parts - 1; i++) {
    const v = randInt(1, rest - (parts - 1 - i), rng)
    vals.push(v)
    rest -= v
  }
  vals.push(rest)
  const hideWhole = d >= 5 && rng() < 0.3
  const hideIdx = hideWhole ? -1 : randInt(0, parts - 1, rng)
  const answer = hideWhole ? total : vals[hideIdx]
  const known = vals.filter((_, i) => i !== hideIdx)
  return {
    key: `bond-${total}-${vals.join('-')}-${hideIdx}`,
    visual: (
      <div className="flex flex-col items-center gap-2">
        <Bubble v={hideWhole ? null : total} big />
        <svg viewBox="0 0 200 30" className="h-6 w-48" aria-hidden>
          {vals.map((_, i) => (
            <line key={i} x1={100} y1={0} x2={parts === 2 ? 50 + i * 100 : 30 + i * 70} y2={30} stroke="#c9c4e6" strokeWidth={4} strokeLinecap="round" />
          ))}
        </svg>
        <div className="flex gap-6">
          {vals.map((v, i) => (
            <Bubble key={i} v={i === hideIdx ? null : v} />
          ))}
        </div>
      </div>
    ),
    question: hideWhole ? 'What is the whole?' : 'What is the missing part?',
    aria: hideWhole ? `Number bond: parts ${vals.join(', ')}, whole is unknown.` : `Number bond: whole ${total}, known parts ${known.join(' and ')}, one part missing.`,
    answer,
    why: hideWhole ? `The whole is all the parts added: ${vals.join(' + ')} = ${total}.` : `The parts add up to the whole: ${total} − ${known.join(' − ')} = ${answer}.`,
    hint: hideWhole ? 'Add all the parts together.' : `Take the known part${known.length > 1 ? 's' : ''} away from ${total}.`,
  }
}

/** Number line with evenly spaced ticks, one missing. */
function numberLine(diff: Difficulty, rng: Rng): Built {
  const d = diff.d
  const step = d <= 2 ? 1 : d <= 4 ? pick([2, 5, 10], rng) : d <= 7 ? pick([5, 10, 25, 50], rng) : pick([4, 15, 25, 75, 125], rng)
  const n = 6
  const start = d >= 10 && rng() < 0.5 ? -step * randInt(1, 4, rng) : step * randInt(0, d <= 2 ? 4 : 10, rng)
  const ticks = Array.from({ length: n }, (_, i) => start + i * step)
  const hide = randInt(1, n - 2, rng)
  const answer = ticks[hide]
  return {
    key: `line-${start}-${step}-${hide}`,
    visual: (
      <svg viewBox="0 0 360 90" className="w-full max-w-lg" aria-hidden>
        <line x1={14} y1={40} x2={346} y2={40} stroke="#20213a" strokeWidth={3} strokeLinecap="round" />
        <path d="M346 40 l-10 -6 v12Z" fill="#20213a" />
        {ticks.map((t, i) => {
          const x = 30 + i * 60
          return (
            <g key={i}>
              <line x1={x} y1={30} x2={x} y2={50} stroke="#20213a" strokeWidth={3} />
              {i === hide ? (
                <>
                  <rect x={x - 22} y={58} width={44} height={28} rx={8} fill="#fff" stroke="#7557f6" strokeWidth={2} strokeDasharray="4 3" />
                  <text x={x} y={78} textAnchor="middle" fontSize={18} fontWeight={800} fill="#7557f6">
                    ?
                  </text>
                </>
              ) : (
                <text x={x} y={78} textAnchor="middle" fontSize={t >= 1000 || t <= -100 ? 14 : 18} fontWeight={700} fill="#20213a">
                  {t}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    ),
    question: 'Which number is missing from the number line?',
    aria: `Number line: ${ticks.map((t, i) => (i === hide ? 'blank' : t)).join(', ')}.`,
    answer,
    why: `The marks go up by ${step} each time, so the missing number is ${ticks[hide - 1]} + ${step} = ${answer}.`,
    hint: 'How much does each mark go up by?',
    allowNegative: start < 0,
  }
}

// The Lo Shu magic square and its 8 symmetries.
const LO_SHU = [
  [2, 7, 6],
  [9, 5, 1],
  [4, 3, 8],
]
function transform(g: number[][], rot: number, flip: boolean): number[][] {
  let m = g.map((r) => [...r])
  if (flip) m = m.map((r) => [...r].reverse())
  for (let k = 0; k < rot; k++) m = m[0].map((_, c) => m.map((r) => r[c]).reverse())
  return m
}

/** 3×3 grid: rows sum to N (told at lower d) or a true magic square (inferred at high d). */
function grid(diff: Difficulty, rng: Rng): Built {
  const d = diff.d
  let g: number[][]
  let target: number
  const magic = d >= 8
  if (magic) {
    const mult = d >= 10 ? randInt(2, 4, rng) : 1
    const add = randInt(0, d >= 10 ? 20 : 10, rng)
    g = transform(LO_SHU, randInt(0, 3, rng), rng() < 0.5).map((r) => r.map((v) => v * mult + add))
    target = g[0][0] + g[0][1] + g[0][2]
  } else {
    target = d <= 5 ? randInt(10, 20, rng) : randInt(20, 50, rng)
    g = Array.from({ length: 3 }, () => {
      const a = randInt(1, target - 2, rng)
      const b = randInt(1, target - a - 1, rng)
      return [a, b, target - a - b]
    })
  }
  const hr = randInt(0, 2, rng)
  const hc = randInt(0, 2, rng)
  const answer = g[hr][hc]
  const rowKnown = g[hr].filter((_, c) => c !== hc)
  const tell = !(magic && d >= 10)
  return {
    key: `grid-${g.flat().join(',')}-${hr}${hc}`,
    visual: (
      <div className="flex flex-col items-center gap-2">
        {tell && (
          <span className="bchip bg-accent/20 text-ink">
            {magic ? `Every row, column and diagonal adds up to ${target}` : `Each row adds up to ${target}`}
          </span>
        )}
        {!tell && <span className="bchip bg-accent/20 text-ink">Every row, column and diagonal adds up to the same number</span>}
        <div className="grid grid-cols-3 gap-2">
          {g.flat().map((v, i) => {
            const isHidden = Math.floor(i / 3) === hr && i % 3 === hc
            return (
              <span key={i} className={`grid size-16 place-items-center rounded-2xl border-2 font-display text-2xl font-bold sm:size-20 ${isHidden ? 'border-dashed border-primary text-primary' : 'border-line bg-white'}`}>
                {isHidden ? '?' : v}
              </span>
            )
          })}
        </div>
      </div>
    ),
    question: 'What number goes in the ? square?',
    aria: `${tell ? (magic ? `Magic square, every line adds to ${target}.` : `Each row adds up to ${target}.`) : 'Magic square, every line adds to the same number.'} Rows: ${g
      .map((r, ri) => r.map((v, ci) => (ri === hr && ci === hc ? 'blank' : v)).join(', '))
      .join('; ')}.`,
    answer,
    why: tell
      ? `${target} − ${rowKnown.join(' − ')} = ${answer}.`
      : `A full row adds to ${target} (e.g. ${g[(hr + 1) % 3].join(' + ')}). So ${target} − ${rowKnown.join(' − ')} = ${answer}.`,
    hint: tell ? `Add the other two numbers in that row and take them from ${target}.` : 'Add up a complete row to find the magic total first.',
  }
}

/** Missing number in a simple equation chain like 4 + ? + 6 = 15. */
function sumChain(diff: Difficulty, rng: Rng): Built {
  const d = diff.d
  const count = d <= 3 ? 3 : 4
  const max = d <= 3 ? 9 : d <= 7 ? 25 : 60
  const vals = Array.from({ length: count }, () => randInt(1, max, rng))
  const total = vals.reduce((a, b) => a + b, 0)
  const hide = randInt(0, count - 1, rng)
  const known = vals.filter((_, i) => i !== hide)
  return {
    key: `chain-${vals.join('+')}-${hide}`,
    visual: (
      <span className="flex flex-wrap items-center justify-center gap-2 font-display text-3xl font-semibold sm:text-4xl">
        {vals.map((v, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span>+</span>}
            {i === hide ? <span className="grid size-14 place-items-center rounded-xl border-2 border-dashed border-primary text-primary">?</span> : <span>{v}</span>}
          </span>
        ))}
        <span>= {total}</span>
      </span>
    ),
    question: 'Find the missing number.',
    aria: `${vals.map((v, i) => (i === hide ? 'blank' : v)).join(' plus ')} equals ${total}.`,
    answer: vals[hide],
    why: `${known.join(' + ')} = ${total - vals[hide]}, and ${total} − ${total - vals[hide]} = ${vals[hide]}.`,
    hint: 'Add the numbers you know, then see what is left.',
  }
}

function generate(diff: Difficulty, rng: Rng): QuizQuestion {
  const r = rng()
  const b = r < 0.3 ? bond(diff, rng) : r < 0.55 ? numberLine(diff, rng) : r < 0.8 ? grid(diff, rng) : sumChain(diff, rng)
  const spread = Math.max(3, Math.round(Math.abs(b.answer) * 0.2))
  const distract = [b.answer + 1, b.answer - 1, b.answer + spread, b.answer - spread, b.answer + 10, b.answer - 10].filter((n) => b.allowNegative || n >= 0)
  const { options, answerId } = numberOptions(b.answer, distract, rng)
  return {
    key: b.key,
    prompt: (
      <div className="flex flex-col items-center gap-4">
        {b.visual}
        <span>{b.question}</span>
      </div>
    ),
    promptAria: `${b.aria} ${b.question}`,
    options: options.map((o) => ({ ...o, label: <span className="text-2xl">{o.label}</span> })),
    answerId,
    explanation: b.why,
    hint: b.hint,
  }
}

export const missingNumber: GameDef = {
  id: 'missing-number',
  category: 'number',
  skill: 'logic',
  title: 'Missing Number',
  emoji: '❓',
  blurb: 'Number bonds, number lines and magic squares with a gap.',
  instructions: ['Each puzzle has one number missing.', 'Use the rule shown – parts add up to the whole, rows add up to a total – to find it.', 'Magic squares at high levels hide the total: work it out first!'],
  kidInstructions: ['One number is hiding.', 'Find the missing number!'],
  timeLimit: (d) => Math.round(120 * d.time),
  component: createQuizGame('missing-number', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate }),
}
