import { Component, useEffect, useState, type ReactNode } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { WorldFrame } from '../../shell/WorldFrame'
import { useShared } from '../../shared/store'
import { celebrate } from './lib/celebrate'
import { actions, BADGES, onBadgeEarned, useProgress } from './lib/progress'
import { announceTap, hasTamilVoice, speak, stopSpeaking } from './lib/speech'
import { NotFoundError } from './next-shim/navigation'
import HomePage from './app/page'
import WorldPage from './app/world/page'
import CountryPage from './app/world/[id]/page'
import ContinentPage from './app/world/continent/[slug]/page'
import ExplorePage from './app/explore/page'
import StatesPage from './app/states/page'
import StatePage from './app/states/[id]/page'
import DistrictsPage from './app/districts/page'
import DistrictPage from './app/districts/[id]/page'
import LandmarksPage from './app/landmarks/page'
import LandmarkPage from './app/landmarks/[id]/page'
import CulturesPage from './app/cultures/page'
import PuzzlesPage from './app/puzzle/page'
import PuzzlePage from './app/puzzle/[id]/page'
import QuizPage from './app/quiz/page'
import GamesPage from './app/games/page'
import ProgressPage from './app/progress/page'
import ContinentChallenge from './app/games/continent-challenge/page'
import DailyChallenge from './app/games/daily/page'
import DistrictExplorerGame from './app/games/district-explorer/page'
import FindCapital from './app/games/find-capital/page'
import FindCountry from './app/games/find-country/page'
import FoodExplorer from './app/games/food-explorer/page'
import GuessCapital from './app/games/guess-capital/page'
import IdentifyCountry from './app/games/identify-country/page'
import IdentifyState from './app/games/identify-state/page'
import LandmarkDetective from './app/games/landmark-detective/page'
import MatchFlags from './app/games/match-flags/page'
import Neighbours from './app/games/neighbours/page'
import { Mascot } from './components/Mascot'

const TABS = [
  { to: '/maps', label: 'Today', end: true },
  { to: '/maps/world', label: 'World' },
  { to: '/maps/explore', label: 'India' },
  { to: '/maps/landmarks', label: 'Landmarks' },
  { to: '/maps/cultures', label: 'Cultures' },
  { to: '/maps/games', label: 'Games' },
  { to: '/maps/progress', label: 'Passport' },
]
const INDIA_TABS = [
  { href: '/maps/explore', label: 'India map' },
  { href: '/maps/states', label: 'States' },
  { href: '/maps/districts', label: 'Districts' },
  { href: '/maps/puzzle', label: 'Puzzles' },
  { href: '/maps/quiz', label: 'Quiz' },
]

/** Map Explorer's read-aloud switch and English / Tamil voice, kept from the original app. */
function VoiceControls() {
  const p = useProgress()
  const choose = (next: 'en' | 'ta') => {
    actions.setVoiceLang(next)
    if (next === 'ta') {
      if (hasTamilVoice()) speak('வணக்கம்! இனி பெயர்களைத் தமிழில் சொல்கிறேன்.', { force: true, lang: 'ta' })
      else speak('This device has no Tamil voice, so I will keep speaking English.', { force: true })
    } else speak('Okay! I will speak in English.', { force: true })
  }
  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Voice language" className="flex rounded-xl border border-line bg-white p-0.5">
        {(['en', 'ta'] as const).map((l) => (
          <button key={l} type="button" lang={l} aria-pressed={p.voiceLang === l} aria-label={l === 'en' ? 'English voice' : 'Tamil voice'} onClick={() => choose(l)} className={`min-h-10 min-w-10 rounded-[10px] px-2 text-sm font-bold ${p.voiceLang === l ? 'bg-primary text-white' : 'text-ink-soft'}`}>
            {l === 'en' ? 'EN' : 'த'}
          </button>
        ))}
      </div>
    </div>
  )
}

class Boundary extends Component<{ children: ReactNode; path: string }, { missing: boolean }> {
  state = { missing: false }
  static getDerivedStateFromError(e: unknown) {
    if (e instanceof NotFoundError) return { missing: true }
    throw e
  }
  componentDidUpdate(prev: { path: string }) {
    if (prev.path !== this.props.path && this.state.missing) this.setState({ missing: false })
  }
  render() {
    if (this.state.missing)
      return (
        <div className="py-16 text-center">
          <h1 className="text-3xl font-black">We couldn’t find that place</h1>
          <Link to="/maps" className="mt-4 inline-block font-bold text-primary underline">Back to Maps</Link>
        </div>
      )
    return this.props.children
  }
}

