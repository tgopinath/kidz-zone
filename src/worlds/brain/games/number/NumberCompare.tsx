import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, sample, type Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'

interface Expr {
  text: string
  spoken: string
  value: number
}

const num = (n: number): Expr => ({ text: String(n), spoken: String(n), value: n })

function expr(d: number, rng: Rng): Expr {
  const op = d <= 7 ? pick(['+', '−'], rng) : pick(['+', '−', '×', '×'], rng)
  if (op === '×') {
    const a = randInt(3, d >= 11 ? 15 : 12, rng)
    const b = randInt(3, 9, rng)
    return { text: `${a} × ${b}`, spoken: `${a} times ${b}`, value: a * b }
  }
  const max = d <= 7 ? 30 : 99
  if (op === '+') {
    const a = randInt(2, max, rng)
    const b = randInt(2, max, rng)
    return { text: `${a} + ${b}`, spoken: `${a} plus ${b}`, value: a + b }
  }
  const a = randInt(10, max + 10, rng)
  const b = randInt(1, a - 1, rng)
  return { text: `${a} − ${b}`, spoken: `${a} minus ${b}`, value: a - b }
}

/** An expression with exactly the given value (for "=" answers). */
function exprEqual(value: number, d: number, rng: Rng): Expr {
  // Try a factor pair first for multiplication at higher d.
  if (d >= 9) {
    const pairs: [number, number][] = []
    for (let a = 2; a <= 15; a++) if (value % a === 0 && value / a >= 2 && value / a <= 15) pairs.push([a, value / a])
    if (pairs.length) {
      const [a, b] = pick(pairs, rng)
      return { text: `${a} × ${b}`, spoken: `${a} times ${b}`, value }
    }
  }
  if (rng() < 0.5 && value > 3) {
    const a = randInt(1, value - 1, rng)
    return { text: `${a} + ${value - a}`, spoken: `${a} plus ${value - a}`, value }
  }
  const b = randInt(1, 20, rng)
  return { text: `${value + b} − ${b}`, spoken: `${value + b} minus ${b}`, value }
}

const SYMBOLS = [
  { id: 'lt', label: '<', aria: 'is less than' },
  { id: 'eq', label: '=', aria: 'is equal to' },
  { id: 'gt', label: '>', aria: 'is greater than' },
]

function symbolQuestion(left: Expr, right: Expr): QuizQuestion {
  const ans = left.value < right.value ? 'lt' : left.value > right.value ? 'gt' : 'eq'
  const sym = SYMBOLS.find((s) => s.id === ans)!
  return {
    key: `sym-${left.text}-${right.text}`,
    prompt: (
      <span className="flex flex-wrap items-center justify-center gap-3 text-3xl sm:text-4xl">
        <span className="rounded-xl bg-primary-soft px-3 py-1">{left.text}</span>
        <span className="grid size-12 place-items-center rounded-xl border-2 border-dashed border-primary text-primary">?</span>
        <span className="rounded-xl bg-primary-soft px-3 py-1">{right.text}</span>
      </span>
    ),
    promptAria: `Choose the sign: ${left.spoken} ... ${right.spoken}`,
    options: SYMBOLS.map((s) => ({ id: s.id, label: <span className="text-4xl">{s.label}</span>, aria: s.aria })),
    answerId: ans,
    explanation: `${left.text} = ${left.value} and ${right.text} = ${right.value}, so ${left.text} ${sym.label} ${right.text}.`,
    hint: 'Work out each side first. The open end of < or > faces the bigger side.',
    columns: 3,
  }
}

function pickQuestion(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const bigger = rng() < 0.6
  const word = bigger ? (diff.young ? 'bigger' : 'larger') : 'smaller'
  // Low d: choose the bigger/smaller of 2–3 plain numbers.
  const count = d <= 2 ? 2 : 3
  const max = d <= 1 ? 10 : d <= 2 ? 20 : d <= 4 ? 100 : 1000
  const values = sample(
    Array.from({ length: max }, (_, i) => i + 1),
    count,
    rng,
  )
  const ans = bigger ? Math.max(...values) : Math.min(...values)
  return {
    key: `pick-${word}-${values.join(',')}`,
    prompt: `Which number is ${word}?`,
    options: values.map((v) => ({ id: String(v), label: <span className="text-4xl">{v}</span>, aria: String(v) })),
    answerId: String(ans),
    explanation: `${ans} is the ${bigger ? 'biggest' : 'smallest'} of ${values.join(', ')}.`,
    hint: max > 20 ? 'Compare the number of digits first, then the first digit.' : 'Count up – the later number is bigger.',
    columns: count,
    big: count === 2,
  }
}

function pickExprQuestion(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const bigger = rng() < 0.6
  let es: Expr[] = []
  for (let t = 0; t < 30; t++) {
    es = [expr(d, rng), expr(d, rng), expr(d, rng)]
    if (new Set(es.map((e) => e.value)).size === 3) break
  }
  if (new Set(es.map((e) => e.value)).size < 3) es = [es[0], num(es[0].value + 7), exprEqual(es[0].value + 13, 1, rng)]
  const target = bigger ? es.reduce((a, b) => (b.value > a.value ? b : a)) : es.reduce((a, b) => (b.value < a.value ? b : a))
  return {
    key: `pexpr-${es.map((e) => e.text).join('|')}-${bigger}`,
    prompt: `Which has the ${bigger ? 'largest' : 'smallest'} value?`,
    options: es.map((e, i) => ({ id: `e${i}`, label: e.text, aria: e.spoken })),
    answerId: `e${es.indexOf(target)}`,
    explanation: es.map((e) => `${e.text} = ${e.value}`).join(', ') + '.',
    hint: 'Work out each one, then compare.',
    columns: 3,
  }
}

function generate(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const r = rng()
  if (d <= 2) return pickQuestion(diff, rng)
  if (d <= 5) {
    if (r < 0.5) return pickQuestion(diff, rng)
    const a = randInt(1, 100, rng)
    const b = r < 0.62 ? a : randInt(1, 100, rng)
    return symbolQuestion(num(a), num(b))
  }
  if (d <= 8) {
    if (r < 0.25) return pickExprQuestion(diff, rng)
    const left = expr(d, rng)
    const near = left.value + randInt(-3, 3, rng)
    return symbolQuestion(left, num(Math.max(0, near)))
  }
  if (r < 0.25) return pickExprQuestion(diff, rng)
  const left = expr(d, rng)
  const right = rng() < 0.2 ? exprEqual(left.value, d, rng) : expr(d, rng)
  return symbolQuestion(left, right.text === left.text ? exprEqual(left.value, 1, rng) : right)
}

export const numberCompare: GameDef = {
  id: 'number-compare',
  category: 'number',
  skill: 'logic',
  title: 'Number Compare',
  emoji: '🆚',
  blurb: 'Bigger, smaller or equal? Compare numbers and sums fast.',
  instructions: ['Pick the bigger or smaller value, or choose <, = or >.', 'At higher levels both sides are sums to work out.', 'Quick correct answers earn bonus points.'],
  kidInstructions: ['Which number is bigger?', 'Tap the right one!'],
  timeLimit: (d) => Math.round(75 * d.time),
  component: createQuizGame('number-compare', { rounds: (d) => 10 + Math.min(4, Math.floor(d.d / 3)), generate }),
}
