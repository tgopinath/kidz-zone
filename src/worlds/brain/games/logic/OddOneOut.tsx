import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, sample, shuffle, type Rng } from '../../lib/random'
import { createQuizGame, type QuizOption, type QuizQuestion } from '../shared/QuizEngine'
import { PALETTE, Shape, type ShapeKind } from '../shared/Shape'
import type { GameDef } from '../types'

type Tier = 'young' | 'mid' | 'adult'

interface Group {
  id: string
  /** Groups sharing a family overlap in meaning and are never paired. */
  family: string
  tier: Tier
  /** Plural description used in explanations: "the others are all …". */
  desc: string
  /** Singular description of a member: "X is …". */
  one: string
  items: string[]
}

const GROUPS: Group[] = [
  // young – emoji
  { id: 'animals', family: 'animal', tier: 'young', desc: 'farm and pet animals', one: 'an animal', items: ['🐶', '🐱', '🐮', '🐷', '🐸', '🐵', '🐰', '🦁', '🐔', '🐴'] },
  { id: 'vehicles', family: 'vehicle', tier: 'young', desc: 'vehicles', one: 'a vehicle', items: ['🚗', '🚌', '🚲', '✈️', '🚂', '🚀', '🛵', '🚤', '🚒', '🚜'] },
  { id: 'fruit', family: 'food', tier: 'young', desc: 'fruits', one: 'a fruit', items: ['🍎', '🍌', '🍇', '🍓', '🍉', '🍐', '🍒', '🍍', '🥝', '🍑'] },
  { id: 'clothes', family: 'clothes', tier: 'young', desc: 'clothes', one: 'something to wear', items: ['👕', '👖', '👗', '🧦', '🧢', '👟', '🧤', '🧣'] },
  { id: 'balls', family: 'toy', tier: 'young', desc: 'sports balls', one: 'a sports ball', items: ['⚽', '🏀', '🏈', '🎾', '⚾', '🏐'] },
  { id: 'veg', family: 'food', tier: 'young', desc: 'vegetables', one: 'a vegetable', items: ['🥕', '🥦', '🌽', '🥔', '🧅', '🥒', '🍆'] },
  { id: 'weather', family: 'weather', tier: 'young', desc: 'kinds of weather', one: 'weather', items: ['☀️', '🌧️', '❄️', '⛈️', '🌈', '🌪️'] },
  { id: 'tools', family: 'tool', tier: 'young', desc: 'tools', one: 'a tool', items: ['🔨', '🪛', '🔧', '🪚', '✂️', '🪓'] },
  // mid – words
  { id: 'colours', family: 'colour', tier: 'mid', desc: 'colours', one: 'not a colour', items: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Brown'] },
  { id: 'planets', family: 'space', tier: 'mid', desc: 'planets', one: 'not a planet', items: ['Mars', 'Venus', 'Jupiter', 'Saturn', 'Mercury', 'Neptune', 'Uranus'] },
  { id: 'instruments', family: 'music', tier: 'mid', desc: 'musical instruments', one: 'not an instrument', items: ['Piano', 'Guitar', 'Violin', 'Drum', 'Flute', 'Trumpet', 'Harp'] },
  { id: 'countries', family: 'place', tier: 'mid', desc: 'countries', one: 'not a country', items: ['France', 'Japan', 'Brazil', 'Kenya', 'Canada', 'Egypt', 'India'] },
  { id: 'body', family: 'body', tier: 'mid', desc: 'parts of the body', one: 'not a body part', items: ['Elbow', 'Knee', 'Ankle', 'Shoulder', 'Wrist', 'Thumb', 'Chin'] },
  { id: 'furniture', family: 'home', tier: 'mid', desc: 'furniture', one: 'not furniture', items: ['Chair', 'Table', 'Sofa', 'Wardrobe', 'Bed', 'Desk'] },
  { id: 'sports', family: 'sport', tier: 'mid', desc: 'sports', one: 'not a sport', items: ['Tennis', 'Football', 'Cricket', 'Hockey', 'Rugby', 'Golf'] },
  // adult – subtler sets
  { id: 'mammals', family: 'animal', tier: 'adult', desc: 'mammals', one: 'not a mammal (it lays eggs / has feathers or scales)', items: ['Whale', 'Bat', 'Dolphin', 'Horse', 'Elephant', 'Kangaroo'] },
  { id: 'birds', family: 'animal2', tier: 'adult', desc: 'birds', one: 'not a bird', items: ['Penguin', 'Ostrich', 'Eagle', 'Parrot', 'Owl', 'Swan'] },
  { id: 'capitals', family: 'city', tier: 'adult', desc: 'capital cities', one: 'not a capital city', items: ['Paris', 'Tokyo', 'Cairo', 'Ottawa', 'Canberra', 'Madrid', 'Nairobi'] },
  { id: 'notcapitals', family: 'city2', tier: 'adult', desc: 'large cities that are not capitals', one: 'a capital city', items: ['Sydney', 'Toronto', 'Istanbul', 'New York', 'Zurich', 'Mumbai'] },
  { id: 'metals', family: 'element', tier: 'adult', desc: 'metals', one: 'not a metal', items: ['Iron', 'Copper', 'Gold', 'Silver', 'Zinc', 'Nickel', 'Tin'] },
  { id: 'gases', family: 'element2', tier: 'adult', desc: 'gases at room temperature', one: 'not a gas at room temperature', items: ['Oxygen', 'Hydrogen', 'Nitrogen', 'Helium', 'Neon', 'Argon'] },
  { id: 'happy', family: 'mood', tier: 'adult', desc: 'words meaning happy', one: 'not a word for happy', items: ['Joyful', 'Cheerful', 'Glad', 'Merry', 'Elated', 'Content'] },
  { id: 'sad', family: 'mood2', tier: 'adult', desc: 'words meaning sad', one: 'not a word for sad', items: ['Gloomy', 'Glum', 'Miserable', 'Sorrowful', 'Downcast'] },
]

/** Pairs that are good "near" contrasts at adult level (same theme, different rule). */
const NEAR: [string, string][] = [
  ['mammals', 'birds'],
  ['birds', 'mammals'],
  ['capitals', 'notcapitals'],
  ['notcapitals', 'capitals'],
  ['metals', 'gases'],
  ['gases', 'metals'],
  ['happy', 'sad'],
  ['sad', 'happy'],
]

function tierFor(diff: Difficulty): Tier {
  if (diff.young || diff.d <= 3) return 'young'
  if (diff.d <= 7) return 'mid'
  return 'adult'
}

interface Built {
  key: string
  items: { label: QuizQuestion['options'][number]['label']; aria: string }[]
  oddIndex: number
  why: string
  hint: string
  big?: boolean
}

function fromGroups(diff: Difficulty, rng: Rng, n: number): Built {
  const tier = tierFor(diff)
  let main: Group
  let odd: Group
  let why: string
  if (tier === 'adult' && rng() < 0.7) {
    const [a, b] = pick(NEAR, rng)
    main = GROUPS.find((g) => g.id === a)!
    odd = GROUPS.find((g) => g.id === b)!
  } else {
    const pool = GROUPS.filter((g) => g.tier === tier)
    main = pick(pool, rng)
    odd = pick(
      GROUPS.filter((g) => g.family !== main.family && g.tier === main.tier),
      rng,
    )
  }
  const members = sample(main.items, n - 1, rng)
  const oddItem = pick(odd.items, rng)
  const all = shuffle([...members, oddItem], rng)
  const isEmoji = main.tier === 'young'
  if (main.id === 'notcapitals') why = `${oddItem} is a capital city – the others are big cities that are not capitals.`
  else why = `${oddItem} is ${main.one.startsWith('not') ? main.one : `not ${main.one}`} – the others are all ${main.desc}.`
  if (isEmoji) why = `${oddItem} is not like the others – they are all ${main.desc}.`
  return {
    key: `grp-${main.id}-${odd.id}-${all.join('')}`,
    items: all.map((x) => ({ label: x, aria: x })),
    oddIndex: all.indexOf(oddItem),
    why,
    hint: `${n - 1} of these belong to the same group. What group?`,
    big: isEmoji,
  }
}

const isPrime = (n: number) => {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

function numberRule(diff: Difficulty, rng: Rng, n: number): Built {
  const d = diff.d
  const rules = d <= 5 ? ['even', 'odd'] : d <= 8 ? ['even', 'odd', 'mult5', 'mult3', 'mult4'] : ['prime', 'square', 'mult7', 'mult6', 'notprime']
  const rule = pick(rules, rng)
  const max = d <= 3 ? 20 : d <= 6 ? 60 : 100
  let test: (x: number) => boolean
  let desc: string
  let oddDesc: string
  switch (rule) {
    case 'even':
      test = (x) => x % 2 === 0
      desc = 'even'
      oddDesc = 'odd'
      break
    case 'odd':
      test = (x) => x % 2 === 1
      desc = 'odd'
      oddDesc = 'even'
      break
    case 'mult5':
      test = (x) => x % 5 === 0
      desc = 'multiples of 5'
      oddDesc = 'not a multiple of 5'
      break
    case 'mult3':
      test = (x) => x % 3 === 0
      desc = 'multiples of 3'
      oddDesc = 'not a multiple of 3'
      break
    case 'mult4':
      test = (x) => x % 4 === 0
      desc = 'multiples of 4'
      oddDesc = 'not a multiple of 4'
      break
    case 'mult6':
      test = (x) => x % 6 === 0
      desc = 'multiples of 6'
      oddDesc = 'not a multiple of 6'
      break
    case 'mult7':
      test = (x) => x % 7 === 0
      desc = 'multiples of 7'
      oddDesc = 'not a multiple of 7'
      break
    case 'square':
      test = (x) => Number.isInteger(Math.sqrt(x))
      desc = 'square numbers'
      oddDesc = 'not a square number'
      break
    case 'prime':
      test = isPrime
      desc = 'prime numbers'
      oddDesc = 'not prime'
      break
    default:
      test = (x) => x > 3 && !isPrime(x)
      desc = 'composite (not prime) numbers'
      oddDesc = 'prime'
  }
  const yes: number[] = []
  const no: number[] = []
  for (let x = 2; x <= max; x++) (test(x) ? yes : no).push(x)
  // For prime rule, make the odd one a tricky odd composite.
  const noPool = rule === 'prime' ? no.filter((x) => x % 2 === 1 && x % 5 !== 0) : rule === 'even' || rule === 'odd' ? no : no.filter((x) => x > 5)
  const yesPool = rule === 'prime' ? yes.filter((x) => x !== 2) : yes
  // Make sure parity doesn't single out a different item (which would give two answers).
  let members: number[] = []
  let oddItem = 0
  for (let t = 0; t < 60; t++) {
    members = sample(yesPool, n - 1, rng)
    oddItem = pick(noPool.length ? noPool : no, rng)
    if (rule === 'even' || rule === 'odd') break
    const evens = [...members, oddItem].filter((x) => x % 2 === 0)
    const odds = [...members, oddItem].filter((x) => x % 2 === 1)
    const lone = evens.length === 1 ? evens[0] : odds.length === 1 ? odds[0] : null
    if (lone === null || lone === oddItem) break
  }
  const all = shuffle([...members, oddItem], rng)
  return {
    key: `num-${rule}-${all.join(',')}`,
    items: all.map((x) => ({ label: <span className="text-3xl">{x}</span>, aria: String(x) })),
    oddIndex: all.indexOf(oddItem),
    why: `${oddItem} is ${oddDesc} – ${members.join(', ')} are all ${desc}.`,
    hint: rule === 'even' || rule === 'odd' ? 'Check which numbers can be split into two equal groups.' : 'Try dividing each number by small numbers.',
  }
}

const SIDES: { sides: number; kinds: ShapeKind[]; name: string }[] = [
  { sides: 3, kinds: ['triangle'], name: '3 sides' },
  { sides: 4, kinds: ['square', 'diamond'], name: '4 sides' },
  { sides: 5, kinds: ['pentagon'], name: '5 sides' },
  { sides: 6, kinds: ['hexagon'], name: '6 sides' },
]

function shapeRule(_diff: Difficulty, rng: Rng, n: number): Built {
  const [main, odd] = sample(SIDES, 2, rng)
  const colors = sample(PALETTE, n, rng)
  const shapes = [...Array.from({ length: n - 1 }, () => ({ kind: pick(main.kinds, rng), sides: main.sides })), { kind: pick(odd.kinds, rng), sides: odd.sides }]
  const order = shuffle(
    shapes.map((s, i) => ({ ...s, color: colors[i], rot: randInt(0, 3, rng) * 15 })),
    rng,
  )
  const oddIndex = order.findIndex((s) => s.sides === odd.sides)
  return {
    key: `shape-${order.map((s) => s.kind + s.color.name).join('')}`,
    items: order.map((s) => ({
      label: <Shape kind={s.kind} color={s.color.hex} size={64} rotate={s.rot} />,
      aria: `${s.color.name} ${s.kind}`,
    })),
    oddIndex,
    why: `The ${order[oddIndex].kind} has ${odd.name}; all the other shapes have ${main.name}.`,
    hint: 'Count the sides of each shape.',
    big: true,
  }
}

function generate(diff: Difficulty, rng: Rng): QuizQuestion {
  const n = diff.d <= 5 ? 4 : 5
  const r = rng()
  const tier = tierFor(diff)
  const b =
    tier === 'young'
      ? r < 0.6 ? fromGroups(diff, rng, n) : r < 0.8 ? shapeRule(diff, rng, n) : numberRule(diff, rng, n)
      : r < 0.5 ? fromGroups(diff, rng, n) : r < 0.75 ? numberRule(diff, rng, n) : shapeRule(diff, rng, n)
  const options: QuizOption[] = b.items.map((it, i) => ({ id: `o${i}`, label: it.label, aria: it.aria }))
  return {
    key: b.key,
    prompt: diff.young ? 'Which one does not belong?' : 'Which is the odd one out?',
    options,
    answerId: `o${b.oddIndex}`,
    explanation: b.why,
    hint: b.hint,
    big: b.big,
    columns: n,
  }
}

export const oddOneOut: GameDef = {
  id: 'odd-one-out',
  category: 'logic',
  skill: 'logic',
  title: 'Odd One Out',
  emoji: '🧐',
  blurb: 'Find the item that breaks the group rule.',
  instructions: ['All but one item share a rule.', 'Tap the one that does not belong.', 'The explanation tells you the rule.'],
  kidInstructions: ['One of these is different.', 'Tap the one that does not belong!'],
  timeLimit: (d) => Math.round(120 * d.time),
  component: createQuizGame('odd-one-out', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate, explain: true }),
}
