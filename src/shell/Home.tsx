import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { playerLevel, streak, totals, useShared, type WorldId } from '../shared/store'
import { useTodayMix } from '../shared/useMix'
import { GROUPS, WORLDS, worldMeta, worldsIn } from '../shared/worlds'
import { Art, WorldBadge, WorldScene } from './art'
import { useMotionKit, Words } from './motion'
import { Card, Eyebrow, ProgressBar } from './ui'

export function TodayMix({ compact = false }: { compact?: boolean }) {
  const { items, done } = useTodayMix()
  if (!items.length) return null
  const all = done === items.length
  return (
    <section aria-labelledby="mix-h" className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Today’s mix</Eyebrow>
          <h2 id="mix-h" className="flex items-center gap-2 text-2xl font-black">
            {all ? 'All done for today' : `${items.length} short activities`}
            {all && <Art name="party" size={30} motion="pop" />}
          </h2>
        </div>
        <div className="w-32 shrink-0 text-right" aria-live="polite">
          <p className="text-sm font-bold text-ink-soft">{done} of {items.length} done</p>
          <div className="mt-1.5"><ProgressBar value={done / items.length} colour="var(--color-success)" label={`Today’s mix: ${done} of ${items.length} done`} /></div>
        </div>
      </div>
      <ol data-mk="stagger" className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {items.map((it, i) => {
          const m = worldMeta(it.world)
          return (
            <li key={it.world + it.activityId}>
              <Link
                to={it.href}
                data-mk="press"
                data-say={`${it.title}. ${it.subtitle}`}
                className={`kz-card group flex h-full min-h-28 items-center gap-4 rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card ${it.done ? 'border-success/30 bg-success-soft/60' : 'border-line bg-white'}`}
                aria-label={`${i + 1}. ${it.title}, in ${m.name}${it.done ? ', done' : ''}`}
              >
                <WorldBadge world={it.world} size={80} done={it.done} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-[0.1em]" style={{ color: m.accent }}>{m.name}</span>
                  <span className={`mt-0.5 block leading-snug font-black ${it.done ? 'text-ink-soft line-through decoration-2' : ''}`}>{it.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">{it.subtitle}</span>
                </span>
                {!it.done && <ArrowRight size={20} className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5" aria-hidden />}
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function WorldCard({ id }: { id: WorldId }) {
  const s = useShared()
  const m = worldMeta(id)
  const w = s.worlds[id]
  const started = w.plays > 0
  return (
    <Link
      to={m.href}
      data-mk="press"
      className="kz-card mk-card group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-card focus-visible:-translate-y-1"
      aria-label={`${m.name}: ${m.tagline}. ${w.stars} stars. ${started ? 'Continue' : 'Start'}`}
    >
      <div className="relative">
        <WorldScene world={id} />
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 py-0.5 pr-2 pl-1 text-sm font-black shadow-sm sm:top-3 sm:right-3 sm:py-1 sm:pr-2.5 sm:pl-1.5" aria-hidden>
          <Art name="star" size={18} /> {w.stars}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <h3 className="text-xl leading-tight font-black sm:text-2xl">{m.name}</h3>
        <p className="mt-1 text-sm text-ink-soft sm:text-base">{m.tagline}</p>
        {/* phones: two cards a row, so the level sits above a full-width button */}
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
          <span className="min-w-0 text-xs font-bold text-ink-soft sm:text-sm">{w.levelLabel || (started ? `${w.plays} played` : 'Not started yet')}</span>
          <span className="inline-flex min-h-16 shrink-0 items-center justify-center gap-1.5 rounded-full px-5 text-lg font-black text-white transition-[gap] group-hover:gap-2.5" style={{ background: m.accent }} aria-hidden>
            {started ? 'Continue' : 'Start'} <ArrowRight size={17} />
          </span>
        </div>
      </div>
    </Link>
  )
}

/** The world played most recently, with the last thing finished there. */
function ContinueBanner() {
  const s = useShared()
  const last = WORLDS.map((w) => ({ id: w.id, at: s.worlds[w.id].lastAt })).filter((x) => x.at > 0).sort((a, b) => b.at - a.at)[0]
  if (!last) return null
  const m = worldMeta(last.id)
  const w = s.worlds[last.id]
  const act = [...s.log].reverse().find((a) => a.world === last.id)
  return (
    <section aria-labelledby="cont-h" className="mb-10">
      <Link
        to={m.href}
        data-mk="press"
        className="kz-card mk-card group grid overflow-hidden rounded-3xl border border-line bg-white transition hover:shadow-card sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        aria-label={`Pick up where you left off: ${m.name}${w.levelLabel ? `, ${w.levelLabel}` : ''}. Continue`}
      >
        <WorldScene world={last.id} className="sm:aspect-auto sm:h-full sm:min-h-44" />
        <div className="flex flex-col justify-center gap-1 p-5 sm:p-7">
          <Eyebrow>Pick up where you left off</Eyebrow>
          <h2 id="cont-h" className="text-3xl font-black" style={{ color: m.accent }}>{m.name}</h2>
          <p className="text-ink-soft">
            {w.levelLabel || `${w.plays} played`}
            {act ? ` · last time: ${act.title}` : ''}
          </p>
          <span data-mk="nudge" className="mt-3 inline-flex min-h-20 w-fit items-center gap-2 rounded-full px-8 text-xl font-black text-white transition-[gap] group-hover:gap-3" style={{ background: m.accent }} aria-hidden>
            Continue <ArrowRight size={19} />
          </span>
        </div>
      </Link>
    </section>
  )
}

export function Home() {
  const s = useShared()
  const t = totals(s)
  const lvl = playerLevel(t.xp)
  const days = streak(s)
  useMotionKit()
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Eyebrow className="flex items-center gap-1.5">Hi {s.profile!.name} <Art name="wave" size={20} motion="pop" /></Eyebrow>
          <Words text="Where shall we play today?" className="mt-1 text-[32px] leading-tight font-black tracking-tight sm:text-5xl" />
        </div>
        <Card className="grid grid-cols-3 divide-x divide-line p-0">
          <div className="px-4 py-3">
            <p className="eyebrow">Stars</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-2xl font-black"><Art name="star" size={26} />{t.stars}</p>
          </div>
          <div className="px-4 py-3">
            <p className="eyebrow">Streak</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-2xl font-black"><Art name="fire" size={26} motion={days > 0 ? 'float' : undefined} className={days > 0 ? '' : 'opacity-40 grayscale'} />{days}<span className="text-sm font-bold text-ink-soft">{days === 1 ? 'day' : 'days'}</span></p>
          </div>
          <div className="min-w-28 px-4 py-3 sm:min-w-36">
            <p className="eyebrow flex items-center gap-1"><Art name="trophy" size={16} /> Level {lvl.level}</p>
            <div className="mt-3"><ProgressBar value={lvl.pct} label={`Level ${lvl.level}: ${lvl.into} of ${lvl.need} XP`} /></div>
            <p className="mt-1 text-xs font-bold text-ink-soft">{lvl.need - lvl.into} XP to level {lvl.level + 1}</p>
          </div>
        </Card>
      </header>

      <ContinueBanner />
      <TodayMix />

      {GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`g-${g.id}`} className="mb-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <Eyebrow>{g.blurb}</Eyebrow>
              <h2 id={`g-${g.id}`} className="text-2xl font-black">{g.name}</h2>
            </div>
            <Link to={g.href} className="inline-flex min-h-16 shrink-0 items-center gap-1 font-bold text-brand hover:underline">All of {g.name} <ArrowRight size={16} aria-hidden /></Link>
          </div>
          <ul data-mk="stagger" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {worldsIn(g.id).map((w) => (
              <li key={w.id}><WorldCard id={w.id} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
