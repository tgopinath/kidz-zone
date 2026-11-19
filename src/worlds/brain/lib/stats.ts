import type { GameResult, ProgressState, SkillId } from '../types'
import { gameById } from '../games/registry'

/**
 * Game-performance score (0–100) for one result: accuracy weighted by the
 * level played. This is an in-game measure, not a validated cognitive test.
 */
export function perf(r: GameResult): number {
  return Math.round(r.accuracy * (0.55 + 0.45 * (r.level / 10)) * 100)
}

export function skillOf(r: GameResult): SkillId | undefined {
  return gameById(r.gameId)?.skill
}

/** Rolling score per skill from the latest 10 results of that skill. Null = no data yet. */
export function skillScores(history: GameResult[]): Record<SkillId, number | null> {
  const out: Record<SkillId, number | null> = { memory: null, attention: null, logic: null, pattern: null, spatial: null, speed: null }
  for (const s of Object.keys(out) as SkillId[]) {
    const rs = history.filter((r) => skillOf(r) === s).slice(-10)
    if (rs.length) out[s] = Math.round(rs.reduce((a, r) => a + perf(r), 0) / rs.length)
  }
  return out
}

export function brainScore(scores: Record<SkillId, number | null>): number | null {
  const v = Object.values(scores).filter((x): x is number => x !== null)
  if (!v.length) return null
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length)
}

export function totals(p: ProgressState) {
  const h = p.history
  const games = h.length
  const passed = h.filter((r) => r.passed).length
  const avgAcc = games ? h.reduce((a, r) => a + r.accuracy, 0) / games : null
  const rts = h.filter((r) => r.avgReactionMs).map((r) => r.avgReactionMs!)
  const avgRt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null
  const highest = Math.max(0, ...Object.values(p.unlocked).map((l) => l))
  const highestCleared = Math.max(0, ...h.filter((r) => r.passed).map((r) => r.level))
  return { games, passed, avgAcc, avgRt, highest, highestCleared }
}
