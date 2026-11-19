import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, sample, type Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'
import { textOptions } from './quizUtil'

interface Seq {
  items: string[]
  missing: number
  /** Extra wrong candidates (answer is filtered out automatically). */
  wrongs: string[]
  rule: string
  kind: string
}

const MOON = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
const CLOCK = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛']
const PATTERN_EMOJI = ['🍎', '🍌', '🍇', '⭐', '❤️', '🐶', '🐱', '🌸', '⚽', '🚗', '🎈', '🐸']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function midIndex(len: number, rng: Rng) {
  return randInt(1, len - 2, rng)
}

function numberSeq(d: number, rng: Rng): Seq {
  const len = d <= 4 ? 5 : 6
  const kinds = d <= 2 ? ['add'] : d <= 5 ? ['add', 'sub'] : d <= 8 ? ['add', 'sub', 'mul'] : ['mul', 'square', 'fib', 'alt', 'growing']
  const kind = pick(kinds, rng)
  let items: number[] = []
  let rule = ''
  if (kind === 'add') {
    const step = d <= 2 ? pick([1, 2, 5, 10], rng) : randInt(2, d <= 5 ? 9 : 15, rng)
    const start = randInt(0, d <= 2 ? 10 : 30, rng)
    items = Array.from({ length: len }, (_, i) => start + i * step)
    rule = `Add ${step} each time.`
  } else if (kind === 'sub') {
    const step = randInt(2, d <= 5 ? 9 : 15, rng)
    const start = step * len + randInt(0, 30, rng)
    items = Array.from({ length: len }, (_, i) => start - i * step)
    rule = `Subtract ${step} each time.`
  } else if (kind === 'mul') {
    const f = pick([2, 3], rng)
    const start = randInt(1, f === 2 ? 6 : 3, rng)
    items = Array.from({ length: len }, (_, i) => start * f ** i)
    rule = `Multiply by ${f} each time.`
  } else if (kind === 'square') {
    const s = randInt(1, 6, rng)
    items = Array.from({ length: len }, (_, i) => (s + i) ** 2)
    rule = `Square numbers: ${s}², ${s + 1}², ${s + 2}² …`
  } else if (kind === 'fib') {
    const a = randInt(1, 4, rng)
    const b = a + randInt(0, 3, rng)
    items = [a, b]
    while (items.length < len) items.push(items[items.length - 1] + items[items.length - 2])
    rule = 'Each number is the sum of the two before it.'
  } else if (kind === 'alt') {
    const up = randInt(4, 9, rng)
    const down = randInt(1, up - 1, rng)
    items = [randInt(5, 20, rng)]
    for (let i = 1; i < len; i++) items.push(items[i - 1] + (i % 2 ? up : -down))
    rule = `Alternate: add ${up}, then subtract ${down}.`
  } else {
    const start = randInt(1, 10, rng)
    const first = randInt(1, 3, rng)
    items = [start]
    for (let i = 1; i < len; i++) items.push(items[i - 1] + first + (i - 1))
    rule = `The gap grows by 1 each time (+${first}, +${first + 1}, +${first + 2} …).`
  }
  const missing = midIndex(len, rng)
  const ans = items[missing]
  const spread = Math.max(2, Math.round(Math.abs(ans) * 0.15))
  const wrongs = [ans + 1, ans - 1, ans + spread, ans - spread, ans + 2 * spread, ans + 10].filter((n) => n >= 0).map(String)
  return { items: items.map(String), missing, wrongs, rule, kind: `n-${kind}` }
}

function letterSeq(d: number, rng: Rng): Seq {
  const len = d <= 5 ? 5 : 6
  const step = d <= 3 ? 1 : d <= 6 ? pick([1, 2], rng) : d <= 9 ? pick([2, 3], rng) : pick([3, 4, -2, -3], rng)
  const span = Math.abs(step) * (len - 1)
  const start = step > 0 ? randInt(0, 25 - span, rng) : randInt(span, 25, rng)
  const idx = Array.from({ length: len }, (_, i) => start + i * step)
  const missing = midIndex(len, rng)
  const a = idx[missing]
  const wrongs = [a - 1, a + 1, a + 2, a - 2, a + 3].filter((n) => n >= 0 && n < 26).map((n) => LETTERS[n])
  const rule = step === 1 ? 'Letters in alphabet order.' : step > 0 ? `Skip ${step - 1} letter${step > 2 ? 's' : ''} each time (+${step}).` : `Go backwards ${-step} letters each time.`
  return { items: idx.map((n) => LETTERS[n]), missing, wrongs, rule, kind: 'letters' }
}

