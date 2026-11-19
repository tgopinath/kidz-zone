import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loading } from '../../shell/ui'
import { Toaster } from './ui/ui'
import { usePuzzleChild } from './World'
import './styles.scoped.css'
import './game.scoped.css'
import './kz-overrides.css'

const Parent = lazy(() => import('./screens/Parent'))

function Inner() {
  const child = usePuzzleChild()
  const nav = useNavigate()
  if (!child) return null
  return (
    <Suspense fallback={<Loading />}>
      <Parent onExit={() => nav('/puzzles')} onPreview={(c, d) => nav(`/puzzles/play/${c}?preview=${d}`)} />
    </Suspense>
  )
}

/** Puzzle Quest's own dashboard (KPIs, 14-day charts, per-category difficulty, engine tuning), in the grown-ups area. */
export default function PuzzlesParentPanel() {
  return (
    <div className="w-puzzles">
      <div className="app">
        <Inner />
        <Toaster />
      </div>
    </div>
  )
}
