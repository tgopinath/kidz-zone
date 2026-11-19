import { motion } from 'framer-motion'
import { RotateCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { pick, randInt, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { DraggableTile } from '../shared/DraggableTile'
import { PALETTE } from '../shared/Shape'
import type { GameDef, GameProps } from '../types'

/**
 * Each grid cell is split by its diagonals into 4 quarter-triangles:
 * 0 = top (N), 1 = right (E), 2 = bottom (S), 3 = left (W).
 * A full square covers all four; a half-square right triangle covers two neighbours.
 */
type Quad = [number, number, number] // row, col, quarter

type PieceType = 'sq1' | 'tri1' | 'rect2' | 'sq2' | 'tri2' | 'rect3'

const ALL: number[] = [0, 1, 2, 3]
const full = (r: number, c: number): Quad[] => ALL.map((q) => [r, c, q] as Quad)

const BASE: Record<PieceType, Quad[]> = {
  sq1: full(0, 0),
  tri1: [
    [0, 0, 2],
    [0, 0, 3],
  ],
  rect2: [...full(0, 0), ...full(0, 1)],
  sq2: [...full(0, 0), ...full(0, 1), ...full(1, 0), ...full(1, 1)],
  tri2: [[0, 0, 2], [0, 0, 3], ...full(1, 0), [1, 1, 2], [1, 1, 3]],
  rect3: [...full(0, 0), ...full(0, 1), ...full(0, 2)],
}

const NAMES: Record<PieceType, string> = {
  sq1: 'small square',
  tri1: 'small triangle',
  rect2: 'domino rectangle',
  sq2: 'big square',
  tri2: 'big triangle',
  rect3: 'long rectangle',
}

function normalize(s: Quad[]): Quad[] {
  const mr = Math.min(...s.map((x) => x[0]))
  const mc = Math.min(...s.map((x) => x[1]))
  return s.map(([r, c, q]) => [r - mr, c - mc, q] as Quad)
}

function rotateOnce(s: Quad[]): Quad[] {
  const H = Math.max(...s.map((x) => x[0])) + 1
  return normalize(s.map(([r, c, q]) => [c, H - 1 - r, (q + 1) % 4] as Quad))
}

const orientCache = new Map<string, Quad[]>()
function oriented(type: PieceType, rot: number): Quad[] {
  const k = `${type}${rot % 4}`
  let v = orientCache.get(k)
  if (!v) {
    v = BASE[type]
    for (let i = 0; i < rot % 4; i++) v = rotateOnce(v)
    orientCache.set(k, v)
  }
  return v
}

const key = (r: number, c: number, q: number) => `${r},${c},${q}`

function placedKeys(type: PieceType, rot: number, r0: number, c0: number): string[] {
  return oriented(type, rot).map(([r, c, q]) => key(r + r0, c + c0, q))
}

function dims(type: PieceType, rot: number) {
  const s = oriented(type, rot)
  return { h: Math.max(...s.map((x) => x[0])) + 1, w: Math.max(...s.map((x) => x[1])) + 1 }
}

function neighbourKeys(r: number, c: number, q: number): string[] {
  const out = [key(r, c, (q + 1) % 4), key(r, c, (q + 3) % 4)]
  if (q === 0) out.push(key(r - 1, c, 2))
  if (q === 1) out.push(key(r, c + 1, 3))
  if (q === 2) out.push(key(r + 1, c, 0))
  if (q === 3) out.push(key(r, c - 1, 1))
  return out
}

interface SolPiece {
  type: PieceType
  rot: number
  r: number
  c: number
  sig: string
}

function sigOf(keys: string[]) {
  return keys.slice().sort().join('|')
}

function config(d: number) {
  const G = d <= 4 ? 4 : d <= 8 ? 5 : 6
  const count = 3 + Math.floor(((d - 1) * 4) / 11)
  const types: PieceType[] = ['sq1', 'tri1', 'tri1', 'rect2', 'tri2']
  if (d >= 5) types.push('sq2', 'tri2')
  if (d >= 9) types.push('rect3')
  return { G, count, types }
}

function generate(d: number, rng: Rng): { G: number; solution: SolPiece[]; silhouette: Set<string> } {
  const { G, count, types } = config(d)
  for (let attempt = 0; attempt < 400; attempt++) {
    const cover = new Set<string>()
    const solution: SolPiece[] = []
    let ok = true
    for (let p = 0; p < count; p++) {
      const type = pick(types, rng)
      const rot = randInt(0, 3, rng)
      const { h, w } = dims(type, rot)
      const spots: [number, number][] = []
      for (let r = 0; r <= G - h; r++)
        for (let c = 0; c <= G - w; c++) {
          const ks = placedKeys(type, rot, r, c)
          if (ks.some((k) => cover.has(k))) continue
          if (cover.size) {
            const touches = oriented(type, rot).some(([qr, qc, q]) => neighbourKeys(qr + r, qc + c, q).some((n) => cover.has(n)))
            if (!touches) continue
          }
          spots.push([r, c])
        }
      if (!spots.length) {
        ok = false
        break
      }
      const [r, c] = pick(spots, rng)
      const ks = placedKeys(type, rot, r, c)
      ks.forEach((k) => cover.add(k))
      solution.push({ type, rot, r, c, sig: sigOf(ks) })
    }
    if (ok) return { G, solution, silhouette: cover }
  }
  // Fallback (practically unreachable): a row of small squares.
  const solution: SolPiece[] = Array.from({ length: 3 }, (_, i) => ({ type: 'sq1' as PieceType, rot: 0, r: 0, c: i, sig: sigOf(placedKeys('sq1', 0, 0, i)) }))
  return { G, solution, silhouette: new Set(solution.flatMap((s) => placedKeys(s.type, s.rot, s.r, s.c))) }
}

interface TrayPiece {
  id: number
  type: PieceType
  rot: number
  color: string
  at: { r: number; c: number } | null
}

function quadPoints(r: number, c: number, q: number, s = 10) {
  const x = c * s
  const y = r * s
  const m = `${x + s / 2},${y + s / 2}`
  switch (q) {
    case 0:
      return `${x},${y} ${x + s},${y} ${m}`
    case 1:
      return `${x + s},${y} ${x + s},${y + s} ${m}`
    case 2:
      return `${x + s},${y + s} ${x},${y + s} ${m}`
    default:
      return `${x},${y + s} ${x},${y} ${m}`
  }
}

function Quads({ quads, fill, stroke, dashed, opacity = 1 }: { quads: Quad[]; fill: string; stroke?: string; dashed?: boolean; opacity?: number }) {
  return (
    <g opacity={opacity}>
      {quads.map(([r, c, q]) => (
        <polygon
          key={`${r}-${c}-${q}`}
          points={quadPoints(r, c, q)}
          fill={fill}
          stroke={stroke ?? fill}
          strokeWidth={dashed ? 0.6 : 0.35}
          strokeDasharray={dashed ? '1.2 1' : undefined}
          strokeLinejoin="round"
        />
      ))}
    </g>
  )
}

function PieceIcon({ type, rot, color }: { type: PieceType; rot: number; color: string }) {
  const { h, w } = dims(type, rot)
  const m = Math.max(h, w, 2)
  return (
    <svg viewBox={`-1 -1 ${m * 10 + 2} ${m * 10 + 2}`} className="size-14 sm:size-16" aria-hidden>
      <g transform={`translate(${((m - w) * 10) / 2} ${((m - h) * 10) / 2})`}>
        <Quads quads={oriented(type, rot)} fill={color} />
      </g>
    </svg>
  )
}

function Tangram({ diff, rng, paused, api }: GameProps) {
  const { G, solution, silhouette } = useMemo(() => generate(diff.d, rng), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [pieces, setPieces] = useState<TrayPiece[]>(() =>
    shuffle(solution, rng).map((s, i) => ({
      id: i,
      type: s.type,
      rot: randInt(0, 3, rng),
      color: PALETTE[i % PALETTE.length].hex,
      at: null,
    })),
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [focusCell, setFocusCell] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const [hintCell, setHintCell] = useState<number | null>(null)
  const [hintPiece, setHintPiece] = useState<number | null>(null)
  const [shake, setShake] = useState(0)
  const [msg, setMsg] = useState('')
  const awarded = useRef(new Set<number>())
  const finished = useRef(false)

  const placedCount = pieces.filter((p) => p.at).length
  useEffect(() => api.progress(placedCount, pieces.length), [placedCount, pieces.length, api])

  const occupied = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pieces) if (p.at) placedKeys(p.type, p.rot, p.at.r, p.at.c).forEach((k) => m.set(k, p.id))
    return m
  }, [pieces])

  const tryPlace = useCallback(
    (id: number, cell: number) => {
      if (paused || finished.current) return
      const p = pieces.find((x) => x.id === id)
      if (!p || p.at) return
      const r = Math.floor(cell / G)
      const c = cell % G
      const ks = placedKeys(p.type, p.rot, r, c)
      const spill = ks.some((k) => !silhouette.has(k))
      const overlap = ks.some((k) => occupied.has(k))
      if (spill || overlap) {
        play('wrong')
        api.wrong()
        setShake((s) => s + 1)
        setMsg(spill ? `The ${NAMES[p.type]} would stick out of the shape. Try another spot or rotate it.` : `The ${NAMES[p.type]} would overlap another piece.`)
        return
      }
      play('correct')
      if (!awarded.current.has(id)) {
        awarded.current.add(id)
        api.correct()
      }
      const next = pieces.map((x) => (x.id === id ? { ...x, at: { r, c } } : x))
      setPieces(next)
      setSelected(null)
      setHintCell(null)
      setHintPiece(null)
      setMsg(`Placed the ${NAMES[p.type]}.`)
      if (next.every((x) => x.at) && !finished.current) {
        finished.current = true
        setMsg('Shape complete!')
        window.setTimeout(() => {
          play('win')
          api.finish({ completed: true })
        }, 700)
      }
    },
    [paused, pieces, G, silhouette, occupied, api],
  )

  const removeAt = (cell: number) => {
    const r = Math.floor(cell / G)
    const c = cell % G
    const id = [0, 1, 2, 3].map((q) => occupied.get(key(r, c, q))).find((v) => v !== undefined)
    if (id === undefined) return false
    play('tap')
    setPieces((ps) => ps.map((x) => (x.id === id ? { ...x, at: null } : x)))
    setMsg('Piece returned to the tray.')
    return true
  }

  const rotate = useCallback(() => {
    if (selected === null || paused) {
      setMsg('Select a piece in the tray to rotate it.')
      return
    }
    play('flip')
    setPieces((ps) => ps.map((x) => (x.id === selected ? { ...x, rot: (x.rot + 1) % 4 } : x)))
  }, [selected, paused])

  const clickCell = (cell: number) => {
    if (paused || finished.current) return
    if (selected !== null) tryPlace(selected, cell)
    else if (!removeAt(cell)) setMsg('Pick a piece from the tray first.')
  }

  useEffect(() => {
    if (paused) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        rotate()
      } else if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paused, rotate])

  useEffect(() => {
    api.onHint(() => {
      const used = new Set<number>()
      for (const p of pieces) {
        if (!p.at) continue
        const sig = sigOf(placedKeys(p.type, p.rot, p.at.r, p.at.c))
        const idx = solution.findIndex((s, i) => !used.has(i) && s.type === p.type && s.sig === sig)
        if (idx < 0) {
          const [qr, qc] = oriented(p.type, p.rot)[0]
          const hr = p.at.r + qr
          const hc = p.at.c + qc
          setHintCell(hr * G + hc)
          window.setTimeout(() => setHintCell(null), 2500)
          return `The ${NAMES[p.type]} at row ${hr + 1}, column ${hc + 1} is in a tricky spot – tap it (with nothing selected) to return it to the tray.`
        }
        used.add(idx)
      }
      const si = solution.findIndex((_, i) => !used.has(i))
      if (si < 0) return 'Nearly there!'
      const s = solution[si]
      const tp = pieces.find((p) => !p.at && p.type === s.type)
      if (!tp) return 'Try rotating your pieces.'
      setPieces((ps) => ps.map((x) => (x.id === tp.id ? { ...x, rot: s.rot } : x)))
      setSelected(tp.id)
      setHintPiece(tp.id)
      setHintCell(s.r * G + s.c)
      window.setTimeout(() => {
        setHintCell(null)
        setHintPiece(null)
      }, 3000)
      return `Place the ${NAMES[s.type]} (now turned the right way) with its top-left corner on the glowing square: row ${s.r + 1}, column ${s.c + 1}.`
    })
    return () => api.onHint(null)
  }, [api, pieces, solution, G])

  const onCellKey = (e: ReactKeyboardEvent, cell: number) => {
    const r = Math.floor(cell / G)
    const c = cell % G
    let n = -1
    if (e.key === 'ArrowRight') n = r * G + Math.min(G - 1, c + 1)
    else if (e.key === 'ArrowLeft') n = r * G + Math.max(0, c - 1)
    else if (e.key === 'ArrowDown') n = Math.min(G - 1, r + 1) * G + c
    else if (e.key === 'ArrowUp') n = Math.max(0, r - 1) * G + c
    if (n >= 0) {
      e.preventDefault()
      setFocusCell(n)
      setHover(n)
      ;(document.querySelector(`[data-tcell="${n}"]`) as HTMLElement | null)?.focus()
    }
  }

  const sel = pieces.find((p) => p.id === selected)
  const ghostCell = hover ?? null
  const ghost =
    sel && ghostCell !== null
      ? oriented(sel.type, sel.rot).map(([r, c, q]) => [r + Math.floor(ghostCell / G), c + (ghostCell % G), q] as Quad)
      : null
  const ghostOk = ghost ? ghost.every(([r, c, q]) => silhouette.has(key(r, c, q)) && !occupied.has(key(r, c, q))) : false
  const silQuads = [...silhouette].map((k) => k.split(',').map(Number) as Quad)
  const cellPx = `min(${Math.floor(400 / G)}px, ${Math.floor(84 / G)}vw)`

  const cellLabel = (cell: number) => {
    const r = Math.floor(cell / G)
    const c = cell % G
    const inside = ALL.filter((q) => silhouette.has(key(r, c, q))).length
    const filled = ALL.filter((q) => occupied.has(key(r, c, q))).length
    const shape = inside === 4 ? 'inside the shape' : inside === 0 ? 'outside the shape' : `${inside === 2 ? 'half' : 'partly'} inside the shape`
    return `Row ${r + 1}, column ${c + 1}: ${shape}${filled ? (filled === inside ? ', filled' : ', partly filled') : ''}`
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
      <p className="text-center text-sm font-semibold text-muted">
        {diff.young ? 'Fill the dark shape with all the pieces!' : 'Cover the dark silhouette exactly using every piece – no overlaps, nothing sticking out.'}
      </p>

      <motion.div
        key={shake}
        animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="relative rounded-2xl border-2 border-line bg-white p-1 shadow-soft"
      >
        <svg viewBox={`0 0 ${G * 10} ${G * 10}`} className="pointer-events-none absolute inset-1" style={{ width: `calc(${cellPx} * ${G})`, height: `calc(${cellPx} * ${G})` }} aria-hidden>
          {Array.from({ length: G + 1 }, (_, i) => (
            <g key={i}>
              <line x1={0} y1={i * 10} x2={G * 10} y2={i * 10} stroke="#e7e4f5" strokeWidth="0.3" />
              <line x1={i * 10} y1={0} x2={i * 10} y2={G * 10} stroke="#e7e4f5" strokeWidth="0.3" />
            </g>
          ))}
          <Quads quads={silQuads} fill="#3b3570" opacity={0.85} />
          {pieces
            .filter((p) => p.at)
            .map((p) => (
              <Quads key={p.id} quads={oriented(p.type, p.rot).map(([r, c, q]) => [r + p.at!.r, c + p.at!.c, q] as Quad)} fill={p.color} stroke="#ffffff" />
            ))}
          {ghost && <Quads quads={ghost} fill={ghostOk ? '#35c98b' : '#f0506e'} stroke={ghostOk ? '#1d8a5c' : '#c22d4b'} dashed opacity={0.55} />}
          {hintCell !== null && (
            <rect x={(hintCell % G) * 10 + 0.6} y={Math.floor(hintCell / G) * 10 + 0.6} width={8.8} height={8.8} fill="none" stroke="#ffaa45" strokeWidth="1.2" rx="1.5">
              <animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite" />
            </rect>
          )}
        </svg>
        <div
          role="grid"
          aria-label={`Tangram board ${G} by ${G}. ${placedCount} of ${pieces.length} pieces placed.`}
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${G}, ${cellPx})`, gridAutoRows: cellPx }}
          onMouseLeave={() => setHover(null)}
        >
          {Array.from({ length: G * G }, (_, cell) => (
            <button
              key={cell}
              type="button"
              data-tcell={cell}
              data-dropzone={`cell-${cell}`}
              tabIndex={cell === focusCell ? 0 : -1}
              onFocus={() => {
                setFocusCell(cell)
                setHover(cell)
              }}
              onMouseEnter={() => setHover(cell)}
              onKeyDown={(e) => onCellKey(e, cell)}
              onClick={() => clickCell(cell)}
              aria-label={cellLabel(cell)}
              className="rounded-none bg-transparent"
            />
          ))}
        </div>
      </motion.div>

      <p role="status" aria-live="polite" className="min-h-6 text-center text-sm font-semibold text-muted">
        {msg ||
          (sel
            ? `${NAMES[sel.type]} selected – tap a square for its top-left corner. Press R to rotate.`
            : 'Select a piece, rotate it with R, then tap or drag it onto the board.')}
      </p>

      <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-primary-soft/60 p-3" role="group" aria-label="Piece tray">
        {pieces
          .filter((p) => !p.at)
          .map((p) => (
            <DraggableTile
              key={p.id}
              label={`${NAMES[p.type]}, turned ${p.rot * 90} degrees${selected === p.id ? ', selected' : ''}`}
              selected={selected === p.id}
              disabled={paused}
              onActivate={() => {
                play('tap')
                setSelected((s) => (s === p.id ? null : p.id))
                setMsg('')
              }}
              onDrop={(zone) => {
                if (zone.startsWith('cell-')) tryPlace(p.id, Number(zone.slice(5)))
              }}
              className={`grid place-items-center p-1.5 ${hintPiece === p.id ? 'ring-4 ring-accent' : ''}`}
            >
              <PieceIcon type={p.type} rot={p.rot} color={p.color} />
            </DraggableTile>
          ))}
        {placedCount === pieces.length && <span className="font-bold text-success">✓ All pieces placed</span>}
      </div>
      <button type="button" className="bbtn-ghost" onClick={rotate} disabled={selected === null}>
        <RotateCw size={18} /> Rotate (R)
      </button>
    </div>
  )
}

export const tangram: GameDef = {
  id: 'tangram',
  category: 'puzzle',
  skill: 'spatial',
  title: 'Shape Builder',
  emoji: '🔷',
  blurb: 'Fit squares and triangles together to fill a silhouette.',
  instructions: [
    'Fill the dark silhouette using every piece in the tray.',
    'Select a piece, rotate it with R or the Rotate button.',
    'Tap a square (or drag) to place it – the square you choose is the piece’s top-left corner.',
    'Pieces that stick out or overlap are rejected. Tap a placed piece to take it back.',
  ],
  kidInstructions: ['Fill the dark shape with the coloured pieces.', 'Tap a piece, then tap the board.', 'Tap Rotate to turn a piece.'],
  timeLimit: (d) => Math.round((90 + config(d.d).count * 30) * d.time),
  timeoutCompletes: false,
  component: Tangram,
}
