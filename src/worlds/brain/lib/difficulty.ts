import type { AgeGroup, DifficultyPref } from '../types'

export const MAX_LEVEL = 10

export const LEVEL_NAMES = [
  'Beginner',
  'Explorer',
  'Thinker',
  'Problem Solver',
  'Brain Master',
  'Genius',
  'Expert',
  'Champion',
  'Mastermind',
  'Grand Master',
] as const

export function levelName(level: number): string {
  return LEVEL_NAMES[Math.min(MAX_LEVEL, Math.max(1, level)) - 1]
}

export const AGE_GROUPS: { id: AgeGroup; label: string; short: string }[] = [
  { id: 'kids57', label: 'Kids · 5–7 years', short: '5–7' },
  { id: 'kids810', label: 'Kids · 8–10 years', short: '8–10' },
  { id: 'kids1112', label: 'Kids · 11–12 years', short: '11–12' },
  { id: 'teen', label: 'Teenager', short: 'Teen' },
  { id: 'adult', label: 'Adult', short: 'Adult' },
]

const AGE_OFFSET: Record<AgeGroup, number> = { kids57: -3, kids810: -2, kids1112: -1, teen: 0, adult: 1 }
const AGE_TIME: Record<AgeGroup, number> = { kids57: 1.8, kids810: 1.45, kids1112: 1.2, teen: 1.05, adult: 1 }
const PREF_OFFSET: Record<DifficultyPref, number> = { easy: -1, normal: 0, hard: 1 }

/**
 * Everything a game needs to scale itself. `d` is the effective difficulty
 * (1 = gentlest, 12 = hardest), derived from the game level, the player's age
 * group and their difficulty preference – never random.
 */
export interface Difficulty {
  level: number
  d: number
  /** Multiply any time limit / display time by this. */
  time: number
  ageGroup: AgeGroup
  /** Young kids get simpler wording, emoji and smaller numbers. */
  young: boolean
}

export function getDifficulty(level: number, ageGroup: AgeGroup, pref: DifficultyPref): Difficulty {
  const d = Math.min(12, Math.max(1, level + AGE_OFFSET[ageGroup] + PREF_OFFSET[pref]))
  const prefTime = pref === 'easy' ? 1.2 : pref === 'hard' ? 0.85 : 1
  return {
    level,
    d,
    time: AGE_TIME[ageGroup] * prefTime,
    ageGroup,
    young: ageGroup === 'kids57' || ageGroup === 'kids810',
  }
}

/** Accuracy required to pass a level (and unlock the next one). */
export function passAccuracy(level: number): number {
  return Math.min(0.85, 0.6 + level * 0.025)
}

/** Player level from total XP: each level needs a little more XP than the last. */
export function playerLevelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1
  let need = 250
  let rest = xp
  while (rest >= need && level < 99) {
    rest -= need
    level++
    need = Math.round(need * 1.18)
  }
  return { level, into: rest, need }
}
