import { CATEGORIES, GAMES } from '../games/registry'
import type { GameDef } from '../games/types'
import type { ProgressState } from '../types'
import { dateKey, weekStart } from './dates'
import { hashString, mulberry32, shuffle } from './random'

export const DAILY_BONUS = { xp: 150, coins: 40 }

/**
 * Today's three challenges, deterministic for (date, profile) so they don't
 * change on refresh. Three different categories; level = player's unlocked
 * level for that game (so difficulty follows real progress).
 */
export function dailyChallenges(profileId: string, p: ProgressState, day = dateKey()): { game: GameDef; level: number }[] {
  const rng = mulberry32(hashString(`${day}|${profileId}`))
  const cats = shuffle(CATEGORIES.map((c) => c.id), rng).slice(0, 3)
  return cats.map((cat) => {
    const pool = GAMES.filter((g) => g.category === cat)
    const game = pool[Math.floor(rng() * pool.length)]
    return { game, level: p.unlocked[game.id] ?? 1 }
  })
}

/** Seed for a daily game so the puzzle is the same all day. */
export function dailySeed(profileId: string, gameId: string, day = dateKey()) {
  return hashString(`${day}|${profileId}|${gameId}`)
}

export interface Mission {
  id: string
  title: string
  icon: string
  goal: number
  value: number
  reward: number
  scope: 'daily' | 'weekly'
}

export function missions(p: ProgressState): Mission[] {
  const today = dateKey()
  const ws = weekStart()
  const todays = p.history.filter((r) => dateKey(r.at) === today)
  const week = p.history.filter((r) => r.at >= ws)
  const wk = new Date(ws).toISOString().slice(0, 10)
  return [
    { id: `d-play3-${today}`, title: 'Play 3 games today', icon: '🎮', goal: 3, value: todays.length, reward: 15, scope: 'daily' },
    { id: `d-star-${today}`, title: 'Earn 3 stars in a game', icon: '⭐', goal: 1, value: todays.some((r) => r.stars === 3) ? 1 : 0, reward: 20, scope: 'daily' },
    { id: `d-xp-${today}`, title: 'Earn 250 XP today', icon: '✨', goal: 250, value: todays.reduce((a, r) => a + r.xp, 0), reward: 20, scope: 'daily' },
    { id: `w-play20-${wk}`, title: 'Play 20 games this week', icon: '🏋️', goal: 20, value: week.length, reward: 60, scope: 'weekly' },
    { id: `w-cats-${wk}`, title: 'Train every category this week', icon: '🌈', goal: 8, value: new Set(week.map((r) => r.category)).size, reward: 80, scope: 'weekly' },
    { id: `w-pass-${wk}`, title: 'Pass 10 levels this week', icon: '🏅', goal: 10, value: week.filter((r) => r.passed).length, reward: 70, scope: 'weekly' },
  ]
}
