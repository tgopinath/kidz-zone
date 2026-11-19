import confetti from 'canvas-confetti'

let reduced = false
export function setConfettiReduced(v: boolean) {
  reduced = v
}

export function celebrate(big = false) {
  if (reduced) return
  const colors = ['#7557F6', '#3898FF', '#FFAA45', '#35C98B', '#FF6FCF']
  confetti({ particleCount: big ? 160 : 90, spread: big ? 100 : 70, origin: { y: 0.6 }, colors, disableForReducedMotion: true })
  if (big) {
    window.setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true }), 250)
    window.setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true }), 400)
  }
}
