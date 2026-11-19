// next/navigation on top of react-router, for Map Explorer's pages (mounted under /maps).
import { useMemo } from 'react'
import { useLocation, useNavigate, useParams as useRRParams, useSearchParams as useRRSearch } from 'react-router-dom'
import { withBase } from './link'

export function usePathname(): string {
  const { pathname } = useLocation()
  const p = pathname.replace(/^\/maps/, '')
  return p === '' ? '/' : p
}

export function useRouter() {
  const nav = useNavigate()
  return useMemo(
    () => ({
      push: (href: string) => nav(withBase(href)),
      replace: (href: string) => nav(withBase(href), { replace: true }),
      back: () => nav(-1),
      forward: () => nav(1),
      refresh: () => {},
      prefetch: () => {},
    }),
    [nav],
  )
}

export function useSearchParams() {
  return useRRSearch()[0]
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useRRParams() as T
}

export class NotFoundError extends Error {}
export function notFound(): never {
  throw new NotFoundError('not found')
}
export function redirect(href: string): never {
  window.location.hash = '#' + withBase(href)
  throw new NotFoundError('redirect')
}
