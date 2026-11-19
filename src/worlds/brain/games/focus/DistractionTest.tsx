import { AnimatePresence, motion } from 'framer-motion'
import { Check, Hand, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { pick, randInt, shuffle } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { PALETTE } from '../shared/Shape'
import type { GameDef, GameProps } from '../types'

const TOTAL = 25

/** Timeout that restarts whenever `key` changes (so equal durations on consecutive steps still fire). Freezes while paused. */
function useKeyedTimeout(cb: () => void, ms: number | null, key: string, paused: boolean) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (ms === null || paused) return
    const id = window.setTimeout(() => ref.current(), ms)
    return () => window.clearTimeout(id)
  }, [ms, key, paused])
}

const GROUPS: string[][] = [
  ['⭐', '🌟', '✨', '💫'],
  ['🐱', '😺', '🐯', '🦁'],
  ['🍎', '🍅', '🍒', '🍓'],
  ['🔵', '🟣', '🔷', '🫐'],
  ['🐶', '🐕', '🐺', '🦊'],
  ['🚗', '🚙', '🚕', '🚓'],
]

interface Item {
  sym: string
  isTarget: boolean
  dx: number
  dy: number
  flash: string | null
}

function buildStream(d: number, rng: Rng): { target: string; items: Item[] } {
  const gi = randInt(0, GROUPS.length - 1, rng)
  const target = pick(GROUPS[gi], rng)
  const lookAlikes = GROUPS[gi].filter((s) => s !== target)
  const others = GROUPS.filter((_, i) => i !== gi).flat()
  const nTargets = Math.round(TOTAL * 0.32)
  const flags = shuffle([...Array(nTargets).fill(true), ...Array(TOTAL - nTargets).fill(false)] as boolean[], rng)
  // Never start with a target so the player can settle in.
  if (flags[0]) {
    const j = flags.findIndex((f) => !f)
    ;[flags[0], flags[j]] = [flags[j], flags[0]]
  }
  const lookShare = d <= 4 ? 0 : Math.min(0.7, (d - 4) * 0.12)
  const move = d >= 10 ? 70 : d >= 8 ? 40 : 0
  const items = flags.map<Item>((isTarget) => ({
    isTarget,
    sym: isTarget ? target : rng() < lookShare ? pick(lookAlikes, rng) : pick(others, rng),
    dx: move ? randInt(-move, move, rng) : 0,
    dy: move ? randInt(-move / 2, move / 2, rng) : 0,
    flash: d >= 8 && rng() < 0.35 ? pick(PALETTE, rng).hex : null,
  }))
  return { target, items }
}

type Phase = 'gap' | 'show'
type Fb = { kind: 'hit' | 'false' | 'miss'; ms?: number } | null

