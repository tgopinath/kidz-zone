/**
 * One voice for every world. Android's WebView has no speechSynthesis, so inside the Android app the shell's
 * native text-to-speech plugin (@capacitor-community/text-to-speech) reads aloud instead; everywhere else the
 * browser's Web Speech API does. Speed comes from Settings (Slow / Normal / Fast).
 */
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { Capacitor } from '@capacitor/core'
import { shared, type VoiceSpeed } from './store'

export const isNativeApp = (() => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
})()

const RATE: Record<VoiceSpeed, number> = { slow: 0.7, normal: 0.9, fast: 1.05 }

/** Multiplier for a world's own preferred rate (worlds were tuned for "normal"). */
export const voiceRate = (base = RATE.normal) => (base / RATE.normal) * RATE[shared.get().settings.voice]

let voice: SpeechSynthesisVoice | null = null
function pickVoice() {
  try {
    const v = speechSynthesis.getVoices()
    voice =
      v.find((x) => x.lang === 'en-IN') ??
      v.find((x) => x.lang === 'en-US' && /samantha|google us/i.test(x.name)) ??
      v.find((x) => x.lang === 'en-US') ??
      v.find((x) => x.lang.startsWith('en')) ??
      null
  } catch {
    voice = null
  }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice()
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

export interface SayOptions {
  lang?: string
  rate?: number
  pitch?: number
}

/** Native TTS when inside the Android/iOS shell; resolves when speech ends (or fails). */
export async function speakNative(text: string, opts: SayOptions = {}) {
  try {
    await TextToSpeech.stop().catch(() => {})
    await TextToSpeech.speak({ text, lang: opts.lang ?? 'en-IN', rate: opts.rate ?? voiceRate(), pitch: opts.pitch ?? 1.05 })
  } catch {
    /* no engine */
  }
}

export function say(text: string, opts: SayOptions = {}): Promise<void> {
  if (!text) return Promise.resolve()
  if (isNativeApp) return speakNative(text, opts)
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve()
  return new Promise((resolve) => {
    try {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = opts.lang ?? 'en-IN'
      if (voice && !opts.lang) u.voice = voice
      u.rate = opts.rate ?? voiceRate()
      u.pitch = opts.pitch ?? 1.05
      u.onend = () => resolve()
      u.onerror = () => resolve()
      speechSynthesis.speak(u)
      setTimeout(resolve, 1500 + text.length * 120)
    } catch {
      resolve()
    }
  })
}

export function hush() {
  if (isNativeApp) {
    void TextToSpeech.stop().catch(() => {})
    return
  }
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* noop */
  }
}

/** Sound effects are muted by Settings → Sound; worlds call this before playing a tone. */
export const soundOn = () => shared.get().settings.sound
