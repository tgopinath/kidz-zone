import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, Coins, Flame, Play, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { Bar, ProgressRing, SectionTitle } from '../components/ui'
import { CATEGORIES, SKILLS, gamesIn } from '../games/registry'
import { DAILY_BONUS, dailyChallenges, missions } from '../lib/daily'
import { computeStreak, dateKey, formatDuration, msUntilMidnight } from '../lib/dates'
import { hashString } from '../lib/random'
import { levelName, playerLevelFromXp } from '../lib/difficulty'
import { href } from '../lib/router'
import { brainScore, perf, skillScores } from '../lib/stats'
import { useActive } from '../store/AppContext'
import type { CategoryMeta } from '../games/registry'

const MESSAGES = [
  'Every rep makes your brain stronger. 💪',
  'Small steps every day add up to big gains.',
  'Mistakes are how brains learn – keep going!',
  'Curiosity is a superpower. Use it today!',
  'Focus on progress, not perfection.',
  'Your brain loves a good challenge.',
  'Practice today, shine tomorrow. ✨',
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function useCountdown() {
  const [ms, setMs] = useState(msUntilMidnight())
  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilMidnight()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return ms
}

export function Home() {
  const { profile, progress } = useActive()
  const today = dateKey()
  const daily = dailyChallenges(profile.id, progress, today)
  const done = new Set(progress.dailyDone[today] ?? [])
  const doneCount = daily.filter((c) => done.has(c.game.id)).length
  const nextDaily = daily.find((c) => !done.has(c.game.id))
  const countdown = useCountdown()
  const streak = computeStreak(progress.playedDays)
  const scores = skillScores(progress.history)
  const overall = brainScore(scores)
  const lvl = playerLevelFromXp(progress.xp)
  const trend = progress.history.slice(-12).map((r, i) => ({ i, v: perf(r) }))
  const msg = MESSAGES[hashString(today) % MESSAGES.length]
  const missionList = missions(progress).filter((m) => m.scope === 'daily')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-6">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-8 -bottom-10 text-[11rem] leading-none opacity-15 select-none sm:text-[14rem]" aria-hidden>
          🧠
        </div>
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-bold text-white/80">
              {greeting()}, {profile.avatar}
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Hi {profile.name}! Ready to train?</h1>
            <p className="mt-2 max-w-md text-white/90">{msg}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="bchip bg-white/20 py-1.5 text-sm text-white">
                <Flame size={16} /> {streak} day streak
              </span>
              <span className="bchip bg-white/20 py-1.5 text-sm text-white">
                <Coins size={16} /> {progress.coins} coins
              </span>
              <span className="bchip bg-white/20 py-1.5 text-sm text-white">
                <Check size={16} /> Daily {doneCount}/3
              </span>
            </div>
          </div>
          {nextDaily ? (
            <a href={href({ name: 'play', id: nextDaily.game.id, level: nextDaily.level, daily: true })} className="bbtn-accent self-start text-lg md:self-auto">
              <Play size={20} className="fill-ink" /> {doneCount ? 'Continue daily' : 'Start daily challenge'}
            </a>
          ) : (
            <a href={href({ name: 'games' })} className="bbtn-accent self-start text-lg md:self-auto">
              <Sparkles size={20} /> Free play
            </a>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Daily challenge */}
        <section className="bcard flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="daily-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="daily-h" className="text-xl font-semibold">
              📅 Daily Brain Challenge
            </h2>
            <span className="bchip bg-bg py-1.5 text-sm" aria-label={`New challenges in ${formatDuration(countdown)}`}>
              <Clock size={14} /> Resets in {formatDuration(countdown)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Bar value={(doneCount / 3) * 100} color="#35C98B" label="Daily challenge completion" />
            <span className="shrink-0 font-bold text-muted">{Math.round((doneCount / 3) * 100)}%</span>
          </div>
          <ul className="flex flex-col gap-2">
            {daily.map((c, i) => {
              const isDone = done.has(c.game.id)
              const cat = CATEGORIES.find((x) => x.id === c.game.category)!
              return (
                <li key={c.game.id}>
                  <a
                    href={href({ name: 'play', id: c.game.id, level: c.level, daily: true })}
                    className={`group flex items-center gap-3 rounded-2xl border-2 p-3 transition ${isDone ? 'border-success/40 bg-success/5' : 'border-line hover:border-primary hover:bg-primary-soft/40'}`}
                  >
                    <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-2xl`} aria-hidden>
                      {c.game.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">
                        {i === 0 && <span className="bchip mr-1 bg-accent/25 px-2 py-0 text-[10px] text-[#8a5200]">FEATURED</span>}
                        {c.game.title}
                      </span>
                      <span className="block text-sm text-muted">
                        {cat.title} · Level {c.level}
                      </span>
                    </span>
                    {isDone ? (
                      <span className="bchip bg-success text-white">
                        <Check size={14} /> Done
                      </span>
                    ) : (
                      <span className="bchip bg-primary text-white group-hover:brightness-110">
                        <Play size={12} className="fill-white" /> Play
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
          <p className="flex items-center gap-2 rounded-2xl bg-accent/15 px-3 py-2 text-sm font-bold text-[#8a5200]">
            🎁 {progress.dailyRewarded.includes(today) ? 'Reward collected – see you tomorrow!' : `Complete all 3 for +${DAILY_BONUS.xp} XP and +${DAILY_BONUS.coins} coins`}
          </p>
        </section>

        {/* Performance overview */}
        <section className="bcard flex flex-col gap-5 p-5 sm:p-6" aria-labelledby="perf-h">
          <div className="flex items-center justify-between">
            <h2 id="perf-h" className="text-xl font-semibold">
              🧬 Brain Performance
            </h2>
            <a href={href({ name: 'stats' })} className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              Details <ArrowRight size={14} />
            </a>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={overall} size={128} label={overall === null ? 'Brain score: no data yet' : `Brain score ${overall} out of 100`}>
              <div>
                <div className="font-display text-3xl font-bold">{overall ?? '–'}</div>
                <div className="text-[11px] font-bold text-muted uppercase">Brain score</div>
              </div>
            </ProgressRing>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-sm font-bold text-muted">Learning level</p>
              <p className="font-display text-2xl font-semibold">
                Lv {lvl.level} <span className="text-base text-muted">· {levelName(Math.min(10, lvl.level))}</span>
              </p>
              <Bar value={(lvl.into / lvl.need) * 100} label="XP to next level" />
              <p className="text-xs text-muted">
                {lvl.into} / {lvl.need} XP to level {lvl.level + 1}
              </p>
              {trend.length > 1 && (
                <div className="h-10" aria-label="Recent game performance trend" role="img">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <YAxis hide domain={[0, 100]} />
                      <Line type="monotone" dataKey="v" stroke="#7557F6" strokeWidth={2.5} dot={false} isAnimationActive />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
            {SKILLS.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1 rounded-2xl bg-bg p-2">
                <ProgressRing value={scores[s.id]} size={56} stroke={6} color={s.color} label={`${s.label}: ${scores[s.id] ?? 'no data'}`}>
                  <span className="font-display text-sm font-semibold">{scores[s.id] ?? '–'}</span>
                </ProgressRing>
                <span className="text-xs font-bold">{s.label}</span>
              </div>
            ))}
          </div>
          {overall === null && <p className="text-center text-sm text-muted">Play any game to see your scores here.</p>}
        </section>
      </div>

      {/* Missions */}
      <section aria-labelledby="missions-h">
        <SectionTitle
          action={
            <a href={href({ name: 'rewards' })} className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              All missions <ArrowRight size={14} />
            </a>
          }
        >
          <span id="missions-h">🎯 Today’s missions</span>
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {missionList.map((m) => {
            const claimed = progress.claimedMissions.includes(m.id)
            const complete = m.value >= m.goal
            return (
              <div key={m.id} className="bcard flex items-center gap-3 p-4">
                <span className="text-3xl" aria-hidden>
                  {m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.title}</p>
                  <Bar value={(Math.min(m.value, m.goal) / m.goal) * 100} color={complete ? '#35C98B' : '#7557F6'} className="mt-1.5" label={m.title} />
                  <p className="mt-1 text-xs text-muted">
                    {Math.min(m.value, m.goal)}/{m.goal} · {claimed ? 'Claimed ✓' : complete ? 'Ready to claim!' : `+${m.reward} coins`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Categories */}
      <section aria-labelledby="cats-h">
        <SectionTitle>
          <span id="cats-h">🎮 Game categories</span>
        </SectionTitle>
        <CategoryGrid />
      </section>
    </div>
  )
}

export function CategoryGrid() {
  const { progress } = useActive()
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORIES.map((c, i) => (
        <motion.li key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <CategoryCard c={c} played={progress.history.filter((r) => r.category === c.id).length} />
        </motion.li>
      ))}
    </ul>
  )
}

function CategoryCard({ c, played }: { c: CategoryMeta; played: number }) {
  const count = gamesIn(c.id).length
  return (
    <motion.a
      href={href({ name: 'category', id: c.id })}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      className="bcard group flex h-full flex-col overflow-hidden"
      aria-label={`${c.title}: ${c.description} ${count} games.`}
    >
      <div className={`relative grid h-32 place-items-center bg-gradient-to-br ${c.gradient}`}>
        <div className="absolute top-3 left-3 size-16 rounded-full bg-white/15" aria-hidden />
        <div className="absolute right-6 bottom-2 size-10 rounded-full bg-white/15" aria-hidden />
        <motion.span className="relative text-6xl drop-shadow-lg" whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }} aria-hidden>
          {c.emoji}
        </motion.span>
        <span className="bchip absolute top-3 right-3 bg-white/25 text-white">{count} games</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{c.title}</h3>
          <span className="flex gap-0.5" aria-label={`Difficulty ${c.difficulty} of 3`} role="img">
            {[1, 2, 3].map((d) => (
              <span key={d} className={`h-3 w-1.5 rounded-full ${d <= c.difficulty ? 'bg-accent' : 'bg-line'}`} />
            ))}
          </span>
        </div>
        <p className="flex-1 text-sm text-muted">{c.description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-muted">{played ? `${played} played` : 'New!'}</span>
          <span className="bchip bg-primary py-1.5 text-sm text-white transition group-hover:brightness-110">
            <Play size={12} className="fill-white" /> Play
          </span>
        </div>
      </div>
    </motion.a>
  )
}
