import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShared } from '../shared/store'
import { useTodayMix } from '../shared/useMix'
import { GROUPS, worldMeta, worldsIn, type GroupId } from '../shared/worlds'
import { WorldBadge } from './art'
import { WorldCard } from './Home'
import { useMotionKit, Words } from './motion'
import { Eyebrow } from './ui'

const LEAD: Record<GroupId, string> = {
  learn: 'Grow words with moving pictures, read your first words in the garden, and count real rupee notes and coins.',
  play: 'Puzzles that adapt to you, quick brain games, and a pet that needs you every day.',
  explore: 'Every state and district of India, the whole world on a globe, and a supermarket to shop in.',
}

/** Learn, Play and Explore: the worlds of one group with their progress. */
export function Hub({ group }: { group: GroupId }) {
  const g = GROUPS.find((x) => x.id === group)!
  const s = useShared()
  const { items } = useTodayMix()
  const worlds = worldsIn(group)
  const mine = items.filter((it) => worlds.some((w) => w.id === it.world) && !it.done)
  const tint = worldMeta(worlds[0].id)
  useMotionKit()
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header
        data-mk="drift"
        className="mb-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl border border-line p-6 sm:p-8"
        style={{ background: `radial-gradient(80% 140% at 100% 0%, ${tint.soft}, transparent 70%), #fff`, ['--mk-blob-a' as string]: worldMeta(worlds[1].id).soft, ['--mk-blob-b' as string]: tint.soft }}
      >
        <div className="min-w-0 max-w-2xl">
          <Eyebrow className="mb-1">{worlds.length} worlds</Eyebrow>
          <Words text={g.name} className="text-[32px] leading-tight font-black sm:text-5xl" />
          <p className="mt-2 text-ink-soft sm:text-lg">{LEAD[group]}</p>
        </div>
        <span className="flex -space-x-4" aria-hidden>
          {worlds.map((w, i) => (
            <span key={w.id} className="rounded-3xl ring-4 ring-white" style={{ rotate: `${(i - (worlds.length - 1) / 2) * 6}deg` }}>
              <WorldBadge world={w.id} size={84} />
            </span>
          ))}
        </span>
      </header>
      <ul data-mk="stagger" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {worlds.map((w) => (
          <li key={w.id}><WorldCard id={w.id} /></li>
        ))}
      </ul>
      {mine.length > 0 && (
        <section className="mt-10" aria-labelledby="hub-mix">
          <Eyebrow>From today’s mix</Eyebrow>
          <h2 id="hub-mix" className="text-xl font-black">Still to do, {s.profile!.name}</h2>
          <ul data-mk="stagger" className="mt-3 flex flex-col gap-2">
            {mine.map((it) => (
              <li key={it.world + it.activityId}>
                <Link to={it.href} data-mk="press" className="kz-card group flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2.5 font-bold transition hover:shadow-card">
                  <WorldBadge world={it.world} size={44} />
                  <span className="min-w-0 flex-1">
                    {it.title}
                    <span className="block text-sm font-normal text-ink-soft">{it.subtitle}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
