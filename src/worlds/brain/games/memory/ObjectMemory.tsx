import { motion } from 'framer-motion'
import { ArrowRight, Check, Eye, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sample, shuffle } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import { useInterval } from '../shared/hooks'
import type { GameDef, GameProps } from '../types'

const POOL = [
  '🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐵', '🐧', '🐙', '🦄', '🐢', '🐝', '🦋', '🐳', '🦒', '🐨',
  '🍎', '🍌', '🍇', '🍓', '🍉', '🥕', '🍕', '🍩', '🧁', '🍪', '🥑', '🌽', '🍒', '🥨', '🍋', '🫐',
  '⚽', '🎈', '🚀', '🎸', '🧩', '🎁', '📚', '⏰', '🔑', '🪁', '🎨', '🛼', '🔭', '🧲', '🎲', '🪀',
  '🌻', '🌈', '⭐', '🌙', '☂️', '🔥', '❄️', '🍄', '🚗', '🚲', '✈️', '⛵', '🏠', '🎩', '👟', '🧸',
]

const ROUNDS = 3

interface Round {
  shown: string[]
  grid: string[]
}

function makeRound(d: number, rng: Rng): Round {
  const count = Math.min(15, 4 + d)
  const total = Math.min(30, count * 2)
  const picks = sample(POOL, total, rng)
  const shown = picks.slice(0, count)
  return { shown, grid: shuffle(picks, rng) }
}

type Phase = 'show' | 'pick' | 'result'

