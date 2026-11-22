import { useEffect, type ElementType, type ReactNode } from 'react'

/* The motion kit (src/motion-kit, a copy of portfolio-agent/animations) in React.
   The kit sets itself up once on page load; screens rendered later call useMotionKit() so their data-mk elements
   are picked up too. It is idempotent: anything already set up is skipped. */
declare global {
  interface Window {
    MotionKit?: { init: (scope?: Element) => void; still: () => boolean; swap: (el: Element, change: () => void) => void }
  }
}

/** Set up the kit's effects for whatever this screen has rendered (runs after every render; cheap). */
export function useMotionKit() {
  useEffect(() => {
    window.MotionKit?.init()
  })
}

/**
 * A heading whose words rise one after another when it first appears (the kit's "words" effect).
 * React renders the word spans itself (data-mk-split tells the kit not to split the text), so changing the text
 * later works normally. Screen readers get the whole text from aria-label.
 */
export function Words({ text, as: As = 'h1', className = '', id, children }: { text: string; as?: ElementType; className?: string; id?: string; children?: ReactNode }) {
  const words = text.trim().split(/\s+/)
  return (
    <As id={id} className={className} data-mk="words" data-mk-split="1" aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true">
          {i > 0 && ' '}
          <span className="mk-w mk-piece" style={{ ['--mk-i' as string]: i }}>{w}</span>
        </span>
      ))}
      {children}
    </As>
  )
}
