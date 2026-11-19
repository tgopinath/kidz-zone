import { AnimatePresence, motion } from 'framer-motion'
import { Check, X, ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Difficulty } from '../../lib/difficulty'
import { RecentSet, generateUnique, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameProps } from '../types'

export interface QuizOption {
  id: string
  label: ReactNode
  /** Text read by screen readers (required when label is visual). */
  aria: string
}

export interface QuizQuestion {
  /** Unique-ish key used to avoid repeating the same question back-to-back. */
  key: string
  prompt: ReactNode
  /** Plain-text version of the prompt for screen readers if prompt is visual. */
  promptAria?: string
  options: QuizOption[]
  answerId: string
  explanation?: string
  hint?: string
  /** Number of columns for options (default: 2 on mobile, options.length up to 4 on desktop). */
  columns?: number
  /** Make options large square tiles (good for shapes/emoji). */
  big?: boolean
}

export interface QuizConfig {
  rounds: (diff: Difficulty) => number
  generate: (diff: Difficulty, rng: Rng, round: number) => QuizQuestion
  /** Points per correct answer (default 10 × d). */
  points?: (diff: Difficulty) => number
  /** Always pause on the explanation (logic questions); otherwise auto-advance after feedback. */
  explain?: boolean
}

/** Remember recent question keys across plays within the session. */
const recentByGame = new Map<string, RecentSet>()

/**
 * Builds a complete multiple-choice game from a question generator:
 * rounds, feedback (icon + text, never colour alone), explanations, hints, scoring.
 */
export function createQuizGame(gameKey: string, cfg: QuizConfig) {
  return function QuizGame({ diff, rng, paused, api }: GameProps) {
    const total = useMemo(() => cfg.rounds(diff), [diff])
    const recent = useMemo(() => {
      if (!recentByGame.has(gameKey)) recentByGame.set(gameKey, new RecentSet(30))
      return recentByGame.get(gameKey)!
    }, [])
    const [round, setRound] = useState(0)
    const [q, setQ] = useState<QuizQuestion>(() => generateUnique(() => cfg.generate(diff, rng, 0), (x) => x.key, recent))
    const [picked, setPicked] = useState<string | null>(null)
    const [hidden, setHidden] = useState<Set<string>>(new Set())
    const startRef = useRef(performance.now())
    const finished = useRef(false)

    useEffect(() => {
      api.progress(round, total)
    }, [round, total, api])

    useEffect(() => {
      api.onHint(() => {
        // Remove one wrong option and give the textual hint if present.
        const wrongs = q.options.filter((o) => o.id !== q.answerId && !hidden.has(o.id))
        if (wrongs.length > 1) setHidden((h) => new Set(h).add(wrongs[0].id))
        return q.hint ?? 'One wrong answer has been removed.'
      })
      return () => api.onHint(null)
    }, [q, hidden, api])

    const next = () => {
      const r = round + 1
      if (r >= total) {
        if (!finished.current) {
          finished.current = true
          api.progress(total, total)
          api.finish({ completed: true })
        }
        return
      }
      setRound(r)
      setQ(generateUnique(() => cfg.generate(diff, rng, r), (x) => x.key, recent))
      setPicked(null)
      setHidden(new Set())
      startRef.current = performance.now()
    }

    const choose = (id: string) => {
      if (picked || paused) return
      setPicked(id)
      const ms = performance.now() - startRef.current
      if (id === q.answerId) {
        const base = cfg.points ? cfg.points(diff) : 10 * diff.d
        const speed = Math.max(0, Math.round(base * 0.5 * (1 - ms / (8000 * diff.time))))
        api.correct(base + speed)
        play('correct')
      } else {
        api.wrong()
        play('wrong')
      }
    }

    // Auto-advance when there's nothing to read.
    useEffect(() => {
      if (!picked || paused) return
      const needsReading = cfg.explain && q.explanation
      if (needsReading) return
      const t = window.setTimeout(next, picked === q.answerId ? 700 : 1300)
      return () => window.clearTimeout(t)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [picked, paused])

    const cols = q.columns ?? Math.min(4, q.options.length)
    const isRight = picked === q.answerId

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex w-full flex-col items-center gap-6"
          >
            <div className="bcard w-full px-4 py-6 text-center sm:px-8" aria-live="polite">
              {q.promptAria && <span className="sr-only">{q.promptAria}</span>}
              <div aria-hidden={q.promptAria ? true : undefined} className="font-display text-xl font-semibold sm:text-2xl">
                {q.prompt}
              </div>
            </div>

            <div
              role="group"
              aria-label="Answer choices"
              className="grid w-full gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(cols, q.big ? 4 : 2)}, minmax(0,1fr))` }}
            >
              {q.options.map((o, i) => {
                const isAnswer = o.id === q.answerId
                const isPicked = o.id === picked
                const state = !picked ? 'idle' : isAnswer ? 'right' : isPicked ? 'wrong' : 'dim'
                if (hidden.has(o.id) && !picked) return <div key={o.id} aria-hidden className="rounded-2xl border-2 border-dashed border-line" />
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => choose(o.id)}
                    disabled={!!picked}
                    aria-label={`${o.aria}${state === 'right' ? ', correct answer' : state === 'wrong' ? ', wrong' : ''}`}
                    className={`btile relative flex items-center justify-center gap-2 p-3 text-lg sm:text-xl ${
                      q.big ? 'aspect-square text-3xl sm:text-4xl' : 'min-h-16'
                    } ${state === 'right' ? '!border-success bg-success/10' : ''} ${
                      state === 'wrong' ? 'animate-shake !border-danger bg-danger/10' : ''
                    } ${state === 'dim' ? 'opacity-50' : ''}`}
                  >
                    <span className="sr-only">Option {i + 1}: </span>
                    {o.label}
                    {state === 'right' && (
                      <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-success text-white">
                        <Check size={16} strokeWidth={3} />
                      </span>
                    )}
                    {state === 'wrong' && (
                      <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-danger text-white">
                        <X size={16} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {picked && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                role="status"
                className={`flex w-full flex-col items-center gap-3 rounded-2xl px-4 py-3 text-center font-bold ${
                  isRight ? 'bg-success/12 text-[#1d8a5c]' : 'bg-danger/10 text-[#c22d4b]'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isRight ? <Check size={20} /> : <X size={20} />}
                  {isRight ? 'Correct!' : 'Not quite.'}
                </span>
                {q.explanation && (cfg.explain || !isRight) && <p className="font-semibold text-ink">{q.explanation}</p>}
                {cfg.explain && q.explanation && (
                  <button type="button" className="bbtn-primary" onClick={next} autoFocus>
                    {round + 1 >= total ? 'See results' : 'Next'} <ArrowRight size={18} />
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }
}
