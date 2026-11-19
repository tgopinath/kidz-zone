import { Check } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pick, randInt, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { DraggableTile } from '../shared/DraggableTile'
import type { GameDef, GameProps } from '../types'

const SKIES: [string, string][] = [
  ['#8ecbff', '#fde3ff'],
  ['#ffcf8a', '#ff8fb1'],
  ['#a7f0e1', '#7ab8ff'],
  ['#c9b8ff', '#ffe1a8'],
]
const HOUSE = ['#FF8A3D', '#F0506E', '#3898FF', '#7557F6', '#19B5B0']
const DECOR_COLORS = ['#FFC43D', '#FF6FCF', '#ffffff', '#F0506E', '#7557F6', '#3898FF']

function gridFor(d: number) {
  if (d <= 3) return 2
  if (d <= 7) return 3
  return 4
}

/** A small random landscape. Every grid cell gets its own decoration so no two pieces look alike. */
function makeScene(n: number, rng: Rng): string {
  const S = 400
  const [s1, s2] = pick(SKIES, rng)
  const g1 = pick(['#35C98B', '#4fb36b', '#7fd17a'], rng)
  const g2 = pick(['#1fa971', '#2e8f57', '#5cbf63'], rng)
  const sunX = randInt(60, 340, rng)
  const sunY = randInt(50, 120, rng)
  const hx = randInt(40, 230, rng)
  const hw = randInt(100, 130, rng)
  const hy = 250
  const houseCol = pick(HOUSE, rng)
  const roofCol = pick(['#7a3b2e', '#20213a', '#5a3fe0', '#c22d4b'], rng)
  const tx = hx + hw + randInt(30, Math.max(31, 360 - hx - hw), rng)
  const treeX = Math.min(370, tx)
  const parts: string[] = [
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs>`,
    `<rect width="${S}" height="${S}" fill="url(#sky)"/>`,
    `<circle cx="${sunX}" cy="${sunY}" r="34" fill="#FFC43D" stroke="#ffe08a" stroke-width="10"/>`,
    `<path d="M0 ${randInt(250, 290, rng)} Q ${randInt(80, 160, rng)} ${randInt(180, 230, rng)} ${randInt(220, 260, rng)} ${randInt(260, 290, rng)} T ${S} ${randInt(240, 280, rng)} V ${S} H 0 Z" fill="${g1}"/>`,
    `<path d="M0 ${randInt(310, 340, rng)} Q ${randInt(150, 250, rng)} ${randInt(270, 300, rng)} ${S} ${randInt(300, 340, rng)} V ${S} H 0 Z" fill="${g2}"/>`,
    `<rect x="${hx}" y="${hy}" width="${hw}" height="90" fill="${houseCol}" stroke="#20213a" stroke-width="3"/>`,
    `<path d="M${hx - 12} ${hy} L${hx + hw / 2} ${hy - 60} L${hx + hw + 12} ${hy} Z" fill="${roofCol}" stroke="#20213a" stroke-width="3"/>`,
    `<rect x="${hx + hw / 2 - 14}" y="${hy + 44}" width="28" height="46" fill="#7a3b2e"/>`,
    `<rect x="${hx + 12}" y="${hy + 16}" width="24" height="22" fill="#dff3ff" stroke="#20213a" stroke-width="2"/>`,
    `<rect x="${hx + hw - 36}" y="${hy + 16}" width="24" height="22" fill="#dff3ff" stroke="#20213a" stroke-width="2"/>`,
    `<rect x="${treeX - 8}" y="270" width="16" height="70" fill="#7a3b2e"/>`,
    `<circle cx="${treeX}" cy="255" r="${randInt(30, 40, rng)}" fill="#2e8f57"/>`,
  ]
  const cell = S / n
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = c * cell + randInt(Math.round(cell * 0.25), Math.round(cell * 0.75), rng)
      const y = r * cell + randInt(Math.round(cell * 0.25), Math.round(cell * 0.75), rng)
      const col = pick(DECOR_COLORS, rng)
      const k = randInt(0, 4, rng)
      const sz = Math.max(8, cell * 0.12)
      if (k === 0) {
        parts.push(
          `<g fill="#ffffff" opacity=".95"><circle cx="${x}" cy="${y}" r="${sz}"/><circle cx="${x + sz}" cy="${y - sz * 0.5}" r="${sz * 1.1}"/><circle cx="${x + sz * 2}" cy="${y}" r="${sz}"/></g>`,
        )
      } else if (k === 1) {
        const p = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
          .map((i) => {
            const a = (Math.PI / 5) * i - Math.PI / 2
            const rr = i % 2 ? sz * 0.45 : sz
            return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`
          })
          .join(' ')
        parts.push(`<polygon points="${p}" fill="${col}" stroke="#20213a" stroke-width="1.5"/>`)
      } else if (k === 2) {
        parts.push(
          `<g><circle cx="${x - sz * 0.6}" cy="${y}" r="${sz * 0.55}" fill="${col}"/><circle cx="${x + sz * 0.6}" cy="${y}" r="${sz * 0.55}" fill="${col}"/><circle cx="${x}" cy="${y - sz * 0.6}" r="${sz * 0.55}" fill="${col}"/><circle cx="${x}" cy="${y + sz * 0.6}" r="${sz * 0.55}" fill="${col}"/><circle cx="${x}" cy="${y}" r="${sz * 0.45}" fill="#FFC43D" stroke="#20213a" stroke-width="1"/></g>`,
        )
      } else if (k === 3) {
        parts.push(
          `<path d="M${x - sz} ${y} q ${sz / 2} ${-sz * 0.8} ${sz} 0 q ${sz / 2} ${-sz * 0.8} ${sz} 0" fill="none" stroke="#20213a" stroke-width="3" stroke-linecap="round"/>`,
        )
      } else {
        parts.push(`<rect x="${x - sz * 0.7}" y="${y - sz * 0.7}" width="${sz * 1.4}" height="${sz * 1.4}" rx="${sz * 0.3}" fill="${col}" stroke="#20213a" stroke-width="1.5" transform="rotate(${randInt(0, 45, rng)} ${x} ${y})"/>`)
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">${parts.join('')}</svg>`
}

