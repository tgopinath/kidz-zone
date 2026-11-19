import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppNotification, GameResult, Profile, ProfileData, ProgressState, Settings } from '../types'
import { storage } from '../lib/storage'
import { scoreOutcome, type RawOutcome } from '../lib/scoring'
import { dateKey } from '../lib/dates'
import { uid } from '../lib/random'
import { MAX_LEVEL, playerLevelFromXp } from '../lib/difficulty'
import { newlyEarned, type AchievementDef } from '../lib/achievements'
import { DAILY_BONUS, dailyChallenges, type Mission } from '../lib/daily'
import { gameById } from '../games/registry'
import { setMusic, setSound } from '../lib/sound'
import { record, useShared } from '../../../shared/store'

export const DEFAULT_SETTINGS: Settings = { sound: true, volume: 0.6, music: false, reducedMotion: false, highContrast: false }

const emptyProgress = (): ProgressState => ({
  xp: 0,
  coins: 0,
  unlocked: {},
  bests: {},
  history: [],
  achievements: {},
  playedDays: [],
  dailyDone: {},
  dailyRewarded: [],
  claimedMissions: [],
  notifications: [],
  targetsFound: 0,
})

export interface RecordInput {
  gameId: string
  level: number
  raw: RawOutcome
  reactions: number[]
  targets: number
  daily: boolean
}

export interface RecordOutcome {
  result: GameResult
  newAchievements: AchievementDef[]
  unlockedLevel: number | null
  playerLevelUp: number | null
  dailyBonus: boolean
  newBest: boolean
  previousBest: number | null
}

interface Ctx {
  profiles: ProfileData[]
  active: ProfileData | null
  settings: Settings
  createProfile: (p: Omit<Profile, 'id' | 'createdAt'>) => void
  updateProfile: (patch: Partial<Profile>) => void
  switchProfile: (id: string | null) => void
  deleteProfile: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  recordResult: (input: RecordInput) => RecordOutcome
  claimMission: (m: Mission) => void
  markAllRead: () => void
  resetProgress: () => void
}

const AppCtx = createContext<Ctx | null>(null)

