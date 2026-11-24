/**
 * The shared play kit's pieces: big buttons, picture cards, the round indicator, the in-round cheer, the gentle
 * "Try again!" and the end-of-game celebration with Replay. Styles in play.css; motion from the motion kit
 * (data-mk="press" / "pop") plus a few kz-* keyframes, all still under Reduce motion.
 */
import { House, RotateCcw, Star } from 'lucide-react'
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { art3dUrl } from './art'
import { cue } from './feedback'
import type { RoundPhase } from './roundFlow'

/* ---------- 3D picture ---------- */

/** An emoji drawn as its 3D picture (Fluent Emoji 3D). Falls back to the emoji itself. Decorative unless `label`. */
export function Art3D({ emoji, size, label, className = '', style }: { emoji: string; size?: number | string; label?: string; className?: string; style?: CSSProperties }) {
  const src = art3dUrl(emoji)
  const dim = size === undefined ? undefined : typeof size === 'number' ? `${size}px` : size
  const st: CSSProperties = { width: dim, height: dim, ...style }
  if (!src)
    return (
      <span className={`kz-art kz-art-emoji ${className}`} style={{ ...st, fontSize: dim ? `calc(${dim} * 0.8)` : undefined }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-no-art>
        {emoji}
      </span>
    )
  return <img src={src} alt={label ?? ''} className={`kz-art ${className}`} style={st} loading="lazy" decoding="async" draggable={false} data-no-art />
}

/* ---------- button ---------- */

type Tone = 'primary' | 'secondary' | 'success' | 'ghost'
type Size = 'md' | 'lg' | 'xl'

const btnClass = (tone: Tone, size: Size, extra = '') => `kz-btn kz-btn-${tone} kz-btn-${size} ${extra}`

/** A big, bouncy button (≥64 px; lg 80 px; xl 96 px) with a tap sound. */
export function KzButton({ tone = 'primary', size = 'lg', icon, children, onClick, disabled, className = '', type = 'button', label, autoFocus }: { tone?: Tone; size?: Size; icon?: ReactNode; children?: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: 'button' | 'submit'; label?: string; autoFocus?: boolean }) {
  return (
    <button type={type} className={btnClass(tone, size, className)} onPointerDown={() => cue('tap')} onClick={onClick} disabled={disabled} aria-label={label} data-mk="press" autoFocus={autoFocus}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  )
}

export function KzButtonLink({ to, tone = 'secondary', size = 'lg', icon, children, className = '', label }: { to: string; tone?: Tone; size?: Size; icon?: ReactNode; children?: ReactNode; className?: string; label?: string }) {
  return (
    <Link to={to} className={btnClass(tone, size, className)} onPointerDown={() => cue('tap')} aria-label={label} data-mk="press">
      {icon}
      {children && <span>{children}</span>}
    </Link>
  )
}

/* ---------- selection card ---------- */

export type CardState = 'idle' | 'selected' | 'right' | 'wrong' | 'dim'

/**
 * A picture card: the picture fills ~80% of the card, the label sits under it, the whole card is the button.
 * `emoji` draws the 3D picture; or pass your own picture as `picture` (a photo, a note, a shape).
 */
export function SelectionCard({ emoji, picture, label, hideLabel = false, state = 'idle', onClick, disabled, ariaLabel, className = '', style }: { emoji?: string; picture?: ReactNode; label?: ReactNode; hideLabel?: boolean; state?: CardState; onClick?: () => void; disabled?: boolean; ariaLabel?: string; className?: string; style?: CSSProperties }) {
  return (
    <button
      type="button"
      className={`kz-sel kz-sel-${state} ${className}`}
      onPointerDown={() => !disabled && cue('select')}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={state === 'selected' ? true : undefined}
      style={style}
    >
      <span className="kz-sel-pic">{picture ?? (emoji ? <Art3D emoji={emoji} className="kz-sel-art" /> : null)}</span>
      {label !== undefined && !hideLabel && <span className="kz-sel-label">{label}</span>}
      {state === 'right' && <span className="kz-sel-badge kz-sel-badge-right" aria-hidden><Star size={22} fill="currentColor" strokeWidth={0} /></span>}
    </button>
  )
}

/** A responsive grid for picture cards: as many columns as fit, cards as big as the screen allows. */
export function CardGrid({ children, count, className = '', min }: { children: ReactNode; count: number; className?: string; min?: string }) {
  const cols = count <= 2 ? count : count === 4 ? 2 : count <= 3 ? 3 : count <= 6 ? 3 : 4
  return (
    <div className={`kz-grid ${className}`} style={{ ['--kz-cols' as string]: cols, ['--kz-card-min' as string]: min } as CSSProperties} data-count={count}>
      {children}
    </div>
  )
}

/* ---------- round indicator ---------- */

export function RoundProgress({ round, total, done = false, className = '' }: { round: number; total: number; done?: boolean; className?: string }) {
  if (!Number.isFinite(total) || total <= 0) return null
  const finished = done ? total : round
  const dots = total <= 12
  return (
    <div className={`kz-rounds ${className}`} role="progressbar" aria-label="Rounds" aria-valuemin={0} aria-valuemax={total} aria-valuenow={finished} aria-valuetext={`Round ${Math.min(total, round + 1)} of ${total}`} data-no-announce>
      {dots ? (
        Array.from({ length: total }, (_, i) => <span key={i} className={`kz-dot ${i < finished ? 'is-done' : i === round && !done ? 'is-now' : ''}`} />)
      ) : (
        <span className="kz-rounds-bar"><span style={{ width: `${(finished / total) * 100}%` }} /></span>
      )}
      <span className="kz-rounds-text">{Math.min(total, round + 1)}/{total}</span>
    </div>
  )
}

/* ---------- in-round feedback ---------- */

const CHEERS = ['Great job!', 'Super!', 'Well done!', 'Yay!', 'Brilliant!', 'You got it!', 'Wonderful!']
const TRIES = ['Try again!', 'Almost! Try again!', 'Have another go!']

/** The cheer over the game while a round is won, and a soft "Try again!" after a miss. */
export function RoundCheer({ phase, round }: { phase: RoundPhase; round: number }) {
  const word = useMemo(() => CHEERS[(round * 7 + 3) % CHEERS.length], [round])
  const tryWord = useMemo(() => TRIES[round % TRIES.length], [round])
  return (
    <div className="kz-cheer-wrap" aria-live="polite" role="status">
      {phase === 'celebrate' && (
        <div className="kz-cheer" key={`c${round}`}>
          <Art3D emoji="🌟" className="kz-cheer-art" />
          <span>{word}</span>
        </div>
      )}
      {phase === 'retry' && (
        <div className="kz-try" key={`t${round}`}>
          <Art3D emoji="💪" className="kz-try-art" />
          <span>{tryWord}</span>
        </div>
      )}
    </div>
  )
}

/* ---------- end of game ---------- */

/** The big celebration at the end of a game: trophy, stars, Replay and Home. */
export function GameComplete({ stars = 3, title = 'You did it!', detail, onReplay, homeHref, homeLabel = 'Home', extra }: { stars?: number; title?: string; detail?: ReactNode; onReplay: () => void; homeHref?: string; homeLabel?: string; extra?: ReactNode }) {
  const actions = useRef<HTMLDivElement>(null)
  useEffect(() => {
    actions.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])
  return (
    <section className="kz-complete" aria-labelledby="kz-complete-title" data-kz-complete>
      <Art3D emoji="🏆" className="kz-complete-art" />
      <h2 id="kz-complete-title" className="kz-complete-title">{title}</h2>
      <div className="kz-complete-stars" role="img" aria-label={`${stars} of 3 stars`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`kz-cstar ${i < stars ? 'on' : ''}`} style={{ ['--i' as string]: i } as CSSProperties}>
            <Star fill="currentColor" strokeWidth={0} />
          </span>
        ))}
      </div>
      {detail && <div className="kz-complete-detail">{detail}</div>}
      <div className="kz-complete-actions" ref={actions}>
        <KzButton size="xl" icon={<RotateCcw aria-hidden />} onClick={onReplay}>
          Replay
        </KzButton>
        {homeHref && (
          <KzButtonLink to={homeHref} size="xl" tone="secondary" icon={<House aria-hidden />}>
            {homeLabel}
          </KzButtonLink>
        )}
        {extra}
      </div>
    </section>
  )
}
