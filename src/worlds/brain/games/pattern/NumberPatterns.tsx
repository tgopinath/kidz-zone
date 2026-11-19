import type { Difficulty } from '../../lib/difficulty'
import { numericOptions, pick, randInt, shuffle } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { createQuizGame } from '../shared/QuizEngine'
import type { QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'

interface Seq {
  terms: number[]
  rule: string
  hint: string
  /** A tempting wrong answer (common mistake). */
  trap?: number
  tag: string
}

const SHOWN = 5

function arithmetic(d: number, rng: Rng, young: boolean): Seq {
  const n = randInt(1, d <= 2 ? 3 : young ? 5 : Math.min(12, 2 + d), rng)
  const down = d >= 3 && rng() < 0.35
  const start = down ? n * SHOWN + randInt(1, young ? 10 : 30, rng) : randInt(young ? 0 : 1, young ? 10 : 20, rng)
  const terms = Array.from({ length: SHOWN + 1 }, (_, i) => start + (down ? -n : n) * i)
  return {
    terms,
    rule: down ? `Subtract ${n} each time.` : `Add ${n} each time.`,
    hint: 'Look at the difference between neighbouring numbers.',
    trap: terms[SHOWN] + (down ? -1 : 1),
    tag: `ar${start}${down ? '-' : '+'}${n}`,
  }
}

function geometric(d: number, rng: Rng): Seq {
  const r = d >= 6 ? pick([2, 3], rng) : 2
  const start = randInt(1, r === 3 ? 3 : 5, rng)
  const terms = Array.from({ length: SHOWN + 1 }, (_, i) => start * r ** i)
  return {
    terms,
    rule: `Multiply by ${r} each time.`,
    hint: 'Each number is a few times bigger than the last.',
    trap: terms[SHOWN - 1] + (terms[SHOWN - 1] - terms[SHOWN - 2]),
    tag: `geo${start}x${r}`,
  }
}

function alternating(_d: number, rng: Rng): Seq {
  const a = randInt(1, 6, rng)
  let b = randInt(1, 9, rng)
  if (b === a) b += 2
  const start = randInt(1, 15, rng)
  const terms = [start]
  for (let i = 1; i <= SHOWN; i++) terms.push(terms[i - 1] + (i % 2 === 1 ? a : b))
  const nextStep = SHOWN % 2 === 1 ? a : b
  return {
    terms,
    rule: `Add ${a}, then add ${b}, and keep alternating.`,
    hint: 'The steps take turns – look at every other gap.',
    trap: terms[SHOWN - 1] + (nextStep === a ? b : a),
    tag: `alt${start}+${a}+${b}`,
  }
}

function squares(_d: number, rng: Rng): Seq {
  const s = randInt(1, 5, rng)
  const terms = Array.from({ length: SHOWN + 1 }, (_, i) => (s + i) ** 2)
  return {
    terms,
    rule: `Square numbers: ${s}², ${s + 1}², ${s + 2}²… so next is ${s + SHOWN}² = ${terms[SHOWN]}.`,
    hint: 'Try multiplying a number by itself.',
    trap: terms[SHOWN - 1] + (terms[SHOWN - 1] - terms[SHOWN - 2]),
    tag: `sq${s}`,
  }
}

function fibonacci(_d: number, rng: Rng): Seq {
  const a = randInt(1, 5, rng)
  const b = randInt(a, a + 5, rng)
  const terms = [a, b]
  while (terms.length < SHOWN + 1) terms.push(terms[terms.length - 1] + terms[terms.length - 2])
  return {
    terms,
    rule: 'Each number is the sum of the two before it.',
    hint: 'Add the two previous numbers together.',
    trap: terms[SHOWN - 1] + (terms[SHOWN - 1] - terms[SHOWN - 2]),
    tag: `fib${a},${b}`,
  }
}

function twoStep(_d: number, rng: Rng): Seq {
  const a = randInt(1, 4, rng)
  const m = 2
  const start = randInt(1, 5, rng)
  const terms = [start]
  for (let i = 1; i <= SHOWN; i++) terms.push(i % 2 === 1 ? terms[i - 1] + a : terms[i - 1] * m)
  // SHOWN is odd → the hidden 6th term (index 5) is an "add" step.
  return {
    terms,
    rule: `Add ${a}, then multiply by ${m}, and repeat.`,
    hint: 'Two different steps take turns – one adds, one multiplies.',
    trap: terms[SHOWN - 1] * m,
    tag: `two${start}+${a}x${m}`,
  }
}

function growingGap(_d: number, rng: Rng): Seq {
  const start = randInt(1, 20, rng)
  const g = randInt(1, 3, rng)
  const terms = [start]
  for (let i = 1; i <= SHOWN; i++) terms.push(terms[i - 1] + g + (i - 1))
  return {
    terms,
    rule: `The gap grows by 1 each time: +${g}, +${g + 1}, +${g + 2}…`,
    hint: 'Write down the gaps between numbers – they make their own pattern.',
    trap: terms[SHOWN - 1] + (terms[SHOWN - 1] - terms[SHOWN - 2]),
    tag: `gg${start}+${g}`,
  }
}

function doublePlusOne(_d: number, rng: Rng): Seq {
  const start = randInt(1, 4, rng)
  const terms = [start]
  for (let i = 1; i <= SHOWN; i++) terms.push(terms[i - 1] * 2 + 1)
  return {
    terms,
    rule: 'Double the number, then add 1.',
    hint: 'Try doubling, then adjust a little.',
    trap: terms[SHOWN - 1] * 2,
    tag: `d1${start}`,
  }
}

function cubes(_d: number, rng: Rng): Seq {
  const s = randInt(1, 3, rng)
  const terms = Array.from({ length: SHOWN + 1 }, (_, i) => (s + i) ** 3)
  return {
    terms,
    rule: `Cube numbers: ${s}³, ${s + 1}³… so next is ${s + SHOWN}³ = ${terms[SHOWN]}.`,
    hint: 'Multiply a number by itself three times.',
    trap: (s + SHOWN) ** 2,
    tag: `cu${s}`,
  }
}

type Gen = (d: number, rng: Rng, young: boolean) => Seq

function pool(d: number): Gen[] {
  const p: Gen[] = [arithmetic]
  if (d >= 4) p.push(geometric)
  if (d >= 5) p.push(alternating)
  if (d >= 6) p.push(squares)
  if (d >= 7) p.push(fibonacci)
  if (d >= 8) p.push(twoStep, growingGap)
  if (d >= 10) p.push(doublePlusOne, cubes)
  // Easier types fade out at high levels.
  return d >= 9 ? p.slice(1) : p
}

function gen(diff: Difficulty, rng: Rng): QuizQuestion {
  const s = pick(pool(diff.d), rng)(diff.d, rng, diff.young)
  const shown = s.terms.slice(0, SHOWN)
  const ans = s.terms[SHOWN]
  const set = new Set<number>([ans])
  if (s.trap !== undefined && s.trap !== ans && s.trap >= 0) set.add(s.trap)
  for (const n of numericOptions(ans, 6, Math.max(3, Math.round(Math.abs(ans) * 0.15)), rng)) if (set.size < 4) set.add(n)
  const opts = shuffle([...set], rng)
  return {
    key: s.tag,
    prompt: (
      <div className="flex flex-col items-center gap-3">
        <span className="text-base font-semibold text-muted">{diff.young ? 'What number comes next?' : 'What comes next?'}</span>
        <div className="flex flex-wrap items-center justify-center gap-2 text-3xl sm:text-4xl">
          {shown.map((n, i) => (
            <span key={i} className="rounded-2xl bg-primary-soft px-3 py-1">
              {n}
            </span>
          ))}
          <span className="rounded-2xl border-2 border-dashed border-primary px-3 py-1 text-primary">?</span>
        </div>
      </div>
    ),
    promptAria: `Number sequence: ${shown.join(', ')}. What comes next?`,
    options: opts.map((n) => ({ id: String(n), label: n, aria: String(n) })),
    answerId: String(ans),
    explanation: `${s.rule} The answer is ${ans}.`,
    hint: s.hint,
  }
}

export const numberPatterns: GameDef = {
  id: 'number-patterns',
  category: 'pattern',
  skill: 'pattern',
  title: 'Number Patterns',
  emoji: '🔢',
  blurb: 'Crack the rule behind each number sequence.',
  instructions: [
    'Each row of numbers follows a rule.',
    'Work out the rule and pick the next number.',
    'Rules get trickier: multiplying, alternating steps, squares and more.',
  ],
  kidInstructions: ['The numbers follow a rule.', 'What number comes next?'],
  component: createQuizGame('number-patterns', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate: gen }),
}
