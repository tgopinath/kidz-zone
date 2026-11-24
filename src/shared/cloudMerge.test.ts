import { describe, expect, it } from 'vitest'
import { aheadIn, isSynced, mergeAll, mergeShared } from './cloudMerge'
import { emptyState, STORAGE_KEY, type SharedState } from './store'

const st = (patch: (s: SharedState) => void) => {
  const s = emptyState()
  patch(s)
  return s
}

describe('cloud merge', () => {
  it('keeps the higher progress in each world', () => {
    const local = st((s) => {
      s.worlds.words = { ...s.worlds.words, xp: 120, plays: 6, stars: 9 }
      s.worlds.maps = { ...s.worlds.maps, xp: 10, plays: 1 }
    })
    const cloud = st((s) => {
      s.worlds.words = { ...s.worlds.words, xp: 40, plays: 2 }
      s.worlds.maps = { ...s.worlds.maps, xp: 300, plays: 12, stars: 20 }
    })
    const m = mergeShared(local, cloud)!
    expect(m.worlds.words.xp).toBe(120)
    expect(m.worlds.maps.xp).toBe(300)
    expect(m.worlds.maps.stars).toBe(20)
  })

  it('joins activity logs without duplicates and keeps the larger jar', () => {
    const a = { world: 'brain' as const, id: 'odd', title: 'Odd', stars: 3, xp: 30, at: 1000, day: '2026-11-20' }
    const b = { ...a, at: 2000 }
    const m = mergeShared(st((s) => { s.log = [a]; s.wallet = 40 }), st((s) => { s.log = [a, b]; s.wallet = 90 }))!
    expect(m.log).toHaveLength(2)
    expect(m.wallet).toBe(90)
  })

  it("keeps this device's settings and child, takes the cloud child on a new device", () => {
    const child = { name: 'Asha', ageBand: '7-9' as const, avatar: 'teal', createdAt: 1 }
    const local = st((s) => { s.settings.sound = false })
    const cloud = st((s) => { s.profile = child; s.settings.sound = true })
    const m = mergeShared(local, cloud)!
    expect(m.settings.sound).toBe(false)
    expect(m.profile?.name).toBe('Asha')
  })

  it('takes each world save from the side that is ahead in that world', () => {
    const ls = st((s) => { s.worlds.garden = { ...s.worlds.garden, xp: 500 } })
    const cs = st((s) => { s.worlds.brain = { ...s.worlds.brain, xp: 500 } })
    expect(aheadIn('garden', ls, cs)).toBe('local')
    expect(aheadIn('brain', ls, cs)).toBe('cloud')
    const { merged, changed } = mergeAll(
      { [STORAGE_KEY]: JSON.stringify(ls), 'word-garden-v2': 'LOCAL-GARDEN', 'braingym:v1': 'LOCAL-BRAIN', 'other-app': 'x' },
      { [STORAGE_KEY]: JSON.stringify(cs), 'word-garden-v2': 'CLOUD-GARDEN', 'braingym:v1': 'CLOUD-BRAIN', 'money-master:stars': '["c0"]' },
    )
    expect(merged['word-garden-v2']).toBe('LOCAL-GARDEN')
    expect(merged['braingym:v1']).toBe('CLOUD-BRAIN')
    expect(merged['money-master:stars']).toBe('["c0"]')
    expect(merged['other-app']).toBeUndefined()
    expect(changed).toBe(true)
    expect(JSON.parse(merged[STORAGE_KEY]).worlds.brain.xp).toBe(500)
  })

  it('an empty cloud copy changes nothing on this device', () => {
    const local = { [STORAGE_KEY]: JSON.stringify(st((s) => { s.wallet = 5 })), 'braingym:v1': 'B' }
    const { merged, changed } = mergeAll(local, {})
    expect(changed).toBe(false)
    expect(merged['braingym:v1']).toBe('B')
  })

  it('syncs only progress keys', () => {
    expect(isSynced(STORAGE_KEY)).toBe(true)
    expect(isSynced('money-master:level')).toBe(true)
    expect(isSynced('kz-parent-unlocked')).toBe(false)
  })
})
