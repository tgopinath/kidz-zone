import { useEffect, useState } from 'react'

/** A pixel size worked out from the window (and kept up to date on resize/rotate), e.g. how big a picture card can be. */
export function useFitSize(calc: (w: number, h: number) => number, deps: unknown[] = []): number {
  const get = () => (typeof window === 'undefined' ? 160 : Math.round(calc(window.innerWidth, window.innerHeight)))
  const [v, setV] = useState(get)
  useEffect(() => {
    const on = () => setV(get())
    on()
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return v
}

/** Bright, AA-on-white colours for big letters and numbers (alphabet cards). */
export const LETTER_COLOURS = ['#c2410c', '#1d4ed8', '#15803d', '#be185d', '#7c3aed', '#0f766e', '#b45309', '#dc2626']
export const letterColour = (ch: string) => LETTER_COLOURS[(ch.codePointAt(0) ?? 0) % LETTER_COLOURS.length]
