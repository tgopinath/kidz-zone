import type { GameDef } from '../types'
import { jigsaw } from './Jigsaw'
import { kidsSudoku } from './KidsSudoku'
import { maze } from './Maze'
import { slidingPuzzle } from './SlidingPuzzle'
import { tangram } from './Tangram'
import { visualRiddles } from './VisualRiddles'
import { wordPuzzle } from './WordPuzzle'

export const puzzleGames: GameDef[] = [jigsaw, kidsSudoku, slidingPuzzle, maze, wordPuzzle, visualRiddles, tangram]
