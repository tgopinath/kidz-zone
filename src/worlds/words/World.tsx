import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { WorldFrame } from '../../shell/WorldFrame'
import { BadgeToast } from './components/Celebration'
import { FindObjectGame } from './games/FindObject'
import { pronunciation } from './services/audio'
import { CategoryGallery } from './screens/CategoryGallery'
import { Explore } from './screens/Explore'
import { Favorites } from './screens/Favorites'
import { Games } from './screens/Games'
import { Home } from './screens/Home'
import { MyLearning } from './screens/MyLearning'
import { WordDetail } from './screens/WordDetail'
import { ProgressProvider, useProgress } from './state/ProgressProvider'

function Shell() {
  const loc = useLocation()
  const { state, secondsToday } = useProgress()
  const limit = state.settings.dailyLimitMin
  const overLimit = limit > 0 && secondsToday >= limit * 60

  // Stop speech on navigation (no auto-play on transitions).
  useEffect(() => { pronunciation.stop() }, [loc.pathname])
  const playing = loc.pathname.startsWith('/words/play')

  return (
    <WorldFrame
      world="words"
      tabs={playing ? undefined : [
        { to: '/words', label: 'Today', end: true },
        { to: '/words/explore', label: 'Explore' },
        { to: '/words/games', label: 'Games' },
        { to: '/words/learning', label: 'My learning' },
        { to: '/words/favorites', label: 'Favourites' },
      ]}
    >
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <Routes location={loc}>
              <Route index element={<Home />} />
              <Route path="explore" element={<Explore />} />
              <Route path="category/:catId" element={<CategoryGallery />} />
              <Route path="word/:wordId" element={<WordDetail />} />
              <Route path="play/find/:lessonId" element={<FindObjectGame />} />
              <Route path="games" element={<Games />} />
              <Route path="learning" element={<MyLearning />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      <BadgeToast />
      {overLimit && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-white p-6 text-center" role="dialog" aria-modal="true" aria-label="Break time">
          <div>
            <h1 className="font-display text-4xl font-black text-ink">Time for a break</h1>
            <p className="mt-2 text-xl text-ink-soft">You learned a lot today. See you tomorrow.</p>
            <Link to="/parent/words" className="mt-6 inline-block font-bold text-primary underline">Grown-ups</Link>
          </div>
        </div>
      )}
    </WorldFrame>
  )
}

function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-3xl font-black text-ink">This page is not here</h1>
      <Link to="/words" className="mt-4 inline-block font-bold text-primary underline">Back to Words</Link>
    </div>
  )
}

export default function WordsWorld() {
  return (
    <ProgressProvider>
      <Shell />
    </ProgressProvider>
  )
}
