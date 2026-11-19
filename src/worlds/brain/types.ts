export type CategoryId =
  | 'memory'
  | 'focus'
  | 'pattern'
  | 'logic'
  | 'number'
  | 'spatial'
  | 'speed'
  | 'puzzle'

/** Skill dimensions shown on the dashboard and analytics screens. */
export type SkillId = 'memory' | 'attention' | 'logic' | 'pattern' | 'spatial' | 'speed'

export type AgeGroup = 'kids57' | 'kids810' | 'kids1112' | 'teen' | 'adult'
export type DifficultyPref = 'easy' | 'normal' | 'hard'

export interface Profile {
  id: string
  name: string
  avatar: string
  ageGroup: AgeGroup
  difficulty: DifficultyPref
  createdAt: number
}

export interface Settings {
  sound: boolean
  volume: number // 0..1
  music: boolean
  reducedMotion: boolean
  highContrast: boolean
}

export interface GameResult {
  id: string
  gameId: string
  category: CategoryId
  level: number
  score: number
  correct: number
  wrong: number
  accuracy: number // 0..1
  durationMs: number
  avgReactionMs?: number
  bestReactionMs?: number
  stars: number // 0..3
  passed: boolean
  xp: number
  coins: number
  hintsUsed: number
  daily?: boolean
  at: number
}

export interface AppNotification {
  id: string
  title: string
  body: string
  icon: string
  at: number
  read: boolean
}

export interface ProgressState {
  xp: number
  coins: number
  /** Highest unlocked level per game id (1-based). */
  unlocked: Record<string, number>
  /** Best score per game id + level, key `${gameId}:${level}`. */
  bests: Record<string, number>
  bestReactionMs?: number
  history: GameResult[]
  achievements: Record<string, number> // id -> unlocked timestamp
  /** Local date keys (YYYY-MM-DD) on which the user played. */
  playedDays: string[]
  /** dateKey -> ids of completed daily challenge games */
  dailyDone: Record<string, string[]>
  dailyRewarded: string[]
  claimedMissions: string[]
  notifications: AppNotification[]
  targetsFound: number
}

export interface ProfileData {
  profile: Profile
  progress: ProgressState
}
