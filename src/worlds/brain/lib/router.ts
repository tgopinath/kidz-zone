import { useEffect, useState } from 'react'

/** Minimal hash router so the browser back button works and links can be bookmarked. */
export type Route =
  | { name: 'home' }
  | { name: 'games' }
  | { name: 'category'; id: string }
  | { name: 'play'; id: string; level?: number; daily?: boolean }
  | { name: 'stats' }
  | { name: 'rewards' }
  | { name: 'profile' }
  | { name: 'settings' }

/** Brain Gym lives under #/brain in KidZ Zone. */
export function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').replace(/^brain\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const q = new URLSearchParams(query)
  switch (parts[0]) {
    case 'games':
      return parts[1] ? { name: 'category', id: parts[1] } : { name: 'games' }
    case 'play':
      return { name: 'play', id: parts[1] ?? '', level: q.get('level') ? Number(q.get('level')) : undefined, daily: q.get('daily') === '1' }
    case 'stats':
      return { name: 'stats' }
    case 'rewards':
      return { name: 'rewards' }
    case 'profile':
      return { name: 'profile' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'home' }
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/brain'
    case 'games':
      return '#/brain/games'
    case 'category':
      return `#/brain/games/${r.id}`
    case 'play': {
      const q = new URLSearchParams()
      if (r.level) q.set('level', String(r.level))
      if (r.daily) q.set('daily', '1')
      const s = q.toString()
      return `#/brain/play/${r.id}${s ? `?${s}` : ''}`
    }
    case 'profile':
    case 'settings':
      return '#/settings'
    default:
      return `#/brain/${r.name}`
  }
}

export function go(r: Route) {
  window.location.hash = href(r)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
