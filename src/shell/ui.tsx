import { BookA, Brain, IndianRupee, Map as MapIcon, PawPrint, Puzzle, ShoppingCart, Sprout, Star, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { WorldId } from '../shared/store'
import { avatarColour, initials, worldMeta } from '../shared/worlds'

export const WORLD_ICON: Record<WorldId, LucideIcon> = {
  words: BookA,
  garden: Sprout,
  money: IndianRupee,
  puzzles: Puzzle,
  brain: Brain,
  pets: PawPrint,
  maps: MapIcon,
  shop: ShoppingCart,
}

export function WorldIcon({ world, size = 22, tile = false }: { world: WorldId; size?: number; tile?: boolean }) {
  const Icon = WORLD_ICON[world]
  const m = worldMeta(world)
  if (!tile) return <Icon size={size} aria-hidden strokeWidth={1.8} />
  return (
    <span className="grid shrink-0 place-items-center rounded-xl" style={{ width: size * 2, height: size * 2, background: m.soft, color: m.accent }} aria-hidden>
      <Icon size={size} strokeWidth={1.8} />
    </span>
  )
}

export function Avatar({ name, colour, size = 40 }: { name: string; colour?: string; size?: number }) {
  const c = avatarColour(colour)
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-black"
      style={{ width: size, height: size, background: c.bg, color: c.fg, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function Stars({ n, of = 3, size = 16, label }: { n: number; of?: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (
        <Star key={i} size={size} aria-hidden className={i < n ? 'fill-[#E8A900] text-[#9A6A00]' : 'text-line'} strokeWidth={1.6} />
      ))}
    </span>
  )
}

export function Card({ children, className = '', style, as: As = 'div' }: { children: ReactNode; className?: string; style?: CSSProperties; as?: 'div' | 'section' | 'article' | 'li' }) {
  return (
    <As className={`kz-card rounded-2xl border border-line bg-white ${className}`} style={style}>
      {children}
    </As>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>
}

export function PageTitle({ eyebrow, title, lead, right }: { eyebrow?: string; title: string; lead?: string; right?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <h1 className="text-[28px] leading-9 font-black sm:text-4xl sm:leading-[44px]">{title}</h1>
        {lead && <p className="mt-1 max-w-2xl text-ink-soft">{lead}</p>}
      </div>
      {right}
    </header>
  )
}

export function ButtonLink({ to, children, tone = 'primary', className = '', style }: { to: string; children: ReactNode; tone?: 'primary' | 'outline' | 'ghost'; className?: string; style?: CSSProperties }) {
  const base = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 font-bold transition active:scale-[0.98]'
  const tones = {
    primary: 'bg-brand text-white hover:brightness-110',
    outline: 'border border-line bg-white text-ink hover:border-ink/30',
    ghost: 'text-ink hover:bg-black/5',
  }
  return (
    <Link to={to} className={`${base} ${tones[tone]} ${className}`} style={style}>
      {children}
    </Link>
  )
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-ink-soft">
        <span className="size-5 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden />
        <span className="font-bold">{label}…</span>
      </div>
    </div>
  )
}

export function ProgressBar({ value, colour = 'var(--color-brand)', label }: { value: number; colour?: string; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: colour }} />
    </div>
  )
}
