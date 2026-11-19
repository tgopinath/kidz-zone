import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, shuffle, type Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import { PALETTE } from '../shared/Shape'
import type { GameDef } from '../types'

type Cell = [number, number]

/** Move a polyomino so its top-left is at 0,0 and sort cells (canonical position, not rotation). */
function norm(cells: Cell[]): Cell[] {
  const mx = Math.min(...cells.map((c) => c[0]))
  const my = Math.min(...cells.map((c) => c[1]))
  return cells.map(([x, y]) => [x - mx, y - my] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0])
}
const keyOf = (cells: Cell[]) => norm(cells).map(([x, y]) => `${x},${y}`).join(';')
/** 90° clockwise in screen coordinates (y points down). */
const rot = (cells: Cell[]): Cell[] => cells.map(([x, y]) => [-y, x] as Cell)
const mirror = (cells: Cell[]): Cell[] => cells.map(([x, y]) => [-x, y] as Cell)

function rotations(cells: Cell[]): Cell[][] {
  const out: Cell[][] = [norm(cells)]
  for (let i = 1; i < 4; i++) out.push(norm(rot(out[i - 1])))
  return out
}

/** All 8 orientations' keys (rotations + mirrored rotations). */
function allKeys(cells: Cell[]): Set<string> {
  return new Set([...rotations(cells), ...rotations(mirror(cells))].map(keyOf))
}

function isChiral(cells: Cell[]): boolean {
  const rk = new Set(rotations(cells).map(keyOf))
  return !rk.has(keyOf(mirror(cells)))
}

function growPoly(n: number, rng: Rng): Cell[] {
  for (let tries = 0; tries < 200; tries++) {
    const cells: Cell[] = [[0, 0]]
    const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y)
    while (cells.length < n) {
      const frontier: Cell[] = []
      for (const [x, y] of cells) {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (!has(x + dx, y + dy) && !frontier.some((f) => f[0] === x + dx && f[1] === y + dy)) frontier.push([x + dx, y + dy])
        }
      }
      cells.push(pick(frontier, rng))
    }
    if (isChiral(cells)) return norm(cells)
  }
  // Fallback: the L tetromino is always chiral.
  return norm([
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ])
}

function Poly({ cells, color, size = 96 }: { cells: Cell[]; color: string; size?: number }) {
  const n = norm(cells)
  const w = Math.max(...n.map((c) => c[0])) + 1
  const h = Math.max(...n.map((c) => c[1])) + 1
  const dim = Math.max(w, h)
  const ox = (dim - w) / 2
  const oy = (dim - h) / 2
  return (
    <svg viewBox={`-0.1 -0.1 ${dim + 0.2} ${dim + 0.2}`} width={size} height={size} aria-hidden>
      {n.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x + ox} y={y + oy} width={1} height={1} rx={0.12} fill={color} stroke="#fff" strokeWidth={0.08} />
      ))}
    </svg>
  )
}

function sizeFor(d: number) {
  if (d <= 3) return 4
  if (d <= 6) return 5
  if (d <= 9) return 6
  return 7
}

function gen(diff: Difficulty, rng: Rng): QuizQuestion {
  const n = sizeFor(diff.d)
  const optionCount = diff.d <= 3 ? 3 : diff.d <= 7 ? 4 : 5
  const ref = growPoly(n, rng)
  const refRots = rotations(ref)
  const r = randInt(1, 3, rng)
  const answer = refRots[r]
  const used = new Set<string>([keyOf(answer)])
  const distractors: Cell[][] = []
  for (const m of shuffle(rotations(mirror(ref)), rng)) {
    if (distractors.length >= optionCount - 1) break
    const k = keyOf(m)
    if (used.has(k)) continue
    used.add(k)
    distractors.push(m)
  }
  // Rotationally symmetric shapes have fewer distinct mirrors – top up with a different shape.
  const refAll = allKeys(ref)
  let guard = 0
  while (distractors.length < optionCount - 1 && guard++ < 100) {
    const other = growPoly(n, rng)
    if ([...allKeys(other)].some((k) => refAll.has(k))) continue
    const o = pick(rotations(other), rng)
    const k = keyOf(o)
    if (used.has(k)) continue
    used.add(k)
    distractors.push(o)
  }
  const color = pick(PALETTE, rng).hex
  const items = shuffle([{ cells: answer, ok: true }, ...distractors.map((c) => ({ cells: c, ok: false }))], rng)
  const opts = items.map((it, i) => ({ id: `o${i}`, ...it }))
  const ans = opts.find((o) => o.ok)!
  const turns = ['', 'a quarter turn clockwise', 'half a turn', 'a quarter turn anticlockwise'][r]
  return {
    key: `${keyOf(ref)}|${r}`,
    prompt: (
      <div className="flex flex-col items-center gap-3">
        <span>{diff.young ? 'Which one is the same shape, just turned around?' : 'Which option is this shape rotated – not flipped?'}</span>
        <div className="rounded-2xl bg-primary-soft p-3">
          <Poly cells={ref} color={color} size={110} />
        </div>
      </div>
    ),
    promptAria: `A shape made of ${n} squares. Pick the option that is the same shape rotated, not mirrored.`,
    options: opts.map((o, i) => ({
      id: o.id,
      label: <Poly cells={o.cells} color={color} size={84} />,
      aria: `Shape option ${i + 1}`,
    })),
    answerId: ans.id,
    explanation: `The answer is the shape turned ${turns}. The others are mirror images (flipped), which no amount of turning can make.`,
    hint: diff.young
      ? 'Some of these are flipped like in a mirror. Find the one you can get just by spinning.'
      : 'Mirror images can never be reached by rotating. Track one distinctive corner of the shape.',
    big: true,
    columns: optionCount,
  }
}

export const shapeRotation: GameDef = {
  id: 'shape-rotation',
  category: 'spatial',
  skill: 'spatial',
  title: 'Shape Rotation',
  emoji: '🔄',
  blurb: 'Spot the shape that was turned, not flipped.',
  instructions: [
    'Look at the shape made of squares.',
    'Pick the option that is the same shape rotated.',
    'Watch out: mirror images look similar but are flipped.',
    'Higher levels use bigger shapes and more options.',
  ],
  kidInstructions: ['Look at the shape.', 'Find the same shape turned around.', 'Do not pick the flipped one!'],
  timeLimit: (d) => Math.round(90 * d.time),
  component: createQuizGame('shape-rotation', { rounds: (d) => 8 + Math.min(4, Math.floor(d.d / 3)), generate: gen }),
}
