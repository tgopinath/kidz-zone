import type { GameResult, ProgressState } from '../types'
import { computeStreak } from './dates'

export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  /** Current progress toward the goal, for progress bars. */
  progress: (p: ProgressState) => { value: number; goal: number }
}

const count = (p: ProgressState, f: (r: GameResult) => boolean) => p.history.filter(f).length
const SPEED_TARGET_MS = 350

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-game', title: 'First Rep', description: 'Finish your first game.', icon: '🎉', progress: (p) => ({ value: p.history.length, goal: 1 }) },
  { id: 'memory-master', title: 'Memory Master', description: 'Complete 10 memory games.', icon: '🧠', progress: (p) => ({ value: count(p, (r) => r.category === 'memory'), goal: 10 }) },
  { id: 'sharp-eyes', title: 'Sharp Eyes', description: 'Find 50 hidden targets.', icon: '👀', progress: (p) => ({ value: p.targetsFound, goal: 50 }) },
  { id: 'logic-legend', title: 'Logic Legend', description: 'Complete 20 logic challenges.', icon: '🧪', progress: (p) => ({ value: count(p, (r) => r.category === 'logic'), goal: 20 }) },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: `Average under ${SPEED_TARGET_MS} ms in a reaction game.`,
    icon: '⚡',
    progress: (p) => ({ value: p.history.some((r) => r.avgReactionMs && r.avgReactionMs < SPEED_TARGET_MS) ? 1 : 0, goal: 1 }),
  },
  { id: 'perfect-brain', title: 'Perfect Brain', description: 'Score 100% accuracy in a game.', icon: '💯', progress: (p) => ({ value: count(p, (r) => r.accuracy === 1 && r.correct > 0) ? 1 : 0, goal: 1 }) },
  { id: 'streak-7', title: 'Seven-Day Streak', description: 'Play on seven days in a row.', icon: '🔥', progress: (p) => ({ value: computeStreak(p.playedDays), goal: 7 }) },
  { id: 'number-ninja', title: 'Number Ninja', description: 'Complete 15 number games.', icon: '🥷', progress: (p) => ({ value: count(p, (r) => r.category === 'number'), goal: 15 }) },
  { id: 'puzzle-pro', title: 'Puzzle Pro', description: 'Solve 10 puzzles.', icon: '🧩', progress: (p) => ({ value: count(p, (r) => r.category === 'puzzle' && r.passed), goal: 10 }) },
  { id: 'three-stars', title: 'Star Collector', description: 'Earn 3 stars in 5 games.', icon: '⭐', progress: (p) => ({ value: count(p, (r) => r.stars === 3), goal: 5 }) },
  {
    id: 'all-rounder',
    title: 'All-Rounder',
    description: 'Play a game in every category.',
    icon: '🌈',
    progress: (p) => ({ value: new Set(p.history.map((r) => r.category)).size, goal: 8 }),
  },
  { id: 'level-5', title: 'Brain Master', description: 'Unlock level 5 in any game.', icon: '🏅', progress: (p) => ({ value: Math.max(0, ...Object.values(p.unlocked)), goal: 5 }) },
  { id: 'level-10', title: 'Grand Master', description: 'Reach level 10 in any game.', icon: '👑', progress: (p) => ({ value: Math.max(0, ...Object.values(p.unlocked)), goal: 10 }) },
  { id: 'daily-3', title: 'Daily Hero', description: 'Finish all daily challenges 3 times.', icon: '📅', progress: (p) => ({ value: p.dailyRewarded.length, goal: 3 }) },
  { id: 'games-50', title: 'Gym Regular', description: 'Play 50 games.', icon: '🏋️', progress: (p) => ({ value: p.history.length, goal: 50 }) },
]

export function isUnlocked(def: AchievementDef, p: ProgressState) {
  const { value, goal } = def.progress(p)
  return value >= goal
}

/** Returns newly earned achievement ids (not yet in p.achievements). */
export function newlyEarned(p: ProgressState): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !p.achievements[a.id] && isUnlocked(a, p))
}
