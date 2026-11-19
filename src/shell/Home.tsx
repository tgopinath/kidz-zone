import { ArrowRight, CheckCircle2, Flame, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { playerLevel, streak, totals, useShared } from '../shared/store'
import { useTodayMix } from '../shared/useMix'
import { GROUPS, worldMeta, worldsIn } from '../shared/worlds'
import { Card, Eyebrow, ProgressBar, WorldIcon } from './ui'

export function TodayMix({ compact = false }: { compact?: boolean }) {
  const { items, done } = useTodayMix()
  if (!items.length) return null
  return (
    <section aria-labelledby="mix-h" className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Today’s mix</Eyebrow>
          <h2 id="mix-h" className="text-2xl font-black">{done === items.length ? 'All done for today' : `${items.length} short activities`}</h2>
        </div>
        <p className="text-sm font-bold text-ink-soft" aria-live="polite">{done} of {items.length} done</p>
      </div>
      <ol className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {items.map((it, i) => {
          const m = worldMeta(it.world)
          return (
            <li key={it.world + it.activityId}>
              <Link
                to={it.href}
                className="kz-card group flex h-full min-h-24 items-start gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                aria-label={`${i + 1}. ${it.title}, in ${m.name}${it.done ? ', done' : ''}`}
              >
                <WorldIcon world={it.world} size={18} tile />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-[0.1em]" style={{ color: m.accent }}>{m.name}</span>
                  <span className="mt-0.5 block leading-snug font-black">{it.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{it.subtitle}</span>
                </span>
                {it.done ? <CheckCircle2 size={22} className="shrink-0 text-success" aria-hidden /> : <ArrowRight size={20} className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5" aria-hidden />}
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function WorldCard({ id }: { id: Parameters<typeof worldMeta>[0] }) {
  const s = useShared()
  const m = worldMeta(id)
  const w = s.worlds[id]
  return (
    <Link to={m.href} className="kz-card group flex h-full flex-col rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card sm:p-5" aria-label={`${m.name}: ${m.tagline}`}>
      <div className="flex items-start justify-between gap-3">
        <WorldIcon world={id} size={22} tile />
        <span className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft" aria-label={`${w.stars} stars`}>
          <Star size={15} className="fill-[#E8A900] text-[#9A6A00]" aria-hidden /> {w.stars}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-black">{m.name}</h3>
      <p className="mt-1 text-ink-soft">{m.tagline}</p>
      <div className="mt-auto flex items-center justify-between pt-4 text-sm font-bold">
        <span className="text-ink-soft">{w.levelLabel || (w.plays ? `${w.plays} played` : 'Not started')}</span>
        <span className="inline-flex items-center gap-1" style={{ color: m.accent }}>
          {w.plays ? 'Continue' : 'Start'} <ArrowRight size={16} aria-hidden />
        </span>
      </div>
    </Link>
  )
}

export function Home() {
  const s = useShared()
  const t = totals(s)
  const lvl = playerLevel(t.xp)
  const days = streak(s)
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Eyebrow>Hi {s.profile!.name}</Eyebrow>
          <h1 className="mt-1 text-[32px] leading-tight font-black tracking-tight sm:text-5xl">Where shall we play today?</h1>
        </div>
        <Card className="grid grid-cols-3 divide-x divide-line p-0">
          <div className="px-4 py-3">
            <p className="eyebrow">Stars</p>
            <p className="mt-0.5 flex items-center gap-1 text-2xl font-black"><Star size={20} className="fill-[#E8A900] text-[#9A6A00]" aria-hidden />{t.stars}</p>
          </div>
          <div className="px-4 py-3">
            <p className="eyebrow">Streak</p>
            <p className="mt-0.5 flex items-center gap-1 text-2xl font-black"><Flame size={20} className="text-accent" aria-hidden />{days}<span className="text-sm font-bold text-ink-soft">{days === 1 ? 'day' : 'days'}</span></p>
          </div>
          <div className="min-w-32 px-4 py-3">
            <p className="eyebrow">Level {lvl.level}</p>
            <div className="mt-3"><ProgressBar value={lvl.pct} label={`Level ${lvl.level}: ${lvl.into} of ${lvl.need} XP`} /></div>
            <p className="mt-1 text-xs font-bold text-ink-soft">{lvl.need - lvl.into} XP to level {lvl.level + 1}</p>
          </div>
        </Card>
      </header>

      <TodayMix />

      {GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`g-${g.id}`} className="mb-10">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <Eyebrow>{g.blurb}</Eyebrow>
              <h2 id={`g-${g.id}`} className="text-2xl font-black">{g.name}</h2>
            </div>
            <Link to={g.href} className="inline-flex min-h-11 items-center gap-1 font-bold text-brand hover:underline">All of {g.name} <ArrowRight size={16} aria-hidden /></Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {worldsIn(g.id).map((w) => (
              <li key={w.id}><WorldCard id={w.id} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
