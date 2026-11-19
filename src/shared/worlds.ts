import type { AgeBand, WorldId } from './store'

export type GroupId = 'learn' | 'play' | 'explore'

export interface WorldMeta {
  id: WorldId
  name: string
  group: GroupId
  /** the original app this world comes from */
  source: string
  tagline: string
  /** what a grown-up gets from it, one line */
  skill: string
  href: string
  /** AA accent on white (text and filled buttons) and its soft tint */
  accent: string
  soft: string
  ages: AgeBand[]
}

export const WORLDS: WorldMeta[] = [
  { id: 'words', name: 'Words', group: 'learn', source: 'Word Wonders', tagline: '314 words that move, speak and play', skill: 'Vocabulary, listening, spaced revision', href: '/words', accent: '#9A2F80', soft: '#FBEAF6', ages: ['4-6', '7-9', '10-12'] },
  { id: 'garden', name: 'Word Garden', group: 'learn', source: 'Word Garden', tagline: '40 levels from first words to rhymes', skill: 'Early reading, phonics, spelling', href: '/garden', accent: '#157A48', soft: '#E3F3EA', ages: ['4-6', '7-9'] },
  { id: 'money', name: 'Money', group: 'learn', source: 'Money Master', tagline: 'Real rupee notes and coins, true to size', skill: 'Counting money, making amounts', href: '/money', accent: '#A84A0B', soft: '#FDEEE2', ages: ['4-6', '7-9', '10-12'] },
  { id: 'puzzles', name: 'Puzzles', group: 'play', source: 'Puzzle Quest', tagline: 'Eight puzzle types that adapt to the child', skill: 'Reasoning, shapes, numbers, mazes', href: '/puzzles', accent: '#0E66A3', soft: '#E4F1FA', ages: ['4-6', '7-9', '10-12'] },
  { id: 'brain', name: 'Brain Gym', group: 'play', source: 'Brain Gym', tagline: '37 mini-games in 8 training zones', skill: 'Memory, focus, logic, speed', href: '/brain', accent: '#6236C9', soft: '#EFEAFC', ages: ['7-9', '10-12'] },
  { id: 'pets', name: 'Pets', group: 'play', source: 'Virtual Pet Universe', tagline: 'Adopt a pet and raise it to Legendary', skill: 'Care routines, mini-games, responsibility', href: '/pets', accent: '#B3264E', soft: '#FCE8EE', ages: ['4-6', '7-9', '10-12'] },
  { id: 'maps', name: 'Maps', group: 'explore', source: 'Map Explorer', tagline: 'India’s states and districts, and the whole world', skill: 'Geography, places, cultures', href: '/maps', accent: '#0A7470', soft: '#E1F3F2', ages: ['7-9', '10-12'] },
  { id: 'shop', name: 'Shop', group: 'explore', source: 'My Supermarket', tagline: 'A 3D supermarket with a trolley and a till', skill: 'Prices, totals, paying and change', href: '/shop', accent: '#4A6B12', soft: '#EEF4E1', ages: ['4-6', '7-9', '10-12'] },
]

export const GROUPS: { id: GroupId; name: string; href: string; blurb: string }[] = [
  { id: 'learn', name: 'Learn', href: '/learn', blurb: 'Words, reading and money' },
  { id: 'play', name: 'Play', href: '/play', blurb: 'Puzzles, brain training and a pet to look after' },
  { id: 'explore', name: 'Explore', href: '/explore', blurb: 'Maps of India and the world, and a supermarket' },
]

export const worldMeta = (id: WorldId) => WORLDS.find((w) => w.id === id)!
export const worldsIn = (g: GroupId) => WORLDS.filter((w) => w.group === g)
export const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: '4-6', label: '4–6 years' },
  { id: '7-9', label: '7–9 years' },
  { id: '10-12', label: '10–12 years' },
]

/** Initials avatars (photos and abstract 3D avatars were rejected in earlier apps; initials on a calm colour). */
export const AVATAR_COLOURS: { id: string; name: string; bg: string; fg: string }[] = [
  { id: 'indigo', name: 'Indigo', bg: '#2E3A8C', fg: '#FFFFFF' },
  { id: 'teal', name: 'Teal', bg: '#0A7470', fg: '#FFFFFF' },
  { id: 'plum', name: 'Plum', bg: '#9A2F80', fg: '#FFFFFF' },
  { id: 'saffron', name: 'Saffron', bg: '#A84A0B', fg: '#FFFFFF' },
  { id: 'leaf', name: 'Leaf', bg: '#157A48', fg: '#FFFFFF' },
  { id: 'rose', name: 'Rose', bg: '#B3264E', fg: '#FFFFFF' },
]
export const avatarColour = (id: string | undefined) => AVATAR_COLOURS.find((a) => a.id === id) ?? AVATAR_COLOURS[0]
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'K'
