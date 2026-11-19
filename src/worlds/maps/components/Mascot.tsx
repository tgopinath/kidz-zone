"use client";

import { useEffect, type ReactNode } from "react";
import { speak } from "@/lib/speech";

export type Mood = "happy" | "cheer" | "think" | "oops";

export const MASCOT_NAME = "Gaju";

/** Gaju, a little elephant explorer in a safari hat. */
export function Mascot({ mood = "happy", size = 96, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const trunkUp = mood === "cheer";
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden>
      {/* ears */}
      <ellipse cx="24" cy="62" rx="20" ry="24" fill="#93a8d6" />
      <ellipse cx="96" cy="62" rx="20" ry="24" fill="#93a8d6" />
      <ellipse cx="26" cy="63" rx="12" ry="15" fill="#f7bfd0" />
      <ellipse cx="94" cy="63" rx="12" ry="15" fill="#f7bfd0" />
      {/* head */}
      <ellipse cx="60" cy="64" rx="31" ry="29" fill="#b3c4ea" />
      {/* trunk */}
      {trunkUp ? (
        <path d="M60 76 C60 92 74 96 82 86 C86 81 84 74 80 74" fill="none" stroke="#b3c4ea" strokeWidth="11" strokeLinecap="round" />
      ) : (
        <path d="M60 76 C60 94 56 102 66 104 C72 105 74 100 71 97" fill="none" stroke="#b3c4ea" strokeWidth="11" strokeLinecap="round" />
      )}
      {/* cheeks */}
      <circle cx="40" cy="76" r="5" fill="#ffb3c7" opacity="0.8" />
      <circle cx="80" cy="76" r="5" fill="#ffb3c7" opacity="0.8" />
      {/* eyes */}
      {mood === "think" ? (
        <>
          <ellipse cx="47" cy="61" rx="5" ry="6" fill="#1f2a44" />
          <ellipse cx="73" cy="61" rx="5" ry="6" fill="#1f2a44" />
          <circle cx="49" cy="58" r="1.8" fill="#fff" />
          <circle cx="75" cy="58" r="1.8" fill="#fff" />
        </>
      ) : mood === "cheer" ? (
        <>
          <path d="M41 63 Q47 55 53 63" fill="none" stroke="#1f2a44" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M67 63 Q73 55 79 63" fill="none" stroke="#1f2a44" strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="47" cy="63" rx="5" ry="6" fill="#1f2a44" />
          <ellipse cx="73" cy="63" rx="5" ry="6" fill="#1f2a44" />
          <circle cx="48.8" cy="61" r="1.8" fill="#fff" />
          <circle cx="74.8" cy="61" r="1.8" fill="#fff" />
        </>
      )}
      {/* mouth */}
      {mood === "oops" ? (
        <ellipse cx="50" cy="82" rx="3" ry="3.5" fill="#1f2a44" />
      ) : mood === "cheer" ? (
        <path d="M44 80 Q50 88 54 80 Z" fill="#e5484d" />
      ) : (
        <path d="M45 80 Q50 85 54 80" fill="none" stroke="#1f2a44" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {mood === "oops" && <path d="M88 40 q4 7 0 9 q-4 -2 0 -9z" fill="#7cc4ff" />}
      {/* safari hat */}
      <ellipse cx="60" cy="40" rx="40" ry="8" fill="#d9a54e" />
      <path d="M30 40 C30 16 90 16 90 40 Z" fill="#efc57a" />
      <rect x="31" y="33" width="58" height="6" rx="3" fill="#b8792a" />
      <circle cx="60" cy="19" r="3" fill="#d9a54e" />
    </svg>
  );
}

export function MascotSays({
  mood = "happy",
  children,
  size = 84,
  className = "",
  say = false,
}: {
  mood?: Mood;
  children: ReactNode;
  size?: number;
  className?: string;
  /** read the message aloud whenever it changes */
  say?: boolean;
}) {
  const text = typeof children === "string" ? children : "";
  useEffect(() => {
    if (say && text) speak(text);
  }, [say, text]);
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <Mascot mood={mood} size={size} className="shrink-0 animate-float" />
      <div
        key={String(children)}
        className="relative mb-3 animate-pop rounded-3xl rounded-bl-md bg-white px-4 py-3 font-display text-lg font-semibold leading-snug text-ink shadow-[var(--shadow-card)]"
        role="status"
        aria-live="polite"
      >
        {children}
      </div>
    </div>
  );
}
