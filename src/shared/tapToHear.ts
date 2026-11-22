/**
 * Tap to hear, for the whole app (there are no speaker buttons): tapping a card reads the card, tapping a title
 * reads the title. Runs in the capture phase, before the tapped control's own handler, so a control that says
 * something richer (a word, a quiz question) simply takes over.
 *
 *   data-say="…"         read exactly this text when the element (or anything inside it) is tapped
 *   data-no-announce     leave this element alone (it speaks for itself, or should stay quiet)
 *
 * Buttons and links inside a card keep their own job and do not read the whole card; text fields never speak.
 * Maps has its own announcer for buttons and links, so there this only reads cards, titles and data-say.
 */
import { say, soundOn } from './speech'

const CARD = '.kz-card, .bcard, .card, [data-card]'
const TITLE = 'h1, h2, h3, [role=heading]'
const CONTROL = 'button, a[href], [role=button], [role=tab], summary, label'

const clean = (t: string) =>
  t
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/gu, '')
    .replace(/[→←↗·•|★]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)

/** Read a text aloud in the app's voice, if Sound is on (Settings). */
export function sayText(text: string) {
  const t = clean(text)
  if (t && soundOn()) void say(t)
}

/** The text a tap should read, or '' to stay quiet. Exported for tests. */
export function textForTap(target: EventTarget | null): string {
  if (!(target instanceof Element)) return ''
  if (target.closest('[data-no-announce], input, textarea, select, [contenteditable="true"]')) return ''
  const own = target.closest<HTMLElement>('[data-say]')
  if (own) return own.dataset.say ?? ''
  const control = target.closest(CONTROL)
  const inMaps = !!target.closest('.w-maps')
  const card = target.closest<HTMLElement>(CARD)
  const title = target.closest<HTMLElement>(TITLE)
  // a control inside the card or title keeps its own job; the card itself may be a link or a button
  const owns = (el: HTMLElement) => !control || control === el || control.contains(el)
  if (card && owns(card) && !(inMaps && control)) return card.getAttribute('aria-label') || card.innerText
  if (title && owns(title) && !(inMaps && control)) return title.getAttribute('aria-label') || title.innerText
  return ''
}

/** Install once (App): reads what a child taps. Returns a function that removes it. */
export function installTapToHear() {
  const onTap = (e: MouseEvent) => {
    const text = textForTap(e.target)
    if (text) sayText(text)
  }
  document.addEventListener('click', onTap, true)
  return () => document.removeEventListener('click', onTap, true)
}
