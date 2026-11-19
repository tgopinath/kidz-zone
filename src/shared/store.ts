/**
 * KidZ Zone shared layer: one child profile, one settings object and one progress summary for all eight worlds.
 * Each world keeps its own detailed store (under its original localStorage key, so data from the original app is
 * picked up when it lives on the same origin) and reports finished activities here through `record()`.
 * Plain TypeScript + a tiny listener set, read in React through `useShared()` (useSyncExternalStore).
 */
import { useSyncExternalStore } from 'react'

export const WORLD_IDS = ['words', 'garden', 'money', 'puzzles', 'brain', 'pets', 'maps', 'shop'] as const
export type WorldId = (typeof WORLD_IDS)[number]
export type AgeBand = '4-6' | '7-9' | '10-12'
export type VoiceSpeed = 'slow' | 'normal' | 'fast'
export type TextSize = 'normal' | 'large' | 'larger'

export interface ChildProfile {
  name: string
  ageBand: AgeBand
  /** colour key for the initials avatar (see AVATAR_COLOURS) */
  avatar: string
  createdAt: number
}

export interface Settings {
  sound: boolean
  voice: VoiceSpeed
  textSize: TextSize
  reducedMotion: boolean
}

export interface Activity {
  world: WorldId
  /** world-specific id, e.g. a game id, lesson id or garden level ("L12") */
  id: string
  title: string
  stars: number
  xp: number
  at: number
  /** local date key YYYY-MM-DD */
  day: string
}

export interface WorldProgress {
  stars: number
  xp: number
  plays: number
  /** the world's own idea of "level" (garden level, puzzle difficulty, brain player level…) */
  level: number
  levelLabel: string
  lastAt: number
}

export interface MixItem {
  world: WorldId
  activityId: string
  /** when true any finished activity in the world counts */
  anyInWorld?: boolean
  title: string
  subtitle: string
  href: string
}

export interface SharedState {
  version: 1
  profile: ChildProfile | null
  settings: Settings
  worlds: Record<WorldId, WorldProgress>
  log: Activity[]
  /** play money (rupees) earned in Money and Shop, spendable in Shop */
  wallet: number
  mix: { day: string; items: MixItem[] } | null
  /** legacy app keys already summarised into `worlds` */
  imported: string[]
}

export const STORAGE_KEY = 'kidzzone:v1'
export const LOG_LIMIT = 2000

export const DEFAULT_SETTINGS: Settings = { sound: true, voice: 'normal', textSize: 'normal', reducedMotion: false }

export const emptyWorld = (): WorldProgress => ({ stars: 0, xp: 0, plays: 0, level: 0, levelLabel: '', lastAt: 0 })

export function emptyState(): SharedState {
  return {
    version: 1,
    profile: null,
    settings: { ...DEFAULT_SETTINGS },
    worlds: Object.fromEntries(WORLD_IDS.map((w) => [w, emptyWorld()])) as Record<WorldId, WorldProgress>,
    log: [],
    wallet: 0,
    mix: null,
    imported: [],
  }
}

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ---------- pure reducers (unit-tested) ---------- */

export interface RecordInput {
  id: string
  title: string
  stars?: number
  xp?: number
  level?: number
  levelLabel?: string
  at?: number
}

export function applyRecord(s: SharedState, world: WorldId, r: RecordInput): SharedState {
  const at = r.at ?? Date.now()
  const stars = Math.max(0, Math.min(3, Math.round(r.stars ?? 0)))
  const xp = Math.max(0, Math.round(r.xp ?? stars * 10))
  const a: Activity = { world, id: r.id, title: r.title, stars, xp, at, day: dayKey(new Date(at)) }
  const w = s.worlds[world] ?? emptyWorld()
  const next: WorldProgress = {
    stars: w.stars + stars,
    xp: w.xp + xp,
    plays: w.plays + 1,
    level: r.level ?? w.level,
    levelLabel: r.levelLabel ?? w.levelLabel,
    lastAt: at,
  }
  const log = [...s.log, a]
  return { ...s, worlds: { ...s.worlds, [world]: next }, log: log.length > LOG_LIMIT ? log.slice(-LOG_LIMIT) : log }
}

export function totals(s: SharedState) {
  const ws = Object.values(s.worlds)
  return { stars: ws.reduce((n, w) => n + w.stars, 0), xp: ws.reduce((n, w) => n + w.xp, 0), plays: ws.reduce((n, w) => n + w.plays, 0) }
}

