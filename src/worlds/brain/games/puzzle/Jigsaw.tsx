import { motion } from 'framer-motion'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { pick, randInt, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { DraggableTile } from '../shared/DraggableTile'
import type { GameDef, GameProps } from '../types'

const CELL = 100

function gridFor(d: number): [number, number] {
  if (d <= 2) return [2, 2]
  if (d <= 4) return [3, 2]
  if (d <= 6) return [3, 3]
  if (d <= 8) return [4, 3]
  if (d <= 10) return [4, 4]
  return [5, 4]
}

interface Feature {
  name: string
  x: number
  y: number
  w: number
  h: number
}

interface SceneDef {
  W: number
  H: number
  sky: [string, string]
  sun: { x: number; y: number; r: number; color: string; moon: boolean }
  clouds: { x: number; y: number; s: number }[]
  hills: { color: string; y: number; amp: number; phase: number }[]
  house: { x: number; w: number; h: number; wall: string; roof: string; door: string } | null
  trees: { x: number; s: number; leaf: string }[]
  flowers: { x: number; y: number; color: string }[]
  emoji: { char: string; name: string; x: number; y: number; size: number } | null
  features: Feature[]
}

const SKIES: [string, string][] = [
  ['#6ec6ff', '#d8f1ff'],
  ['#ff9a8b', '#ffe3b3'],
  ['#8e7dff', '#ffc6e8'],
  ['#4fc3f7', '#fff7c2'],
  ['#1e2a78', '#6a5acd'],
]
const HILL_SETS = [
  ['#7ed957', '#4caf50', '#2e7d32'],
  ['#a5d66a', '#6fb43f', '#3d8b2a'],
  ['#ffd27f', '#f4a259', '#bc6c25'],
  ['#9be3c4', '#4cc9a0', '#1b8f6d'],
]
const BIG_EMOJI = [
  ['🦄', 'a unicorn'],
  ['🐘', 'an elephant'],
  ['🦒', 'a giraffe'],
  ['🐳', 'a whale'],
  ['🚀', 'a rocket'],
  ['🎈', 'a balloon'],
  ['🦋', 'a butterfly'],
  ['🐢', 'a turtle'],
  ['🦁', 'a lion'],
  ['🐞', 'a ladybird'],
] as const

function makeScene(rng: Rng, cols: number, rows: number): SceneDef {
  const W = cols * CELL
  const H = rows * CELL
  const night = rng() < 0.18
  const sky = night ? SKIES[4] : pick(SKIES.slice(0, 4), rng)
  const features: Feature[] = [{ name: 'sky', x: 0, y: 0, w: W, h: H * 0.55 }]
  const sunR = Math.min(W, H) * 0.09 + 10
  const sun = {
    x: randInt(Math.round(W * 0.12), Math.round(W * 0.88), rng),
    y: randInt(Math.round(H * 0.12), Math.round(H * 0.28), rng),
    r: sunR,
    color: night ? '#fff6c9' : pick(['#ffd23f', '#ffb703', '#ffe066'], rng),
    moon: night,
  }
  features.push({ name: night ? 'the moon' : 'the sun', x: sun.x - sunR, y: sun.y - sunR, w: sunR * 2, h: sunR * 2 })
  const clouds = Array.from({ length: Math.max(1, Math.round(cols / 1.5)) }, () => ({
    x: randInt(20, W - 60, rng),
    y: randInt(Math.round(H * 0.08), Math.round(H * 0.32), rng),
    s: 0.7 + rng() * 0.6,
  }))
  clouds.forEach((c) => features.push({ name: 'a cloud', x: c.x - 30 * c.s, y: c.y - 18 * c.s, w: 80 * c.s, h: 36 * c.s }))
  const hs = pick(HILL_SETS, rng)
  const hills = hs.map((color, i) => ({ color, y: H * (0.5 + i * 0.12), amp: 14 + rng() * 22, phase: rng() * Math.PI * 2 }))
  features.push({ name: 'green hills', x: 0, y: H * 0.45, w: W, h: H * 0.55 })

  let house: SceneDef['house'] = null
  let emoji: SceneDef['emoji'] = null
  const ground = H * 0.82
  if (rng() < 0.55) {
    const w = Math.min(W * 0.32, 150)
    const x = randInt(Math.round(W * 0.1), Math.round(W * 0.9 - w), rng)
    house = {
      x,
      w,
      h: w * 0.75,
      wall: pick(['#fff3e0', '#ffe0e9', '#e3f2fd', '#fff9c4'], rng),
      roof: pick(['#e63946', '#8338ec', '#fb8500', '#3a86ff'], rng),
      door: pick(['#6d4c41', '#2a9d8f', '#e76f51'], rng),
    }
    features.push({ name: 'a house', x, y: ground - house.h - w * 0.45, w, h: house.h + w * 0.45 })
  } else {
    const [char, name] = pick(BIG_EMOJI, rng)
    const size = Math.min(W, H) * 0.42
    const x = randInt(Math.round(size * 0.6), Math.round(W - size * 0.6), rng)
    emoji = { char, name, x, y: ground - size * 0.1, size }
    features.push({ name, x: x - size / 2, y: ground - size, w: size, h: size })
  }
  const trees = Array.from({ length: Math.max(2, cols) }, () => ({
    x: randInt(20, W - 20, rng),
    s: 0.7 + rng() * 0.6,
    leaf: pick(['#2d6a4f', '#40916c', '#52b788', '#1b4332'], rng),
  })).filter((t) => !house || t.x < house.x - 25 || t.x > house.x + house.w + 25)
  trees.forEach((t) => features.push({ name: 'a tree', x: t.x - 28 * t.s, y: ground - 95 * t.s, w: 56 * t.s, h: 95 * t.s }))
  const flowers = Array.from({ length: cols * 3 }, () => ({
    x: randInt(8, W - 8, rng),
    y: randInt(Math.round(H * 0.86), H - 8, rng),
    color: pick(['#ff006e', '#ffbe0b', '#fb5607', '#ffffff', '#8338ec'], rng),
  }))
  features.push({ name: 'flowers', x: 0, y: H * 0.84, w: W, h: H * 0.16 })
  return { W, H, sky, sun, clouds, hills, house, trees, flowers, emoji, features }
}

function hillPath(W: number, H: number, y: number, amp: number, phase: number) {
  let d = `M0 ${H} L0 ${y}`
  const steps = 24
  for (let i = 0; i <= steps; i++) {
    const x = (W * i) / steps
    d += ` L${x.toFixed(1)} ${(y + Math.sin((i / steps) * Math.PI * 2 + phase) * amp).toFixed(1)}`
  }
  return d + ` L${W} ${H}Z`
}

/** Renders the whole scene, or just one window of it (a piece). */
function Scene({ s, view, className }: { s: SceneDef; view?: { x: number; y: number }; className?: string }) {
  const id = useId().replace(/:/g, '')
  const ground = s.H * 0.82
  const vb = view ? `${view.x} ${view.y} ${CELL} ${CELL}` : `0 0 ${s.W} ${s.H}`
  return (
    <svg viewBox={vb} className={className} aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.sky[0]} />
          <stop offset="1" stopColor={s.sky[1]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={s.W} height={s.H} fill={`url(#sky${id})`} />
      <circle cx={s.sun.x} cy={s.sun.y} r={s.sun.r} fill={s.sun.color} />
      {s.sun.moon && <circle cx={s.sun.x + s.sun.r * 0.45} cy={s.sun.y - s.sun.r * 0.25} r={s.sun.r * 0.85} fill={s.sky[0]} />}
      {!s.sun.moon &&
        Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4
          return (
            <line
              key={i}
              x1={s.sun.x + Math.cos(a) * s.sun.r * 1.25}
              y1={s.sun.y + Math.sin(a) * s.sun.r * 1.25}
              x2={s.sun.x + Math.cos(a) * s.sun.r * 1.6}
              y2={s.sun.y + Math.sin(a) * s.sun.r * 1.6}
              stroke={s.sun.color}
              strokeWidth="5"
              strokeLinecap="round"
            />
          )
        })}
      {s.clouds.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`} fill="#fff" opacity="0.92">
          <ellipse cx="0" cy="0" rx="26" ry="16" />
          <ellipse cx="24" cy="-6" rx="22" ry="18" />
          <ellipse cx="44" cy="2" rx="20" ry="13" />
        </g>
      ))}
      {s.hills.map((h, i) => (
        <path key={i} d={hillPath(s.W, s.H, h.y, h.amp, h.phase)} fill={h.color} />
      ))}
      {s.trees.map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${ground}) scale(${t.s})`}>
          <rect x="-6" y="-38" width="12" height="40" fill="#8d5524" rx="3" />
          <circle cx="0" cy="-58" r="26" fill={t.leaf} />
          <circle cx="-14" cy="-44" r="16" fill={t.leaf} />
          <circle cx="14" cy="-44" r="16" fill={t.leaf} />
        </g>
      ))}
      {s.house && (
        <g>
          <rect x={s.house.x} y={ground - s.house.h} width={s.house.w} height={s.house.h} fill={s.house.wall} stroke="#00000022" strokeWidth="2" />
          <path
            d={`M${s.house.x - 10} ${ground - s.house.h} L${s.house.x + s.house.w / 2} ${ground - s.house.h - s.house.w * 0.45} L${s.house.x + s.house.w + 10} ${ground - s.house.h}Z`}
            fill={s.house.roof}
          />
          <rect x={s.house.x + s.house.w * 0.4} y={ground - s.house.h * 0.55} width={s.house.w * 0.2} height={s.house.h * 0.55} fill={s.house.door} rx="3" />
          <rect x={s.house.x + s.house.w * 0.1} y={ground - s.house.h * 0.8} width={s.house.w * 0.2} height={s.house.w * 0.2} fill="#90e0ef" stroke="#fff" strokeWidth="3" />
          <rect x={s.house.x + s.house.w * 0.7} y={ground - s.house.h * 0.8} width={s.house.w * 0.2} height={s.house.w * 0.2} fill="#90e0ef" stroke="#fff" strokeWidth="3" />
        </g>
      )}
      {s.emoji && (
        <text x={s.emoji.x} y={s.emoji.y} fontSize={s.emoji.size} textAnchor="middle">
          {s.emoji.char}
        </text>
      )}
      {s.flowers.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r="4.5" fill={f.color} />
          <circle cx={f.x} cy={f.y} r="1.8" fill="#ffd60a" />
        </g>
      ))}
    </svg>
  )
}

