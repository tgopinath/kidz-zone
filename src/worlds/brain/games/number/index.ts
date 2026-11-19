import type { GameDef } from '../types'
import { arithmeticRace } from './ArithmeticRace'
import { dragMath } from './DragMath'
import { missingNumber } from './MissingNumber'
import { numberCompare } from './NumberCompare'
import { quickMath } from './QuickMath'

export const numberGames: GameDef[] = [quickMath, dragMath, numberCompare, missingNumber, arithmeticRace]