/** Player level from total XP: 100 XP for level 2, then each level needs 50 XP more than the last. */
export function playerLevel(xp: number) {
  let level = 1
  let need = 100
  let left = xp
  while (left >= need) {
    left -= need
    level++
    need += 50
  }
  return { level, into: left, need, pct: left / need }
}

/** Consecutive days with at least one activity, ending today (or yesterday, so a streak survives until bedtime). */
export function streak(s: SharedState, today = dayKey()): number {
  const days = new Set(s.log.map((a) => a.day))
  const d = new Date(`${today}T12:00:00`)
  if (!days.has(today)) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(dayKey(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

/** Activities per world for the last `n` days (oldest first), for the parent chart. */
export function dailyCounts(s: SharedState, n = 14, today = dayKey()) {
  const end = new Date(`${today}T12:00:00`)
  const rows: ({ day: string; label: string } & Record<WorldId, number>)[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    const row = { day: key, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) } as { day: string; label: string } & Record<WorldId, number>
    for (const w of WORLD_IDS) row[w] = 0
    rows.push(row)
  }
  const idx = new Map(rows.map((r, i) => [r.day, i]))
  for (const a of s.log) {
    const i = idx.get(a.day)
    if (i !== undefined) rows[i][a.world]++
  }
  return rows
}

export function isMixDone(s: SharedState, item: MixItem, today = dayKey()): boolean {
  return s.log.some((a) => a.day === today && a.world === item.world && (item.anyInWorld || a.id === item.activityId))
}

export function resetWorld(s: SharedState, world: WorldId): SharedState {
  return { ...s, worlds: { ...s.worlds, [world]: emptyWorld() }, log: s.log.filter((a) => a.world !== world) }
}

/* ---------- store ---------- */

function load(): SharedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as SharedState
      if (s.version === 1) {
        const base = emptyState()
        return { ...base, ...s, settings: { ...base.settings, ...s.settings }, worlds: { ...base.worlds, ...s.worlds } }
      }
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return emptyState()
}

let state: SharedState = typeof localStorage === 'undefined' ? emptyState() : load()
const listeners = new Set<() => void>()

function commit(next: SharedState) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota or private mode: keep going in memory */
  }
  listeners.forEach((l) => l())
}

export const shared = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  setProfile(p: Omit<ChildProfile, 'createdAt'> & { createdAt?: number }) {
    commit({ ...state, profile: { createdAt: state.profile?.createdAt ?? Date.now(), ...p } })
  },
  updateSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } })
  },
  record(world: WorldId, r: RecordInput) {
    commit(applyRecord(state, world, r))
  },
  setWorldLevel(world: WorldId, level: number, levelLabel: string) {
    const w = state.worlds[world]
    if (w.level === level && w.levelLabel === levelLabel) return
    commit({ ...state, worlds: { ...state.worlds, [world]: { ...w, level, levelLabel } } })
  },
  addMoney(rupees: number) {
    commit({ ...state, wallet: Math.max(0, state.wallet + Math.round(rupees)) })
  },
  /** Take play money out of the jar; returns false when there is not enough. */
  spendMoney(rupees: number): boolean {
    if (rupees <= 0 || state.wallet < rupees) return false
    commit({ ...state, wallet: state.wallet - Math.round(rupees) })
    return true
  },
  setMix(day: string, items: MixItem[]) {
    commit({ ...state, mix: { day, items } })
  },
  importSummary(key: string, world: WorldId, w: Partial<WorldProgress>) {
    if (state.imported.includes(key)) return
    const cur = state.worlds[world]
    commit({
      ...state,
      imported: [...state.imported, key],
      worlds: { ...state.worlds, [world]: { ...cur, ...w, stars: cur.stars + (w.stars ?? 0), xp: cur.xp + (w.xp ?? 0), plays: cur.plays + (w.plays ?? 0) } },
    })
  },
  markImported(key: string) {
    if (!state.imported.includes(key)) commit({ ...state, imported: [...state.imported, key] })
  },
  resetWorld(world: WorldId) {
    commit(resetWorld(state, world))
  },
  resetAll() {
    commit({ ...emptyState(), profile: state.profile, settings: state.settings, imported: state.imported })
  },
  /** test helper */
  _replace(next: SharedState) {
    state = next
    listeners.forEach((l) => l())
  },
}

export function useShared(): SharedState {
  return useSyncExternalStore(shared.subscribe, shared.get, shared.get)
}

/** Fire-and-forget reporter used by the worlds. */
export const record = (world: WorldId, r: RecordInput) => shared.record(world, r)
