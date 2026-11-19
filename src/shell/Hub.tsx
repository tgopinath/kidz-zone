import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShared } from '../shared/store'
import { useTodayMix } from '../shared/useMix'
import { GROUPS, worldsIn, type GroupId } from '../shared/worlds'
import { WorldCard } from './Home'
import { Eyebrow, PageTitle } from './ui'

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
  const mine = items.filter((it) => worldsIn(group).some((w) => w.id === it.world) && !it.done)
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <PageTitle eyebrow={`${worldsIn(group).length} worlds`} title={g.name} lead={LEAD[group]} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {worldsIn(group).map((w) => (
          <li key={w.id}><WorldCard id={w.id} /></li>
        ))}
      </ul>
      {mine.length > 0 && (
        <section className="mt-10" aria-labelledby="hub-mix">
          <Eyebrow>From today’s mix</Eyebrow>
          <h2 id="hub-mix" className="text-xl font-black">Still to do, {s.profile!.name}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {mine.map((it) => (
              <li key={it.world + it.activityId}>
                <Link to={it.href} className="kz-card flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 font-bold hover:shadow-card">
                  <span>{it.title}</span> <ArrowRight size={18} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
