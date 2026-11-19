import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Empty, SectionTitle } from '../components/ui'
import { SKILLS, gameById } from '../games/registry'
import { computeStreak, dateKey, daysAgoKey } from '../lib/dates'
import { levelName, playerLevelFromXp } from '../lib/difficulty'
import { href } from '../lib/router'
import { perf, skillOf, skillScores, totals } from '../lib/stats'
import { useActive } from '../store/AppContext'
import type { GameResult, SkillId } from '../types'

type Range = 'day' | 'week' | 'month'

function bucketise(history: GameResult[], range: Range, skill: SkillId) {
  const rs = history.filter((r) => skillOf(r) === skill)
  if (range === 'day') {
    const today = dateKey()
    return rs
      .filter((r) => dateKey(r.at) === today)
      .map((r) => ({ label: new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: perf(r) }))
  }
  const days = range === 'week' ? 7 : 30
  const out: { label: string; value: number | null }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const k = daysAgoKey(i)
    const day = rs.filter((r) => dateKey(r.at) === k)
    const d = new Date(k + 'T00:00')
    out.push({
      label: range === 'week' ? d.toLocaleDateString([], { weekday: 'short' }) : `${d.getDate()}/${d.getMonth() + 1}`,
      value: day.length ? Math.round(day.reduce((a, r) => a + perf(r), 0) / day.length) : null,
    })
  }
  return out
}

function trendText(history: GameResult[], skill: SkillId): string | null {
  const rs = history.filter((r) => skillOf(r) === skill)
  if (rs.length < 4) return null
  const half = Math.floor(rs.length / 2)
  const avg = (a: GameResult[]) => a.reduce((s, r) => s + perf(r), 0) / a.length
  const early = avg(rs.slice(Math.max(0, half - 10), half))
  const late = avg(rs.slice(-Math.min(10, rs.length - half)))
  const diff = Math.round(late - early)
  if (Math.abs(diff) < 3) return 'Holding steady'
  return diff > 0 ? `▲ Up ${diff} points` : `▼ Down ${-diff} points`
}

export function Stats() {
  const { progress } = useActive()
  const [range, setRange] = useState<Range>('week')
  const t = totals(progress)
  const scores = skillScores(progress.history)
  const lvl = playerLevelFromXp(progress.xp)
  const radar = SKILLS.map((s) => ({ skill: s.label, value: scores[s.id] ?? 0 }))
  const charts = useMemo(() => SKILLS.map((s) => ({ s, data: bucketise(progress.history, range, s.id), trend: trendText(progress.history, s.id) })), [progress.history, range])
  const recent = progress.history.slice(-8).reverse()

  const tiles: [string, string | number, string][] = [
    ['🎮', t.games, 'Games played'],
    ['✅', t.passed, 'Challenges completed'],
    ['🎯', t.avgAcc === null ? '–' : `${Math.round(t.avgAcc * 100)}%`, 'Average accuracy'],
    ['⏱️', t.avgRt === null ? '–' : `${t.avgRt} ms`, 'Avg reaction time'],
    ['✨', progress.xp, 'Total XP'],
    ['🪙', progress.coins, 'Coins'],
    ['🔥', computeStreak(progress.playedDays), 'Day streak'],
    ['🏅', t.highest ? `Lv ${t.highest}` : '–', 'Highest level unlocked'],
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Your progress</h1>
        <p className="text-muted">
          Player level {lvl.level} · {levelName(Math.min(10, lvl.level))}
        </p>
      </div>

      <div role="note" className="flex gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm">
        <Info size={20} className="shrink-0 text-secondary" />
        <p>
          <strong>About these numbers:</strong> scores reflect how you perform in Brain Gym games (accuracy weighted by level). They track your practice and improvement in the games – they are
          not a scientifically validated measure of intelligence or cognitive ability.
        </p>
      </div>

      <section aria-label="Totals">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map(([icon, value, label]) => (
            <li key={label} className="bcard p-4">
              <div className="text-2xl" aria-hidden>
                {icon}
              </div>
              <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
              <div className="text-sm text-muted">{label}</div>
            </li>
          ))}
        </ul>
      </section>

      {progress.history.length === 0 ? (
        <div className="bcard">
          <Empty
            icon="📈"
            title="No games played yet"
            body="Play a few games and your charts will appear here, showing how each skill improves over time."
            action={
              <a href={href({ name: 'games' })} className="bbtn-primary">
                Start training
              </a>
            }
          />
        </div>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="bcard p-5">
              <h2 className="mb-2 text-lg font-semibold">Skill balance</h2>
              <div className="h-72" role="img" aria-label={`Skill radar: ${SKILLS.map((s) => `${s.label} ${scores[s.id] ?? 'no data'}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke="#E7E4F5" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: '#20213A', fontSize: 12, fontWeight: 700 }} />
                    <Radar dataKey="value" stroke="#7557F6" fill="#7557F6" fillOpacity={0.35} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bcard p-5">
              <h2 className="mb-3 text-lg font-semibold">Recent games</h2>
              <ul className="flex flex-col divide-y divide-line">
                {recent.map((r) => {
                  const g = gameById(r.gameId)
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <span className="text-2xl" aria-hidden>
                        {g?.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">
                          {g?.title} <span className="font-semibold text-muted">· Lv {r.level}</span>
                        </p>
                        <p className="text-xs text-muted">{new Date(r.at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-semibold">{r.score}</p>
                        <p className={`text-xs font-bold ${r.passed ? 'text-[#1d8a5c]' : 'text-muted'}`}>
                          {Math.round(r.accuracy * 100)}% {r.passed ? '✓ passed' : '· retry'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>

          <section>
            <SectionTitle
              action={
                <div className="flex rounded-2xl bg-white p-1 shadow-soft" role="tablist" aria-label="Time range">
                  {(['day', 'week', 'month'] as Range[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="tab"
                      aria-selected={range === r}
                      onClick={() => setRange(r)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-bold capitalize ${range === r ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}
                    >
                      {r === 'day' ? 'Daily' : r === 'week' ? 'Weekly' : 'Monthly'}
                    </button>
                  ))}
                </div>
              }
            >
              Skill trends
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {charts.map(({ s, data, trend }) => {
                const has = data.some((d) => d.value !== null)
                return (
                  <div key={s.id} className="bcard p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">
                        <span aria-hidden>{s.emoji}</span> {s.label}
                      </h3>
                      <span className="text-sm font-bold" style={{ color: s.color }}>
                        {scores[s.id] ?? '–'}
                      </span>
                    </div>
                    {has ? (
                      <div className="h-36" role="img" aria-label={`${s.label} trend: ${trend ?? 'not enough data'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data} margin={{ left: -28, right: 6, top: 6 }}>
                            <defs>
                              <linearGradient id={`g-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#F0EDFA" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#777A91' }} interval="preserveStartEnd" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#777A91' }} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E7E4F5' }} />
                            <Area type="monotone" dataKey="value" name="Score" stroke={s.color} strokeWidth={2.5} fill={`url(#g-${s.id})`} connectNulls dot={{ r: 3 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="grid h-36 place-items-center text-center text-sm text-muted">No {s.label.toLowerCase()} games in this period.</p>
                    )}
                    <p className="mt-1 text-xs font-bold text-muted">{trend ?? 'Play 4+ games to see a trend'}</p>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
