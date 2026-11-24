import { MotionConfig } from 'framer-motion'
import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useFirstRunImport } from './shared/import'
import { useShared } from './shared/store'
import { installTapToHear } from './shared/tapToHear'
import { installArtify } from './play/artify'
import { Layout } from './shell/Layout'
import { Hub } from './shell/Hub'
import { Home } from './shell/Home'
import { Onboarding } from './shell/Onboarding'
import { ProgressScreen } from './shell/Progress'
import { SettingsScreen } from './shell/Settings'
import { Loading } from './shell/ui'

// Every world is its own chunk, so Home loads fast and the 3D supermarket's code only loads in the Shop.
const WordsWorld = lazy(() => import('./worlds/words/World'))
const GardenWorld = lazy(() => import('./worlds/garden/World'))
const MoneyWorld = lazy(() => import('./worlds/money/World'))
const PuzzlesWorld = lazy(() => import('./worlds/puzzles/World'))
const BrainWorld = lazy(() => import('./worlds/brain/World'))
const PetsWorld = lazy(() => import('./worlds/pets/World'))
const MapsWorld = lazy(() => import('./worlds/maps/World'))
const ShopWorld = lazy(() => import('./worlds/shop/World'))
const ParentArea = lazy(() => import('./shell/Parent'))

function Screens() {
  const s = useShared()
  const loc = useLocation()
  useFirstRunImport()
  useEffect(() => installTapToHear(), []) // tap a card or a title to hear it (no speaker buttons)
  useEffect(() => installArtify(document.body), []) // every emoji becomes its 3D picture (src/play/artify.ts)
  useEffect(() => {
    // a grown-up signed in on this device before: restore the session so progress keeps saving to their account
    try {
      if (localStorage.getItem('kidzzone:cloud') === '1') void import('./shared/cloud').then((m) => m.resumeCloud())
    } catch {
      /* storage blocked */
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('reduce-motion', s.settings.reducedMotion)
    html.classList.toggle('mk-still', s.settings.reducedMotion) // motion kit: the app's own Reduce motion switch
    html.dataset.text = s.settings.textSize
  }, [s.settings.reducedMotion, s.settings.textSize])
  useEffect(() => {
    document.documentElement.classList.toggle('kz-onboarding', !s.profile)
  }, [s.profile])

  if (!s.profile) return <Onboarding />

  return (
    <MotionConfig reducedMotion={s.settings.reducedMotion ? 'always' : 'user'}>
      <Layout>
        <Suspense fallback={<Loading />}>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Hub group="learn" />} />
            <Route path="/play" element={<Hub group="play" />} />
            <Route path="/explore" element={<Hub group="explore" />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/parent/*" element={<ParentArea />} />
            <Route path="/words/*" element={<WordsWorld />} />
            <Route path="/garden" element={<GardenWorld />} />
            <Route path="/money" element={<MoneyWorld />} />
            <Route path="/puzzles/*" element={<PuzzlesWorld />} />
            <Route path="/brain/*" element={<BrainWorld />} />
            <Route path="/pets" element={<PetsWorld />} />
            <Route path="/maps/*" element={<MapsWorld />} />
            <Route path="/shop" element={<ShopWorld />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </MotionConfig>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Screens />
    </HashRouter>
  )
}
