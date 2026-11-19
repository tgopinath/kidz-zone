import type { GameDef } from '../types'
import { blockBuild } from './BlockBuild'
import { mirrorImage } from './MirrorImage'
import { shadowMatch } from './ShadowMatch'
import { shapeAssembly } from './ShapeAssembly'
import { shapeRotation } from './ShapeRotation'

export const spatialGames: GameDef[] = [shapeRotation, shadowMatch, mirrorImage, blockBuild, shapeAssembly]
