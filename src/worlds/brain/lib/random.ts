/** Random helpers. Every generator takes an `Rng` so puzzles can be seeded (daily challenges) or free. */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const defaultRng: Rng = Math.random

export function randInt(min: number, max: number, rng: Rng = defaultRng): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

export function pick<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function shuffle<T>(arr: readonly T[], rng: Rng = defaultRng): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(arr: readonly T[], n: number, rng: Rng = defaultRng): T[] {
  return shuffle(arr, rng).slice(0, n)
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** Build numeric distractors near the answer, unique and non-negative unless allowed. */
export function numericOptions(answer: number, count = 4, spread = 5, rng: Rng = defaultRng, allowNegative = false): number[] {
  const set = new Set<number>([answer])
  let guard = 0
  while (set.size < count && guard++ < 200) {
    const delta = randInt(1, Math.max(2, spread), rng) * (rng() < 0.5 ? -1 : 1)
    const v = answer + delta
    if (!allowNegative && v < 0) continue
    set.add(v)
  }
  return shuffle([...set], rng)
}

/** Keeps a short memory of recently shown question keys so we don't repeat continuously. */
export class RecentSet {
  private items: string[] = []
  private size: number
  constructor(size = 12) {
    this.size = size
  }
  has(k: string) {
    return this.items.includes(k)
  }
  add(k: string) {
    this.items.push(k)
    if (this.items.length > this.size) this.items.shift()
  }
}

export function generateUnique<T>(gen: () => T, key: (t: T) => string, recent: RecentSet, tries = 30): T {
  let item = gen()
  for (let i = 0; i < tries && recent.has(key(item)); i++) item = gen()
  recent.add(key(item))
  return item
}
