import { ArrowRight, Flame, Lock, Settings as SettingsIcon, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { playerLevel, streak, totals, useShared } from '../shared/store'
import { WORLDS } from '../shared/worlds'
import { TodayMix } from './Home'
import { Avatar, Card, Eyebrow, ProgressBar, WorldIcon } from './ui'

export function ProgressScreen() {
  const s = useShared()
  const t = totals(s)
  const lvl = playerLevel(t.xp)
  const days = streak(s)
  const recent = [...s.log].reverse().slice(0, 8)
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={s.profile!.name} colour={s.profile!.avatar} size={64} />
        <div className="min-w-0 flex-1">
          <Eyebrow>My progress</Eyebrow>
          <h1 className="text-3xl font-black sm:text-4xl">{s.profile!.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/settings" className="inline-flex min-h-16 items-center gap-2 rounded-xl border border-line bg-white px-4 font-bold hover:border-ink/30"><SettingsIcon size={18} aria-hidden /> Settings</Link>
          <Link to="/parent" className="inline-flex min-h-16 items-center gap-2 rounded-xl border border-line bg-white px-4 font-bold hover:border-ink/30"><Lock size={18} aria-hidden /> Grown-ups</Link>
        </div>
      </header>

      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <Eyebrow>Player level</Eyebrow>
          <p className="mt-1 text-4xl font-black">{lvl.level}</p>
          <div className="mt-3"><ProgressBar value={lvl.pct} label={`${lvl.into} of ${lvl.need} XP to the next level`} /></div>
          <p className="mt-1.5 text-sm text-ink-soft">{t.xp} XP in total</p>
        </Card>
        <Card className="p-5">
          <Eyebrow>Stars</Eyebrow>
          <p className="mt-1 flex items-center gap-2 text-4xl font-black"><Star size={28} className="fill-[#E8A900] text-[#9A6A00]" aria-hidden />{t.stars}</p>
          <p className="mt-3 text-sm text-ink-soft">from {t.plays} finished activities</p>
        </Card>
        <Card className="p-5">
          <Eyebrow>Streak</Eyebrow>
          <p className="mt-1 flex items-center gap-2 text-4xl font-black"><Flame size={28} className="text-accent" aria-hidden />{days}</p>
          <p className="mt-3 text-sm text-ink-soft">{days ? 'days in a row' : 'Play today to start one'}</p>
        </Card>
      </div>

      <TodayMix />

      <section aria-labelledby="pw" className="mb-10">
        <Eyebrow>Every world</Eyebrow>
        <h2 id="pw" className="mb-3 text-2xl font-black">Where you are</h2>
        <Card as="section" className="divide-y divide-line">
          {WORLDS.map((m) => {
            const w = s.worlds[m.id]
            return (
              <Link key={m.id} to={m.href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-black/[0.02]">
                <WorldIcon world={m.id} size={18} tile />
                <span className="min-w-0 flex-1">
                  <span className="block font-black">{m.name}</span>
                  <span className="block truncate text-sm text-ink-soft">{w.levelLabel || (w.plays ? `${w.plays} played` : 'Not started yet')}</span>
                </span>
                <span className="text-right text-sm font-bold">
                  <span className="flex items-center justify-end gap-1"><Star size={14} className="fill-[#E8A900] text-[#9A6A00]" aria-hidden />{w.stars}</span>
                  <span className="text-ink-soft">{w.xp} XP</span>
                </span>
                <ArrowRight size={18} className="text-ink-soft" aria-hidden />
              </Link>
            )
          })}
        </Card>
      </section>

      <section aria-labelledby="pr" className="mb-6">
        <Eyebrow>Lately</Eyebrow>
        <h2 id="pr" className="mb-3 text-2xl font-black">Recent activities</h2>
        {recent.length === 0 ? (
          <Card className="p-6 text-ink-soft">Nothing yet. Pick something from today’s mix.</Card>
        ) : (
          <Card as="section" className="divide-y divide-line">
            {recent.map((a, i) => (
              <div key={a.at + ':' + i} className="flex items-center gap-3 px-4 py-3">
                <WorldIcon world={a.world} size={16} tile />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{a.title}</span>
                  <span className="block text-sm text-ink-soft">{WORLDS.find((w) => w.id === a.world)!.name} · {new Date(a.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                </span>
                <span className="text-sm font-bold text-ink-soft">+{a.xp} XP</span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
