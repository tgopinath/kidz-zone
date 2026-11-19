"use client";

import confetti from "canvas-confetti";
import { getProgress } from "./progress";

const COLOURS = ["#356ae6", "#ffc857", "#36b37e", "#ff8b5c", "#cdb8f5"];

export function celebrate(size: "small" | "big" = "small") {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (size === "small") {
    confetti({ particleCount: 40, spread: 60, startVelocity: 30, origin: { y: 0.7 }, colors: COLOURS, scalar: 0.9 });
    return;
  }
  const end = Date.now() + 900;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: COLOURS });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: COLOURS });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

let ctx: AudioContext | null = null;
/** Tiny synthesized sounds, so there are no audio files to load. */
export function playSound(kind: "correct" | "wrong" | "win") {
  if (typeof window === "undefined" || !getProgress().soundOn) return;
  try {
    ctx ??= new AudioContext();
    const notes = kind === "correct" ? [660, 880] : kind === "wrong" ? [300, 220] : [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = kind === "wrong" ? "triangle" : "sine";
      o.frequency.value = f;
      const t = ctx!.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch {
    /* audio not available */
  }
}
