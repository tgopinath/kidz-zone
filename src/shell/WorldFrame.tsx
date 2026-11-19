import { ChevronLeft } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { WorldId } from '../shared/store'
import { GROUPS, worldMeta } from '../shared/worlds'
import { SoundToggle } from './Layout'
import { WorldIcon } from './ui'

export interface WorldTab {
  to: string
  label: string
  end?: boolean
}

/**
 * The shared frame every world sits in: a world bar (back to its group, name, the world's own sections,
 * sound) and the world's accent on a scope class (.w-<id>). `fill` gives full-screen worlds (the 3D shop,
 * the pet world) a box that fills the rest of the viewport.
 */
export function WorldFrame({ world, tabs, actions, fill = false, children, className = '' }: { world: WorldId; tabs?: WorldTab[]; actions?: ReactNode; fill?: boolean; children: ReactNode; className?: string }) {
  const m = worldMeta(world)
  const group = GROUPS.find((g) => g.id === m.group)!
  const box = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!fill) return
    const el = box.current
    if (!el) return
    const size = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      const bottomInset = parseFloat(getComputedStyle(document.body).paddingBottom) || 0
      el.style.height = `${Math.max(420, window.innerHeight - top - bottomInset)}px`
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(document.body)
    window.addEventListener('resize', size)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', size)
    }
  }, [fill])

  return (
    <div data-theme="light" className={`w-${world} ${className}`} style={{ ['--kz-accent' as string]: m.accent, ['--kz-soft' as string]: m.soft }}>
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
          <Link to={group.href} className="kz-web-only -ml-2 flex min-h-11 items-center gap-1 rounded-xl pr-2 pl-1 font-bold text-ink-soft hover:text-ink" aria-label={`Back to ${group.name}`}>
            <ChevronLeft size={20} aria-hidden /> {group.name}
          </Link>
          <div className="kz-web-only flex items-center gap-2">
            <WorldIcon world={world} size={16} tile />
            <span className="text-lg font-black">{m.name}</span>
          </div>
          {tabs && tabs.length > 1 && (
            <nav aria-label={`${m.name} sections`} className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] sm:ml-4">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    `flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm font-bold whitespace-nowrap transition ${isActive ? 'text-white' : 'text-ink-soft hover:bg-black/5 hover:text-ink'}`
                  }
                  style={({ isActive }) => (isActive ? { background: m.accent } : undefined)}
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <span className="kz-app-only"><SoundToggle compact /></span>
          </div>
        </div>
      </div>
      {fill ? (
        <div ref={box} className="relative overflow-hidden">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
