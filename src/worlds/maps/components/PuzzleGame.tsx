"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Clock, Lightbulb, Lock, RotateCcw, Shuffle, Timer } from "lucide-react";
import MapView, { type RegionMark } from "./MapView";
import { MascotSays, type Mood } from "./Mascot";
import { Button, Card, DataStatusBadge, Loading, SpeakButton, Stars } from "./ui";
import { getDistricts, getState, shuffle, STATES } from "@/lib/content";
import { DISTRICT_FILLS, STATE_FILLS, useDistrictMap, useIndiaMap, useWorldMap, type RegionFeature } from "@/lib/geo";
import { continentBySlug, CONTINENT_BOX, COUNTRIES } from "@/lib/world";
import { actions, starsFor, unlocks, useProgress, type PuzzleLevel } from "@/lib/progress";
import { celebrate, playSound } from "@/lib/celebrate";
import { GameComplete, KzButton } from "../../../play/ui";
import { speakLocal } from "@/lib/speech";

const LEVELS: Record<PuzzleLevel, { label: string; cards: number; hints: number; timer: "optional" | "on"; blurb: string }> = {
  easy: { label: "Easy", cards: 8, hints: 5, timer: "optional", blurb: "Place 8 names. The rest are already on the map." },
  medium: { label: "Medium", cards: 16, hints: 3, timer: "optional", blurb: "Place 16 names with 3 hints." },
  hard: { label: "Hard", cards: Infinity, hints: 1, timer: "on", blurb: "Place every name against the clock. 1 hint." },
};
const HAND = 6;
// Clock and dice live outside the component: they're only used from event handlers.
const nowMs = () => Date.now();
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

type Phase = "setup" | "play" | "done";
interface Result { score: number; stars: number; timeSec: number; firstTry: number; total: number; hints: number }

