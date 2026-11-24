/**
 * Swaps emoji for their 3D pictures across the whole app, including worlds that are not React (Word Garden) —
 * the same idea as Twemoji's parse(), made safe for React:
 *
 * - React keeps its own text node: we only shorten its text to the part before the first emoji and put our
 *   pictures and the rest of the text right after it (nodes React does not know about).
 * - When React changes that text (characterData) or removes the node, a MutationObserver throws our nodes away
 *   and, for a change, builds them again. When React resets an element's textContent our nodes go with it.
 * - Never inside SVG, form fields, <option>, editable text or anything marked data-no-art.
 *
 * The picture's alt is the emoji itself, so screen readers still say "red apple" where they did before.
 */
import { splitEmoji, emojiPattern } from './art'

type Marked = Text & { __kzSrc?: string; __kzShown?: string; __kzAfter?: Node[] }
const OWN = '__kzOwn'
const SKIP = 'svg, input, textarea, select, option, script, style, noscript, title, [contenteditable="true"], [data-no-art], canvas'

function isOwn(n: Node) {
  return (n as unknown as Record<string, unknown>)[OWN] === true
}

function dropAfter(t: Marked) {
  for (const n of t.__kzAfter ?? []) n.parentNode?.removeChild(n)
  t.__kzAfter = undefined
}

function picture(src: string, emoji: string): HTMLImageElement {
  const img = document.createElement('img')
  img.src = src
  img.alt = emoji
  img.className = 'kz-e3d'
  img.draggable = false
  img.decoding = 'async'
  img.loading = 'lazy'
  ;(img as unknown as Record<string, unknown>)[OWN] = true
  // a picture that fails to load turns back into the emoji
  img.onerror = () => {
    const t = document.createTextNode(emoji)
    ;(t as unknown as Record<string, unknown>)[OWN] = true
    img.replaceWith(t)
  }
  return img
}

function processText(t: Marked, force = false) {
  const parent = t.parentElement
  if (!parent || isOwn(t)) return
  const value = t.nodeValue ?? ''
  if (!force && t.__kzShown !== undefined && value === t.__kzShown) return // already done
  if (t.__kzAfter) dropAfter(t)
  t.__kzSrc = value
  t.__kzShown = undefined
  if (!value || parent.closest(SKIP)) return
  const re = emojiPattern()
  if (!re) return
  re.lastIndex = 0
  if (!re.test(value)) return
  const parts = splitEmoji(value)
  if (!parts.some((p) => p.art)) return
  // first plain part stays in React's node, the rest goes after it
  let i = 0
  let head = ''
  if (!parts[0].art) {
    head = parts[0].text
    i = 1
  }
  const after: Node[] = []
  for (; i < parts.length; i++) {
    const p = parts[i]
    let n: Node
    if (p.art) n = picture(p.art, p.text)
    else {
      n = document.createTextNode(p.text)
      ;(n as unknown as Record<string, unknown>)[OWN] = true
    }
    after.push(n)
  }
  t.__kzShown = head
  t.nodeValue = head
  const ref = t.nextSibling
  for (const n of after) parent.insertBefore(n, ref)
  t.__kzAfter = after
  parent.classList.add('kz-has-art')
  // just a picture (no words next to it): draw it bigger, and let a square card's picture fill the card
  const onlyArt = !head.trim() && parts.every((p) => p.art || !p.text.trim()) && [...parent.childNodes].every((n) => n === t || after.includes(n) || (n.nodeType === Node.TEXT_NODE && !(n.nodeValue ?? '').trim()))
  if (onlyArt) {
    parent.classList.add('kz-art-only')
    const host = parent.closest<HTMLElement>('button, [role="button"], .btile, [data-card]')
    if (host && (host === parent || host.contains(parent))) queueFill(host)
  }
}

const fillQueue = new Set<HTMLElement>()
let fillFrame = 0
/** A square-ish card or tile that only holds a picture gets class kz-fill (picture ~75% of the card). */
function queueFill(el: HTMLElement) {
  fillQueue.add(el)
  if (fillFrame) return
  fillFrame = requestAnimationFrame(() => {
    fillFrame = 0
    fillQueue.forEach((h) => {
      if (!h.isConnected || h.closest('[data-no-fill]')) return
      const r = h.getBoundingClientRect()
      const words = (h.innerText || '').replace(/\s+/g, '').length
      if (!(r.width >= 72 && r.height >= 72 && Math.abs(r.width - r.height) / Math.max(r.width, r.height) < 0.22 && words <= 2)) return
      // only where the card's width comes from its box, not from its picture (else the picture would size itself)
      const cs = getComputedStyle(h)
      const parentGrid = h.parentElement ? getComputedStyle(h.parentElement).display.includes('grid') : false
      if (cs.aspectRatio !== 'auto' || parentGrid) h.classList.add('kz-fill')
    })
    fillQueue.clear()
  })
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return processText(root as Marked)
  if (root.nodeType !== Node.ELEMENT_NODE) return
  const el = root as Element
  if (el.closest(SKIP)) return
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const list: Marked[] = []
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (!isOwn(n)) list.push(n as Marked)
  list.forEach((n) => processText(n))
}

let observer: MutationObserver | null = null

/** Start swapping emoji inside `root` (the app's body). Returns a stop function. */
export function installArtify(root: Element = document.body): () => void {
  if (observer || typeof MutationObserver === 'undefined' || !emojiPattern()) return () => {}
  walk(root)
  observer = new MutationObserver((records) => {
    const touched = new Set<Node>()
    const changed = new Set<Marked>()
    for (const r of records) {
      if (r.type === 'characterData') {
        const t = r.target as Marked
        if (isOwn(t)) continue
        // our own shortening writes src -> shown; anything else is React (or a world) changing the text
        if (!(t.__kzShown !== undefined && r.oldValue === t.__kzSrc && t.nodeValue === t.__kzShown)) changed.add(t)
      } else {
        r.removedNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE && (n as Marked).__kzAfter) dropAfter(n as Marked)
        })
        r.addedNodes.forEach((n) => {
          if (!isOwn(n)) touched.add(n)
        })
      }
    }
    changed.forEach((t) => {
      if (t.isConnected) processText(t, true)
      else dropAfter(t)
    })
    touched.forEach((n) => {
      if (n.isConnected) walk(n)
    })
  })
  observer.observe(root, { subtree: true, childList: true, characterData: true, characterDataOldValue: true })
  return () => {
    observer?.disconnect()
    observer = null
  }
}