function DistractionTest({ diff, rng, paused, api }: GameProps) {
  const [stream] = useState(() => buildStream(diff.d, rng))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('gap')
  const [responded, setResponded] = useState(false)
  const [fb, setFb] = useState<Fb>(null)
  const shownAt = useRef(0)
  const finished = useRef(false)

  const item = stream.items[idx]
  const jiggle = diff.d >= 6
  // Display time shrinks with d and speeds up through the game.
  const showMs = Math.max(450, (1400 - diff.d * 65) * diff.time * (1 - 0.3 * (idx / TOTAL)))
  const gapMs = idx === 0 && phase === 'gap' ? 1400 : Math.max(250, 450 - diff.d * 15) * diff.time

  useEffect(() => api.progress(idx, TOTAL), [idx, api])

  useEffect(() => {
    api.onHint(() => `Only tap when you see ${stream.target}. Ignore everything else${diff.d >= 5 ? ' – even look-alikes' : ''}.`)
    return () => api.onHint(null)
  }, [api, stream.target, diff.d])

  // Restart the reaction clock after a pause so paused time is not counted.
  useEffect(() => {
    if (!paused && phase === 'show') shownAt.current = performance.now()
  }, [paused, phase])

  useKeyedTimeout(
    () => {
      if (phase === 'gap') {
        setPhase('show')
        setResponded(false)
        shownAt.current = performance.now()
        return
      }
      // End of a show phase.
      if (item.isTarget && !responded) {
        api.wrong()
        play('wrong')
        setFb({ kind: 'miss' })
      }
      const next = idx + 1
      if (next >= TOTAL) {
        if (!finished.current) {
          finished.current = true
          api.progress(TOTAL, TOTAL)
          window.setTimeout(() => api.finish({ completed: true }), 500)
        }
        setPhase('gap')
        return
      }
      setIdx(next)
      setPhase('gap')
    },
    finished.current ? null : phase === 'show' ? showMs : gapMs,
    `${phase}-${idx}`,
    paused,
  )

  const respond = useCallback(() => {
    if (paused || finished.current || phase !== 'show' || responded) return
    setResponded(true)
    if (item.isTarget) {
      const ms = performance.now() - shownAt.current
      api.reaction(ms)
      api.correct(10 * diff.d + Math.max(0, Math.round((showMs - ms) / 50)))
      play('correct')
      setFb({ kind: 'hit', ms })
    } else {
      api.wrong()
      play('wrong')
      setFb({ kind: 'false' })
    }
  }, [paused, phase, responded, item, api, diff.d, showMs])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        respond()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [respond])

  useEffect(() => {
    if (!fb) return
    const t = window.setTimeout(() => setFb(null), 700)
    return () => window.clearTimeout(t)
  }, [fb])

  const showing = phase === 'show' && !finished.current
  const flashBg = showing && item.flash ? `${item.flash}33` : undefined

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      <div className="bcard flex w-full items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          {diff.young ? 'Tap for' : 'Target:'}
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-3xl" aria-label={`target ${stream.target}`}>
            {stream.target}
          </span>
        </span>
        <span className="text-sm font-bold text-muted">
          {Math.min(idx + 1, TOTAL)} / {TOTAL}
        </span>
      </div>

      <button
        type="button"
        onClick={respond}
        aria-label={showing ? `Showing ${item.sym}. Tap if it is the target.` : 'Wait for the next symbol'}
        className="relative grid aspect-square w-full max-w-sm place-items-center overflow-hidden rounded-3xl border-2 border-line bg-white shadow-soft transition-colors duration-150 active:scale-[0.99]"
        style={{ backgroundColor: flashBg }}
      >
        <AnimatePresence>
          {showing && (
            <motion.span
              key={idx}
              initial={{ opacity: 0, scale: 0.6, x: item.dx, y: item.dy }}
              animate={
                jiggle
                  ? { opacity: 1, scale: 1, x: [item.dx, item.dx - 8, item.dx + 8, item.dx - 4, item.dx], y: item.dy, rotate: [0, -6, 6, -3, 0] }
                  : { opacity: 1, scale: 1, x: item.dx, y: item.dy }
              }
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: jiggle ? 0.5 : 0.15, repeat: jiggle ? Infinity : 0 }}
              className="text-8xl select-none sm:text-9xl"
              aria-hidden
            >
              {item.sym}
            </motion.span>
          )}
        </AnimatePresence>
        {!showing && <span className="text-4xl text-line" aria-hidden>+</span>}
      </button>

      <div role="status" aria-live="polite" className="flex min-h-10 items-center justify-center font-display text-lg font-bold">
        {fb?.kind === 'hit' && (
          <span className="flex items-center gap-2 text-[#1d8a5c]">
            <Check size={20} /> Hit! {Math.round(fb.ms ?? 0)} ms
          </span>
        )}
        {fb?.kind === 'false' && (
          <span className="flex items-center gap-2 text-[#c22d4b]">
            <X size={20} /> Not the target!
          </span>
        )}
        {fb?.kind === 'miss' && (
          <span className="flex items-center gap-2 text-[#c22d4b]">
            <X size={20} /> Missed one!
          </span>
        )}
        {!fb && (
          <span className="flex items-center gap-2 text-muted">
            <Hand size={18} /> Tap the box or press Space
          </span>
        )}
      </div>
    </div>
  )
}

export const distractionTest: GameDef = {
  id: 'distraction-test',
  category: 'focus',
  skill: 'attention',
  title: 'Distraction Test',
  emoji: '🚦',
  blurb: 'Tap only for the target – ignore everything else.',
  instructions: [
    'Symbols appear one at a time in the centre.',
    'Tap (or press Space) only when the target symbol appears.',
    'Ignore all other symbols – tapping them is a mistake, and so is missing a target.',
    'It speeds up as you go, and higher levels add look-alikes, movement and flashes.',
  ],
  kidInstructions: ['Pictures will pop up one by one.', 'Tap only when you see your picture!', 'Don’t tap the others.'],
  component: DistractionTest,
}
