import type { CategoryId, SkillId } from '../types'
import type { GameDef } from './types'
import { memoryGames } from './memory'
import { focusGames } from './focus'
import { patternGames } from './pattern'
import { logicGames } from './logic'
import { numberGames } from './number'
import { spatialGames } from './spatial'
import { speedGames } from './speed'
import { puzzleGames } from './puzzle'

export interface CategoryMeta {
  id: CategoryId
  title: string
  emoji: string
  tagline: string
  description: string
  gradient: string
  /** Tailwind-safe solid colour used for accents. */
  color: string
  difficulty: 1 | 2 | 3
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'memory', title: 'Memory Master', emoji: '🧠', tagline: 'Remember & recall', description: 'Match cards, repeat sequences and recall objects to boost short-term memory.', gradient: 'from-[#8B6CFF] to-[#6A4CF0]', color: '#7557F6', difficulty: 1 },
  { id: 'focus', title: 'Focus Fighter', emoji: '🎯', tagline: 'Sharpen attention', description: 'Spot the odd one, hunt targets and ignore distractions.', gradient: 'from-[#FF8A5B] to-[#F2557A]', color: '#F0506E', difficulty: 2 },
  { id: 'pattern', title: 'Pattern Detective', emoji: '🔍', tagline: 'Find the rule', description: 'Crack colour, shape, number and rotation patterns.', gradient: 'from-[#3EC6FF] to-[#3898FF]', color: '#3898FF', difficulty: 2 },
  { id: 'logic', title: 'Logic Lab', emoji: '🧪', tagline: 'Reason it out', description: 'Riddles, balance scales, river crossings and odd-one-out.', gradient: 'from-[#2FD6A3] to-[#19B5B0]', color: '#19B5B0', difficulty: 3 },
  { id: 'number', title: 'Number Ninja', emoji: '🥷', tagline: 'Mental maths', description: 'Quick sums, number tiles, comparisons and arithmetic races.', gradient: 'from-[#FFC24D] to-[#FF9A3D]', color: '#FF9A3D', difficulty: 2 },
  { id: 'spatial', title: 'Spatial Genius', emoji: '🧊', tagline: 'See in space', description: 'Rotate shapes, match shadows, mirror patterns and build blocks.', gradient: 'from-[#B57CFF] to-[#FF6FCF]', color: '#C85CE8', difficulty: 3 },
  { id: 'speed', title: 'Speed Challenge', emoji: '⚡', tagline: 'Think fast', description: 'Reaction tests, rapid spotting, colour words and quick decisions.', gradient: 'from-[#FFD93D] to-[#FFAA45]', color: '#F5A623', difficulty: 2 },
  { id: 'puzzle', title: 'Puzzle World', emoji: '🧩', tagline: 'Mix it all', description: 'Jigsaws, sudoku, sliding tiles, mazes, words and tangrams.', gradient: 'from-[#5B8CFF] to-[#7557F6]', color: '#5B6CFF', difficulty: 3 },
]

export const GAMES: GameDef[] = [
  ...memoryGames,
  ...focusGames,
  ...patternGames,
  ...logicGames,
  ...numberGames,
  ...spatialGames,
  ...speedGames,
  ...puzzleGames,
]

export const SKILLS: { id: SkillId; label: string; color: string; emoji: string }[] = [
  { id: 'memory', label: 'Memory', color: '#7557F6', emoji: '🧠' },
  { id: 'attention', label: 'Attention', color: '#F0506E', emoji: '🎯' },
  { id: 'logic', label: 'Logic', color: '#19B5B0', emoji: '🧪' },
  { id: 'pattern', label: 'Pattern', color: '#3898FF', emoji: '🔍' },
  { id: 'spatial', label: 'Spatial', color: '#C85CE8', emoji: '🧊' },
  { id: 'speed', label: 'Speed', color: '#F5A623', emoji: '⚡' },
]

export const gameById = (id: string) => GAMES.find((g) => g.id === id)
export const categoryById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!
export const gamesIn = (cat: CategoryId) => GAMES.filter((g) => g.category === cat)
