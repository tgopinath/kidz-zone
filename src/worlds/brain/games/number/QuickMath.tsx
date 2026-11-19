import { randInt, numericOptions, pick } from '../../lib/random'
import type { Difficulty } from '../../lib/difficulty'
import type { Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'

/** Example quiz-style game – the pattern for all multiple-choice games. */
function maxFor(d: number) {
  if (d <= 2) return 10
  if (d <= 4) return 20
  if (d <= 6) return 50
  return 100
}

function gen(diff: Difficulty, rng: Rng): QuizQuestion {
  const max = maxFor(diff.d)
  const ops = diff.d <= 2 ? ['+'] : diff.d <= 4 ? ['+', '−'] : ['+', '−', '×']
  const op = pick(ops, rng)
  let a: number, b: number, ans: number
  if (op === '+') {
    a = randInt(1, max, rng)
    b = randInt(1, Math.max(1, max - a), rng)
    ans = a + b
  } else if (op === '−') {
    a = randInt(2, max, rng)
    b = randInt(1, a, rng)
    ans = a - b
  } else {
    const m = diff.d >= 9 ? 15 : diff.d >= 7 ? 12 : 10
    a = randInt(2, m, rng)
    b = randInt(2, m, rng)
    ans = a * b
  }
  const opts = numericOptions(ans, 4, Math.max(3, Math.round(ans * 0.2)), rng)
  return {
    key: `${a}${op}${b}`,
    prompt: (
      <span className="text-4xl sm:text-5xl">
        {a} {op} {b} = <span className="text-primary">?</span>
      </span>
    ),
    promptAria: `What is ${a} ${op === '−' ? 'minus' : op === '×' ? 'times' : 'plus'} ${b}?`,
    options: opts.map((n) => ({ id: String(n), label: n, aria: String(n) })),
    answerId: String(ans),
    explanation: `${a} ${op} ${b} = ${ans}`,
    hint: op === '×' ? `Think of ${a} groups of ${b}.` : op === '+' ? `Start at ${a} and count up ${b}.` : `Start at ${a} and count back ${b}.`,
    big: false,
  }
}

export const quickMath: GameDef = {
  id: 'quick-math',
  category: 'number',
  skill: 'logic',
  title: 'Quick Maths',
  emoji: '➕',
  blurb: 'Fast addition, subtraction and multiplication.',
  instructions: ['Solve each sum as quickly as you can.', 'Faster correct answers earn bonus points.', 'Higher levels add bigger numbers and multiplication.'],
  kidInstructions: ['Work out the sum.', 'Tap the right number!'],
  timeLimit: (d) => Math.round(60 * d.time),
  component: createQuizGame('quick-math', { rounds: (d) => 8 + Math.min(6, d.d), generate: gen }),
}
