import type { GameDef } from '../types'
import { completePattern } from './CompletePattern'
import { numberPatterns } from './NumberPatterns'
import { rotationPatterns } from './RotationPatterns'
import { shapePatterns } from './ShapePatterns'

export const patternGames: GameDef[] = [completePattern, shapePatterns, numberPatterns, rotationPatterns]
