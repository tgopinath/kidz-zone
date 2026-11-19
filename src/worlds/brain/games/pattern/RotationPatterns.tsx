import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, shuffle } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { createQuizGame } from '../shared/QuizEngine'
import type { QuizQuestion } from '../shared/QuizEngine'
import { PALETTE, Shape } from '../shared/Shape'
import type { GameDef } from '../types'

type Kind = 'arrow' | 'lshape'

interface Pose {
  angle: number
  flip: boolean
}

const norm = (a: number) => ((a % 360) + 360) % 360
const poseKey = (p: Pose) => `${norm(p.angle)}${p.flip ? 'f' : ''}`

const DIRS: Record<number, string> = {
  0: 'right',
  45: 'down-right',
  90: 'down',
  135: 'down-left',
  180: 'left',
  225: 'up-left',
  270: 'up',
  315: 'up-right',
}

function describe(kind: Kind, p: Pose) {
  const a = norm(p.angle)
  if (kind === 'arrow') return `arrow pointing ${DIRS[a] ?? `${a} degrees`}`
  return `L shape turned ${a} degrees clockwise${p.flip ? ', mirrored' : ''}`
}

function gen(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const useFlip = d >= 9 && rng() < 0.5
  const kind: Kind = useFlip ? 'lshape' : pick<Kind>(['arrow', 'lshape'], rng)
  const base = d <= 4 ? 90 : d <= 8 ? pick([45, 90], rng) : pick([45, 135], rng)
  const dir = d <= 2 ? 1 : rng() < 0.5 ? 1 : -1
  const step = base * dir
  const start = randInt(0, 7, rng) * 45
  const color = pick(PALETTE, rng)
  const pose = (i: number): Pose => ({ angle: start + step * i, flip: useFlip ? i % 2 === 1 : false })
  const frames = [0, 1, 2, 3].map(pose)
  const answer = pose(4)

  const opts = new Map<string, Pose>([[poseKey(answer), answer]])
  const candidates: Pose[] = [
    pose(3),
    { angle: answer.angle + step, flip: answer.flip },
    { angle: answer.angle - 2 * step, flip: answer.flip },
    { angle: answer.angle + 180, flip: answer.flip },
    { angle: answer.angle, flip: !answer.flip },
    { angle: answer.angle + 90, flip: answer.flip },
  ]
  // For the lshape, a mirrored version at the right angle is the sneakiest wrong answer.
  if (kind === 'lshape' && d >= 6) candidates.unshift({ angle: answer.angle, flip: !answer.flip })
  for (const c of candidates) {
    if (opts.size >= 4) break
    // Arrow is mirror-symmetric, so never offer flipped arrows (they would look like rotations).
    if (kind === 'arrow' && c.flip) continue
    opts.set(poseKey(c), c)
  }
  const options = shuffle([...opts.values()], rng)

  const verb = dir === 1 ? 'clockwise' : 'anticlockwise'
  return {
    key: `${kind}${start}${step}${useFlip}`,
    prompt: (
      <div className="flex flex-col items-center gap-3">
        <span className="text-base font-semibold text-muted">{diff.young ? 'Which way does it point next?' : 'Which comes next?'}</span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {frames.map((p, i) => (
            <span key={i} className="grid size-16 place-items-center rounded-2xl border-2 border-line bg-white sm:size-20">
              <Shape kind={kind} color={color.hex} rotate={p.angle} flip={p.flip} size="80%" />
            </span>
          ))}
          <span className="grid size-16 place-items-center rounded-2xl border-2 border-dashed border-primary bg-primary-soft font-display text-2xl text-primary sm:size-20">
            ?
          </span>
        </div>
      </div>
    ),
    promptAria: `Sequence: ${frames.map((p) => describe(kind, p)).join(', then ')}. What comes next?`,
    options: options.map((p) => ({
      id: poseKey(p),
      label: <Shape kind={kind} color={color.hex} rotate={p.angle} flip={p.flip} size={64} />,
      aria: describe(kind, p),
    })),
    answerId: poseKey(answer),
    explanation: `It turns ${base}° ${verb} each step${useFlip ? ' and flips over every other step' : ''}.`,
    hint: useFlip ? 'Watch the turn AND whether it is mirrored – it changes every other step.' : `Follow how far it turns between each picture (${base}°?).`,
    big: true,
    columns: 4,
  }
}

export const rotationPatterns: GameDef = {
  id: 'rotation-patterns',
  category: 'pattern',
  skill: 'pattern',
  title: 'Rotation Patterns',
  emoji: '🔄',
  blurb: 'A shape keeps turning – predict where it points next.',
  instructions: [
    'A shape rotates by the same amount each step.',
    'Pick the picture that shows the next position.',
    'At higher levels it turns in smaller steps and may flip over too.',
  ],
  kidInstructions: ['The arrow keeps turning.', 'Which way will it point next?'],
  component: createQuizGame('rotation-patterns', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate: gen }),
}
