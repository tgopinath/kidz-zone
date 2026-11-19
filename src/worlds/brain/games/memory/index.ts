import type { GameDef } from '../types'
import { cardMatch } from './CardMatch'
import { objectMemory } from './ObjectMemory'
import { sequenceRecall } from './SequenceRecall'

export const memoryGames: GameDef[] = [cardMatch, sequenceRecall, objectMemory]
