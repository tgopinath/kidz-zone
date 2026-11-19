import type { GameDef } from '../types'
import { distractionTest } from './DistractionTest'
import { findDifferent } from './FindDifferent'
import { targetFinder } from './TargetFinder'

export const focusGames: GameDef[] = [findDifferent, targetFinder, distractionTest]