function ShapeAssembly({ diff, rng, paused, api }: GameProps) {
  const n = gridFor(diff.d)
  const total = n * n
  const { url, order } = useMemo(() => {
    const svg = makeScene(n, rng)
    const ids = [...Array(total).keys()]
    let o = shuffle(ids, rng)
    // Make sure the tray doesn't start in solved order.
    if (o.every((v, i) => v === i)) o = [...o.slice(1), o[0]]
    return { url: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, order: o }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [placed, setPlaced] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<number | null>(null)
  const [shake, setShake] = useState<number | null>(null)
  const [glow, setGlow] = useState<number | null>(null)
  const done = useRef(false)
  const showPreview = diff.d <= 9

  useEffect(() => api.progress(placed.size, total), [placed, total, api])

  useEffect(() => {
    api.onHint(() => {
      const piece = selected ?? order.find((p) => !placed.has(p))
      if (piece === undefined) return 'The picture is complete!'
      setSelected(piece)
      setGlow(piece)
      window.setTimeout(() => setGlow(null), 1500)
      return `The selected piece goes in row ${Math.floor(piece / n) + 1}, column ${(piece % n) + 1} – the glowing slot.`
    })
    return () => api.onHint(null)
  }, [api, selected, order, placed, n])

  const pieceStyle = (k: number) => ({
    backgroundImage: url,
    backgroundSize: `${n * 100}% ${n * 100}%`,
    backgroundPosition: `${((k % n) / (n - 1)) * 100}% ${(Math.floor(k / n) / (n - 1)) * 100}%`,
  })

  const tryPlace = (piece: number, slot: number) => {
    if (paused || placed.has(piece) || placed.has(slot)) return
    if (piece === slot) {
      play('correct')
      api.correct(10 * diff.d)
      const next = new Set(placed).add(piece)
      setPlaced(next)
      setSelected(null)
      if (next.size === total && !done.current) {
        done.current = true
        window.setTimeout(() => {
          play('win')
          api.progress(total, total)
          api.finish({ completed: true })
        }, 700)
      }
    } else {
      play('wrong')
      api.wrong()
      setShake(piece)
      window.setTimeout(() => setShake(null), 450)
    }
  }

  const board = `min(360px, calc(100vw - 48px))`
  const trayTile = n >= 4 ? 64 : n === 3 ? 80 : 104

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center font-semibold text-muted">
        {diff.young ? 'Put the picture back together! Drag a piece, or tap a piece then a space.' : 'Rebuild the picture: drag pieces into place, or select a piece then a slot.'}
      </p>
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
        <div
          role="group"
          aria-label={`Picture board, ${placed.size} of ${total} pieces placed`}
          className="grid gap-0.5 rounded-2xl bg-line p-1"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, width: board }}
        >
          {[...Array(total).keys()].map((slot) => {
            const isPlaced = placed.has(slot)
            return (
              <button
                key={slot}
                type="button"
                data-dropzone={`slot-${slot}`}
                disabled={isPlaced}
                onClick={() => {
                  if (selected !== null) tryPlace(selected, slot)
                }}
                aria-label={`Slot row ${Math.floor(slot / n) + 1}, column ${(slot % n) + 1}${isPlaced ? ', filled correctly' : ', empty'}`}
                className={`relative aspect-square overflow-hidden rounded-md ${
                  isPlaced ? '' : `border-2 border-dashed bg-white/80 ${selected !== null ? 'border-primary/60 hover:bg-primary-soft' : 'border-line'}`
                } ${glow === slot ? 'ring-4 ring-accent' : ''}`}
                style={isPlaced ? pieceStyle(slot) : undefined}
              >
                {isPlaced && (
                  <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-success text-white shadow">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {showPreview && (
          <div className="bcard flex flex-col items-center gap-1 p-2">
            <span className="text-xs font-bold text-muted">Picture to make</span>
            <div role="img" aria-label="Preview of the finished picture" className="size-24 rounded-lg sm:size-28" style={{ backgroundImage: url, backgroundSize: 'cover' }} />
          </div>
        )}
      </div>
      <div role="group" aria-label="Pieces tray" className="bcard flex w-full flex-wrap justify-center gap-2 p-3">
        {order.filter((p) => !placed.has(p)).length === 0 && <span className="font-bold text-[#1d8a5c]">✓ All pieces placed!</span>}
        {order
          .filter((p) => !placed.has(p))
          .map((p, i) => (
            <DraggableTile
              key={p}
              label={`Piece ${i + 1}${selected === p ? ', selected' : ''}`}
              selected={selected === p}
              disabled={paused}
              onActivate={() => {
                play('tap')
                setSelected(selected === p ? null : p)
              }}
              onDrop={(zone) => {
                if (zone.startsWith('slot-')) tryPlace(p, Number(zone.slice(5)))
              }}
              className={`relative overflow-hidden !p-0 ${shake === p ? 'animate-shake !border-danger' : ''}`}
            >
              <span aria-hidden className="block rounded-xl" style={{ width: trayTile, height: trayTile, ...pieceStyle(p) }} />
              {shake === p && <span className="absolute inset-x-0 bottom-0 bg-danger/90 text-xs font-bold text-white">✗ Not there</span>}
            </DraggableTile>
          ))}
      </div>
    </div>
  )
}

export const shapeAssembly: GameDef = {
  id: 'shape-assembly',
  category: 'spatial',
  skill: 'spatial',
  title: 'Picture Puzzle',
  emoji: '🧩',
  blurb: 'Put a scrambled picture back together.',
  instructions: [
    'A picture has been cut into square pieces.',
    'Drag each piece to its slot, or select a piece and then tap a slot.',
    'Correct pieces lock in with a ✓. Wrong ones bounce back and count as a mistake.',
    'Higher levels cut the picture into more pieces and hide the preview.',
  ],
  kidInstructions: ['Fix the broken picture!', 'Drag each piece to the right place.'],
  timeLimit: (d) => {
    const n = gridFor(d.d)
    return Math.round((45 + n * n * 8) * d.time)
  },
  timeoutCompletes: false,
  component: ShapeAssembly,
}
