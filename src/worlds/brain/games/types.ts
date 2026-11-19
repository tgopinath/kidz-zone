import type { ComponentType } from 'react'
import type { CategoryId, SkillId } from '../types'
import type { Difficulty } from '../lib/difficulty'
import type { Rng } from '../lib/random'

/**
 * The only way a game talks to the outside world. The GameShell owns the
 * timer, pause, hints, scoring and the result screen; games just play.
 */
export interface GameApi {
  /** A correct move/answer. `points` defaults to 10 × difficulty. */
  correct(points?: number): void
  /** A wrong move/answer. */
  wrong(): void
  /** Update the progress bar (e.g. 3 of 10 rounds). */
  progress(done: number, total: number): void
  /** Record one reaction time in ms (speed games). */
  reaction(ms: number): void
  /** Count found targets (feeds the "Sharp Eyes" achievement). */
  found(n?: number): void
  /** End the game. `completed: false` means the goal was not reached (e.g. puzzle unsolved). */
  finish(opts?: { completed?: boolean }): void
  /**
   * Register a hint provider. The shell's Hint button calls it; return the
   * text to show (and optionally highlight something on the board).
   * Pass null to disable hints.
   */
  onHint(fn: (() => string) | null): void
}

export interface GameProps {
  diff: Difficulty
  rng: Rng
  paused: boolean
  api: GameApi
}

export interface GameDef {
  id: string
  category: CategoryId
  skill: SkillId
  title: string
  emoji: string
  /** One-line description for cards. */
  blurb: string
  /** How to play – shown before the game starts. Keep each line short. */
  instructions: string[]
  /** Optional simpler wording for 5–10 year olds. */
  kidInstructions?: string[]
  /** Overall time limit in seconds (shell shows a countdown and ends the game at 0). */
  timeLimit?: (diff: Difficulty) => number | undefined
  /** Whether running out of time still counts as completing the game. Default true (quiz-like). */
  timeoutCompletes?: boolean
  component: ComponentType<GameProps>
}
