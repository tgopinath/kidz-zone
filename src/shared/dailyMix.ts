/**
 * Today's mix: a few short activities picked across worlds for the child's age, the same all day.
 * Pure and seeded from the date and the child's name, so it survives reloads; the store keeps the
 * first mix of the day so it does not change while the child plays.
 */
import type { AgeBand, MixItem, WorldId } from './store'
import { WORLDS } from './worlds'

export interface MixContext {
  day: string
  name: string
  ageBand: AgeBand
  /** next unfinished Word Garden level (1–40) */
  gardenNext: number
}

/* Lightweight catalogue (ids and titles only) so Home does not load the worlds' code. */
export const BRAIN_GAMES: { id: string; title: string; ages: AgeBand[] }[] = [
  ['card-match', 'Card Matching', 'all'], ['object-memory', 'Object Memory', 'all'], ['sequence-recall', 'Sequence Recall', 'older'],
  ['find-different', 'Find the Different One', 'all'], ['target-finder', 'Target Finder', 'all'], ['distraction-test', 'Distraction Test', 'older'],
  ['complete-pattern', 'Complete the Pattern', 'all'], ['shape-patterns', 'Shape Patterns', 'all'], ['number-patterns', 'Number Patterns', 'older'],
  ['rotation-patterns', 'Rotation Patterns', 'older'], ['logic-questions', 'Logic Questions', 'older'], ['balance-challenge', 'Balance Challenge', 'older'],
  ['sequence-puzzle', 'Sequence Puzzle', 'all'], ['missing-number', 'Missing Number', 'all'], ['drag-math', 'Drag Maths', 'all'],
  ['arithmetic-race', 'Arithmetic Race', 'older'], ['jigsaw', 'Jigsaw Picture', 'all'], ['kids-sudoku', 'Mini Sudoku', 'older'],
  ['maze', 'Mouse Maze', 'all'], ['sliding-puzzle', 'Sliding Tiles', 'older'], ['tangram', 'Shape Builder', 'all'],
  ['word-scramble', 'Word Scramble', 'older'], ['mirror-image', 'Mirror Image', 'all'], ['shadow-match', 'Shadow Match', 'all'],
  ['shape-rotation', 'Shape Rotation', 'older'], ['color-word', 'Colour Words', 'older'], ['reaction-test', 'Reaction Test', 'all'],
  ['symbol-spot', 'Symbol Spot', 'all'], ['fast-compare', 'Fast Compare', 'older'],
].map(([id, title, a]) => ({ id, title, ages: a === 'all' ? (['4-6', '7-9', '10-12'] as AgeBand[]) : (['7-9', '10-12'] as AgeBand[]) }))

export const PUZZLE_TYPES: { id: string; title: string }[] = [
  { id: 'jigsaw', title: 'Jigsaw' }, { id: 'shapes', title: 'Shapes' }, { id: 'number', title: 'Numbers' }, { id: 'arrange', title: 'Picture stories' },
  { id: 'memory', title: 'Memory cards' }, { id: 'logic', title: 'Logic' }, { id: 'pattern', title: 'Patterns' }, { id: 'maze', title: 'Mazes' },
]

/** Word Wonders categories by level (1 = youngest). */
export const WORD_CATEGORIES: { id: string; name: string; level: 1 | 2 | 3 }[] = [
  ['fruits', 'Fruits', 1], ['vegetables', 'Vegetables', 1], ['animals', 'Animals', 1], ['birds', 'Birds', 1], ['sea', 'Sea Animals', 1],
  ['body', 'Body Parts', 1], ['colors', 'Colors', 1], ['shapes', 'Shapes', 1], ['numbers', 'Numbers', 1], ['school', 'School Objects', 1],
  ['clothes', 'Clothes', 1], ['food', 'Food and Drinks', 1], ['everyday', 'Everyday Objects', 1], ['insects', 'Insects', 2],
  ['vehicles', 'Vehicles', 2], ['household', 'Household Objects', 2], ['kitchen', 'Kitchen Items', 2], ['nature', 'Nature', 2],
  ['weather', 'Weather', 2], ['occupations', 'Occupations', 2], ['sports', 'Sports', 2], ['emotions', 'Emotions', 3],
  ['actions', 'Action Words', 3], ['opposites', 'Opposite Words', 3],
].map(([id, name, level]) => ({ id: id as string, name: name as string, level: level as 1 | 2 | 3 }))

