"use client";

// Read-aloud for children who can't read yet, using the browser's built-in voices.
// English uses an Indian English voice; Tamil uses a ta-IN voice when the device has one.

import { getProgress } from "./progress";
import { isNativeApp, speakNative as nativeSay, hush, voiceRate } from "../../../shared/speech";
import { shared } from "../../../shared/store";

export type VoiceLang = "en" | "ta";

const cache: Partial<Record<VoiceLang, SpeechSynthesisVoice | null>> = {};

function pickVoice(lang: VoiceLang) {
  if (cache[lang] !== undefined) return cache[lang]!;
  const all = window.speechSynthesis.getVoices();
  if (!all.length) return null; // voices load async; try again next time
  cache[lang] =
    lang === "ta"
      ? all.find((v) => v.lang.toLowerCase().startsWith("ta")) ?? null
      : all.find((v) => v.lang === "en-IN") ??
        all.find((v) => v.lang.startsWith("en-") && /india|rishi|veena|heera|ravi/i.test(v.name)) ??
        all.find((v) => v.lang.startsWith("en")) ??
        null;
  return cache[lang]!;
}

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;
export const hasTamilVoice = () => isNativeApp || (speechSupported() && Boolean(pickVoice("ta")));

let last = { text: "", at: 0 };

/** Speak text now, interrupting anything already being said. Speech is kept slow and clear for young children. */
export function speak(text: string, { force = false, lang = "en" as VoiceLang, rate }: { force?: boolean; lang?: VoiceLang; rate?: number } = {}) {
  if (!text || !shared.get().settings.sound) return;
  if (!force && !getProgress().readAloud) return;
  // Android/iOS app: the shell's native text-to-speech (the Android WebView has no speechSynthesis)
  if (isNativeApp) {
    void nativeSay(text.replace(/[★⭐]/g, ""), { lang: lang === "ta" ? "ta-IN" : "en-IN", rate: voiceRate(rate ?? (lang === "ta" ? 0.75 : 0.78)) });
    return;
  }
  if (!speechSupported()) return;
  // The same words twice in a row (e.g. a tap announced, then the card saying its name) are said once.
  const now = Date.now();
  if (text === last.text && now - last.at < 1200) return;
  last = { text, at: now };
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[★⭐]/g, ""));
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.lang = v?.lang ?? (lang === "ta" ? "ta-IN" : "en-IN");
  u.rate = voiceRate(rate ?? (lang === "ta" ? 0.75 : 0.78));
  u.pitch = 1.1;
  synth.speak(u);
}

/** Speak a name or fact in the child's chosen voice language, falling back to English. */
export function speakLocal(en: string, ta?: string | null, opts: { force?: boolean } = {}) {
  if (getProgress().voiceLang === "ta" && ta && hasTamilVoice()) speak(ta, { ...opts, lang: "ta" });
  else speak(en, opts);
}

export function stopSpeaking() {
  if (isNativeApp) hush();
  else if (speechSupported()) window.speechSynthesis.cancel();
}

const clean = (t: string) =>
  t
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[→←↗·•|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

/**
 * Say what a child just tapped, slowly. Runs before the tapped control's own handler, so a
 * control that speaks something richer (a district's fact, a quiz answer) simply takes over.
 */
export function announceTap(target: EventTarget | null) {
  const el = target instanceof Element ? target.closest("button, a[href], [role=button], [role=tab], summary") : null;
  const region = target instanceof Element ? target.closest("[data-fid]") : null;
  let label = "";
  if (el && !el.closest("[data-no-announce]")) {
    label = el.getAttribute("aria-label") || el.getAttribute("title") || (el as HTMLElement).innerText || "";
  } else if (region) {
    // map regions: only tappable ones, named by their path's label (tap dots share the path's id)
    const id = region.getAttribute("data-fid");
    const path = region.closest("svg")?.querySelector(`path[data-fid="${CSS.escape(id ?? "")}"][role=button]`);
    label = path?.getAttribute("aria-label") ?? "";
  }
  label = clean(label);
  if (label) speak(label, { rate: 0.7 });
}

/** Read several lines in order with a short pause between them (e.g. a title, then its description). */
export function speakLines(lines: string[], { force = false } = {}) {
  if (!speechSupported() || !lines.length) return;
  if (!force && !getProgress().readAloud) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  last = { text: "", at: 0 };
  const v = pickVoice("en");
  lines.filter(Boolean).forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(clean(text));
    if (v) u.voice = v;
    u.lang = v?.lang ?? "en-IN";
    u.rate = 0.75;
    u.pitch = 1.1;
    if (i > 0) {
      // a short silent beat between lines
      const gap = new SpeechSynthesisUtterance(" ");
      gap.volume = 0;
      gap.rate = 0.5;
      synth.speak(gap);
    }
    synth.speak(u);
  });
}

/** Find a device voice for a language tag such as "ja-JP" (exact, then same language). */
export function voiceFor(tag: string) {
  if (!speechSupported()) return null;
  const all = window.speechSynthesis.getVoices();
  const base = tag.split("-")[0].toLowerCase();
  return all.find((v) => v.lang.toLowerCase() === tag.toLowerCase()) ?? all.find((v) => v.lang.toLowerCase().startsWith(base)) ?? null;
}

/**
 * Say a word in its own language (e.g. こんにちは with a Japanese voice). If the device has no
 * voice for that language, the English voice says the romanised word instead.
 */
export function speakNative(native: string, romanised: string, tag: string) {
  if (!speechSupported()) return false;
  const v = voiceFor(tag);
  const synth = window.speechSynthesis;
  synth.cancel();
  last = { text: "", at: 0 };
  const u = new SpeechSynthesisUtterance(v ? native : romanised);
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  } else {
    const en = pickVoice("en");
    if (en) u.voice = en;
    u.lang = en?.lang ?? "en-IN";
  }
  u.rate = 0.7;
  synth.speak(u);
  return Boolean(v);
}
