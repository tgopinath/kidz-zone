import { describe, expect, it } from 'vitest'
import { applyRecord, dailyCounts, emptyState, isMixDone, playerLevel, resetWorld, streak, totals, LOG_LIMIT, type MixItem } from './store'

const at = (day: string, h = 10) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00`).getTime()

describe('shared progress', () => {
  it('records an activity into the world summary and the log', () => {
    const s = applyRecord(emptyState(), 'garden', { id: 'L3', title: 'Word Garden level 3', stars: 2, level: 4, levelLabel: 'Seedling · level 4', at: at('2026-11-19') })
    expect(s.worlds.garden).toMatchObject({ stars: 2, xp: 20, plays: 1, level: 4, levelLabel: 'Seedling · level 4' })
    expect(s.log).toHaveLength(1)
    expect(s.log[0]).toMatchObject({ world: 'garden', id: 'L3', day: '2026-11-19' })
    expect(s.worlds.words.plays).toBe(0)
  })

  it('clamps stars to 0–3 and keeps the previous level when none is given', () => {
    let s = applyRecord(emptyState(), 'words', { id: 'a', title: 'a', stars: 9, xp: 50, level: 2, levelLabel: 'two' })
    s = applyRecord(s, 'words', { id: 'b', title: 'b', stars: -1 })
    expect(s.worlds.words.stars).toBe(3)
    expect(s.worlds.words.xp).toBe(50)
    expect(s.worlds.words.level).toBe(2)
    expect(s.worlds.words.levelLabel).toBe('two')
  })

  it('caps the log', () => {
    let s = emptyState()
    for (let i = 0; i < LOG_LIMIT + 25; i++) s = applyRecord(s, 'brain', { id: `g${i}`, title: 'g', stars: 1 })
    expect(s.log).toHaveLength(LOG_LIMIT)
    expect(s.log[0].id).toBe('g25')
    expect(s.worlds.brain.plays).toBe(LOG_LIMIT + 25)
  })

  it('totals stars, XP and plays across worlds', () => {
    let s = applyRecord(emptyState(), 'maps', { id: 'quiz', title: 'q', stars: 3, xp: 40 })
    s = applyRecord(s, 'shop', { id: 'shop', title: 's', stars: 1 })
    expect(totals(s)).toEqual({ stars: 4, xp: 50, plays: 2 })
  })

  it('computes player levels', () => {
    expect(playerLevel(0)).toMatchObject({ level: 1, into: 0, need: 100 })
    expect(playerLevel(100)).toMatchObject({ level: 2, into: 0, need: 150 })
    expect(playerLevel(260).level).toBe(3)
  })

  it('counts a streak that ends today or yesterday', () => {
    let s = emptyState()
    for (const d of ['2026-11-16', '2026-11-17', '2026-11-18']) s = applyRecord(s, 'pets', { id: 'care', title: 'c', at: at(d) })
    expect(streak(s, '2026-11-18')).toBe(3)
    expect(streak(s, '2026-11-19')).toBe(3) // not played yet today: the streak survives until tomorrow
    expect(streak(s, '2026-11-20')).toBe(0)
  })

  it('builds per-day counts for the chart', () => {
    let s = applyRecord(emptyState(), 'money', { id: 'challenge', title: 'c', at: at('2026-11-19') })
    s = applyRecord(s, 'money', { id: 'challenge', title: 'c', at: at('2026-11-19', 15) })
    s = applyRecord(s, 'words', { id: 'x', title: 'x', at: at('2026-11-01') }) // outside the window
    const rows = dailyCounts(s, 7, '2026-11-19')
    expect(rows).toHaveLength(7)
    expect(rows[6]).toMatchObject({ day: '2026-11-19', money: 2, words: 0 })
    expect(rows.reduce((n, r) => n + r.words, 0)).toBe(0)
  })

  it('marks a mix item done by its activity id, or by any activity for world-wide items', () => {
    const item: MixItem = { world: 'puzzles', activityId: 'maze', title: 'Mazes', subtitle: '', href: '/puzzles/play/maze' }
    const any: MixItem = { world: 'pets', activityId: 'care', anyInWorld: true, title: 'Pet', subtitle: '', href: '/pets' }
    let s = applyRecord(emptyState(), 'puzzles', { id: 'jigsaw', title: 'j', at: at('2026-11-19') })
    s = applyRecord(s, 'pets', { id: 'game:ball', title: 'g', at: at('2026-11-19') })
    expect(isMixDone(s, item, '2026-11-19')).toBe(false)
    expect(isMixDone(s, any, '2026-11-19')).toBe(true)
    s = applyRecord(s, 'puzzles', { id: 'maze', title: 'm', at: at('2026-11-19') })
    expect(isMixDone(s, item, '2026-11-19')).toBe(true)
    expect(isMixDone(s, item, '2026-11-20')).toBe(false)
  })

  it('resets one world without touching the others', () => {
    let s = applyRecord(emptyState(), 'brain', { id: 'a', title: 'a', stars: 2 })
    s = applyRecord(s, 'words', { id: 'b', title: 'b', stars: 1 })
    s = resetWorld(s, 'brain')
    expect(s.worlds.brain.plays).toBe(0)
    expect(s.worlds.words.plays).toBe(1)
    expect(s.log.map((a) => a.world)).toEqual(['words'])
  })
})
