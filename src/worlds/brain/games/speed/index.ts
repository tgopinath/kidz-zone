import type { GameDef } from '../types'
import { colorWord } from './ColorWord'
import { fastCompare } from './FastCompare'
import { quickDecision } from './QuickDecision'
import { reactionTest } from './ReactionTest'
import { symbolSpot } from './SymbolSpot'

export const speedGames: GameDef[] = [reactionTest, symbolSpot, fastCompare, colorWord, quickDecision]
