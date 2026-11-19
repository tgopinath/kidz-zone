import { describe, expect, it } from 'vitest'
import { BRAIN_GAMES, dailyMix, seeded, WORD_CATEGORIES } from './dailyMix'
import { WORLDS } from './worlds'

const ctx = { day: '2026-11-19', name: 'Asha', ageBand: '7-9' as const, gardenNext: 5 }

describe("today's mix", () => {
  it('is the same all day for the same child', () => {
    expect(dailyMix(ctx)).toEqual(dailyMix({ ...ctx, name: '  asha ' }))
  })

  it('changes from day to day', () => {
    const days = ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'].map((day) => JSON.stringify(dailyMix({ ...ctx, day })))
    expect(new Set(days).size).toBeGreaterThan(1)
  })

  it('picks four different worlds and starts with a learning world', () => {
    for (const day of ['2026-11-19', '2026-12-01', '2027-01-05']) {
      const mix = dailyMix({ ...ctx, day })
      expect(mix).toHaveLength(4)
      expect(new Set(mix.map((m) => m.world)).size).toBe(4)
      expect(['words', 'garden', 'money']).toContain(mix[0].world)
    }
  })

  it('only uses worlds that suit the age band', () => {
    for (const ageBand of ['4-6', '7-9', '10-12'] as const) {
      for (let d = 1; d <= 20; d++) {
        const mix = dailyMix({ ...ctx, ageBand, day: `2026-11-${String(d).padStart(2, '0')}` })
        for (const m of mix) expect(WORLDS.find((w) => w.id === m.world)!.ages).toContain(ageBand)
      }
    }
  })

  it('sends Word Garden to the next unfinished level', () => {
    for (let d = 1; d <= 30; d++) {
      const g = dailyMix({ ...ctx, ageBand: '4-6', day: `2026-11-${String(d).padStart(2, '0')}` }).find((m) => m.world === 'garden')
      if (g) {
        expect(g).toMatchObject({ activityId: 'L5', href: '/garden?level=5' })
        return
      }
    }
    throw new Error('garden never picked for a 4–6 year old in 30 days')
  })

  it('keeps word categories and brain games within the age band', () => {
    for (let d = 1; d <= 28; d++) {
      for (const m of dailyMix({ ...ctx, ageBand: '4-6', day: `2026-02-${String(d).padStart(2, '0')}` })) {
        if (m.world === 'words') expect(WORD_CATEGORIES.find((c) => m.activityId === `find:${c.id}-L1`)!.level).toBe(1)
        if (m.world === 'brain') expect(BRAIN_GAMES.find((g) => g.id === m.activityId)!.ages).toContain('4-6')
      }
    }
  })

  it('has a repeatable seeded generator', () => {
    const a = seeded('x')
    const b = seeded('x')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})
