import { useEffect, useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Gate } from '../../shell/Gate'
import { WorldFrame } from '../../shell/WorldFrame'
import { useShared, type AgeBand } from '../../shared/store'
import { setSoundEnabled } from './audio'
import { actions, activeChild, minutesLeftToday, playedTodaySec } from './core/db'
import type { AgeGroup, CategoryId, Difficulty } from './core/types'
import { CATEGORY_IDS } from './core/types'
import Home from './screens/Home'
import Play from './screens/Play'
import { Avatar, Toaster, useDB } from './ui/ui'
import './styles.scoped.css'
import './game.scoped.css'
import './kz-overrides.css'

export const PQ_AGE: Record<AgeBand, AgeGroup> = { '4-6': 'junior', '7-9': 'thinker', '10-12': 'master' }
const TICK = 15 // seconds of play time recorded per tick

/** Puzzle Quest had a parent account and several children; KidZ Zone keeps one child, mirrored from the shared profile. */
export function usePuzzleChild() {
  const { profile } = useShared()
  const db = useDB()
  const child = activeChild(db)
  useEffect(() => {
    if (!profile) return
    if (!db.parent) actions.signup('Grown-up', '', '')
    if (!child) {
      if (db.children.length) actions.setActive(db.children[0].id)
      else actions.addChild(profile.name, PQ_AGE[profile.ageBand], '🦊')
      return
    }
    if (child.name !== profile.name || child.ageGroup !== PQ_AGE[profile.ageBand]) actions.editChild(child.id, { name: profile.name, ageGroup: PQ_AGE[profile.ageBand] })
  }, [profile, db.parent, db.children, child])
  return child
}

function PlayRoute() {
  const { category } = useParams()
  const [q] = useSearchParams()
  const nav = useNavigate()
  const db = useDB()
  const child = activeChild(db)!
  const cat = (CATEGORY_IDS as string[]).includes(category ?? '') ? (category as CategoryId) : 'jigsaw'
  const daily = q.get('daily') === '1'
  const preview = q.get('preview') ? { difficulty: Math.min(5, Math.max(1, Number(q.get('preview')))) as Difficulty } : undefined
  return (
    <Play
      key={`${child.id}-${cat}-${daily}-${preview?.difficulty}`}
      child={child}
      category={cat}
      daily={daily}
      preview={preview}
      onExit={() => nav(preview ? '/parent/puzzles' : '/puzzles')}
    />
  )
}

function Inner() {
  const child = usePuzzleChild()
  const db = useDB()
  const nav = useNavigate()
  const sh = useShared()
  const [gate, setGate] = useState(false)
  useEffect(() => setSoundEnabled(sh.settings.sound), [sh.settings.sound])

  // Screen time: count time spent playing while the tab is visible.
  useEffect(() => {
    if (!child) return
    const t = setInterval(() => { if (!document.hidden) actions.addPlayTime(child.id, TICK) }, TICK * 1000)
    return () => clearInterval(t)
  }, [child])

  if (!child) return null
  const left = minutesLeftToday(child.id, db)
  const onBreak = left !== null && left <= 0

  if (onBreak)
    return gate ? (
      <Gate title="Give 15 more minutes?" lead="A grown-up can extend today’s puzzle time." onPass={() => { actions.grantExtraMinutes(child.id, 15); setGate(false) }} />
    ) : (
      <div className="page narrow break">
        <div className="card pad-lg col center-text" style={{ gap: 16, marginTop: '6vh' }}>
          <Avatar face={child.avatar} costume={child.costume} size={96} />
          <h1>Time for a break, {child.name}</h1>
          <p className="muted" style={{ fontSize: 18 }}>You played {Math.round(playedTodaySec(child.id, db) / 60)} minutes of puzzles today. They will be waiting for you tomorrow.</p>
          <button className="btn ghost" onClick={() => setGate(true)}>Grown-up: give 15 more minutes</button>
        </div>
      </div>
    )

  return (
    <Routes>
      <Route index element={<Home key={child.id} child={child} onPlay={(category, daily) => nav(`/puzzles/play/${category}${daily ? '?daily=1' : ''}`)} onParent={() => nav('/parent/puzzles')} />} />
      <Route path="play/:category" element={<PlayRoute />} />
      <Route path="*" element={<Home key={child.id} child={child} onPlay={(category, daily) => nav(`/puzzles/play/${category}${daily ? '?daily=1' : ''}`)} onParent={() => nav('/parent/puzzles')} />} />
    </Routes>
  )
}

export default function PuzzlesWorld() {
  return (
    <WorldFrame world="puzzles">
      <div className="app kid-bg">
        <Inner />
        <Toaster />
      </div>
    </WorldFrame>
  )
}
