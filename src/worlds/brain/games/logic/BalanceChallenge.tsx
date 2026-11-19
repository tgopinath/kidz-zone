import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, sample, type Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'
import { textOptions } from './quizUtil'

/** Something sitting on a pan: an emoji object, a numbered weight, or the unknown. */
type PanItem = { e: string } | { kg: number } | { q: true }

interface ScaleRow {
  left: PanItem[]
  right: PanItem[]
}

const OBJECTS = ['🍎', '🍌', '🍐', '🍊', '🧀', '🥥', '🍉', '🎁', '⚽', '📦', '🧸', '🥚']
const NAMES: Record<string, string> = {
  '🍎': 'apple', '🍌': 'banana', '🍐': 'pear', '🍊': 'orange', '🧀': 'cheese', '🥥': 'coconut',
  '🍉': 'melon', '🎁': 'gift', '⚽': 'ball', '📦': 'box', '🧸': 'teddy', '🥚': 'egg',
}

const rep = <T,>(x: T, n: number): T[] => Array.from({ length: n }, () => x)

function itemText(it: PanItem) {
  if ('e' in it) return NAMES[it.e] ?? it.e
  if ('kg' in it) return `${it.kg} kilogram weight`
  return 'question mark'
}

function describe(rows: ScaleRow[]) {
  return rows
    .map((r, i) => `Scale ${i + 1}: ${r.left.map(itemText).join(' and ')} balances ${r.right.map(itemText).join(' and ')}.`)
    .join(' ')
}

