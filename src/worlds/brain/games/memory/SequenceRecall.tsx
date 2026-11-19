import { motion } from 'framer-motion'
import { Check, Eye, Hand, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { randInt } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { play, playNote } from '../../lib/sound'
import { PALETTE, Shape } from '../shared/Shape'
import type { ShapeKind } from '../shared/Shape'
import { useTimeout } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'

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

const PAD_SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart']

type Phase = 'watch' | 'input' | 'feedback' | 'done'

function padCount(d: number) {
  if (d <= 3) return 4
  if (d <= 7) return 5
  return 6
}

function nextPad(prev: number[], pads: number, rng: Rng) {
  // Avoid three of the same pad in a row – it is hard to see as separate flashes.
  let p = randInt(0, pads - 1, rng)
  const n = prev.length
  if (n >= 2 && prev[n - 1] === p && prev[n - 2] === p) p = (p + 1 + randInt(0, pads - 2, rng)) % pads
  return p
}

function SequenceRecall({ diff, rng, paused, api }: GameProps) {
  const pads = padCount(diff.d)
  const startLen = 2 + Math.floor(diff.d / 3)
  const target = Math.min(8, 4 + Math.floor(diff.d / 3))
  const onMs = Math.max(300, 700 - diff.d * 30) * diff.time
  const offMs = Math.max(150, 280 - diff.d * 10) * diff.time

  const initial = useMemo(() => {
    const s: number[] = []
    for (let i = 0; i < startLen; i++) s.push(nextPad(s, pads, rng))
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [seq, setSeq] = useState<number[]>(initial)
  const [phase, setPhase] = useState<Phase>('watch')
  /** Playback step: -1 = lead-in, even = pad lit, odd = gap. */
  const [step, setStep] = useState(-1)
  const [pos, setPos] = useState(0)
  const [pressed, setPressed] = useState<number | null>(null)
  const [hintPad, setHintPad] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [wins, setWins] = useState(0)
  const [result, setResult] = useState<'right' | 'wrong' | null>(null)
  const finished = useRef(false)

  useEffect(() => api.progress(wins, target), [wins, target, api])

  useEffect(() => {
    api.onHint(() => {
      if (phase !== 'input') return 'Watch the pads light up, then copy them in the same order.'
      const p = seq[pos]
      setHintPad(p)
      window.setTimeout(() => setHintPad(null), 900)
      return `Next is pad ${p + 1} – the ${PALETTE[p].name} ${PAD_SHAPES[p]}.`
    })
    return () => api.onHint(null)
  }, [api, phase, seq, pos])

  // Playback of the sequence.
  const playbackMs = phase !== 'watch' ? null : step === -1 ? 700 : step % 2 === 0 ? onMs : offMs
  useKeyedTimeout(
    () => {
      const ns = step + 1
      if (ns >= seq.length * 2) {
        setPhase('input')
        setPos(0)
        setStep(-1)
        return
      }
      if (ns % 2 === 0) playNote(seq[ns / 2])
      setStep(ns)
    },
    playbackMs,
    `${phase}-${step}-${seq.length}-${mistakes}`,
    paused,
  )

  // After feedback, start the next watch phase.
  useTimeout(
    () => {
      setResult(null)
      setStep(-1)
      setPhase('watch')
    },
    phase === 'feedback' ? 1100 : null,
    paused,
  )

  const end = (completed: boolean) => {
    if (finished.current) return
    finished.current = true
    setPhase('done')
    window.setTimeout(() => api.finish({ completed }), 600)
  }

  const press = (p: number) => {
    if (paused || phase !== 'input') return
    playNote(p)
    setPressed(p)
    window.setTimeout(() => setPressed((x) => (x === p ? null : x)), 220)
    if (p !== seq[pos]) {
      play('wrong')
      api.wrong()
      const m = mistakes + 1
      setMistakes(m)
      setResult('wrong')
      if (m >= 2) return end(wins > 0)
      setPhase('feedback') // replay the same sequence
      return
    }
    const np = pos + 1
    if (np < seq.length) {
      setPos(np)
      return
    }
    play('correct')
    api.correct(10 * diff.d + seq.length * 2)
    const w = wins + 1
    setWins(w)
    setResult('right')
    if (w >= target) return end(true)
    setSeq((s) => [...s, nextPad(s, pads, rng)])
    setPhase('feedback')
  }

  // Number keys 1–6 press pads.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= pads) {
        e.preventDefault()
        press(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const lit = phase === 'watch' && step >= 0 && step % 2 === 0 ? seq[step / 2] : null
  const cols = pads === 4 ? 2 : 3

  let status: React.ReactNode
  if (phase === 'watch')
    status = (
      <>
        <Eye size={20} /> {diff.young ? 'Watch closely…' : `Watch… (${seq.length} steps)`}
      </>
    )
  else if (phase === 'input')
    status = (
      <>
        <Hand size={20} /> Your turn! {pos} / {seq.length}
      </>
    )
  else if (result === 'right')
    status = (
      <>
        <Check size={20} /> Correct! One more step next time.
      </>
    )
  else if (result === 'wrong')
    status = (
      <>
        <X size={20} /> {phase === 'done' ? 'Oops – that was the last try.' : 'Oops! Watch it again.'}
      </>
    )
  else
    status = (
      <>
        <Check size={20} /> Well done!
      </>
    )

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between text-sm font-bold text-muted">
        <span>
          Round {Math.min(wins + 1, target)} of {target}
        </span>
        <span aria-label={`${2 - mistakes} tries left`}>Tries left: {'♥'.repeat(Math.max(0, 2 - mistakes))}</span>
      </div>
      <div
        role="status"
        aria-live="polite"
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 font-display text-lg font-bold ${
          result === 'right' ? 'bg-success/12 text-[#1d8a5c]' : result === 'wrong' ? 'bg-danger/10 text-[#c22d4b]' : 'bg-primary-soft text-primary'
        }`}
      >
        {status}
      </div>
      <div className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }} role="group" aria-label="Sequence pads">
        {Array.from({ length: pads }, (_, i) => {
          const c = PALETTE[i]
          const on = lit === i || pressed === i || hintPad === i
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => press(i)}
              disabled={phase !== 'input'}
              aria-label={`Pad ${i + 1}, ${c.name} ${PAD_SHAPES[i]}${lit === i ? ', lit' : ''}`}
              animate={{ scale: on ? 1.06 : 1 }}
              transition={{ duration: 0.12 }}
              className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-3xl border-4 transition-[filter,opacity] disabled:cursor-default"
              style={{
                background: on ? c.hex : `${c.hex}33`,
                borderColor: on ? '#20213a' : `${c.hex}88`,
                boxShadow: on ? `0 0 0 6px ${c.hex}55, 0 10px 30px ${c.hex}aa` : 'none',
              }}
            >
              <Shape kind={PAD_SHAPES[i]} color={on ? '#ffffff' : c.hex} size="45%" />
              <span className={`font-display text-xl font-bold ${on ? 'text-white' : 'text-ink/70'}`}>{i + 1}</span>
            </motion.button>
          )
        })}
      </div>
      <p className="text-center text-sm text-muted">Tip: press number keys 1–{pads} to tap pads.</p>
    </div>
  )
}

export const sequenceRecall: GameDef = {
  id: 'sequence-recall',
  category: 'memory',
  skill: 'memory',
  title: 'Sequence Recall',
  emoji: '🔁',
  blurb: 'Watch the pads light up, then repeat the sequence.',
  instructions: [
    'Watch the pads light up one at a time.',
    'When it says “Your turn”, tap the pads in the same order.',
    'Each success adds one more step to the sequence.',
    'A mistake replays the sequence – two mistakes end the game.',
  ],
  kidInstructions: ['Watch the pads light up.', 'Then tap them in the same order!', 'It gets one longer each time.'],
  component: SequenceRecall,
}
