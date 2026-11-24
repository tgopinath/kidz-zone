/**
 * 3D pictures for emoji: every emoji the app uses maps to a self-hosted Microsoft Fluent Emoji 3D picture
 * (MIT; public/art3d, built by tools/art3d.mjs). Emoji without a picture simply stay emoji.
 */
import { ART3D } from './art3d.generated'

const strip = (e: string) => e.replace(/️/g, '')
const LOOSE: Record<string, string> = {}
for (const [k, v] of Object.entries(ART3D)) LOOSE[strip(k)] ??= v

/** The picture file for an emoji, or null when there is none. */
export function art3dFile(emoji: string): string | null {
  return ART3D[emoji] ?? LOOSE[strip(emoji)] ?? null
}

/** URL of an emoji's 3D picture, or null. */
export function art3dUrl(emoji: string): string | null {
  const f = art3dFile(emoji)
  return f ? `/art3d/${f}.webp` : null
}

let emojiRe: RegExp | null | undefined
/** Matches one emoji (RGI sequences). null where the browser cannot (very old engines): emoji then stay as text. */
export function emojiPattern(): RegExp | null {
  if (emojiRe !== undefined) return emojiRe
  try {
    emojiRe = new RegExp('\\p{RGI_Emoji}', 'gv')
  } catch {
    try {
      emojiRe = new RegExp('\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}\\uFE0F?)*|[\\u{1F1E6}-\\u{1F1FF}]{2}', 'gu')
    } catch {
      emojiRe = null
    }
  }
  return emojiRe
}

/** Split text into plain parts and emoji parts (with their picture, if any). */
export function splitEmoji(text: string): { text: string; art: string | null }[] {
  const re = emojiPattern()
  if (!re) return [{ text, art: null }]
  const out: { text: string; art: string | null }[] = []
  let last = 0
  re.lastIndex = 0
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push({ text: text.slice(last, i), art: null })
    out.push({ text: m[0], art: art3dUrl(m[0]) })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), art: null })
  return out
}
