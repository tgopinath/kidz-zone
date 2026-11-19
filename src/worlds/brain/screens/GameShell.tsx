import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Clock,
  Coins,
  Lightbulb,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { categoryById } from '../games/registry'
import type { GameApi, GameDef } from '../games/types'
import { celebrate } from '../lib/confetti'
import { dailySeed } from '../lib/daily'
import { formatDuration } from '../lib/dates'
import { getDifficulty, levelName, MAX_LEVEL, passAccuracy } from '../lib/difficulty'
import { mulberry32 } from '../lib/random'
import { go } from '../lib/router'
import { play } from '../lib/sound'
import { useActive, useApp, type RecordOutcome } from '../store/AppContext'
import { Bar, Stars } from '../components/ui'

type Phase = 'intro' | 'countdown' | 'playing' | 'result'
const MAX_HINTS = 3

export function GameShell({ game, initialLevel, daily }: { game: GameDef; initialLevel?: number; daily: boolean }) {
  const { profile, progress } = useActive()
  const { recordResult } = useApp()
  const unlocked = progress.unlocked[game.id] ?? 1
  const [level, setLevel] = useState(Math.min(initialLevel ?? unlocked, unlocked))
  const [phase, setPhase] = useState<Phase>('intro')
  const [session, setSession] = useState(0)
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null)
  const [seed, setSeed] = useState(0)
  const cat = categoryById(game.category)
  const diff = useMemo(() => getDifficulty(level, profile.ageGroup, profile.difficulty), [level, profile.ageGroup, profile.difficulty])

  const start = (lv = level) => {
    setLevel(lv)
    setOutcome(null)
    setSession((s) => s + 1)
    // Daily games use the same puzzle all day; everything else is freshly randomised.
    setSeed(daily ? dailySeed(profile.id, game.id) : Math.floor(Math.random() * 2 ** 31))
    setPhase('countdown')
  }

  const instructions = diff.young && game.kidInstructions ? game.kidInstructions : game.instructions
  const best = progress.bests[`${game.id}:${level}`]

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-4xl flex-col px-4 pt-4 pb-10">
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.section key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-5">
            <button type="button" onClick={() => history.back()} className="bbtn-ghost self-start !px-3 !py-2 text-sm">
              <ArrowLeft size={18} /> Back
            </button>
            <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${cat.gradient} p-6 text-white shadow-pop sm:p-8`}>
              <div className="absolute -top-6 -right-4 text-[9rem] leading-none opacity-20 select-none" aria-hidden>
                {game.emoji}
              </div>
              <p className="font-bold text-white/80">
                {cat.emoji} {cat.title}
                {daily && <span className="bchip ml-2 bg-white/25 text-white">Daily challenge</span>}
              </p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{game.title}</h1>
              <p className="mt-2 max-w-md text-white/90">{game.blurb}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
              <div className="bcard p-5 sm:p-6">
                <h2 className="mb-3 text-lg font-semibold">How to play</h2>
                <ol className="flex flex-col gap-2">
                  {instructions.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{i + 1}</span>
                      <span className="pt-0.5">{t}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-bg px-3 py-2 text-sm text-muted">
                  <Target size={16} className="shrink-0" /> Pass with {Math.round(passAccuracy(level) * 100)}% accuracy to unlock the next level.
                </p>
              </div>

              <div className="bcard flex flex-col gap-4 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-semibold">Choose level</h2>
                  <p className="text-sm text-muted">
                    Level {level} · {levelName(level)}
                    {best !== undefined && ` · Best ${best}`}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Level">
                  {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lv) => {
                    const locked = lv > unlocked || (daily && lv !== level)
                    return (
                      <button
                        key={lv}
                        type="button"
                        role="radio"
                        aria-checked={lv === level}
                        aria-label={`Level ${lv}${locked ? ', locked' : ''}`}
                        disabled={locked}
                        onClick={() => setLevel(lv)}
                        className={`grid aspect-square place-items-center rounded-xl border-2 font-display text-lg font-semibold transition ${
                          lv === level ? 'border-primary bg-primary text-white' : locked ? 'border-line bg-bg text-muted/60' : 'border-line bg-white hover:border-primary'
                        }`}
                      >
                        {locked && lv > unlocked ? <Lock size={16} /> : lv}
                      </button>
                    )
                  })}
                </div>
                {game.timeLimit?.(diff) && (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Timer size={16} /> Time limit: {formatDuration(game.timeLimit(diff)! * 1000)}
                  </p>
                )}
                <button type="button" className="bbtn-primary mt-auto w-full text-lg" onClick={() => start()} autoFocus>
                  <Play size={20} className="fill-white" /> Start
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {phase === 'countdown' && <Countdown key="cd" onDone={() => setPhase('playing')} />}

        {phase === 'playing' && (
          <PlayArea
            key={`play-${session}`}
            game={game}
            level={level}
            diff={diff}
            seed={seed}
            onExit={() => history.back()}
            onRestart={() => start()}
            onFinish={(o) => {
              const res = recordResult({ ...o, gameId: game.id, level, daily })
              setOutcome(res)
              setPhase('result')
              if (res.result.passed) {
                play('win')
                celebrate(res.result.stars === 3 || res.dailyBonus || !!res.unlockedLevel)
              } else play('lose')
            }}
          />
        )}

        {phase === 'result' && outcome && (
          <Result
            key="result"
            game={game}
            outcome={outcome}
            onRetry={() => start()}
            onNext={outcome.unlockedLevel || (outcome.result.passed && level < unlocked) ? () => start(Math.min(level + 1, MAX_LEVEL)) : undefined}
            daily={daily}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    if (n === 0) {
      onDone()
      return
    }
    play('tick')
    const t = window.setTimeout(() => setN(n - 1), 650)
    return () => window.clearTimeout(t)
  }, [n, onDone])
  return (
    <motion.div className="grid flex-1 place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-live="assertive">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={n}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.8, opacity: 0 }}
          className="font-display text-9xl font-bold text-primary"
        >
          {n || 'Go!'}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

interface PlayOutcome {
  raw: { points: number; correct: number; wrong: number; completed: boolean; hintsUsed: number; durationMs: number; timeLimitMs?: number }
  reactions: number[]
  targets: number
}

function PlayArea({
  game,
  level,
  diff,
  seed,
  onExit,
  onRestart,
  onFinish,
}: {
  game: GameDef
  level: number
  diff: ReturnType<typeof getDifficulty>
  seed: number
  onExit: () => void
  onRestart: () => void
  onFinish: (o: PlayOutcome) => void
}) {
  const rng = useMemo(() => mulberry32(seed), [seed])
  const [paused, setPaused] = useState(false)
  const [menu, setMenu] = useState<'pause' | 'exit' | null>(null)
  const [score, setScore] = useState(0)
  const [prog, setProg] = useState({ done: 0, total: 0 })
  const [hintText, setHintText] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hasHint, setHasHint] = useState(false)
  const [pop, setPop] = useState<{ id: number; text: string; good: boolean } | null>(null)
  const limit = game.timeLimit?.(diff)
  const [remaining, setRemaining] = useState(limit ?? 0)

  const acc = useRef({ points: 0, correct: 0, wrong: 0, reactions: [] as number[], targets: 0 })
  const hintFn = useRef<(() => string) | null>(null)
  const elapsed = useRef(0)
  const lastTick = useRef(performance.now())
  const done = useRef(false)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const timeoutCompletes = game.timeoutCompletes ?? true

  const finish = useCallback(
    (completed: boolean) => {
      if (done.current) return
      done.current = true
      if (!pausedRef.current) elapsed.current += performance.now() - lastTick.current
      const a = acc.current
      onFinishRef.current({
        raw: {
          points: a.points,
          correct: a.correct,
          wrong: a.wrong,
          completed,
          hintsUsed: hintsUsedRef.current,
          durationMs: elapsed.current,
          timeLimitMs: limit ? limit * 1000 : undefined,
        },
        reactions: a.reactions,
        targets: a.targets,
      })
    },
    [limit],
  )
  const hintsUsedRef = useRef(0)
  hintsUsedRef.current = hintsUsed

  const api = useMemo<GameApi>(
    () => ({
      correct(points) {
        const p = points ?? 10 * diff.d
        acc.current.points += p
        acc.current.correct++
        setScore(acc.current.points)
        setPop({ id: Math.random(), text: `+${p}`, good: true })
      },
      wrong() {
        acc.current.wrong++
        setPop({ id: Math.random(), text: 'Miss', good: false })
      },
      progress(d, t) {
        setProg((p) => (p.done === d && p.total === t ? p : { done: d, total: t }))
      },
      reaction(ms) {
        acc.current.reactions.push(ms)
      },
      found(n = 1) {
        acc.current.targets += n
      },
      finish(opts) {
        window.setTimeout(() => finish(opts?.completed ?? true), 0)
      },
      onHint(fn) {
        hintFn.current = fn
        setHasHint(!!fn)
      },
    }),
    [diff.d, finish],
  )

  // Track active (unpaused) time and drive the countdown.
  useEffect(() => {
    if (paused) {
      elapsed.current += performance.now() - lastTick.current
      return
    }
    lastTick.current = performance.now()
    if (!limit) return
    const id = window.setInterval(() => {
      const now = performance.now()
      const total = elapsed.current + (now - lastTick.current)
      const left = Math.max(0, Math.ceil(limit - total / 1000))
      setRemaining(left)
      if (left <= 5 && left > 0) play('tick')
      if (left === 0) finish(timeoutCompletes)
    }, 250)
    return () => window.clearInterval(id)
  }, [paused, limit, finish, timeoutCompletes])

  // Auto-pause when the tab is hidden.
  useEffect(() => {
    const on = () => {
      if (document.hidden) {
        setPaused(true)
        setMenu('pause')
      }
    }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  // Esc / P toggles pause.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key.toLowerCase() === 'p' && !(e.target instanceof HTMLInputElement))) {
        e.preventDefault()
        setPaused((p) => !p)
        setMenu((m) => (m ? null : 'pause'))
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  useEffect(() => {
    if (!hintText) return
    const t = window.setTimeout(() => setHintText(null), 4000)
    return () => window.clearTimeout(t)
  }, [hintText])

  const useHint = () => {
    if (!hintFn.current || hintsUsed >= MAX_HINTS || paused) return
    const text = hintFn.current()
    setHintsUsed((h) => h + 1)
    setHintText(text)
    play('tap')
  }

  const openMenu = (m: 'pause' | 'exit') => {
    setPaused(true)
    setMenu(m)
  }
  const resume = () => {
    setPaused(false)
    setMenu(null)
  }
  const Cat = categoryById(game.category)
  const pct = prog.total ? (prog.done / prog.total) * 100 : 0
  const lowTime = limit && remaining <= 10

  return (
    <motion.section key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col gap-4" aria-label={`${game.title} game`}>
      <header className="bcard sticky top-2 z-30 flex flex-col gap-3 px-3 py-3 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => openMenu('exit')} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bg hover:bg-primary-soft" aria-label="Exit game">
            <X size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              <span aria-hidden>{game.emoji} </span>
              {game.title}
            </h1>
            <p className="text-xs font-bold text-muted sm:text-sm">
              Level {level} · {levelName(level)}
            </p>
          </div>
          {limit ? (
            <div
              className={`flex items-center gap-1 rounded-2xl px-3 py-2 font-display text-lg font-semibold tabular-nums ${lowTime ? 'animate-pulse bg-danger/10 text-danger' : 'bg-bg'}`}
              aria-label={`${remaining} seconds left`}
              role="timer"
            >
              <Clock size={18} /> {formatDuration(remaining * 1000)}
            </div>
          ) : null}
          <div className="relative flex items-center gap-1 rounded-2xl bg-primary-soft px-3 py-2 font-display text-lg font-semibold text-primary tabular-nums" aria-label={`Score ${score}`}>
            <Zap size={18} className="fill-primary" /> {score}
            <AnimatePresence>
              {pop && (
                <motion.span
                  key={pop.id}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -28 }}
                  transition={{ duration: 0.8 }}
                  className={`pointer-events-none absolute -top-2 right-1 text-sm font-bold ${pop.good ? 'text-success' : 'text-danger'}`}
                  aria-hidden
                >
                  {pop.text}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={useHint}
            disabled={!hasHint || hintsUsed >= MAX_HINTS}
            className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/20 text-[#b26a00] hover:bg-accent/30 disabled:opacity-40"
            aria-label={`Hint, ${MAX_HINTS - hintsUsed} left`}
          >
            <Lightbulb size={22} />
            <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-ink">{MAX_HINTS - hintsUsed}</span>
          </button>
          <button type="button" onClick={() => openMenu('pause')} className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bg hover:bg-primary-soft" aria-label="Pause">
            <Pause size={22} />
          </button>
        </div>
        <Bar value={pct} color={Cat.color} label="Game progress" />
      </header>

      <AnimatePresence>
        {hintText && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 self-center rounded-2xl bg-accent/20 px-4 py-2 font-bold text-[#8a5200]"
          >
            <Lightbulb size={18} /> {hintText}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative flex flex-1 flex-col items-center justify-start py-2 ${paused ? 'pointer-events-none blur-md select-none' : ''}`} aria-hidden={paused}>
        <game.component diff={diff} rng={rng} paused={paused} api={api} />
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="dialog" aria-modal="true" aria-label={menu === 'exit' ? 'Leave game?' : 'Paused'} className="bcard flex w-full max-w-sm flex-col gap-3 p-6 text-center" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <div className="text-5xl" aria-hidden>
                {menu === 'exit' ? '🚪' : '⏸️'}
              </div>
              <h2 className="text-2xl font-semibold">{menu === 'exit' ? 'Leave this game?' : 'Paused'}</h2>
              <p className="text-muted">{menu === 'exit' ? 'Your progress in this round will not be saved.' : 'Take a breather. The timer is stopped.'}</p>
              <button type="button" className="bbtn-primary" onClick={resume} autoFocus>
                <Play size={18} className="fill-white" /> Resume
              </button>
              <button type="button" className="bbtn-ghost" onClick={onRestart}>
                <RotateCcw size={18} /> Restart
              </button>
              <button type="button" className="bbtn-ghost text-danger" onClick={onExit}>
                <ArrowLeft size={18} /> Exit game
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function Result({ game, outcome, onRetry, onNext, daily }: { game: GameDef; outcome: RecordOutcome; onRetry: () => void; onNext?: () => void; daily: boolean }) {
  const r = outcome.result
  const needed = Math.round(passAccuracy(r.level) * 100)
  const headline = r.passed ? (r.stars === 3 ? 'Brilliant!' : r.stars === 2 ? 'Great job!' : 'Level passed!') : 'Nice try!'
  return (
    <motion.section key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-live="polite">
      <div className="bcard relative overflow-hidden p-6 text-center sm:p-8">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary-soft to-transparent" aria-hidden />
        <div className="relative flex flex-col items-center gap-2">
          <motion.div className="text-6xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} aria-hidden>
            {r.passed ? '🏆' : '💪'}
          </motion.div>
          <h1 className="text-3xl font-bold">{headline}</h1>
          <p className="text-muted">
            {game.title} · Level {r.level} · {levelName(r.level)}
          </p>
          <Stars value={r.stars} size={38} animate />
          {!r.passed && (
            <p className="mt-1 rounded-2xl bg-bg px-4 py-2 text-sm font-semibold">
              You need {needed}% accuracy to pass – you got {Math.round(r.accuracy * 100)}%. Practice makes perfect!
            </p>
          )}
        </div>

        <dl className="relative mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
          <Stat icon={<Zap size={18} />} label="Score" value={r.score} />
          <Stat icon={<Target size={18} />} label="Accuracy" value={`${Math.round(r.accuracy * 100)}%`} />
          <Stat icon={<Clock size={18} />} label="Time" value={formatDuration(r.durationMs)} />
          <Stat icon={<span aria-hidden>✅</span>} label="Correct" value={r.correct} />
          <Stat icon={<span aria-hidden>❌</span>} label="Mistakes" value={r.wrong} />
          {r.avgReactionMs ? <Stat icon={<Timer size={18} />} label="Avg reaction" value={`${r.avgReactionMs} ms`} /> : <Stat icon={<Lightbulb size={18} />} label="Hints" value={r.hintsUsed} />}
        </dl>

        <div className="relative mt-5 flex flex-wrap justify-center gap-2">
          <span className="bchip bg-primary-soft text-primary">
            <Sparkles size={14} /> +{r.xp} XP
          </span>
          <span className="bchip bg-accent/20 text-[#8a5200]">
            <Coins size={14} /> +{r.coins} coins
          </span>
          {outcome.newBest && (
            <span className="bchip bg-success/15 text-[#1d8a5c]">
              <Trophy size={14} /> New personal best
            </span>
          )}
        </div>
      </div>

      {(outcome.unlockedLevel || outcome.playerLevelUp || outcome.dailyBonus || outcome.newAchievements.length > 0) && (
        <div className="bcard flex flex-col gap-2 p-4">
          {outcome.unlockedLevel && <Reward icon="🔓" text={`Level ${outcome.unlockedLevel} unlocked – ${levelName(outcome.unlockedLevel)}!`} />}
          {outcome.playerLevelUp && <Reward icon="🚀" text={`You reached player level ${outcome.playerLevelUp}!`} />}
          {outcome.dailyBonus && <Reward icon="🏆" text="All daily challenges done! Bonus XP and coins added." />}
          {outcome.newAchievements.map((a) => (
            <Reward key={a.id} icon={a.icon} text={`Badge earned: ${a.title}`} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="bbtn-ghost flex-1" onClick={onRetry}>
          <RotateCcw size={18} /> Play again
        </button>
        {onNext && !daily ? (
          <button type="button" className="bbtn-primary flex-1" onClick={onNext} autoFocus>
            Next level <ArrowRight size={18} />
          </button>
        ) : (
          <button type="button" className="bbtn-primary flex-1" onClick={() => (daily ? go({ name: 'home' }) : go({ name: 'category', id: game.category }))} autoFocus>
            {daily ? 'Back to dashboard' : 'More games'} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </motion.section>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-bg px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs font-bold text-muted">
        {icon} {label}
      </dt>
      <dd className="font-display text-xl font-semibold">{value}</dd>
    </div>
  )
}

function Reward({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-2xl bg-bg px-3 py-2 font-bold">
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      {text}
      <Award size={16} className="ml-auto text-accent" aria-hidden />
    </motion.div>
  )
}