function note(title: string, body: string, icon: string): AppNotification {
  return { id: uid(), title, body, icon, at: Date.now(), read: false }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<ProfileData[]>(() => storage.loadProfiles())
  const [activeId, setActiveId] = useState<string | null>(() => storage.loadActiveId())
  const [ownSettings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...(storage.loadSettings() ?? {}) }))
  // KidZ Zone: sound and reduced motion come from the shared Settings screen.
  const sh = useShared().settings
  const settings = useMemo<Settings>(() => ({ ...ownSettings, sound: sh.sound, reducedMotion: sh.reducedMotion }), [ownSettings, sh.sound, sh.reducedMotion])

  useEffect(() => storage.saveProfiles(profiles), [profiles])
  useEffect(() => storage.saveActiveId(activeId), [activeId])
  useEffect(() => {
    storage.saveSettings(settings)
    setSound(settings.sound, settings.volume)
  }, [settings])
  useEffect(() => {
    // Browsers only allow audio after a user gesture; start music on first interaction.
    if (!settings.music) {
      setMusic(false)
      return
    }
    const start = () => setMusic(true)
    window.addEventListener('pointerdown', start, { once: true })
    start()
    return () => window.removeEventListener('pointerdown', start)
  }, [settings.music])

  const active = profiles.find((p) => p.profile.id === activeId) ?? null

  const patchActive = useCallback(
    (fn: (d: ProfileData) => ProfileData) => {
      setProfiles((ps) => ps.map((d) => (d.profile.id === activeId ? fn(d) : d)))
    },
    [activeId],
  )

  const createProfile = useCallback((p: Omit<Profile, 'id' | 'createdAt'>) => {
    const profile: Profile = { ...p, id: uid(), createdAt: Date.now() }
    const progress = emptyProgress()
    progress.notifications.push(note(`Welcome, ${p.name}!`, 'Your brain gym is ready. Start with today’s daily challenge.', '👋'))
    setProfiles((ps) => [...ps, { profile, progress }])
    setActiveId(profile.id)
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => patchActive((d) => ({ ...d, profile: { ...d.profile, ...patch } })), [patchActive])

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((ps) => ps.filter((d) => d.profile.id !== id))
      if (id === activeId) setActiveId(null)
    },
    [activeId],
  )

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])

  const recordResult = useCallback(
    (input: RecordInput): RecordOutcome => {
      const d = profiles.find((x) => x.profile.id === activeId)
      if (!d) throw new Error('No active profile')
      const game = gameById(input.gameId)!
      const scored = scoreOutcome(input.raw, input.level)
      const rts = input.reactions
      const result: GameResult = {
        id: uid(),
        gameId: input.gameId,
        category: game.category,
        level: input.level,
        score: scored.score,
        correct: input.raw.correct,
        wrong: input.raw.wrong,
        accuracy: scored.accuracy,
        durationMs: input.raw.durationMs,
        avgReactionMs: rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : undefined,
        bestReactionMs: rts.length ? Math.round(Math.min(...rts)) : undefined,
        stars: scored.stars,
        passed: scored.passed,
        xp: scored.xp,
        coins: scored.coins,
        hintsUsed: input.raw.hintsUsed,
        daily: input.daily || undefined,
        at: Date.now(),
      }

      const p: ProgressState = structuredClone(d.progress)
      const today = dateKey()
      const beforeLevel = playerLevelFromXp(p.xp).level
      p.history.push(result)
      if (p.history.length > 1500) p.history = p.history.slice(-1500)
      p.xp += result.xp
      p.coins += result.coins
      p.targetsFound += input.targets
      if (!p.playedDays.includes(today)) p.playedDays.push(today)
      if (result.bestReactionMs && (!p.bestReactionMs || result.bestReactionMs < p.bestReactionMs)) p.bestReactionMs = result.bestReactionMs

      const bestKey = `${input.gameId}:${input.level}`
      const previousBest = p.bests[bestKey] ?? null
      const newBest = previousBest === null ? result.score > 0 : result.score > previousBest
      if (newBest) p.bests[bestKey] = result.score

      let unlockedLevel: number | null = null
      const cur = p.unlocked[input.gameId] ?? 1
      if (result.passed && input.level === cur && cur < MAX_LEVEL) {
        p.unlocked[input.gameId] = cur + 1
        unlockedLevel = cur + 1
        p.notifications.unshift(note('Level unlocked!', `${game.title} level ${cur + 1} is now open.`, '🔓'))
      } else if (!p.unlocked[input.gameId]) p.unlocked[input.gameId] = 1

      let dailyBonus = false
      if (input.daily && result.passed) {
        const done = new Set(p.dailyDone[today] ?? [])
        done.add(input.gameId)
        p.dailyDone[today] = [...done]
        const todays = dailyChallenges(d.profile.id, d.progress, today)
        if (todays.every((c) => done.has(c.game.id)) && !p.dailyRewarded.includes(today)) {
          p.dailyRewarded.push(today)
          p.xp += DAILY_BONUS.xp
          p.coins += DAILY_BONUS.coins
          dailyBonus = true
          p.notifications.unshift(note('Daily challenge complete!', `+${DAILY_BONUS.xp} XP and +${DAILY_BONUS.coins} coins.`, '🏆'))
        }
      }

      const earned = newlyEarned(p)
      for (const a of earned) {
        p.achievements[a.id] = Date.now()
        p.notifications.unshift(note(`Badge earned: ${a.title}`, a.description, a.icon))
      }
      const afterLevel = playerLevelFromXp(p.xp).level
      const playerLevelUp = afterLevel > beforeLevel ? afterLevel : null
      if (playerLevelUp) p.notifications.unshift(note(`You reached level ${afterLevel}!`, 'Keep training to climb higher.', '🚀'))
      p.notifications = p.notifications.slice(0, 60)

      setProfiles((ps) => ps.map((x) => (x.profile.id === d.profile.id ? { ...x, progress: p } : x)))
      const lvl = playerLevelFromXp(p.xp).level
      record('brain', { id: input.gameId, title: game.title, stars: result.stars, xp: result.xp, level: lvl, levelLabel: `Player level ${lvl}` })
      return { result, newAchievements: earned, unlockedLevel, playerLevelUp, dailyBonus, newBest, previousBest }
    },
    [profiles, activeId],
  )

  const claimMission = useCallback(
    (m: Mission) =>
      patchActive((d) => {
        if (d.progress.claimedMissions.includes(m.id) || m.value < m.goal) return d
        return {
          ...d,
          progress: { ...d.progress, coins: d.progress.coins + m.reward, claimedMissions: [...d.progress.claimedMissions, m.id].slice(-200) },
        }
      }),
    [patchActive],
  )

  const markAllRead = useCallback(
    () => patchActive((d) => ({ ...d, progress: { ...d.progress, notifications: d.progress.notifications.map((n) => ({ ...n, read: true })) } })),
    [patchActive],
  )

  const resetProgress = useCallback(() => patchActive((d) => ({ ...d, progress: emptyProgress() })), [patchActive])

  const value = useMemo<Ctx>(
    () => ({
      profiles,
      active,
      settings,
      createProfile,
      updateProfile,
      switchProfile: setActiveId,
      deleteProfile,
      updateSettings,
      recordResult,
      claimMission,
      markAllRead,
      resetProgress,
    }),
    [profiles, active, settings, createProfile, updateProfile, deleteProfile, updateSettings, recordResult, claimMission, markAllRead, resetProgress],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}

/** Convenience for screens that require a profile. */
export function useActive() {
  const { active } = useApp()
  if (!active) throw new Error('No active profile')
  return active
}
