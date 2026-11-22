import type { CSSProperties } from 'react'
import type { WorldId } from '../shared/store'
import { worldMeta } from '../shared/worlds'

/**
 * Pictures for the shell (Home, Learn/Play/Explore, Today's mix): a small scene per world built from real artwork
 * the app already uses — Fluent Emoji 3D pictures (public/shell/art, MIT) and, for Money, the RBI specimen notes
 * and coins. All decorative: the text next to them says the same thing, so they carry alt="".
 */
export type ArtName =
  | 'apple' | 'book' | 'lion' | 'seedling' | 'sunflower' | 'bee' | 'puzzle' | 'die' | 'bulb' | 'brain' | 'trophy' | 'star'
  | 'dog' | 'cat' | 'fox' | 'globe' | 'elephant' | 'map' | 'cart' | 'milk' | 'bread' | 'fire' | 'wave' | 'sparkles' | 'party'

export const artSrc = (name: ArtName) => `/shell/art/${name}.webp`

/** The main picture of each world, then two smaller ones beside it. */
export const WORLD_ART: Record<WorldId, [ArtName, ArtName, ArtName] | null> = {
  words: ['apple', 'book', 'lion'],
  garden: ['seedling', 'sunflower', 'bee'],
  money: null, // real notes and coins, drawn below
  puzzles: ['puzzle', 'die', 'bulb'],
  brain: ['brain', 'trophy', 'star'],
  pets: ['dog', 'cat', 'fox'],
  maps: ['globe', 'elephant', 'map'],
  shop: ['cart', 'milk', 'bread'],
}

/** motion: motion-kit effects for the picture, e.g. "pop" (springy entrance) or "float" (gentle bob). */
export function Art({ name, size, className = '', style, motion }: { name: ArtName; size: number; className?: string; style?: CSSProperties; motion?: string }) {
  return <img src={artSrc(name)} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} data-mk={motion} className={`select-none ${className}`} style={{ width: size, height: size, ...style }} />
}

/** A world's main picture on its soft colour: Today's mix, lists and the Hub header. */
export function WorldBadge({ world, size = 48, done = false }: { world: WorldId; size?: number; done?: boolean }) {
  const m = worldMeta(world)
  const art = WORLD_ART[world]
  return (
    <span className="relative grid shrink-0 place-items-center rounded-2xl" style={{ width: size, height: size, background: m.soft }} aria-hidden>
      {art ? (
        <Art name={art[0]} size={Math.round(size * 0.74)} motion="pop" />
      ) : (
        <img src="/money/currency/coin-5.png" alt="" width={size} height={size} loading="lazy" data-mk="pop" className="select-none" style={{ width: size * 0.7, height: size * 0.7, objectFit: 'contain' }} />
      )}
      {done && (
        <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-success text-[11px] font-black text-white ring-2 ring-white">✓</span>
      )}
    </span>
  )
}

/** The picture header of a world card: a 16:9 scene. It shimmers until its pictures load (motion kit "skeleton")
 *  and, inside a card with the class mk-card, its pictures lift and spread on hover ("scene-main", "scene-a", "scene-b"). */
export function WorldScene({ world, className = '' }: { world: WorldId; className?: string }) {
  const m = worldMeta(world)
  const art = WORLD_ART[world]
  return (
    <div
      data-mk="skeleton"
      className={`relative aspect-[16/9] overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 110%, ${m.accent}1f, transparent 60%), radial-gradient(70% 80% at 85% 10%, #ffffffb3, transparent 70%), ${m.soft}` }}
      aria-hidden
    >
      {art ? (
        <>
          <img src={artSrc(art[0])} alt="" loading="lazy" decoding="async" draggable={false} data-mk="scene-main" className="absolute select-none" style={{ left: '14%', top: '12%', height: '78%', aspectRatio: '1', filter: `drop-shadow(0 14px 16px ${m.accent}38)` }} />
          <img src={artSrc(art[1])} alt="" loading="lazy" decoding="async" draggable={false} data-mk="scene-a" className="absolute select-none" style={{ right: '22%', top: '14%', height: '38%', aspectRatio: '1', rotate: '8deg', filter: `drop-shadow(0 8px 10px ${m.accent}30)` }} />
          <img src={artSrc(art[2])} alt="" loading="lazy" decoding="async" draggable={false} data-mk="scene-b" className="absolute select-none" style={{ right: '8%', bottom: '10%', height: '44%', aspectRatio: '1', rotate: '-6deg', filter: `drop-shadow(0 8px 10px ${m.accent}30)` }} />
        </>
      ) : (
        <>
          <img src="/money/currency/note-100.jpg" alt="" loading="lazy" decoding="async" draggable={false} data-mk="scene-main" className="absolute rounded-md select-none" style={{ left: '10%', top: '20%', width: '58%', rotate: '-7deg', boxShadow: `0 16px 24px -10px ${m.accent}66` }} />
          <img src="/money/currency/coin-5.png" alt="" loading="lazy" decoding="async" draggable={false} data-mk="scene-a" className="absolute select-none" style={{ right: '10%', top: '14%', height: '42%', aspectRatio: '1', objectFit: 'contain', filter: `drop-shadow(0 8px 10px ${m.accent}40)` }} />
          <img src="/money/currency/coin-2.png" alt="" loading="lazy" decoding="async" draggable={false} data-mk="scene-b" className="absolute select-none" style={{ right: '26%', bottom: '8%', height: '32%', aspectRatio: '1', objectFit: 'contain', filter: `drop-shadow(0 8px 10px ${m.accent}40)` }} />
        </>
      )}
    </div>
  )
}