/** One balanced weighing scale drawn in SVG. */
function Scale({ row, label }: { row: ScaleRow; label: string }) {
  const W = 320
  const panW = 128
  const renderPan = (items: PanItem[], cx: number) => {
    const perRow = Math.min(4, Math.max(1, items.length))
    const rows = Math.ceil(items.length / perRow)
    const size = items.length > 4 ? 24 : 30
    return (
      <g>
        {/* strings */}
        <line x1={cx} y1={44} x2={cx - panW / 2 + 6} y2={110} stroke="#a8a3c7" strokeWidth={2} />
        <line x1={cx} y1={44} x2={cx + panW / 2 - 6} y2={110} stroke="#a8a3c7" strokeWidth={2} />
        <path d={`M${cx - panW / 2} 110 h${panW} q-8 14 -${panW / 2} 14 q-${panW / 2 - 8} 0 -${panW / 2} -14Z`} fill="#ece8ff" stroke="#7557f6" strokeWidth={2} />
        {items.map((it, i) => {
          const r = Math.floor(i / perRow)
          const inRow = Math.min(perRow, items.length - r * perRow)
          const col = i % perRow
          const x = cx + (col - (inRow - 1) / 2) * (size + 4)
          const y = 108 - (rows - 1 - r) * (size + 2)
          if ('e' in it)
            return (
              <text key={i} x={x} y={y} fontSize={size} textAnchor="middle">
                {it.e}
              </text>
            )
          if ('kg' in it)
            return (
              <g key={i}>
                <path d={`M${x - size / 2 + 3} ${y} l4 -${size - 4} h${size - 14} l4 ${size - 4}Z`} fill="#3a3c5a" />
                <text x={x} y={y - 6} fontSize={size > 26 ? 11 : 9} fill="#fff" fontWeight={700} textAnchor="middle">
                  {it.kg}kg
                </text>
              </g>
            )
          return (
            <g key={i}>
              <rect x={x - size / 2} y={y - size + 2} width={size} height={size - 2} rx={6} fill="#fff" stroke="#7557f6" strokeWidth={2} strokeDasharray="4 3" />
              <text x={x} y={y - 6} fontSize={size - 10} fill="#7557f6" fontWeight={800} textAnchor="middle">
                ?
              </text>
            </g>
          )
        })}
      </g>
    )
  }
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} 170`} className="w-full max-w-[340px]" aria-hidden>
        <polygon points={`${W / 2 - 30},166 ${W / 2 + 30},166 ${W / 2},150`} fill="#c9c4e6" />
        <rect x={W / 2 - 4} y={34} width={8} height={120} rx={4} fill="#c9c4e6" />
        <rect x={30} y={38} width={W - 60} height={8} rx={4} fill="#7557f6" />
        <circle cx={W / 2} cy={42} r={8} fill="#5a3fe0" />
        {renderPan(row.left, 70)}
        {renderPan(row.right, W - 70)}
      </svg>
      <figcaption className="text-xs font-bold text-muted">{label} · balanced ⚖️</figcaption>
    </figure>
  )
}

interface Built {
  rows: ScaleRow[]
  question: string
  answer: number
  unit: (n: number) => string
  why: string
  hint: string
  key: string
}

/** Low d: plain numbered weights – what makes it balance? */
function numericOnly(diff: Difficulty, rng: Rng): Built {
  const max = diff.young ? 6 : diff.d <= 2 ? 9 : 15
  const leftN = diff.d <= 1 ? 1 : 2
  const left = Array.from({ length: leftN }, () => randInt(leftN === 1 ? 3 : 1, max, rng))
  const total = left.reduce((a, b) => a + b, 0)
  const known = randInt(1, total - 1, rng)
  const ans = total - known
  return {
    rows: [{ left: left.map((kg) => ({ kg })), right: [{ kg: known }, { q: true }] }],
    question: diff.young ? 'How many kg makes it balance?' : 'What weight goes in the ? to balance the scale?',
    answer: ans,
    unit: (n) => `${n} kg`,
    why: `The left side is ${left.join(' + ')} = ${total} kg. ${total} − ${known} = ${ans} kg.`,
    hint: 'Add up the left side first.',
    key: `num-${left.join('+')}-${known}`,
  }
}

/** One object with a known total: 🍎🍎🍎 = 12 kg → one 🍎? */
function oneObject(diff: Difficulty, rng: Rng): Built {
  const o = pick(OBJECTS, rng)
  const w = randInt(2, diff.young ? 5 : 9, rng)
  const n = randInt(2, diff.young ? 3 : 4, rng)
  const extra = diff.d >= 5 ? randInt(1, 6, rng) : 0
  const right: PanItem[] = extra ? [{ kg: n * w + extra }] : [{ kg: n * w }]
  const left: PanItem[] = [...rep({ e: o }, n), ...(extra ? [{ kg: extra }] : [])]
  // Display: left has n objects (+ extra kg), right has total kg (n*w + extra)
  return {
    rows: [{ left, right }],
    question: `How heavy is one ${o}?`,
    answer: w,
    unit: (x) => `${x} kg`,
    why: extra
      ? `Take ${extra} kg off both sides: ${n} × ${o} = ${n * w} kg, so one ${o} = ${n * w} ÷ ${n} = ${w} kg.`
      : `${n} × ${o} = ${n * w} kg, so one ${o} = ${n * w} ÷ ${n} = ${w} kg.`,
    hint: extra ? 'Remove the same weight from both sides first.' : `Share the weight equally between the ${n} objects.`,
    key: `one-${o}-${n}-${w}-${extra}`,
  }
}

/** Two objects, relation only: 🍎🍎 = 🍌 ; 🍌 + 🍎 = ? 🍎 */
function substitution(_diff: Difficulty, rng: Rng): Built {
  const [a, b] = sample(OBJECTS, 2, rng)
  const n = randInt(2, 4, rng)
  const m = randInt(1, 3, rng)
  const k = randInt(1, 2, rng) // number of B on scale 2
  const ans = k * n + m
  return {
    rows: [
      { left: rep({ e: a }, n), right: [{ e: b }] },
      { left: [...rep({ e: b }, k), ...rep({ e: a }, m)], right: [{ q: true }] },
    ],
    question: `How many ${a} balance scale 2?`,
    answer: ans,
    unit: (x) => `${x} × ${a}`,
    why: `One ${b} weighs the same as ${n} ${a}. So ${k > 1 ? `${k} × ${b}` : b} + ${m} ${a} = ${k * n} + ${m} = ${ans} ${a}.`,
    hint: `Swap each ${b} for ${n} ${a}.`,
    key: `sub-${a}${b}-${n}-${m}-${k}`,
  }
}

/** Two unknowns with kg totals: A + B = x kg, A + A + B = y kg → B? */
function system2(_diff: Difficulty, rng: Rng): Built {
  const [a, b] = sample(OBJECTS, 2, rng)
  const wa = randInt(2, 9, rng)
  let wb = randInt(2, 12, rng)
  if (wb === wa) wb += 1
  const p = randInt(1, 3, rng) // extra A on scale 2
  const s1 = wa + wb
  const s2 = (1 + p) * wa + wb
  const askA = rng() < 0.5
  return {
    rows: [
      { left: [{ e: a }, { e: b }], right: [{ kg: s1 }] },
      { left: [...rep({ e: a }, 1 + p), { e: b }], right: [{ kg: s2 }] },
    ],
    question: `How heavy is one ${askA ? a : b}?`,
    answer: askA ? wa : wb,
    unit: (x) => `${x} kg`,
    why: `Scale 2 has ${p} more ${a} than scale 1 and is ${s2 - s1} kg heavier, so ${p > 1 ? `${p} × ` : ''}${a} = ${s2 - s1} kg → ${a} = ${wa} kg. Then ${b} = ${s1} − ${wa} = ${wb} kg.`,
    hint: 'Compare the two scales – what is different between them?',
    key: `sys2-${a}${b}-${wa}-${wb}-${p}`,
  }
}

/** Three objects chained: A×p = B ; B + A×q = C ; C + B = total kg → A? */
function system3(_diff: Difficulty, rng: Rng): Built {
  const [a, b, c] = sample(OBJECTS, 3, rng)
  const wa = randInt(1, 5, rng)
  const p = randInt(2, 3, rng)
  const q = randInt(1, 2, rng)
  const wb = p * wa
  const wc = wb + q * wa
  const total = wc + wb
  const ask = pick(['a', 'b', 'c'] as const, rng)
  const target = ask === 'a' ? a : ask === 'b' ? b : c
  const ans = ask === 'a' ? wa : ask === 'b' ? wb : wc
  return {
    rows: [
      { left: rep({ e: a }, p), right: [{ e: b }] },
      { left: [{ e: b }, ...rep({ e: a }, q)], right: [{ e: c }] },
      { left: [{ e: c }, { e: b }], right: [{ kg: total }] },
    ],
    question: `How heavy is one ${target}?`,
    answer: ans,
    unit: (x) => `${x} kg`,
    why: `Write everything in ${a}: ${b} = ${p} ${a}, ${c} = ${p + q} ${a}. Scale 3: ${p + q} + ${p} = ${2 * p + q} ${a} = ${total} kg, so ${a} = ${wa} kg, ${b} = ${wb} kg, ${c} = ${wc} kg.`,
    hint: `Rewrite every object as a number of ${a}.`,
    key: `sys3-${a}${b}${c}-${wa}-${p}-${q}-${ask}`,
  }
}

function generate(diff: Difficulty, rng: Rng): QuizQuestion {
  const d = diff.d
  const b: Built =
    d <= 2 ? numericOnly(diff, rng)
    : d <= 4 ? (rng() < 0.4 ? numericOnly(diff, rng) : oneObject(diff, rng))
    : d <= 7 ? (rng() < 0.5 ? oneObject(diff, rng) : substitution(diff, rng))
    : d <= 9 ? (rng() < 0.35 ? substitution(diff, rng) : system2(diff, rng))
    : rng() < 0.4 ? system2(diff, rng) : system3(diff, rng)
  const spread = Math.max(2, Math.round(b.answer * 0.3))
  const wrongNums = [b.answer + 1, b.answer - 1, b.answer + spread, b.answer - spread, b.answer + 2].filter((n) => n > 0)
  const { options, answerId } = textOptions(
    b.unit(b.answer),
    wrongNums.map((n) => b.unit(n)),
    rng,
  )
  return {
    key: b.key,
    prompt: (
      <div className="flex flex-col items-center gap-3">
        <div className={`grid w-full gap-2 ${b.rows.length > 1 ? 'sm:grid-cols-2' : ''} ${b.rows.length > 2 ? 'lg:grid-cols-3' : ''}`}>
          {b.rows.map((r, i) => (
            <Scale key={i} row={r} label={`Scale ${i + 1}`} />
          ))}
        </div>
        <span>{b.question}</span>
      </div>
    ),
    promptAria: `${describe(b.rows)} ${b.question}`,
    options,
    answerId,
    explanation: b.why,
    hint: b.hint,
  }
}

export const balanceChallenge: GameDef = {
  id: 'balance-challenge',
  category: 'logic',
  skill: 'logic',
  title: 'Balance Challenge',
  emoji: '⚖️',
  blurb: 'Read the balanced scales and work out the hidden weights.',
  instructions: [
    'Every scale shown is perfectly balanced.',
    'Use what each scale tells you to find the missing weight.',
    'Higher levels link two or three scales together.',
  ],
  kidInstructions: ['Both sides weigh the same.', 'Find the missing number!'],
  timeLimit: (d) => Math.round(150 * d.time),
  component: createQuizGame('balance-challenge', { rounds: (d) => 6 + Math.min(4, Math.floor(d.d / 3)), generate }),
}