function ObjectMemory({ diff, rng, paused, api }: GameProps) {
  const [round, setRound] = useState(0)
  const [data, setData] = useState<Round>(() => makeRound(diff.d, rng))
  const [phase, setPhase] = useState<Phase>('show')
  const [elapsed, setElapsed] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [peek, setPeek] = useState<string | null>(null)
  const finished = useRef(false)

  const showMs = (2500 + data.shown.length * 550) * diff.time

  useEffect(() => api.progress(round, ROUNDS), [round, api])

  useInterval(
    () => {
      const e = elapsed + 100
      setElapsed(e)
      if (e >= showMs) setPhase('pick')
    },
    phase === 'show' ? 100 : null,
    paused,
  )

  useEffect(() => {
    api.onHint(() => {
      if (phase !== 'pick') return phase === 'show' ? 'Try saying the names of the objects in your head.' : 'Press Next to continue.'
      const missing = data.shown.find((s) => !selected.has(s))
      if (!missing) return 'You have picked all the right ones – press Check!'
      setPeek(missing)
      window.setTimeout(() => setPeek(null), 1000)
      return 'One of the objects you saw is glowing.'
    })
    return () => api.onHint(null)
  }, [api, phase, data, selected])

  const toggle = (e: string) => {
    if (paused || phase !== 'pick') return
    play('tap')
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(e)) n.delete(e)
      else n.add(e)
      return n
    })
  }

  const check = () => {
    if (paused || phase !== 'pick') return
    const shown = new Set(data.shown)
    let right = 0
    let wrong = 0
    selected.forEach((s) => {
      if (shown.has(s)) {
        right++
        api.correct(5 * diff.d)
      } else {
        wrong++
        api.wrong()
      }
    })
    play(wrong === 0 && right > 0 ? 'correct' : 'wrong')
    setPhase('result')
  }

  const next = () => {
    if (paused) return
    const r = round + 1
    if (r >= ROUNDS) {
      if (!finished.current) {
        finished.current = true
        api.progress(ROUNDS, ROUNDS)
        api.finish({ completed: true })
      }
      return
    }
    setRound(r)
    setData(makeRound(diff.d, rng))
    setSelected(new Set())
    setElapsed(0)
    setPhase('show')
  }

  const shownSet = new Set(data.shown)
  const rightCount = [...selected].filter((s) => shownSet.has(s)).length
  const wrongCount = selected.size - rightCount
  const cols = data.grid.length <= 12 ? 4 : data.grid.length <= 20 ? 5 : 6
  const showCols = data.shown.length <= 6 ? 3 : data.shown.length <= 10 ? 4 : 5

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between text-sm font-bold text-muted">
        <span>
          Round {round + 1} of {ROUNDS}
        </span>
        <span>{data.shown.length} objects</span>
      </div>

      {phase === 'show' && (
        <>
          <div role="status" className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <Eye size={20} /> {diff.young ? 'Look at these and remember them!' : 'Memorise these objects'}
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="Time left to memorise"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(100 - (elapsed / showMs) * 100)}
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear" style={{ width: `${Math.max(0, 100 - (elapsed / showMs) * 100)}%` }} />
          </div>
          <div className="bcard grid w-full gap-3 p-4" style={{ gridTemplateColumns: `repeat(${showCols}, minmax(0,1fr))` }} aria-label="Objects to remember">
            {data.shown.map((e, i) => (
              <motion.div
                key={e}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="grid aspect-square place-items-center rounded-2xl bg-primary-soft text-4xl sm:text-5xl"
                role="img"
                aria-label={e}
              >
                {e}
              </motion.div>
            ))}
          </div>
          <button type="button" className="bbtn-ghost" onClick={() => setPhase('pick')} disabled={paused}>
            I'm ready
          </button>
        </>
      )}

      {phase !== 'show' && (
        <>
          <div role="status" aria-live="polite" className="text-center font-display text-lg font-bold">
            {phase === 'pick' ? (
              <span className="text-primary">{diff.young ? 'Tap the ones you saw!' : `Select the ${data.shown.length} objects you saw`}</span>
            ) : (
              <span className="flex flex-wrap items-center justify-center gap-3">
                <span className="flex items-center gap-1 text-[#1d8a5c]">
                  <Check size={20} /> {rightCount} right
                </span>
                <span className="flex items-center gap-1 text-[#c22d4b]">
                  <X size={20} /> {wrongCount} wrong
                </span>
                <span className="text-muted">{data.shown.length - rightCount} missed</span>
              </span>
            )}
          </div>
          <div className="grid w-full gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }} role="group" aria-label="Objects to choose from">
            {data.grid.map((e) => {
              const sel = selected.has(e)
              const wasShown = shownSet.has(e)
              const res = phase === 'result'
              const state = !res ? (sel ? 'sel' : 'idle') : sel ? (wasShown ? 'right' : 'wrong') : wasShown ? 'missed' : 'idle'
              const label =
                state === 'sel'
                  ? `${e}, selected`
                  : state === 'right'
                    ? `${e}, correct`
                    : state === 'wrong'
                      ? `${e}, wrong – not shown`
                      : state === 'missed'
                        ? `${e}, missed`
                        : e
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggle(e)}
                  aria-pressed={!res ? sel : undefined}
                  aria-label={label}
                  disabled={res}
                  className={`btile relative grid aspect-square place-items-center text-3xl sm:text-4xl ${
                    state === 'sel' ? '!border-primary bg-primary-soft ring-2 ring-primary' : ''
                  } ${state === 'right' ? '!border-success bg-success/10' : ''} ${state === 'wrong' ? '!border-danger bg-danger/10' : ''} ${
                    state === 'missed' ? '!border-dashed !border-accent bg-accent/10' : ''
                  } ${res && state === 'idle' ? 'opacity-40' : ''} ${peek === e ? 'animate-pop ring-4 ring-accent' : ''}`}
                >
                  {e}
                  {state === 'sel' && (
                    <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  {state === 'right' && (
                    <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-success text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  {state === 'wrong' && (
                    <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-danger text-white">
                      <X size={12} strokeWidth={3} />
                    </span>
                  )}
                  {state === 'missed' && <span className="absolute bottom-0.5 left-0 right-0 text-center text-[10px] font-bold text-ink">missed</span>}
                </button>
              )
            })}
          </div>
          {phase === 'pick' ? (
            <button type="button" className="bbtn-primary" onClick={check} disabled={paused || selected.size === 0}>
              <Check size={18} /> Check ({selected.size} selected)
            </button>
          ) : (
            <button type="button" className="bbtn-primary" onClick={next} autoFocus>
              {round + 1 >= ROUNDS ? 'See results' : 'Next round'} <ArrowRight size={18} />
            </button>
          )}
        </>
      )}
    </div>
  )
}

export const objectMemory: GameDef = {
  id: 'object-memory',
  category: 'memory',
  skill: 'memory',
  title: 'Object Memory',
  emoji: '🧺',
  blurb: 'Remember a set of objects, then pick them out of a crowd.',
  instructions: [
    'A group of objects appears for a few seconds.',
    'When they disappear, select every object you remember from the bigger grid.',
    'Press Check. Right picks score points; wrong picks count as mistakes.',
    'Three rounds per game.',
  ],
  kidInstructions: ['Look at the pictures.', 'They will hide!', 'Then tap the ones you saw.'],
  component: ObjectMemory,
}
