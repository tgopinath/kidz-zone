import { Home as HomeIcon, Compass, BookOpen, LineChart, Puzzle, Settings } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigationType } from 'react-router-dom'
import { isImmersive, syncNative, tabOf, type TabId } from '../shared/native'
import { hush } from '../shared/speech'
import { useShared, type WorldId } from '../shared/store'
import { GROUPS, WORLDS } from '../shared/worlds'
import { Avatar } from './ui'

const NAV: { id: TabId; label: string; to: string; icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Home', to: '/', icon: HomeIcon },
  { id: 'learn', label: 'Learn', to: '/learn', icon: BookOpen },
  { id: 'play', label: 'Play', to: '/play', icon: Puzzle },
  { id: 'explore', label: 'Explore', to: '/explore', icon: Compass },
  { id: 'progress', label: 'Progress', to: '/progress', icon: LineChart },
]

/** Title and Back target for a path (native bars, document title). */
export function screenFor(path: string): { title: string; back: { href: string; label: string } | null } {
  const seg = path.split('/')[1] ?? ''
  const world = WORLDS.find((w) => w.href === `/${seg}`)
  if (world) {
    const group = GROUPS.find((g) => g.id === world.group)!
    const deep = path.replace(/\/$/, '') !== world.href
    return { title: world.name, back: deep ? { href: world.href, label: world.name } : { href: group.href, label: group.name } }
  }
  const group = GROUPS.find((g) => g.href === `/${seg}`)
  if (group) return { title: group.name, back: null }
  if (seg === 'progress') return { title: 'Progress', back: null }
  if (seg === 'settings') return { title: 'Settings', back: { href: '/progress', label: 'Progress' } }
  if (seg === 'parent') return { title: 'Grown-ups', back: { href: '/progress', label: 'Progress' } }
  return { title: 'KidZ Zone', back: null }
}

export function worldOfPath(path: string): WorldId | null {
  const seg = path.split('/')[1] ?? ''
  return WORLDS.find((w) => w.href === `/${seg}`)?.id ?? null
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="KidZ Zone home">
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#2E3A8C" />
        <path d="M9 9v14M9 16l7-7M11.5 14.5 16 23" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M19.5 10h4.5l-4.5 12h4.5" stroke="#F2C230" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="text-xl leading-none font-black tracking-tight">
        KidZ <span className="text-brand">Zone</span>
      </span>
    </Link>
  )
}

/**
 * Phone looks (Android Material 3, iPhone HIG): each screen change plays that platform's own transition on <main>.
 * Switching tabs: M3 "fade through", iOS cross-fade. Going deeper: M3 shared-axis slide, iOS push from the right.
 * Going back: the reverse. Only the class on <main> changes (no remount), so a world keeps its state; game screens
 * that own the whole screen are skipped. CSS in index.css; off with reduce motion (device or app setting).
 */
function useScreenTransition(pathname: string) {
  const ref = useRef<HTMLElement>(null)
  const prev = useRef(pathname)
  const nav = useNavigationType()
  useEffect(() => {
    const from = prev.current
    prev.current = pathname
    const el = ref.current
    const html = document.documentElement
    if (!el || from === pathname || isImmersive(pathname)) return
    if (!html.classList.contains('k-android') && !html.classList.contains('k-ios')) return
    // the tab pages (Home, Learn, Play, Explore, Progress) are level 0; a world is 1, its inner screens deeper
    const depth = (p: string) => (/^\/(learn|play|explore|progress)?$/.test(p) ? 0 : p.split('/').filter(Boolean).length)
    // depth decides (hash links, like the kits' tab bars, arrive as POP too); history direction only breaks ties
    const d0 = depth(from), d1 = depth(pathname)
    const kind = d0 === 0 && d1 === 0 ? 'tab' : d1 > d0 ? 'forward' : d1 < d0 ? 'back' : nav === 'POP' ? 'back' : 'forward'
    el.classList.remove('kz-enter-tab', 'kz-enter-forward', 'kz-enter-back')
    void el.offsetWidth // restart the animation
    el.classList.add(`kz-enter-${kind}`)
    const done = () => el.classList.remove(`kz-enter-${kind}`)
    el.addEventListener('animationend', done, { once: true })
  }, [pathname, nav])
  return ref
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const mainRef = useScreenTransition(pathname)
  const s = useShared()
  const tab = tabOf(pathname)
  const immersive = isImmersive(pathname)
  const world = worldOfPath(pathname)

  useEffect(() => {
    const sc = screenFor(pathname)
    document.title = sc.title === 'KidZ Zone' ? 'KidZ Zone' : `${sc.title} · KidZ Zone`
    syncNative({ path: pathname, ...sc })
    hush()
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="min-h-dvh" data-world={world ?? undefined}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold">
        Skip to content
      </a>
      <header className="kz-web-only sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.id}
                to={n.to}
                aria-current={tab === n.id ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold transition ${tab === n.id ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:text-ink'}`}
              >
                <n.icon size={18} aria-hidden /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/settings" className="grid size-11 place-items-center rounded-xl border border-line bg-white hover:border-ink/30" aria-label="Settings">
              <Settings size={20} aria-hidden />
            </Link>
            <Link to="/progress" className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-white py-1 pr-3 pl-1 hover:border-ink/30" aria-label={`${s.profile!.name}: my progress`}>
              <Avatar name={s.profile!.name} colour={s.profile!.avatar} size={34} />
              <span className="hidden max-w-28 truncate font-bold lg:inline">{s.profile!.name}</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main" ref={mainRef} className={immersive ? '' : 'pb-28 md:pb-12'}>
        {children}
      </main>

      {!immersive && (
        <nav className="kz-web-only fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/97 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden" aria-label="Main">
          <ul className="mx-auto flex max-w-lg justify-around px-1 pt-1">
            {NAV.map((n) => (
              <li key={n.id} className="flex-1">
                <NavLink
                  to={n.to}
                  aria-current={tab === n.id ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-bold ${tab === n.id ? 'text-brand' : 'text-ink-soft'}`}
                >
                  <span className={`grid h-7 w-14 place-items-center rounded-full ${tab === n.id ? 'bg-brand-soft' : ''}`}>
                    <n.icon size={20} aria-hidden />
                  </span>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