/** mapKey is "india" (arrange the states), "world-<continent>" (its countries) or a state id (its districts). */
export default function PuzzleGame({ mapKey }: { mapKey: string }) {
  const isIndia = mapKey === "india";
  const cont = mapKey.startsWith("world-") ? continentBySlug(mapKey.slice(6)) : undefined;
  const isWorld = Boolean(cont);
  const india = useIndiaMap();
  const dist = useDistrictMap(isIndia || isWorld ? null : mapKey);
  const world = useWorldMap(isWorld);
  const worldFeatures = useMemo(() => {
    if (!cont || !world.features) return null;
    const ids = new Set(COUNTRIES.filter((c) => c.continent === cont.id).map((c) => c.id));
    return world.features.filter((f) => ids.has(f.properties.id));
  }, [cont, world.features]);
  const { features, error } = isIndia ? india : isWorld ? { features: worldFeatures, error: world.error } : dist;
  const state = isIndia || isWorld ? null : getState(mapKey)!;
  const view = cont ? CONTINENT_BOX[cont.id] : undefined;
  const title = isIndia ? "Arrange the States" : cont ? `${cont.id} Puzzle` : `${state!.name} District Challenge`;
  const what = isIndia ? "state" : isWorld ? "country" : "district";

  const names = useMemo(() => {
    const m = new Map<string, string>();
    if (isIndia) STATES.forEach((s) => m.set(s.id, s.name));
    else if (cont) COUNTRIES.filter((c) => c.continent === cont.id).forEach((c) => m.set(c.id, c.name));
    else getDistricts(mapKey).forEach((d) => m.set(d.id, d.name));
    return m;
  }, [isIndia, cont, mapKey]);

  const taNames = useMemo(() => {
    const m = new Map<string, string>();
    if (isIndia) STATES.forEach((s) => s.ta && m.set(s.id, s.ta.name));
    else if (!cont) getDistricts(mapKey).forEach((d) => d.ta && m.set(d.id, d.ta.name));
    return m;
  }, [isIndia, cont, mapKey]);
  const sayName = (id: string) => speakLocal(names.get(id) ?? "", taNames.get(id));

  const p = useProgress();
  const [phase, setPhase] = useState<Phase>("setup");
  const [level, setLevel] = useState<PuzzleLevel>("easy");
  const [timerOn, setTimerOn] = useState(false);
  const [deck, setDeck] = useState<string[]>([]); // cards still to place, in order
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [hinted, setHinted] = useState<Set<string>>(new Set());
  const [hintsLeft, setHintsLeft] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; mark: RegionMark } | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [say, setSay] = useState<{ mood: Mood; text: string }>({ mood: "happy", text: "" });
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStart = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);

  const featById = useMemo(() => new Map((features ?? []).map((f) => [f.properties.id, f])), [features]);

  useEffect(() => {
    if (phase !== "play" || !timerOn) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [phase, timerOn]);

  const start = (lv: PuzzleLevel = level) => {
    if (!features) return;
    const all = shuffle(features.map((f) => f.properties.id));
    const n = Math.min(all.length, LEVELS[lv].cards);
    // On small maps place everything; otherwise prefill the rest so the child has landmarks.
    const toPlace = all.length <= 8 ? all : all.slice(0, n);
    const pre = new Set(all.filter((id) => !toPlace.includes(id)));
    setLevel(lv);
    setDeck(toPlace);
    setPrefilled(pre);
    setPlaced(new Set());
    setWrong({});
    setHinted(new Set());
    setHintsLeft(LEVELS[lv].hints);
    setActive(null);
    setHintId(null);
    setResult(null);
    if (LEVELS[lv].timer === "on") setTimerOn(true);
    setStartAt(Date.now());
    setNow(Date.now());
    setSay({ mood: "happy", text: `Drag each ${what} name to its place on the map — or tap a name, then tap the map.` });
    setPhase("play");
  };

  const elapsed = Math.max(0, Math.round(((phase === "done" ? result?.timeSec ?? 0 : (now - startAt) / 1000))));

  const finish = (placedNow: Set<string>, wrongNow: Record<string, number>, hintedNow: Set<string>) => {
    const timeSec = Math.round((nowMs() - startAt) / 1000);
    const cards = [...placedNow];
    let score = 0;
    let firstTry = 0;
    for (const id of cards) {
      const w = wrongNow[id] ?? 0;
      if (!w && !hintedNow.has(id)) firstTry++;
      score += Math.max(10, 100 - 30 * w - (hintedNow.has(id) ? 40 : 0));
    }
    const maxScore = cards.length * 100;
    const ratio = score / maxScore;
    if (timerOn) score += Math.max(0, cards.length * 12 - timeSec) * 2;
    const stars = starsFor(ratio);
    const r = { score, stars, timeSec, firstTry, total: cards.length, hints: hintedNow.size };
    setResult(r);
    setPhase("done");
    actions.finishPuzzle(mapKey, level, score, stars, timerOn ? timeSec : null);
    playSound("win");
    celebrate("big");
  };

  const direction = (target: RegionFeature, dropped: RegionFeature) => {
    const dy = target.properties.ly - dropped.properties.ly;
    const dx = target.properties.lx - dropped.properties.lx;
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    const ns = Math.abs(dy) > m * 0.4 ? (dy > 0 ? "north" : "south") : "";
    const ew = Math.abs(dx) > m * 0.4 ? (dx > 0 ? "east" : "west") : "";
    return [ns, ew].filter(Boolean).join("-");
  };

  const tryPlace = (card: string, regionId: string | null) => {
    if (!regionId || phase !== "play") return;
    const key = isIndia ? `state:${card}` : isWorld ? `country:${card}` : `district:${mapKey}:${card}`;
    if (regionId === card) {
      const nextPlaced = new Set(placed).add(card);
      setPlaced(nextPlaced);
      setDeck((d) => d.filter((x) => x !== card));
      setActive(null);
      setHintId(null);
      setFlash({ id: card, mark: "correct" });
      window.setTimeout(() => setFlash(null), 600);
      actions.answer(key, true);
      playSound("correct");
      const left = deck.length - 1;
      const cheers = ["Brilliant!", "Spot on!", "You got it!", "Super explorer!", "Yes!"];
      setSay({ mood: "cheer", text: `${pick(cheers)} That's ${names.get(card)}.${left ? ` ${left} to go!` : ""}` });
      if (left === 0) finish(nextPlaced, wrong, hinted);
      return;
    }
    if (placed.has(regionId) || prefilled.has(regionId)) {
      setSay({ mood: "think", text: `That spot is already ${names.get(regionId)}. Try another place!` });
      return;
    }
    const nextWrong = { ...wrong, [card]: (wrong[card] ?? 0) + 1 };
    setWrong(nextWrong);
    actions.answer(key, false);
    playSound("wrong");
    setFlash({ id: regionId, mark: "wrong" });
    window.setTimeout(() => setFlash(null), 700);
    setShakeId(card);
    window.setTimeout(() => setShakeId(null), 450);
    const t = featById.get(card), d = featById.get(regionId);
    const dir = t && d ? direction(t, d) : "";
    setSay({
      mood: "oops",
      text: nextWrong[card] >= 2 && dir
        ? `Not quite! ${names.get(card)} is to the ${dir} of there. You can use a hint too!`
        : `Oops, that's not ${names.get(card)}. ${dir ? `Try a little to the ${dir}!` : "Try again!"}`,
    });
  };

  const giveHint = () => {
    const card = active ?? deck[0];
    if (!card || hintsLeft <= 0) return;
    setActive(card);
    setHintsLeft((h) => h - 1);
    setHinted((h) => new Set(h).add(card));
    setHintId(card);
    setSay({ mood: "think", text: `Look for the glowing ${what} — that's where ${names.get(card)} goes!` });
  };

  // Pointer-based drag so it works the same with mouse, pen and touch.
  const onCardDown = (e: RPointerEvent<HTMLButtonElement>, id: string) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    dragStart.current = { id, x: e.clientX, y: e.clientY, moved: false };
  };
  const onCardMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) {
      s.moved = true;
      sayName(s.id);
    }
    if (s.moved) setDrag({ id: s.id, x: e.clientX, y: e.clientY });
  };
  const onCardUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    dragStart.current = null;
    setDrag(null);
    if (!s) return;
    if (!s.moved) {
      if (active !== s.id) sayName(s.id);
      setActive((a) => (a === s.id ? null : s.id));
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const fid = (el?.closest("[data-fid]") as HTMLElement | SVGElement | null)?.dataset.fid ?? null;
    tryPlace(s.id, fid);
  };

  if (error) return <Card>Couldn&apos;t load this map.</Card>;
  if (!features) return <Loading />;

  const marks: Record<string, RegionMark | undefined> = {};
  if (phase !== "setup") features.forEach((f) => {
    const id = f.properties.id;
    if (!placed.has(id) && !prefilled.has(id)) marks[id] = "blank";
  });
  if (hintId) marks[hintId] = "hint";
  if (flash) marks[flash.id] = flash.mark;

  const fills = isIndia || isWorld ? STATE_FILLS : DISTRICT_FILLS;
  const fillFor = (f: RegionFeature) => {
    const c = fills[f.properties.c];
    if (phase === "setup") return c;
    return prefilled.has(f.properties.id) ? `${c}99` : c;
  };
  const hand = deck.slice(0, HAND);
  const totalCards = deck.length + placed.size;

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <MapView
          features={features}
          fillFor={fillFor}
          labelMode="none"
          nameFor={(f) => names.get(f.properties.id) ?? ""}
          ariaLabel={`${title} map`}
          box={view?.box}
          rotate={view?.rotate}
          zoomable={false}
          maxHeight="70vh"
        />
        <Card className="space-y-4 self-start">
          <MascotSays mood="cheer">Ready for the {title}? Pick a level!</MascotSays>
          {state && state.dataStatus !== "verified" && <DataStatusBadge status={state.dataStatus} issues={state.issues} />}
          <div className="space-y-2">
            {(Object.keys(LEVELS) as PuzzleLevel[]).map((lv) => {
              const open = unlocks.puzzle(p, mapKey, lv);
              const rec = p.puzzles[`${mapKey}:${lv}`];
              return (
                <button
                  key={lv}
                  type="button"
                  disabled={!open}
                  onClick={() => setLevel(lv)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                    level === lv ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary/40"
                  } disabled:opacity-50`}
                >
                  <div className="flex-1">
                    <p className="font-display text-xl font-bold">
                      {LEVELS[lv].label}
                    </p>
                    <p className="text-sm text-ink-soft">{open ? LEVELS[lv].blurb.replace("16", String(Math.min(16, features.length))).replace("8 names", `${Math.min(8, features.length)} names`) : `Finish ${lv === "medium" ? "Easy" : "Medium"} to unlock`}</p>
                  </div>
                  {open ? <Stars count={rec?.stars ?? 0} size="size-5" /> : <Lock className="size-5 text-ink-soft" />}
                </button>
              );
            })}
          </div>
          <label className={`flex items-center justify-between rounded-2xl bg-bg p-3 ${LEVELS[level].timer === "on" ? "opacity-60" : ""}`}>
            <span className="flex items-center gap-2 font-display text-lg font-semibold">
              <Timer className="size-5 text-accent" /> Timer mode {LEVELS[level].timer === "on" && "(always on)"}
            </span>
            <input
              type="checkbox"
              className="size-6 accent-primary"
              checked={LEVELS[level].timer === "on" || timerOn}
              disabled={LEVELS[level].timer === "on"}
              onChange={(e) => setTimerOn(e.target.checked)}
            />
          </label>
          <Button className="w-full" onClick={() => start()}>
            Start puzzle
          </Button>
        </Card>
      </div>
    );
  }

  // ---------- Play / Done ----------
  return (
    <div className={`space-y-4 ${phase === "play" ? "pb-36 lg:pb-0" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white px-4 py-2 font-display font-bold shadow-[var(--shadow-card)]">
          {LEVELS[level].label} · {placed.size}/{totalCards} placed
        </span>
        {timerOn && (
          <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-display font-bold shadow-[var(--shadow-card)]">
            <Clock className="size-4 text-accent" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button tone="secondary" onClick={giveHint} disabled={phase !== "play" || hintsLeft <= 0}>
            <Lightbulb className="size-5" /> Hint ({hintsLeft})
          </Button>
          <Button tone="white" onClick={() => start(level)} aria-label="Restart">
            <RotateCcw className="size-5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          <MapView
            features={features}
            fillFor={fillFor}
            marks={marks}
            onSelect={active ? (id) => tryPlace(active, id) : undefined}
            labelFor={(f) => (placed.has(f.properties.id) || prefilled.has(f.properties.id) ? names.get(f.properties.id) ?? null : null)}
            nameFor={(f) => (placed.has(f.properties.id) || prefilled.has(f.properties.id) ? names.get(f.properties.id)! : `Empty ${what}`)}
            ariaLabel={`${title} map`}
            box={view?.box}
            rotate={view?.rotate}
            maxHeight="72vh"
          />
          <p className="mt-2 text-sm text-ink-soft">Tiny places have a dot. Zoom in with + if a {what} is hard to reach.</p>
        </div>

        <div className="order-1 space-y-3 lg:order-2">
          {phase === "play" && (
            <>
              <MascotSays say mood={say.mood} size={64} className="[&_div[role=status]]:text-base lg:[&_div[role=status]]:text-lg">{say.text}</MascotSays>
              {/* On phones the tray docks above the bottom nav so the map and cards are both in view. */}
              <Card className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 rounded-b-none rounded-t-3xl p-2 shadow-[0_-8px_24px_-12px_rgba(31,42,68,0.3)] lg:static lg:rounded-[var(--radius-card)] lg:p-3 lg:shadow-[var(--shadow-card)]">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="font-display font-bold text-ink-soft">Name cards</p>
                  <p className="flex items-center gap-1 text-sm text-ink-soft">
                    <Shuffle className="size-4" /> {Math.max(0, deck.length - hand.length)} more waiting
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-2 lg:gap-2">
                  {hand.map((id) => (
                    <div key={id} className="relative">
                    <button
                      type="button"
                      onPointerDown={(e) => onCardDown(e, id)}
                      onPointerMove={onCardMove}
                      onPointerUp={onCardUp}
                      onPointerCancel={() => { dragStart.current = null; setDrag(null); }}
                      style={{ touchAction: "none" }}
                      className={`min-h-12 w-full cursor-grab select-none rounded-2xl border-2 py-1.5 pl-2 pr-8 font-display text-[15px] font-bold leading-tight lg:min-h-14 lg:pl-3 lg:pr-9 lg:py-2 lg:text-[17px] transition active:cursor-grabbing ${
                        active === id ? "border-primary bg-primary text-white" : "border-line bg-white hover:border-primary/50"
                      } ${shakeId === id ? "animate-shake border-danger" : ""} ${drag?.id === id ? "opacity-30" : ""}`}
                      aria-pressed={active === id}
                    >
                      {names.get(id)}
                    </button>
                    <SpeakButton label={`Hear ${names.get(id)}`} onSpeak={() => speakLocal(names.get(id) ?? "", taNames.get(id), { force: true })} />
                    </div>
                  ))}
                </div>
                {active && <p className="mt-2 px-1 text-sm font-semibold text-primary">Now tap where {names.get(active)} goes on the map.</p>}
              </Card>
            </>
          )}

          {phase === "done" && result && (
            <GameComplete
              stars={result.stars}
              title="Puzzle complete!"
              onReplay={() => start(level)}
              homeHref="/maps/puzzle"
              homeLabel="More puzzles"
              detail={
                <p className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xl">
                  <span>Score {result.score.toLocaleString()}</span>
                  <span>{Math.floor(result.timeSec / 60)}m {result.timeSec % 60}s</span>
                  <span>{result.firstTry}/{result.total} first try</span>
                </p>
              }
              extra={
                level !== "hard" ? (
                  <KzButton size="xl" tone="success" onClick={() => start(level === "easy" ? "medium" : "hard")}>
                    Try {level === "easy" ? "Medium" : "Hard"}
                  </KzButton>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      {drag && (
        <div
          className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-[120%] rotate-[-3deg] rounded-2xl bg-primary px-4 py-2 font-display text-lg font-bold text-white shadow-xl"
          style={{ left: drag.x, top: drag.y }}
        >
          {names.get(drag.id)}
        </div>
      )}
      {phase === "play" && !isIndia && state?.dataStatus === "verified" && (
        <p className="text-center text-xs text-ink-soft">
          Map: official LGD district boundaries. <Link href="/parent" className="underline">About the data</Link>
        </p>
      )}
    </div>
  );
}