function emojiSeq(d: number, rng: Rng): Seq {
  const kind = d <= 3 ? pick(['pattern2', 'pattern3', 'moon'], rng) : pick(['moon', 'clock', 'pattern3', 'patternAAB'], rng)
  if (kind === 'moon' || kind === 'clock') {
    const set = kind === 'moon' ? MOON : CLOCK
    const step = d >= 7 && kind === 'clock' ? 2 : 1
    const len = 5
    const start = randInt(0, set.length - 1, rng)
    const items = Array.from({ length: len }, (_, i) => set[(start + i * step) % set.length])
    const missing = midIndex(len, rng)
    return {
      items,
      missing,
      wrongs: [-1, 1, 2, -2, 3].map((o) => set[(start + missing * step + o + set.length * 2) % set.length]),
      rule: kind === 'moon' ? 'The moon grows and shrinks one phase at a time.' : `The clock moves forward ${step} hour${step > 1 ? 's' : ''} each step.`,
      kind,
    }
  }
  const unit = kind === 'pattern2' ? sample(PATTERN_EMOJI, 2, rng) : kind === 'pattern3' ? sample(PATTERN_EMOJI, 3, rng) : (() => {
    const [a, b] = sample(PATTERN_EMOJI, 2, rng)
    return [a, a, b]
  })()
  const len = unit.length === 2 ? 6 : 7
  const items = Array.from({ length: len }, (_, i) => unit[i % unit.length])
  const missing = midIndex(len, rng)
  const extra = sample(PATTERN_EMOJI.filter((e) => !unit.includes(e)), 2, rng)
  return { items, missing, wrongs: [...new Set(unit), ...extra], rule: `The pattern ${unit.join(' ')} repeats.`, kind }
}

function calendarSeq(d: number, rng: Rng): Seq {
  const months = rng() < 0.5
  const set = months ? MONTHS : DAYS
  const step = d <= 4 ? 1 : d <= 8 ? 2 : months ? 3 : pick([2, 3], rng)
  const len = 5
  const start = randInt(0, set.length - 1, rng)
  const items = Array.from({ length: len }, (_, i) => set[(start + i * step) % set.length])
  const missing = midIndex(len, rng)
  const ansIdx = (start + missing * step) % set.length
  const wrongs = [-1, 1, 2, -2].map((o) => set[(ansIdx + o + set.length) % set.length])
  const rule = `${months ? 'Months' : 'Days'} ${step === 1 ? 'in order' : `skipping ${step - 1} each time`}.`
  return { items, missing, wrongs, rule, kind: months ? 'months' : 'days' }
}

const HINTS: Record<string, string> = {
  'n-mul': 'Try dividing each number by the one before it.',
  'n-square': 'Think about multiplying a number by itself.',
  'n-fib': 'Look at two numbers in a row together.',
  'n-alt': 'The steps take turns – look at every other gap.',
  'n-growing': 'Write down the gaps – do they change?',
  letters: 'Count how many letters you skip.',
  moon: 'Watch the lit part of the moon.',
  clock: 'Look at where the short hand points.',
  days: 'Say the days of the week out loud.',
  months: 'Say the months in order out loud.',
  pattern2: 'Find the part that repeats.',
  pattern3: 'Find the part that repeats.',
  patternAAB: 'Find the part that repeats.',
}

function generate(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const r = rng()
  const seq = diff.young && d <= 3 ? (r < 0.45 ? numberSeq(d, rng) : r < 0.8 ? emojiSeq(d, rng) : letterSeq(d, rng)) : r < 0.45 ? numberSeq(d, rng) : r < 0.65 ? letterSeq(d, rng) : r < 0.82 ? emojiSeq(d, rng) : calendarSeq(d, rng)
  const ans = seq.items[seq.missing]
  const { options, answerId } = textOptions(ans, seq.wrongs, rng)
  const isEmoji = seq.kind.startsWith('pattern') || seq.kind === 'moon' || seq.kind === 'clock'
  const spoken = seq.items.map((x, i) => (i === seq.missing ? 'blank' : seq.kind === 'days' ? DAYS_FULL[DAYS.indexOf(x)] : x)).join(', ')
  return {
    key: `${seq.kind}-${seq.items.join(',')}-${seq.missing}`,
    prompt: (
      <span className="flex flex-col items-center gap-3">
        <span className="text-base font-semibold text-muted">{diff.young ? 'What goes in the gap?' : 'Find the missing item'}</span>
        <span className={`flex flex-wrap items-center justify-center gap-2 ${isEmoji ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}>
          {seq.items.map((x, i) =>
            i === seq.missing ? (
              <span key={i} className="grid min-w-14 place-items-center rounded-xl border-2 border-dashed border-primary px-2 py-1 text-primary">
                ?
              </span>
            ) : (
              <span key={i} className="rounded-xl bg-primary-soft px-2 py-1">
                {x}
              </span>
            ),
          )}
        </span>
      </span>
    ),
    promptAria: `Find the missing item in the sequence: ${spoken}.`,
    options,
    answerId,
    explanation: seq.rule,
    hint: HINTS[seq.kind] ?? 'Compare each item with the one before it.',
    big: isEmoji,
  }
}

export const sequencePuzzle: GameDef = {
  id: 'sequence-puzzle',
  category: 'logic',
  skill: 'logic',
  title: 'Sequence Puzzle',
  emoji: '🔢',
  blurb: 'Spot the rule and fill the gap in numbers, letters and pictures.',
  instructions: ['Each row follows a rule.', 'Work out the rule and choose the missing item.', 'Higher levels use trickier rules like squares and growing gaps.'],
  kidInstructions: ['Look at the row.', 'What goes in the gap?', 'Tap the answer!'],
  timeLimit: (d) => Math.round(120 * d.time),
  component: createQuizGame('sequence-puzzle', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate }),
}
