import type { GameDef } from '../types'
import { balanceChallenge } from './BalanceChallenge'
import { logicQuestions } from './LogicQuestions'
import { oddOneOut } from './OddOneOut'
import { riverCrossing } from './RiverCrossing'
import { sequencePuzzle } from './SequencePuzzle'

export const logicGames: GameDef[] = [logicQuestions, sequencePuzzle, riverCrossing, balanceChallenge, oddOneOut]