function describe(s: SceneDef, col: number, row: number): string {
  const x0 = col * CELL
  const y0 = row * CELL
  const names = new Set<string>()
  for (const f of s.features) {
    if (f.x < x0 + CELL && f.x + f.w > x0 && f.y < y0 + CELL && f.y + f.h > y0) names.add(f.name)
  }
  return [...names].slice(-3).join(', ') || 'sky'
}

function Jigsaw({ diff, rng, paused, api }: GameProps) {
  const [cols, rows] = gridFor(diff.d)
  const total = cols * rows
  const scene = useMemo(() => makeScene(rng, cols, rows), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const trayOrder = useMemo(() => {
    let order = shuffle(Array.from({ length: total }, (_, i) => i), rng)
    if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]]
    return order
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [placed, setPlaced] = useState<boolean[]>(() => Array(total).fill(false))
  const [selected, setSelected] = useState<number | null>(null)
  const [preview, setPreview] = useState(false)
  const [shakeSlot, setShakeSlot] = useState<number | null>(null)
  const [hintSlot, setHintSlot] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const finished = useRef(false)
  const count = placed.filter(Boolean).length

  useEffect(() => api.progress(count, total), [count, total, api])

  const tryPlace = useCallback(
    (piece: number, slot: number) => {
      if (paused || placed[piece]) return
      if (piece === slot) {
        play('correct')
        api.correct()
        const next = placed.slice()
        next[piece] = true
        setPlaced(next)
        setSelected(null)
        setHintSlot(null)
        setMsg(`Piece fits! ${next.filter(Boolean).length} of ${total} placed.`)
        if (next.every(Boolean) && !finished.current) {
          finished.current = true
          window.setTimeout(() => {
            play('win')
            api.finish({ completed: true })
          }, 700)
        }
      } else {
        play('wrong')
        api.wrong()
        setShakeSlot(slot)
        setMsg('That piece does not go there – it bounced back.')
        window.setTimeout(() => setShakeSlot(null), 450)
      }
    },
    [paused, placed, api, total],
  )

  useEffect(() => {
    api.onHint(() => {
      const piece = trayOrder.find((p) => !placed[p])
      if (piece === undefined) return 'All pieces are in place!'
      setSelected(piece)
      setHintSlot(piece)
      window.setTimeout(() => setHintSlot(null), 2500)
      const r = Math.floor(piece / cols) + 1
      const c = (piece % cols) + 1
      return `The highlighted piece goes in row ${r}, column ${c} – the glowing spot.`
    })
    return () => api.onHint(null)
  }, [api, placed, trayOrder, cols])

  const pieceSize = `min(${Math.floor(560 / cols)}px, ${Math.floor(88 / cols)}vw)`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="bchip bg-primary-soft text-primary">
          {count} / {total} pieces
        </span>
        <button type="button" className="bbtn-ghost !py-2 text-sm" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
          {preview ? <EyeOff size={18} /> : <Eye size={18} />} {preview ? 'Hide picture' : 'Show picture'}
        </button>
      </div>

      <div
        role="grid"
        aria-label={`Puzzle board, ${cols} columns by ${rows} rows. ${selected !== null ? 'A piece is selected – choose a spot.' : 'Select a piece first.'}`}
        className="relative grid overflow-hidden rounded-2xl border-2 border-line bg-white shadow-soft"
        style={{ gridTemplateColumns: `repeat(${cols}, ${pieceSize})`, gridAutoRows: pieceSize }}
      >
        {preview && <Scene s={scene} className="pointer-events-none absolute inset-0 h-full w-full opacity-25" />}
        {Array.from({ length: total }, (_, slot) => {
          const r = Math.floor(slot / cols)
          const c = slot % cols
          const filled = placed[slot]
          return (
            <motion.button
              key={slot}
              type="button"
              data-dropzone={`slot-${slot}`}
              animate={shakeSlot === slot ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => (selected !== null ? tryPlace(selected, slot) : setMsg('Pick a piece from the tray first.'))}
              aria-label={`Row ${r + 1}, column ${c + 1}${filled ? `, filled with ${describe(scene, c, r)}` : ', empty'}`}
              className={`relative border border-dashed border-primary/25 ${hintSlot === slot ? 'z-10 ring-4 ring-accent ring-inset animate-pulse' : ''} ${
                selected !== null && !filled ? 'hover:bg-primary/10' : ''
              }`}
            >
              {filled && (
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0">
                  <Scene s={scene} view={{ x: c * CELL, y: r * CELL }} className="h-full w-full" />
                  <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-success text-white shadow">
                    <Check size={12} strokeWidth={3} />
                  </span>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-semibold text-muted">
        {msg || (diff.young ? 'Drag a piece to the board, or tap a piece then tap a spot.' : 'Drag pieces onto the board, or tap a piece and then a spot.')}
      </p>

      <div role="group" aria-label="Piece tray" className="flex w-full flex-wrap justify-center gap-2 rounded-2xl bg-primary-soft/60 p-3">
        {trayOrder
          .filter((p) => !placed[p])
          .map((p) => {
            const r = Math.floor(p / cols)
            const c = p % cols
            return (
              <DraggableTile
                key={p}
                label={`Piece showing ${describe(scene, c, r)}${selected === p ? ', selected' : ''}`}
                selected={selected === p}
                disabled={paused}
                onActivate={() => {
                  play('tap')
                  setSelected((s) => (s === p ? null : p))
                }}
                onDrop={(zone) => {
                  if (zone.startsWith('slot-')) tryPlace(p, Number(zone.slice(5)))
                }}
                className={`overflow-hidden !p-0 ${hintSlot === p ? 'ring-4 ring-accent' : ''}`}
              >
                <span className="block" style={{ width: `calc(${pieceSize} * 0.8)`, height: `calc(${pieceSize} * 0.8)` }}>
                  <Scene s={scene} view={{ x: c * CELL, y: r * CELL }} className="pointer-events-none h-full w-full" />
                </span>
              </DraggableTile>
            )
          })}
      </div>
    </div>
  )
}

export const jigsaw: GameDef = {
  id: 'jigsaw',
  category: 'puzzle',
  skill: 'spatial',
  title: 'Jigsaw Picture',
  emoji: '🧩',
  blurb: 'Rebuild a colourful picture piece by piece.',
  instructions: [
    'Drag each piece from the tray to its spot on the board.',
    'Or tap a piece, then tap the spot where it belongs.',
    'Pieces in the wrong spot bounce back and count as a miss.',
    'Use “Show picture” for a faint guide.',
  ],
  kidInstructions: ['Put the picture back together!', 'Tap a piece, then tap where it goes.', 'Tap “Show picture” if you need help.'],
  timeLimit: (d) => Math.round((60 + gridFor(d.d)[0] * gridFor(d.d)[1] * 12) * d.time),
  timeoutCompletes: false,
  component: Jigsaw,
}
