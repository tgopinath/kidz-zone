import { useEffect } from 'react'
import { WorldFrame } from '../../shell/WorldFrame'
import { useShared, type AgeBand } from '../../shared/store'
import { Empty } from './components/ui'
import { gameById } from './games/registry'
import { setConfettiReduced } from './lib/confetti'
import { href, useRoute } from './lib/router'
import { GameShell } from './screens/GameShell'
import { Category, Games } from './screens/Games'
import { Home } from './screens/Home'
import { Rewards } from './screens/Rewards'
import { Stats } from './screens/Stats'
import { AppProvider, useApp } from './store/AppContext'
import type { AgeGroup } from './types'

export const BRAIN_AGE: Record<AgeBand, AgeGroup> = { '4-6': 'kids57', '7-9': 'kids810', '10-12': 'kids1112' }

/** Brain Gym keeps its own profiles; KidZ Zone keeps exactly one, mirrored from the shared child profile. */
export function useBrainProfileSync() {
  const { profile } = useShared()
  const { active, profiles, createProfile, updateProfile, switchProfile } = useApp()
  useEffect(() => {
    if (!profile) return
    if (!active) {
      if (profiles.length) switchProfile(profiles[0].profile.id)
      else createProfile({ name: profile.name, avatar: '🧠', ageGroup: BRAIN_AGE[profile.ageBand], difficulty: 'normal' })
      return
    }
    if (active.profile.name !== profile.name || active.profile.ageGroup !== BRAIN_AGE[profile.ageBand]) updateProfile({ name: profile.name, ageGroup: BRAIN_AGE[profile.ageBand] })
  }, [profile, active, profiles, createProfile, updateProfile, switchProfile])
  return active
}

function Screens() {
  const route = useRoute()
  const { settings } = useApp()
  const active = useBrainProfileSync()

  useEffect(() => setConfettiReduced(settings.reducedMotion), [settings.reducedMotion])
  if (!active) return null

  let screen
  switch (route.name) {
    case 'games':
      screen = <Games />
      break
    case 'category':
      screen = <Category id={route.id} />
      break
    case 'play': {
      const game = gameById(route.id)
      screen = game ? (
        <GameShell key={`${route.id}-${route.level}-${route.daily}`} game={game} initialLevel={route.level} daily={!!route.daily} />
      ) : (
        <Empty icon="?" title="Game not found" body="That game doesn’t exist." action={<a className="bbtn-primary" href={href({ name: 'games' })}>Browse games</a>} />
      )
      break
    }
    case 'stats':
      screen = <Stats />
      break
    case 'rewards':
      screen = <Rewards />
      break
    default:
      screen = <Home />
  }
  const playing = route.name === 'play'
  return (
    <WorldFrame
      world="brain"
      tabs={playing ? undefined : [
        { to: '/brain', label: 'Today', end: true },
        { to: '/brain/games', label: 'Games' },
        { to: '/brain/stats', label: 'Progress' },
        { to: '/brain/rewards', label: 'Rewards' },
      ]}
    >
      <div className="pt-2">{screen}</div>
    </WorldFrame>
  )
}

export default function BrainWorld() {
  return (
    <AppProvider>
      <Screens />
    </AppProvider>
  )
}
