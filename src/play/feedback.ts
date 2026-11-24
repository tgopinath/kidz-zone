/**
 * Feedback for every game: short synthesised sounds (no audio files), a light vibration where the device has one,
 * and confetti stars. Everything respects the app's Sound and Reduce motion settings (Settings screen) and the
 * device's reduced-motion preference.
 */
import confetti from 'canvas-confetti'
import { shared } from '../shared/store'

export type Cue = 'tap' | 'select' | 'success' | 'cheer' | 'gentle'

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) {
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, a.currentTime + at)
  g.gain.setValueAtTime(0.0001, a.currentTime + at)
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + at + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur)
  o.connect(g).connect(a.destination)
  o.start(a.currentTime + at)
  o.stop(a.currentTime + at + dur + 0.05)
}

export const soundEnabled = () => {
  try {
    return shared.get().settings.sound
  } catch {
    return true
  }
}

export const motionReduced = () => {
  try {
    if (shared.get().settings.reducedMotion) return true
  } catch {
    /* no store yet */
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Play a cue. Quiet when Sound is off. */
export function cue(c: Cue) {
  haptic(c)
  if (!soundEnabled()) return
  const a = audio()
  if (!a) return
  switch (c) {
    case 'tap':
      tone(a, 660, 0, 0.07, 'triangle', 0.06)
      break
    case 'select':
      tone(a, 520, 0, 0.08, 'triangle', 0.08)
      tone(a, 780, 0.05, 0.1, 'triangle', 0.07)
      break
    case 'success':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(a, f, i * 0.08, 0.22, 'triangle', 0.1))
      break
    case 'cheer':
      ;[523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, i * 0.1, 0.3, 'triangle', 0.1))
      tone(a, 262, 0, 0.9, 'sine', 0.05)
      break
    case 'gentle':
      tone(a, 440, 0, 0.16, 'sine', 0.08)
      tone(a, 494, 0.14, 0.2, 'sine', 0.08)
      break
  }
}

/** A short vibration on phones that support it (Android). */
export function haptic(c: Cue) {
  try {
    const pattern = c === 'success' ? [18, 40, 18] : c === 'cheer' ? [20, 50, 20, 50, 40] : c === 'gentle' ? 12 : 8
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported */
  }
}

const STAR_COLOURS = ['#ffcc33', '#ff8a3d', '#ff5c8a', '#43c6ac', '#4f8cff', '#a66bff']

/** Stars and confetti. `big` for the end of a game. No-op when motion is reduced. */
export function burst(big = false, origin?: { x: number; y: number }) {
  if (motionReduced() || typeof document === 'undefined') return
  try {
    const o = origin ?? { x: 0.5, y: 0.45 }
    void confetti({ particleCount: big ? 70 : 28, spread: big ? 100 : 70, startVelocity: big ? 42 : 30, scalar: big ? 1.4 : 1.2, shapes: ['star'], colors: STAR_COLOURS, origin: o, ticks: big ? 220 : 140, disableForReducedMotion: true, zIndex: 120 })
    if (big)
      setTimeout(() => {
        void confetti({ particleCount: 90, spread: 140, startVelocity: 36, colors: STAR_COLOURS, origin: { x: 0.5, y: 0.35 }, ticks: 240, disableForReducedMotion: true, zIndex: 120 })
      }, 250)
  } catch {
    /* canvas not available (tests) */
  }
}
