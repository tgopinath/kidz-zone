import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sample, shuffle } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameDef, GameProps } from '../types'

const DECKS = {
  animals: ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐵', '🐧', '🐙', '🦄', '🐢', '🐝', '🦋', '🐳', '🦒', '🐨'],
  food: ['🍎', '🍌', '🍇', '🍓', '🍉', '🥕', '🍕', '🍩', '🧁', '🍪', '🥑', '🌽', '🍒', '🥨', '🍋', '🫐'],
  objects: ['⚽', '🎈', '🚀', '🎸', '🧩', '🎁', '📚', '⏰', '🔑', '🪁', '🎨', '🛼', '🔭', '🧲', '🎲', '🪀'],
  // Look-alike set for higher levels
  faces: ['😀', '😃', '😄', '😁', '😆', '😊', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪'],
}

function gridFor(d: number): [number, number] {
  if (d <= 2) return [2, 2]
  if (d === 3) return [3, 2]
  if (d <= 5) return [4, 3]
  if (d <= 7) return [4, 4]
  return [6, 4]
}

interface Card {
  id: number
  face: string
  matched: boolean
}

function CardMatch({ diff, rng, paused, api }: GameProps) {
  const [cols, rows] = gridFor(diff.d)
  const pairs = (cols * rows) / 2
  const deckName = diff.d >= 10 ? 'faces' : (['animals', 'food', 'objects'] as const)[Math.floor(rng() * 3)]
  const initial = useMemo<Card[]>(() => {
    const faces = sample(DECKS[deckName], pairs, rng)
    return shuffle([...faces, ...faces], rng).map((face, id) => ({ id, face, matched: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [cards, setCards] = useState(initial)
  const [open, setOpen] = useState<number[]>([])
  const [peek, setPeek] = useState<number[]>([])
  const [focusIdx, setFocusIdx] = useState(0)
  const lock = useRef(false)
  const matchedCount = cards.filter((c) => c.matched).length / 2
  const seen = useRef(new Set<number>())

  useEffect(() => api.progress(matchedCount, pairs), [matchedCount, pairs, api])

  useEffect(() => {
    api.onHint(() => {
      const remaining = cards.filter((c) => !c.matched)
      if (!remaining.length) return 'All pairs found!'
      const target = remaining[0]
      const twin = remaining.find((c) => c.face === target.face && c.id !== target.id)!
      setPeek([target.id, twin.id])
      window.setTimeout(() => setPeek([]), 1200)
      return 'Peek! Two matching cards are flashing.'
    })
    return () => api.onHint(null)
  }, [cards, api])

  const flip = (idx: number) => {
    if (paused || lock.current) return
    const card = cards[idx]
    if (card.matched || open.includes(idx)) return
    play('flip')
    const nextOpen = [...open, idx]
    setOpen(nextOpen)
    if (nextOpen.length < 2) return
    lock.current = true
    const [a, b] = nextOpen.map((i) => cards[i])
    if (a.face === b.face) {
      window.setTimeout(() => {
        play('correct')
        api.correct(10 * diff.d)
        const next = cards.map((c) => (c.face === a.face ? { ...c, matched: true } : c))
        setCards(next)
        setOpen([])
        lock.current = false
        if (next.every((c) => c.matched)) window.setTimeout(() => api.finish({ completed: true }), 500)
      }, 350)
    } else {
      // Only count it as a miss if the player had already seen one of these cards.
      const wasKnown = seen.current.has(a.id) || seen.current.has(b.id)
      seen.current.add(a.id)
      seen.current.add(b.id)
      window.setTimeout(() => {
        if (wasKnown) {
          api.wrong()
          play('wrong')
        }
        setOpen([])
        lock.current = false
      }, 850)
    }
  }

  const onKey = (e: React.KeyboardEvent, idx: number) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }
    if (map[e.key] !== undefined) {
      e.preventDefault()
      const n = Math.min(cards.length - 1, Math.max(0, idx + map[e.key]))
      setFocusIdx(n)
      ;(document.querySelector(`[data-card="${n}"]`) as HTMLElement | null)?.focus()
    }
  }

  return (
    <div
      role="grid"
      aria-label={`Memory cards, ${matchedCount} of ${pairs} pairs found`}
      className="mx-auto grid w-full gap-2 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 120 }}
    >
      {cards.map((c, i) => {
        const shown = c.matched || open.includes(i) || peek.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            data-card={i}
            tabIndex={i === focusIdx ? 0 : -1}
            onFocus={() => setFocusIdx(i)}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => flip(i)}
            aria-label={shown ? `${c.face}${c.matched ? ', matched' : ''}` : `Card ${i + 1}, face down`}
            className="relative aspect-square [perspective:600px]"
          >
            <motion.div
              className="absolute inset-0 [transform-style:preserve-3d]"
              animate={{ rotateY: shown ? 180 : 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-2xl text-white/80 shadow-soft [backface-visibility:hidden]">
                ?
              </div>
              <div
                className={`absolute inset-0 grid place-items-center rounded-2xl border-2 bg-white text-4xl shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)] sm:text-5xl ${
                  c.matched ? 'border-success' : 'border-line'
                }`}
              >
                {c.face}
                {c.matched && <span className="absolute right-1 bottom-1 text-xs font-bold text-success">✓</span>}
              </div>
            </motion.div>
          </button>
        )
      })}
    </div>
  )
}

export const cardMatch: GameDef = {
  id: 'card-match',
  category: 'memory',
  skill: 'memory',
  title: 'Card Matching',
  emoji: '🃏',
  blurb: 'Flip cards and find every matching pair.',
  instructions: [
    'All cards start face down.',
    'Flip two cards at a time. Matching pairs stay open.',
    'Remember where you saw each picture – mistakes on cards you have already seen count against you.',
    'Use arrow keys to move between cards and Enter to flip.',
  ],
  kidInstructions: ['Tap two cards to turn them over.', 'Find the pictures that are the same!', 'Try to remember where each picture is.'],
  component: CardMatch,
}
