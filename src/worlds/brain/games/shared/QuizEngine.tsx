import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Difficulty } from '../../lib/difficulty'
import { RecentSet, generateUnique, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameProps } from '../types'
import { useRoundFlow } from '../../../../play/roundFlow'
import { burst } from '../../../../play/feedback'
import { RoundCheer, RoundProgress } from '../../../../play/ui'
import { answerMark } from '../../../../play/testMode'

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
    const [wrongs, setWrongs] = useState<Set<string>>(new Set())
    const [hidden, setHidden] = useState<Set<string>>(new Set())
    const startRef = useRef(performance.now())
    const finished = useRef(false)
    const reading = !!(cfg.explain && q.explanation)

    // the shared round flow: lock while celebrating, then the next question loads by itself (no Next button)
    const flow = useRoundFlow({
      total,
      advanceMs: reading ? 3600 : 1500,
      effects: false, // the Brain Gym shell plays its own sounds; the cheer is drawn here
      onAdvance: (r) => {
        setRound(r)
        setQ(generateUnique(() => cfg.generate(diff, rng, r), (x) => x.key, recent))
        setPicked(null)
        setWrongs(new Set())
        setHidden(new Set())
        startRef.current = performance.now()
      },
      onComplete: () => {
        if (finished.current) return
        finished.current = true
        api.progress(total, total)
        api.finish({ completed: true })
      },
    })

    useEffect(() => {
      api.selfCheer?.()
    }, [api])

    useEffect(() => {
      api.progress(round, total)
    }, [round, total, api])

    useEffect(() => {
      api.onHint(() => {
        // Remove one wrong option and give the textual hint if present.
        const ws = q.options.filter((o) => o.id !== q.answerId && !hidden.has(o.id) && !wrongs.has(o.id))
        if (ws.length > 1) setHidden((h) => new Set(h).add(ws[0].id))
        return q.hint ?? 'One wrong answer has been removed.'
      })
      return () => api.onHint(null)
    }, [q, hidden, wrongs, api])

    const choose = (id: string) => {
      if (picked || paused || flow.locked || wrongs.has(id)) return
      const ms = performance.now() - startRef.current
      if (id === q.answerId) {
        setPicked(id)
        const base = cfg.points ? cfg.points(diff) : 10 * diff.d
        const speed = wrongs.size ? 0 : Math.max(0, Math.round(base * 0.5 * (1 - ms / (8000 * diff.time))))
        api.correct(base + speed)
        play('correct')
        burst(false)
        flow.flow.success()
      } else {
        setWrongs((w) => new Set(w).add(id))
        api.wrong()
        play('wrong')
        flow.flow.miss()
      }
    }

    const n = q.options.length
    const isRight = picked === q.answerId

    return (
      <div className="kz-quiz mx-auto flex w-full max-w-5xl flex-col items-center gap-[var(--kz-gap)]">
        <RoundCheer phase={flow.phase} round={round} />
        <RoundProgress round={round} total={total} done={flow.phase === 'done'} />
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex w-full flex-col items-center gap-[var(--kz-gap)]"
          >
            <div className="bcard w-full px-4 py-6 text-center sm:px-8" aria-live="polite">
              {q.promptAria && <span className="sr-only">{q.promptAria}</span>}
              <div aria-hidden={q.promptAria ? true : undefined} className="kz-quiz-prompt font-display text-2xl font-black sm:text-4xl">
                {q.prompt}
              </div>
            </div>

            <div role="group" aria-label="Answer choices" className="kz-grid" data-count={n} style={{ ['--kz-cols' as string]: q.big ? Math.min(4, n) : Math.min(2, n) }}>
              {q.options.map((o, i) => {
                const isAnswer = o.id === q.answerId
                const state = picked ? (isAnswer ? 'right' : 'dim') : wrongs.has(o.id) ? 'wrong' : 'idle'
                if (hidden.has(o.id) && !picked) return <div key={o.id} aria-hidden className="rounded-[var(--kz-radius)] border-4 border-dashed border-line" />
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => choose(o.id)}
                    disabled={!!picked || wrongs.has(o.id)}
                    aria-label={`${o.aria}${state === 'right' ? ', correct answer' : state === 'wrong' ? ', not this one' : ''}`}
                    className={`kz-sel kz-sel-${state} ${q.big ? 'kz-quiz-big' : 'kz-quiz-text'}`}
                    {...answerMark(isAnswer)}
                  >
                    <span className="sr-only">Option {i + 1}: </span>
                    <span className="kz-sel-pic">{o.label}</span>
                    {state === 'right' && (
                      <span className="kz-sel-badge" aria-hidden>
                        <Check size={22} strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {isRight && q.explanation && cfg.explain && (
              <motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} role="status" className="w-full rounded-3xl bg-success/12 px-5 py-4 text-center text-xl font-bold text-ink">
                {q.explanation}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }
}
