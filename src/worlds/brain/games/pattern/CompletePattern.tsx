import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, sample, shuffle } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { createQuizGame } from '../shared/QuizEngine'
import type { QuizQuestion } from '../shared/QuizEngine'
import { PALETTE, Shape } from '../shared/Shape'
import type { ShapeKind } from '../shared/Shape'
import type { GameDef } from '../types'

const KINDS: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart', 'hexagon', 'pentagon']
const COLORS = PALETTE.slice(0, 6)

interface Token {
  shape: ShapeKind
  color: number
}

const tkey = (t: Token) => `${t.color}${t.shape}`
const tname = (t: Token) => `${COLORS[t.color].name} ${t.shape}`

function unitLength(d: number) {
  if (d <= 3) return 2
  if (d <= 7) return 3
  return 4
}

function makeUnit(d: number, rng: Rng): Token[] {
  const L = unitLength(d)
  const unit: Token[] = []
  const used = new Set<string>()
  // At high d, reuse shapes or colours so players must track both attributes.
  const shapes = d >= 9 ? sample(KINDS, 2, rng) : sample(KINDS, L, rng)
  const colors = d >= 6 ? sample([0, 1, 2, 3, 4, 5], Math.max(2, L - 1), rng) : sample([0, 1, 2, 3, 4, 5], L, rng)
  let guard = 0
  while (unit.length < L && guard++ < 100) {
    const t: Token = d >= 6 ? { shape: pick(shapes, rng), color: pick(colors, rng) } : { shape: shapes[unit.length], color: colors[unit.length] }
    if (used.has(tkey(t))) continue
    used.add(tkey(t))
    unit.push(t)
  }
  return unit
}

function TokenView({ t, size = 44 }: { t: Token; size?: number }) {
  return <Shape kind={t.shape} color={COLORS[t.color].hex} size={size} />
}

function gen(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const unit = makeUnit(d, rng)
  const L = unit.length
  const len = L * 2 + randInt(1, L)
  const seq = Array.from({ length: len }, (_, i) => unit[i % L])
  const gap = d >= 7 ? randInt(L, len - 1, rng) : len - 1
  const answer = seq[gap]

  // Distractors: other unit tokens, then near-misses (same shape other colour / same colour other shape).
  const opts = new Map<string, Token>([[tkey(answer), answer]])
  for (const t of shuffle(unit, rng)) if (opts.size < 4) opts.set(tkey(t), t)
  let guard = 0
  while (opts.size < 4 && guard++ < 50) {
    const t: Token = rng() < 0.5 ? { shape: answer.shape, color: randInt(0, COLORS.length - 1, rng) } : { shape: pick(KINDS, rng), color: answer.color }
    opts.set(tkey(t), t)
  }
  const options = shuffle([...opts.values()], rng)
  const size = len > 10 ? 30 : len > 7 ? 36 : 44

  return {
    key: seq.map(tkey).join('-') + gap,
    prompt: (
      <div className="flex flex-col items-center gap-3">
        <span className="text-base font-semibold text-muted">{diff.young ? 'What comes in the gap?' : 'Which piece completes the pattern?'}</span>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {seq.map((t, i) =>
            i === gap ? (
              <span
                key={i}
                className="grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary-soft font-display text-xl text-primary"
                style={{ width: size, height: size }}
              >
                ?
              </span>
            ) : (
              <TokenView key={i} t={t} size={size} />
            ),
          )}
        </div>
      </div>
    ),
    promptAria: `Pattern: ${seq.map((t, i) => (i === gap ? 'blank' : tname(t))).join(', ')}. What goes in the blank?`,
    options: options.map((t) => ({ id: tkey(t), label: <TokenView t={t} size={56} />, aria: tname(t) })),
    answerId: tkey(answer),
    explanation: `The pattern repeats every ${L}: ${unit.map(tname).join(' → ')}.`,
    hint: `Find the group of ${L} that keeps repeating.`,
    big: true,
    columns: 4,
  }
}

export const completePattern: GameDef = {
  id: 'complete-pattern',
  category: 'pattern',
  skill: 'pattern',
  title: 'Complete the Pattern',
  emoji: '🔷',
  blurb: 'Find the missing piece in a repeating colour-and-shape pattern.',
  instructions: [
    'Look at the row of coloured shapes – it repeats.',
    'Work out which piece belongs in the gap.',
    'Watch both the colour and the shape!',
  ],
  kidInstructions: ['The shapes repeat in a pattern.', 'Which one goes in the empty spot?'],
  component: createQuizGame('complete-pattern', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate: gen }),
}
