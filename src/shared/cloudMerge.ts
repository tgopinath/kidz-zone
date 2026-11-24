/**
 * How a device's saves and the grown-up's cloud copy are combined on sign-in (pure, unit-tested).
 * Rule of thumb: never lose progress. The shared summary is merged world by world (the side with more XP wins),
 * activity logs are joined, the jar keeps the larger amount; each world's own save comes from whichever side
 * has more progress in that world. This device keeps its own settings and child profile when it has one.
 */
import { LOG_LIMIT, STORAGE_KEY, WORLD_IDS, type SharedState, type WorldId, type WorldProgress } from './store'

/** localStorage keys kept in the grown-up's account, and the world each one belongs to. */
export const SYNC_KEYS: { key: string; world: WorldId | null; prefix?: boolean }[] = [
  { key: STORAGE_KEY, world: null },
  { key: 'wordwonders:v1', world: 'words' },
  { key: 'word-garden-v2', world: 'garden' },
  { key: 'money-master:', world: 'money', prefix: true },
  { key: 'puzzle-quest/v1', world: 'puzzles' },
  { key: 'braingym:v1', world: 'brain' },
  { key: 'vpu-save-v1', world: 'pets' },
  { key: 'imx-progress-v1', world: 'maps' },
]

export const isSynced = (k: string) => SYNC_KEYS.some((s) => (s.prefix ? k.startsWith(s.key) : k === s.key))
export const worldOfKey = (k: string): WorldId | null => SYNC_KEYS.find((s) => (s.prefix ? k.startsWith(s.key) : k === s.key))?.world ?? null

const better = (a: WorldProgress, b: WorldProgress) => (a.xp !== b.xp ? a.xp > b.xp : a.plays !== b.plays ? a.plays > b.plays : a.lastAt >= b.lastAt)

/** Merge two shared summaries without losing progress from either. */
export function mergeShared(local: SharedState | null, cloud: SharedState | null): SharedState | null {
  if (!local) return cloud
  if (!cloud) return local
  const worlds = { ...local.worlds }
  for (const w of WORLD_IDS) {
    const a = local.worlds[w]
    const b = cloud.worlds?.[w]
    if (!a) worlds[w] = b
    else if (b && !better(a, b)) worlds[w] = b
  }
  const seen = new Set<string>()
  const log = [...(local.log ?? []), ...(cloud.log ?? [])]
    .filter((x) => {
      const k = `${x.world}|${x.id}|${x.at}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((x, y) => x.at - y.at)
    .slice(-LOG_LIMIT)
  return {
    ...local,
    profile: local.profile ?? cloud.profile,
    worlds,
    log,
    wallet: Math.max(local.wallet ?? 0, cloud.wallet ?? 0),
    mix: local.mix ?? cloud.mix,
    imported: [...new Set([...(local.imported ?? []), ...(cloud.imported ?? [])])],
  }
}

const parse = (v: string | undefined): SharedState | null => {
  if (!v) return null
  try {
    return JSON.parse(v) as SharedState
  } catch {
    return null
  }
}

/** Which side has more progress in a world, judged by the shared summaries ('local' on a tie). */
export function aheadIn(world: WorldId, local: SharedState | null, cloud: SharedState | null): 'local' | 'cloud' {
  const a = local?.worlds?.[world]
  const b = cloud?.worlds?.[world]
  if (!b) return 'local'
  if (!a) return 'cloud'
  return better(a, b) ? 'local' : 'cloud'
}

/** Merge every synced key. Returns the merged values and whether this device's saves change. */
export function mergeAll(local: Record<string, string>, cloud: Record<string, string>): { merged: Record<string, string>; changed: boolean } {
  const ls = parse(local[STORAGE_KEY])
  const cs = parse(cloud[STORAGE_KEY])
  const merged: Record<string, string> = {}
  const keys = new Set([...Object.keys(local), ...Object.keys(cloud)].filter(isSynced))
  for (const k of keys) {
    const a = local[k]
    const b = cloud[k]
    if (k === STORAGE_KEY) {
      const m = mergeShared(ls, cs)
      if (m) merged[k] = JSON.stringify(m)
      continue
    }
    if (a === undefined) merged[k] = b
    else if (b === undefined) merged[k] = a
    else {
      const w = worldOfKey(k)
      merged[k] = w && aheadIn(w, ls, cs) === 'cloud' ? b : a
    }
  }
  const changed = Object.keys(merged).some((k) => merged[k] !== local[k])
  return { merged, changed }
}
