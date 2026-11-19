/**
 * First-run import from the eight original apps. Every world keeps its original localStorage key, so its own
 * screens pick that data up automatically when KidZ Zone runs on the same origin as the old app. This module
 * only builds the shared summary (stars, XP, plays, level) and a profile name from those keys.
 * The original apps lived on their own Vercel domains, so on kidz-zone's domain this normally finds nothing.
 */
import type { WorldId, WorldProgress } from './store'

export interface LegacySummary {
  key: string
  world: WorldId
  summary: Partial<WorldProgress>
  name?: string
}

type Get = (key: string) => string | null

const json = <T,>(get: Get, key: string): T | null => {
  try {
    const raw = get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function summarizeLegacy(get: Get): LegacySummary[] {
  const out: LegacySummary[] = []

  const garden = json<{ stars?: Record<string, number>; name?: string }>(get, 'word-garden-v2')
  if (garden?.stars) {
    const vals = Object.values(garden.stars)
    let next = 1
    while (garden.stars[next]) next++
    out.push({ key: 'word-garden-v2', world: 'garden', name: garden.name || undefined, summary: { stars: vals.reduce((a, b) => a + b, 0), xp: vals.reduce((a, b) => a + b, 0) * 10, plays: vals.length, level: Math.min(next, 40), levelLabel: `Level ${Math.min(next, 40)}` } })
  }

  const ww = json<{ profiles?: { id: string; name: string }[]; activeProfileId?: string; progress?: Record<string, { stars: number; lessons: Record<string, unknown> }> }>(get, 'wordwonders:v1')
  if (ww?.progress && ww.activeProfileId && ww.progress[ww.activeProfileId]) {
    const p = ww.progress[ww.activeProfileId]
    const name = ww.profiles?.find((x) => x.id === ww.activeProfileId)?.name
    out.push({ key: 'wordwonders:v1', world: 'words', name: name && name !== 'Little Explorer' ? name : undefined, summary: { stars: p.stars, xp: p.stars * 10, plays: Object.keys(p.lessons ?? {}).length } })
  }

  const bg = json<{ profiles?: { profile: { id: string; name: string }; progress: { xp: number; history: { stars: number }[] } }[]; activeId?: string | null }>(get, 'braingym:v1')
  const bgActive = bg?.profiles?.find((d) => d.profile.id === bg.activeId) ?? bg?.profiles?.[0]
  if (bgActive) {
    const h = bgActive.progress.history ?? []
    out.push({ key: 'braingym:v1', world: 'brain', name: bgActive.profile.name, summary: { stars: h.reduce((a, r) => a + (r.stars ?? 0), 0), xp: bgActive.progress.xp ?? 0, plays: h.length } })
  }

  const pq = json<{ children?: { id: string; name: string; stars: number; xp: number }[]; activeChildId?: string | null; attempts?: { childId: string }[] }>(get, 'puzzle-quest/v1')
  const pqChild = pq?.children?.find((c) => c.id === pq.activeChildId) ?? pq?.children?.[0]
  if (pqChild) {
    out.push({ key: 'puzzle-quest/v1', world: 'puzzles', name: pqChild.name, summary: { stars: pqChild.stars, xp: pqChild.xp, plays: (pq?.attempts ?? []).filter((a) => a.childId === pqChild.id).length } })
  }

  const maps = json<{ points?: number; quizzes?: { stars: number }[]; games?: Record<string, { plays: number }> }>(get, 'imx-progress-v1')
  if (maps && (maps.points || maps.quizzes?.length)) {
    const plays = (maps.quizzes?.length ?? 0) + Object.values(maps.games ?? {}).reduce((a, g) => a + g.plays, 0)
    out.push({ key: 'imx-progress-v1', world: 'maps', summary: { stars: (maps.quizzes ?? []).reduce((a, q) => a + q.stars, 0), xp: maps.points ?? 0, plays } })
  }

  const money = json<string[]>(get, 'money-master:stars')
  if (money?.length) out.push({ key: 'money-master:stars', world: 'money', summary: { stars: money.length * 3, xp: money.length * 15, plays: money.length } })

  const pets = json<{ state?: { player?: { name?: string; xp?: number }; pets?: unknown[] } }>(get, 'vpu-save-v1')
  if (pets?.state?.pets?.length) {
    const n = pets.state.player?.name
    out.push({ key: 'vpu-save-v1', world: 'pets', name: n && n !== 'Pet Pal' ? n : undefined, summary: { xp: pets.state.player?.xp ?? 0, plays: pets.state.pets.length } })
  }
  // My Supermarket saves to IndexedDB (async), so its totals are picked up by the Shop world itself.
  return out
}
