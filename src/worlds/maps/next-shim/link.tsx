// Map Explorer was a Next.js app. Inside KidZ Zone it lives under /maps, so its absolute links ("/world", "/games/…")
// get that prefix here; hash links (#world) and outside links pass through.
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

export const withBase = (href: string) => (href.startsWith('/') && !href.startsWith('/maps') ? `/maps${href === '/' ? '' : href}` : href)

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string | { pathname: string }; children?: ReactNode; prefetch?: boolean; scroll?: boolean; replace?: boolean }

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, scroll: _s, replace, ...rest }, ref) {
  const h = typeof href === 'string' ? href : href.pathname
  if (/^(https?:|mailto:|tel:)/.test(h)) return <a ref={ref} href={h} {...rest} />
  const [path, hash] = h.split('#')
  if (!path) return <a ref={ref} href={`#${hash}`} {...rest} />
  return <RouterLink ref={ref} to={withBase(path) + (hash ? `#${hash}` : '')} replace={replace} {...rest} />
})
export default Link
