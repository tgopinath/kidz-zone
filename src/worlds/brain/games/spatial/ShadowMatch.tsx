import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { pick, sample, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { DraggableTile } from '../shared/DraggableTile'
import type { GameDef, GameProps } from '../types'

interface Item {
  e: string
  name: string
}

const it = (s: string): Item[] =>
  s.split(',').map((p) => {
    const [e, name] = p.trim().split(' ')
    return { e, name }
  })

const DISTINCT = it(
  '🚀 rocket,⭐ star,🍎 apple,🎈 balloon,🌙 moon,☂️ umbrella,🎸 guitar,🦋 butterfly,🐢 turtle,🐘 elephant,🦒 giraffe,🐌 snail,🍄 mushroom,🌵 cactus,⚓ anchor,🔑 key,✂️ scissors,🐟 fish,🦕 dinosaur,🐙 octopus,🏠 house,⛵ sailboat,🦀 crab,🍌 banana',
)
/** Look-alike silhouettes for higher levels. */
const SIMILAR: Item[][] = [
  it('🐶 dog,🐱 cat,🐭 mouse,🐹 hamster,🐰 rabbit,🦊 fox,🐻 bear,🐼 panda,🐨 koala,🐯 tiger,🦁 lion,🐮 cow,🐷 pig,🐵 monkey'),
  it('🐕 dog,🐈 cat,🐎 horse,🐄 cow,🐖 pig,🐑 sheep,🐐 goat,🦌 deer,🐆 leopard,🦏 rhino,🐫 camel,🦘 kangaroo'),
  it('🍎 apple,🍐 pear,🍊 orange,🍋 lemon,🍑 peach,🍒 cherries,🍓 strawberry,🍇 grapes,🍍 pineapple,🥕 carrot,🍆 aubergine,🌶️ chilli'),
]

const BOARDS = 3

function pairsFor(d: number) {
  if (d <= 2) return 3
  if (d <= 5) return 4
  if (d <= 8) return 5
  return 6
}

interface Shadow {
  id: string
  item: number // index into board items; >= pairs means distractor
  rotate: number
}
interface Board {
  items: Item[]
  pairs: number
  shadows: Shadow[]
}

function makeBoard(d: number, rng: Rng): Board {
  const pairs = pairsFor(d)
  const extra = d >= 10 ? 2 : d >= 7 ? 1 : 0
  const pool = d >= 9 ? pick(SIMILAR, rng) : d >= 6 ? [...DISTINCT, ...pick(SIMILAR, rng)] : DISTINCT
  // Avoid two items with the same name (e.g. dog in two sets).
  const uniq = pool.filter((x, i) => pool.findIndex((y) => y.name === x.name) === i)
  const items = sample(uniq, pairs + extra, rng)
  const rots = d >= 9 ? [0, 90, 180, 270] : d >= 6 ? [0, 90, 270] : [0]
  const shadows = shuffle(
    items.map((_, i) => ({ id: `s${i}`, item: i, rotate: pick(rots, rng) })),
    rng,
  )
  return { items, pairs, shadows }
}

function ShadowMatch({ diff, rng, paused, api }: GameProps) {
  const [boardNo, setBoardNo] = useState(0)
  const [board, setBoard] = useState(() => makeBoard(diff.d, rng))
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<number | null>(null)
  const [shake, setShake] = useState<string | null>(null)
  const [glow, setGlow] = useState<string | null>(null)
  const done = useRef(false)
  const total = board.pairs * BOARDS
  const doneCount = boardNo * board.pairs + matched.size

  useEffect(() => api.progress(doneCount, total), [doneCount, total, api])

  useEffect(() => {
    api.onHint(() => {
      const target = selected ?? [...Array(board.pairs).keys()].find((i) => !matched.has(i))
      if (target === undefined) return 'All shadows matched!'
      const sh = board.shadows.find((s) => s.item === target)!
      setGlow(sh.id)
      window.setTimeout(() => setGlow(null), 1500)
      return `The glowing shadow belongs to the ${board.items[target].name}.`
    })
    return () => api.onHint(null)
  }, [api, board, matched, selected])

  const tryMatch = (obj: number, shadowId: string) => {
    if (paused || matched.has(obj)) return
    const sh = board.shadows.find((s) => s.id === shadowId)
    if (!sh || (sh.item < board.pairs && matched.has(sh.item))) return
    if (sh.item === obj) {
      play('correct')
      api.correct(10 * diff.d)
      const next = new Set(matched).add(obj)
      setMatched(next)
      setSelected(null)
      if (next.size === board.pairs) {
        window.setTimeout(() => {
          if (boardNo + 1 >= BOARDS) {
            if (!done.current) {
              done.current = true
              api.progress(total, total)
              api.finish({ completed: true })
            }
            return
          }
          play('win')
          setBoardNo(boardNo + 1)
          setBoard(makeBoard(diff.d, rng))
          setMatched(new Set())
        }, 800)
      }
    } else {
      play('wrong')
      api.wrong()
      setShake(shadowId)
      window.setTimeout(() => setShake(null), 450)
    }
  }

  const rotNote = board.shadows.some((s) => s.rotate !== 0)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <p className="text-center font-semibold text-muted" aria-live="polite">
        {diff.young ? 'Drag each picture to its shadow, or tap a picture then its shadow.' : 'Drag each object onto its shadow – or select it, then pick a shadow.'}
        {rotNote && <span className="block text-sm">{diff.young ? 'Some shadows are turned around!' : 'Some shadows are rotated.'}</span>}
        <span className="block text-sm">
          Board {boardNo + 1} of {BOARDS}
        </span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-label="Objects" className="bcard p-3">
          <h3 className="mb-2 text-center font-display text-lg">Objects</h3>
          <div className="grid grid-cols-3 gap-2">
            {board.items.slice(0, board.pairs).map((item, i) => {
              const isDone = matched.has(i)
              return (
                <DraggableTile
                  key={`${boardNo}-${i}`}
                  label={`${item.name}${isDone ? ', matched' : selected === i ? ', selected' : ''}`}
                  disabled={isDone || paused}
                  selected={selected === i}
                  onActivate={() => {
                    play('tap')
                    setSelected(selected === i ? null : i)
                  }}
                  onDrop={(zone) => tryMatch(i, zone)}
                  className={`relative grid aspect-square place-items-center text-4xl sm:text-5xl ${isDone ? 'opacity-40' : ''}`}
                >
                  <span aria-hidden>{item.e}</span>
                  {isDone && (
                    <span className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-success text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </DraggableTile>
              )
            })}
          </div>
        </section>
        <section aria-label="Shadows" className="bcard p-3">
          <h3 className="mb-2 text-center font-display text-lg">Shadows</h3>
          <div className="grid grid-cols-3 gap-2">
            {board.shadows.map((sh, n) => {
              const isDone = sh.item < board.pairs && matched.has(sh.item)
              const item = board.items[sh.item]
              return (
                <button
                  key={`${boardNo}-${sh.id}`}
                  type="button"
                  data-dropzone={sh.id}
                  disabled={isDone}
                  onClick={() => {
                    if (selected !== null) tryMatch(selected, sh.id)
                  }}
                  aria-label={`Shadow ${n + 1}${isDone ? `, matched with ${item.name}` : ''}`}
                  className={`relative grid aspect-square place-items-center rounded-2xl border-2 bg-[#eceaf6] text-4xl transition sm:text-5xl ${
                    isDone ? 'border-success bg-success/10' : selected !== null ? 'border-primary/50 hover:border-primary' : 'border-dashed border-line'
                  } ${shake === sh.id ? 'animate-shake !border-danger' : ''} ${glow === sh.id ? 'ring-4 ring-accent' : ''}`}
                >
                  <span
                    aria-hidden
                    style={{
                      filter: isDone ? undefined : 'brightness(0)',
                      opacity: isDone ? 1 : 0.85,
                      transform: `rotate(${isDone ? 0 : sh.rotate}deg)`,
                      display: 'inline-block',
                      transition: 'transform .3s, filter .3s',
                    }}
                  >
                    {item.e}
                  </span>
                  {isDone && (
                    <span className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-success text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                  {shake === sh.id && <span className="absolute bottom-1 text-xs font-bold text-danger">✗ No</span>}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export const shadowMatch: GameDef = {
  id: 'shadow-match',
  category: 'spatial',
  skill: 'spatial',
  title: 'Shadow Match',
  emoji: '👤',
  blurb: 'Match every object to its shadow.',
  instructions: [
    'Each object on the left has a shadow on the right.',
    'Drag an object onto its shadow, or select it and then tap the shadow.',
    'Keyboard: press Enter on an object, then Enter on a shadow.',
    'Higher levels rotate the shadows and add look-alikes.',
  ],
  kidInstructions: ['Find the shadow for each picture.', 'Drag it, or tap the picture then its shadow.'],
  component: ShadowMatch,
}