export const MAP_GAMES: { id: string; title: string; href: string }[] = [
  { id: 'daily', title: 'Daily geography challenge', href: '/maps/games/daily' },
  { id: 'identify-state', title: 'Identify the State', href: '/maps/games/identify-state' },
  { id: 'find-capital', title: 'Find the State Capital', href: '/maps/games/find-capital' },
  { id: 'guess-capital', title: 'Guess the Capital', href: '/maps/games/guess-capital' },
  { id: 'match-flags', title: 'Match the Flags', href: '/maps/games/match-flags' },
  { id: 'continent-challenge', title: 'Continent Challenge', href: '/maps/games/continent-challenge' },
  { id: 'food-explorer', title: 'Food Explorer', href: '/maps/games/food-explorer' },
]

/** mulberry32 on a string hash */
export function seeded(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(rng: () => number, xs: T[]) => xs[Math.floor(rng() * xs.length)]

function itemFor(world: WorldId, ctx: MixContext, rng: () => number): MixItem {
  const young = ctx.ageBand === '4-6'
  switch (world) {
    case 'garden': {
      const lv = Math.min(40, Math.max(1, ctx.gardenNext))
      return { world, activityId: `L${lv}`, title: `Word Garden level ${lv}`, subtitle: 'Five picture cards', href: `/garden?level=${lv}` }
    }
    case 'words': {
      const maxLevel = young ? 1 : ctx.ageBand === '7-9' ? 2 : 3
      const c = pick(rng, WORD_CATEGORIES.filter((w) => w.level <= maxLevel))
      return { world, activityId: `find:${c.id}-L1`, title: `${c.name}: find the object`, subtitle: 'Hear a word, tap the picture', href: `/words/play/find/${c.id}-L1` }
    }
    case 'money':
      return { world, activityId: 'challenge', anyInWorld: true, title: 'A money challenge', subtitle: 'Make the amount with real notes and coins', href: '/money?view=challenges' }
    case 'puzzles': {
      const p = pick(rng, PUZZLE_TYPES)
      return { world, activityId: p.id, title: `${p.title} puzzle`, subtitle: 'It adapts as you play', href: `/puzzles/play/${p.id}` }
    }
    case 'brain': {
      const g = pick(rng, BRAIN_GAMES.filter((b) => b.ages.includes(ctx.ageBand)))
      return { world, activityId: g.id, title: g.title, subtitle: 'A one-minute brain game', href: `/brain/play/${g.id}` }
    }
    case 'pets':
      return { world, activityId: 'care', anyInWorld: true, title: 'Look after your pet', subtitle: 'Feed, play or train it', href: '/pets' }
    case 'maps': {
      const g = young ? MAP_GAMES[0] : pick(rng, MAP_GAMES)
      return { world, activityId: g.id, title: g.title, subtitle: 'India and the world', href: g.href }
    }
    case 'shop':
      return { world, activityId: 'shop', anyInWorld: true, title: 'Go shopping', subtitle: 'Fill a trolley and pay at the till', href: '/shop' }
  }
}

/** Four activities from four different worlds that suit the age band, in a seeded order. */
export function dailyMix(ctx: MixContext, size = 4): MixItem[] {
  const rng = seeded(`${ctx.day}|${ctx.name.trim().toLowerCase()}|${ctx.ageBand}`)
  const eligible = WORLDS.filter((w) => w.ages.includes(ctx.ageBand)).map((w) => w.id)
  // Fisher–Yates with the seeded generator
  const order = [...eligible]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  // Always one learning world first, so the mix is not all games.
  const learnFirst = order.findIndex((w) => w === 'words' || w === 'garden' || w === 'money')
  if (learnFirst > 0) order.unshift(...order.splice(learnFirst, 1))
  return order.slice(0, size).map((w) => itemFor(w, ctx, rng))
}
