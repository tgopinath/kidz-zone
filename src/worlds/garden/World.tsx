import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WorldFrame } from '../../shell/WorldFrame'
import { hush, say, voiceRate } from '../../shared/speech'
import { record, shared } from '../../shared/store'
import { mountGarden } from './garden.js'
import './garden.scoped.css'
import './kz-overrides.css'

/**
 * Word Garden stays the original vanilla game (40 levels of cards), mounted into this route with its stylesheet
 * scoped under .w-garden. It reads the shared name, sound and voice speed, and reports every finished level.
 */
export default function GardenWorld() {
  const root = useRef<HTMLElement>(null)
  const live = useRef<HTMLParagraphElement>(null)
  const [q, setQ] = useSearchParams()
  const startLevel = Number(q.get('level')) || 0

  useEffect(() => {
    if (!root.current || !live.current) return
    const stop = mountGarden(root.current, live.current, {
      name: () => shared.get().profile?.name ?? '',
      soundOn: () => shared.get().settings.sound,
      say: (t) => void say(t, { lang: 'en-US', rate: voiceRate(0.8) }),
      hush,
      startLevel,
      onReady: ({ next, stage }) => shared.setWorldLevel('garden', next, `${stage} · level ${next}`),
      onFinish: ({ level, stars, next, stage }) => record('garden', { id: `L${level}`, title: `Word Garden level ${level}`, stars, xp: stars * 10, level: next, levelLabel: `${stage} · level ${next}` }),
    })
    if (startLevel) setQ({}, { replace: true })
    return stop
    // mount once per visit; the level param is only read on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <WorldFrame world="garden">
      <div data-theme="light">
        <section ref={root} className="wrap" id="app" aria-live="off" aria-label="Word Garden" />
        <p ref={live} className="k-sr-only" aria-live="assertive" />
      </div>
    </WorldFrame>
  )
}
