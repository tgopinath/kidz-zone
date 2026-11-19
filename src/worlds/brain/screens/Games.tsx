import { motion } from 'framer-motion'
import { ArrowLeft, Lock, Play } from 'lucide-react'
import { Bar, Stars } from '../components/ui'
import { categoryById, gamesIn } from '../games/registry'
import { MAX_LEVEL, levelName } from '../lib/difficulty'
import { href } from '../lib/router'
import type { CategoryId } from '../types'
import { useActive } from '../store/AppContext'
import { CategoryGrid } from './Home'

export function Games() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Choose your workout</h1>
        <p className="text-muted">Eight training zones, each with several games and ten levels.</p>
      </div>
      <CategoryGrid />
    </div>
  )
}

export function Category({ id }: { id: string }) {
  const { progress } = useActive()
  const cat = categoryById(id as CategoryId)
  if (!cat) return null
  const games = gamesIn(cat.id)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6">
      <a href={href({ name: 'games' })} className="bbtn-ghost self-start !px-3 !py-2 text-sm">
        <ArrowLeft size={18} /> All categories
      </a>
      <section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${cat.gradient} p-6 text-white shadow-pop sm:p-8`}>
        <div className="absolute -right-4 -bottom-8 text-[10rem] leading-none opacity-20 select-none" aria-hidden>
          {cat.emoji}
        </div>
        <p className="font-bold text-white/80">{cat.tagline}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">{cat.title}</h1>
        <p className="mt-2 max-w-lg text-white/90">{cat.description}</p>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g, i) => {
          const unlocked = progress.unlocked[g.id] ?? 1
          const plays = progress.history.filter((r) => r.gameId === g.id)
          const bestStars = Math.max(0, ...plays.filter((r) => r.level === unlocked - 1 || r.level === unlocked).map((r) => r.stars))
          const best = Math.max(0, ...Object.entries(progress.bests).filter(([k]) => k.startsWith(`${g.id}:`)).map(([, v]) => v))
          return (
            <motion.li key={g.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="bcard flex h-full flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-3xl shadow-soft`} aria-hidden>
                    {g.emoji}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{g.title}</h2>
                    <p className="text-sm text-muted">{g.blurb}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">
                    Level {unlocked} <span className="text-muted">· {levelName(unlocked)}</span>
                  </span>
                  {plays.length > 0 && <Stars value={bestStars} size={16} />}
                </div>
                <Bar value={((unlocked - 1) / (MAX_LEVEL - 1)) * 100} color={cat.color} label={`${g.title} level progress`} />
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{plays.length ? `${plays.length} plays · best ${best}` : 'Not played yet'}</span>
                  {unlocked < MAX_LEVEL && (
                    <span className="flex items-center gap-1">
                      <Lock size={12} /> Lv {unlocked + 1}
                    </span>
                  )}
                </div>
                <a href={href({ name: 'play', id: g.id })} className="bbtn-primary mt-auto">
                  <Play size={18} className="fill-white" /> Play
                </a>
              </div>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
