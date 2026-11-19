import { passAccuracy } from './difficulty'

export interface RawOutcome {
  points: number
  correct: number
  wrong: number
  /** Set by games where completion itself is the goal (puzzles); defaults to true. */
  completed?: boolean
  hintsUsed: number
  durationMs: number
  timeLimitMs?: number
}

export interface ScoredOutcome {
  score: number
  accuracy: number
  stars: number
  passed: boolean
  xp: number
  coins: number
}

/** Centralised scoring: every game reports raw numbers, this turns them into score, stars and rewards. */
export function scoreOutcome(raw: RawOutcome, level: number): ScoredOutcome {
  const attempts = raw.correct + raw.wrong
  const accuracy = attempts === 0 ? (raw.completed ? 1 : 0) : raw.correct / attempts
  const completed = raw.completed ?? true
  const hintPenalty = Math.min(0.3, raw.hintsUsed * 0.1)
  const timeBonus =
    raw.timeLimitMs && raw.durationMs < raw.timeLimitMs ? Math.round((1 - raw.durationMs / raw.timeLimitMs) * 50 * level) : 0
  const score = Math.max(0, Math.round((raw.points + timeBonus) * (1 - hintPenalty)))
  const passed = completed && accuracy >= passAccuracy(level)
  let stars = 0
  if (passed) {
    stars = 1
    if (accuracy >= 0.8 && raw.hintsUsed <= 1) stars = 2
    if (accuracy >= 0.95 && raw.hintsUsed === 0) stars = 3
  }
  const xp = Math.round((20 + level * 8) * (0.4 + accuracy) + stars * 10)
  const coins = passed ? 5 + level * 2 + stars * 3 : 2
  return { score, accuracy, stars, passed, xp, coins }
}
