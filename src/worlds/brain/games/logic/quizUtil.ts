import { shuffle, type Rng } from '../../lib/random'
import type { QuizOption } from '../shared/QuizEngine'

/**
 * Build shuffled text options from one correct answer plus distractors.
 * Distractors equal to the answer (or to each other) are dropped, so exactly
 * one option is ever correct.
 */
export function textOptions(correct: string, wrongs: readonly string[], rng: Rng, max = 4): { options: QuizOption[]; answerId: string } {
  const seen = new Set<string>([correct])
  const ws: string[] = []
  for (const w of shuffle(wrongs, rng)) {
    if (seen.has(w)) continue
    seen.add(w)
    ws.push(w)
    if (ws.length >= max - 1) break
  }
  const all = shuffle([correct, ...ws], rng)
  return {
    options: all.map((label, i) => ({ id: `o${i}`, label, aria: label })),
    answerId: `o${all.indexOf(correct)}`,
  }
}

/** Numeric options: answer + unique distractors (all distinct). */
export function numberOptions(answer: number, distractors: readonly number[], rng: Rng, max = 4) {
  return textOptions(
    String(answer),
    distractors.map((n) => String(n)),
    rng,
    max,
  )
}
