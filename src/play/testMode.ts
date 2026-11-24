/**
 * Test mode (?kztest=1, used only by tools/playall.mjs): marks the right answer with data-kz-answer and exposes
 * window.__kzAnswer() / window.__kzFinish() so a headless browser can play every game start to finish.
 * Off for everyone else: nothing is marked and nothing is exposed.
 */
export const KZTEST = typeof location !== 'undefined' && /[?&]kztest=1\b/.test(location.search)

/** Spread onto the right answer's element: {...answerMark(isRight)} */
export const answerMark = (right: boolean): Record<string, string> => (KZTEST && right ? { 'data-kz-answer': '' } : {})

type W = Window & { __kzAnswer?: () => void; __kzFinish?: () => void }

/** Let the test player answer this round correctly (for maps, drags and spelling). Returns a cleanup. */
export function exposeAnswer(fn: (() => void) | null): () => void {
  if (!KZTEST || typeof window === 'undefined') return () => {}
  ;(window as W).__kzAnswer = fn ?? undefined
  return () => {
    if ((window as W).__kzAnswer === fn) (window as W).__kzAnswer = undefined
  }
}

/** Let the test player finish a puzzle-type game it cannot solve by tapping. Returns a cleanup. */
export function exposeFinish(fn: (() => void) | null): () => void {
  if (!KZTEST || typeof window === 'undefined') return () => {}
  ;(window as W).__kzFinish = fn ?? undefined
  return () => {
    if ((window as W).__kzFinish === fn) (window as W).__kzFinish = undefined
  }
}
