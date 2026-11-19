import { motion } from 'framer-motion'
import { Check, Coins, Lock } from 'lucide-react'
import { Bar, SectionTitle } from '../components/ui'
import { ACHIEVEMENTS } from '../lib/achievements'
import { missions, type Mission } from '../lib/daily'
import { computeStreak } from '../lib/dates'
import { playerLevelFromXp } from '../lib/difficulty'
import { play } from '../lib/sound'
import { gameById } from '../games/registry'
import { useActive, useApp } from '../store/AppContext'

export function Rewards() {
  const { profile, progress } = useActive()
  const { profiles, claimMission } = useApp()
  const ms = missions(progress)
  const earned = ACHIEVEMENTS.filter((a) => progress.achievements[a.id]).length

  // Local leaderboard: profiles on this device, ranked by XP. No fake players.
  const board = profiles
    .map((d) => ({ id: d.profile.id, name: d.profile.name, avatar: d.profile.avatar, xp: d.progress.xp, streak: computeStreak(d.progress.playedDays), level: playerLevelFromXp(d.progress.xp).level }))
    .sort((a, b) => b.xp - a.xp)

  // Personal bests: best score per game across levels.
  const bests = new Map<string, { score: number; level: number }>()
  for (const [k, v] of Object.entries(progress.bests)) {
    const [gid, lv] = k.split(':')
    const cur = bests.get(gid)
    if (!cur || v > cur.score) bests.set(gid, { score: v, level: Number(lv) })
  }

  const claim = (m: Mission) => {
    claimMission(m)
    play('coin')
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Rewards</h1>
          <p className="text-muted">Missions, badges, records and your family leaderboard.</p>
        </div>
        <span className="bchip bg-accent/20 py-2 text-base text-[#8a5200]">
          <Coins size={18} /> {progress.coins} coins
        </span>
      </div>

      <section>
        <SectionTitle>🎯 Missions</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          {(['daily', 'weekly'] as const).map((scope) => (
            <div key={scope} className="bcard p-5">
              <h3 className="mb-3 font-semibold">{scope === 'daily' ? 'Daily missions' : 'Weekly challenges'}</h3>
              <ul className="flex flex-col gap-3">
                {ms
                  .filter((m) => m.scope === scope)
                  .map((m) => {
                    const claimed = progress.claimedMissions.includes(m.id)
                    const complete = m.value >= m.goal
                    return (
                      <li key={m.id} className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden>
                          {m.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{m.title}</p>
                          <Bar value={(Math.min(m.value, m.goal) / m.goal) * 100} color={complete ? '#35C98B' : '#7557F6'} className="mt-1" label={m.title} />
                          <p className="mt-0.5 text-xs text-muted">
                            {Math.min(m.value, m.goal)} / {m.goal}
                          </p>
                        </div>
                        {claimed ? (
                          <span className="bchip bg-success/15 text-[#1d8a5c]">
                            <Check size={14} /> Claimed
                          </span>
                        ) : (
                          <button type="button" disabled={!complete} onClick={() => claim(m)} className="bbtn-accent !px-3 !py-2 text-sm" aria-label={`Claim ${m.reward} coins for ${m.title}`}>
                            <Coins size={14} /> {m.reward}
                          </button>
                        )}
                      </li>
                    )
                  })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>
          🏅 Badges <span className="text-base text-muted">({earned}/{ACHIEVEMENTS.length})</span>
        </SectionTitle>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACHIEVEMENTS.map((a, i) => {
            const at = progress.achievements[a.id]
            const { value, goal } = a.progress(progress)
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`bcard flex flex-col items-center gap-1.5 p-4 text-center ${at ? '' : 'opacity-75'}`}
              >
                <span className={`grid size-16 place-items-center rounded-full text-3xl ${at ? 'bg-gradient-to-br from-accent to-[#ff7a59] shadow-soft' : 'bg-bg grayscale'}`} aria-hidden>
                  {a.icon}
                </span>
                <p className="font-bold">{a.title}</p>
                <p className="text-xs text-muted">{a.description}</p>
                {at ? (
                  <span className="bchip bg-success/15 text-[#1d8a5c]">
                    <Check size={12} /> Earned {new Date(at).toLocaleDateString()}
                  </span>
                ) : (
                  <>
                    <Bar value={(Math.min(value, goal) / goal) * 100} className="mt-1" label={`${a.title} progress`} />
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Lock size={11} /> {Math.min(value, goal)}/{goal}
                    </span>
                  </>
                )}
              </motion.li>
            )
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bcard p-5">
          <h2 className="mb-1 text-lg font-semibold">🏆 Family leaderboard</h2>
          <p className="mb-3 text-sm text-muted">Players on this device, ranked by total XP.</p>
          <ol className="flex flex-col gap-2">
            {board.map((p, i) => (
              <li key={p.id} className={`flex items-center gap-3 rounded-2xl p-3 ${p.id === profile.id ? 'bg-primary-soft' : 'bg-bg'}`}>
                <span className="w-7 text-center font-display text-lg font-bold">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                <span className="text-2xl" aria-hidden>
                  {p.avatar}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">
                  {p.name}
                  {p.id === profile.id && <span className="text-muted"> (you)</span>}
                </span>
                <span className="text-sm text-muted">Lv {p.level}</span>
                <span className="font-display font-semibold">{p.xp} XP</span>
              </li>
            ))}
          </ol>
          {board.length === 1 && <p className="mt-3 text-sm text-muted">Add another player from your profile page to compete with family and friends.</p>}
        </section>

        <section className="bcard p-5">
          <h2 className="mb-1 text-lg font-semibold">⭐ Personal bests</h2>
          <p className="mb-3 text-sm text-muted">Your top score in each game.</p>
          {bests.size === 0 ? (
            <p className="py-6 text-center text-muted">Play games to set your first records.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {[...bests.entries()]
                .sort((a, b) => b[1].score - a[1].score)
                .map(([gid, b]) => {
                  const g = gameById(gid)
                  return (
                    <li key={gid} className="flex items-center gap-3 py-2">
                      <span className="text-xl" aria-hidden>
                        {g?.emoji}
                      </span>
                      <span className="flex-1 font-bold">{g?.title}</span>
                      <span className="text-sm text-muted">Lv {b.level}</span>
                      <span className="w-16 text-right font-display font-semibold">{b.score}</span>
                    </li>
                  )
                })}
              {progress.bestReactionMs && (
                <li className="flex items-center gap-3 py-2">
                  <span className="text-xl" aria-hidden>
                    ⚡
                  </span>
                  <span className="flex-1 font-bold">Fastest reaction</span>
                  <span className="font-display font-semibold">{progress.bestReactionMs} ms</span>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
