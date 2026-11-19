/** Tiny synthesized sound engine – no audio files, works offline. */
type Sfx = 'tap' | 'correct' | 'wrong' | 'flip' | 'win' | 'lose' | 'tick' | 'unlock' | 'coin'

let ctx: AudioContext | null = null
let enabled = true
let volume = 0.6
let musicTimer: number | null = null
let musicGain: GainNode | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.25, dest?: AudioNode) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain * volume + 0.0001, c.currentTime + start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(dest ?? c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

export function setSound(on: boolean, vol: number) {
  enabled = on
  volume = vol
  if (musicGain) musicGain.gain.value = 0.05 * vol
}

export function play(s: Sfx) {
  if (!enabled || volume <= 0) return
  switch (s) {
    case 'tap':
      tone(520, 0, 0.06, 'triangle', 0.12)
      break
    case 'flip':
      tone(700, 0, 0.05, 'triangle', 0.1)
      tone(900, 0.03, 0.05, 'triangle', 0.08)
      break
    case 'correct':
      tone(660, 0, 0.1, 'sine', 0.25)
      tone(990, 0.08, 0.16, 'sine', 0.22)
      break
    case 'wrong':
      tone(220, 0, 0.18, 'sawtooth', 0.12)
      tone(160, 0.1, 0.2, 'sawtooth', 0.1)
      break
    case 'tick':
      tone(1200, 0, 0.03, 'square', 0.05)
      break
    case 'coin':
      tone(988, 0, 0.08, 'square', 0.1)
      tone(1319, 0.07, 0.18, 'square', 0.1)
      break
    case 'unlock':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.2, 'triangle', 0.2))
      break
    case 'win':
      ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.22))
      break
    case 'lose':
      ;[392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.25, 'sine', 0.2))
      break
  }
}

/** Gentle pentatonic background loop. */
export function setMusic(on: boolean) {
  const c = ac()
  if (!on || !c) {
    if (musicTimer) window.clearInterval(musicTimer)
    musicTimer = null
    musicGain?.disconnect()
    musicGain = null
    return
  }
  if (musicTimer) return
  musicGain = c.createGain()
  musicGain.gain.value = 0.05 * volume
  musicGain.connect(c.destination)
  const scale = [262, 294, 330, 392, 440, 523, 587, 659]
  let step = 0
  const beat = () => {
    if (!musicGain) return
    const f = scale[(step * 3 + (step % 5)) % scale.length]
    tone(f, 0, 0.5, 'sine', 0.9, musicGain)
    if (step % 4 === 0) tone(f / 2, 0, 0.9, 'triangle', 0.7, musicGain)
    step++
  }
  beat()
  musicTimer = window.setInterval(beat, 420)
}

/** A single musical note – used for per-pad tones (e.g. Simon-style games). */
const PAD_NOTES = [262, 330, 392, 523, 659, 784]
export function playNote(index: number) {
  if (!enabled || volume <= 0) return
  tone(PAD_NOTES[index % PAD_NOTES.length], 0, 0.28, 'triangle', 0.22)
}
