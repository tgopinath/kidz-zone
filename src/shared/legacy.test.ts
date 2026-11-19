import { describe, expect, it } from 'vitest'
import { summarizeLegacy } from './legacy'

const store = (o: Record<string, unknown>) => (k: string) => (k in o ? JSON.stringify(o[k]) : null)

describe('first-run import from the original apps', () => {
  it('finds nothing on a fresh origin', () => {
    expect(summarizeLegacy(store({}))).toEqual([])
  })

  it('summarises Word Garden stars and the next level', () => {
    const [g] = summarizeLegacy(store({ 'word-garden-v2': { stars: { 1: 3, 2: 2, 3: 1 }, name: 'Meera' } }))
    expect(g).toMatchObject({ world: 'garden', name: 'Meera', summary: { stars: 6, plays: 3, level: 4 } })
  })

  it('reads Brain Gym, Puzzle Quest, Word Wonders, Map Explorer, Money Master and Pets saves', () => {
    const found = summarizeLegacy(
      store({
        'braingym:v1': { activeId: 'p1', profiles: [{ profile: { id: 'p1', name: 'Arjun' }, progress: { xp: 120, history: [{ stars: 3 }, { stars: 1 }] } }] },
        'puzzle-quest/v1': { activeChildId: 'c1', children: [{ id: 'c1', name: 'Arjun', stars: 7, xp: 90 }], attempts: [{ childId: 'c1' }, { childId: 'c1' }, { childId: 'x' }] },
        'wordwonders:v1': { activeProfileId: 'w', profiles: [{ id: 'w', name: 'Little Explorer' }], progress: { w: { stars: 12, lessons: { a: {}, b: {} } } } },
        'imx-progress-v1': { points: 300, quizzes: [{ stars: 2 }], games: { daily: { plays: 2 } } },
        'money-master:stars': ['a', 'b'],
        'vpu-save-v1': { state: { player: { name: 'Pet Pal', xp: 40 }, pets: [{}] } },
      }),
    )
    const by = Object.fromEntries(found.map((f) => [f.world, f]))
    expect(by.brain.summary).toMatchObject({ stars: 4, xp: 120, plays: 2 })
    expect(by.puzzles.summary).toMatchObject({ stars: 7, xp: 90, plays: 2 })
    expect(by.words).toMatchObject({ name: undefined, summary: { stars: 12, plays: 2 } }) // default name is not a real name
    expect(by.maps.summary).toMatchObject({ stars: 2, xp: 300, plays: 3 })
    expect(by.money.summary).toMatchObject({ stars: 6, plays: 2 })
    expect(by.pets).toMatchObject({ name: undefined, summary: { xp: 40, plays: 1 } })
  })

  it('ignores corrupt saves', () => {
    expect(summarizeLegacy((k) => (k === 'braingym:v1' ? '{not json' : null))).toEqual([])
  })
})