export default function MapsWorld() {
  const { pathname } = useLocation()
  const sh = useShared()
  const [toast, setToast] = useState<string[] | null>(null)

  // Count learning time while the app is visible; read out whatever is tapped; celebrate badges.
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') actions.addTime(30) }, 30000)
    const onTap = (e: MouseEvent) => announceTap(e.target)
    document.addEventListener('click', onTap, true)
    const off = onBadgeEarned((ids) => {
      setToast(ids)
      celebrate('big')
      window.setTimeout(() => setToast(null), 4500)
    })
    return () => {
      window.clearInterval(id)
      document.removeEventListener('click', onTap, true)
      off()
      stopSpeaking()
    }
  }, [])
  // KidZ Zone's Sound switch also silences Map Explorer's read-aloud.
  useEffect(() => { if (!sh.settings.sound) stopSpeaking() }, [sh.settings.sound])

  const india = INDIA_TABS.some((t) => pathname === t.href || (pathname.startsWith(t.href + '/') && t.href !== '/maps/explore'))
  return (
    <WorldFrame world="maps" tabs={TABS} actions={<VoiceControls />}>
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:pt-8">
        {india && (
          <nav aria-label="Explore India" className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1">
            {INDIA_TABS.map((t) => {
              const on = pathname === t.href || pathname.startsWith(t.href + '/')
              return (
                <Link key={t.href} to={t.href} aria-current={on ? 'page' : undefined} className={`flex min-h-11 shrink-0 items-center rounded-xl px-4 font-bold ${on ? 'bg-primary text-white' : 'text-ink-soft hover:bg-primary-soft'}`}>
                  {t.label}
                </Link>
              )
            })}
          </nav>
        )}
        <Boundary path={pathname}>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="world" element={<WorldPage />} />
            <Route path="world/continent/:slug" element={<ContinentPage />} />
            <Route path="world/:id" element={<CountryPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="states" element={<StatesPage />} />
            <Route path="states/:id" element={<StatePage />} />
            <Route path="districts" element={<DistrictsPage />} />
            <Route path="districts/:id" element={<DistrictPage />} />
            <Route path="landmarks" element={<LandmarksPage />} />
            <Route path="landmarks/:id" element={<LandmarkPage />} />
            <Route path="cultures" element={<CulturesPage />} />
            <Route path="puzzle" element={<PuzzlesPage />} />
            <Route path="puzzle/:id" element={<PuzzlePage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="games/continent-challenge" element={<ContinentChallenge />} />
            <Route path="games/daily" element={<DailyChallenge />} />
            <Route path="games/district-explorer" element={<DistrictExplorerGame />} />
            <Route path="games/find-capital" element={<FindCapital />} />
            <Route path="games/find-country" element={<FindCountry />} />
            <Route path="games/food-explorer" element={<FoodExplorer />} />
            <Route path="games/guess-capital" element={<GuessCapital />} />
            <Route path="games/identify-country" element={<IdentifyCountry />} />
            <Route path="games/identify-state" element={<IdentifyState />} />
            <Route path="games/landmark-detective" element={<LandmarkDetective />} />
            <Route path="games/match-flags" element={<MatchFlags />} />
            <Route path="games/neighbours" element={<Neighbours />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Boundary>
        <p className="mt-10 border-t border-line pt-4 text-xs text-ink-soft">
          India boundaries: Government of India Local Government Directory (Dec 2023) via datameet and ramSeraph/indian_admin_boundaries (CC0). World map: Natural Earth, India point-of-view edition (public domain). Country data: mledoze/countries (ODbL). Photos: Wikimedia Commons, credited under each photo.
        </p>
      </div>
      {toast && (
        <div className="fixed inset-x-4 bottom-32 z-[60] mx-auto max-w-md animate-pop rounded-2xl border border-line bg-white p-4 shadow-pop" role="status">
          <div className="flex items-center gap-3">
            <Mascot mood="cheer" size={56} />
            <div>
              <p className="eyebrow">New badge</p>
              {toast.map((id) => (
                <p key={id} className="text-xl font-black">{BADGES.find((x) => x.id === id)!.name}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </WorldFrame>
  )
}
