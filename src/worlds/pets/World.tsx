import { useEffect } from 'react'
import { WorldFrame } from '../../shell/WorldFrame'
import { useShared } from '../../shared/store'
import PetsApp from './PetsApp'
import { useGame } from './store/game'
import './pets.scoped.css'
import './kz-overrides.css'

export default function PetsWorld() {
  const sh = useShared()
  // one profile and one Settings screen for every world
  useEffect(() => {
    const g = useGame.getState()
    if (sh.profile && g.player.name !== sh.profile.name) g.setPlayer({ name: sh.profile.name })
  }, [sh.profile])
  useEffect(() => {
    useGame.getState().setSettings({ sfx: sh.settings.sound, music: sh.settings.sound && useGame.getState().settings.music, reducedMotion: sh.settings.reducedMotion })
  }, [sh.settings.sound, sh.settings.reducedMotion])
  return (
    <WorldFrame world="pets" fill>
      <PetsApp />
    </WorldFrame>
  )
}
