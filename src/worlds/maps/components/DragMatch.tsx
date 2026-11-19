"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Clock, Trophy } from "lucide-react";
import { MascotSays, type Mood } from "./Mascot";
import { Results, type RunResult } from "./QuizRunner";
import { Button, Loading, ProgressBar } from "./ui";
import { actions, starsFor } from "@/lib/progress";
import { celebrate, playSound } from "@/lib/celebrate";
import { speak } from "@/lib/speech";

export interface MatchItem {
  id: string;
  /** what a correct target looks like */
  answer: string;
  /** spoken and used as an accessible name */
  label: string;
  /** progress key for "needs practice", e.g. "flag:fr" */
  key: string;
}
export interface MatchTarget {
  id: string;
  label: string;
  colour?: string;
}
export interface MatchRound {
  items: MatchItem[];
  targets: MatchTarget[];
}

interface Props {
  /** Builds the rounds (called again on "Play again"). */
  make: () => MatchRound[];
  renderItem: (item: MatchItem) => ReactNode;
  renderTarget: (target: MatchTarget, placed: MatchItem[]) => ReactNode;
  instructions: string;
  gameId: string;
  backHref: string;
  /** targets as a wrapping grid of big buckets (continents) or a list (names) */
  layout?: "buckets" | "pairs";
}

/** Drag (or tap, then tap) each card onto its matching target. */
export default function DragMatch({ make, renderItem, renderTarget, instructions, gameId, backHref, layout = "pairs" }: Props) {
  const [rounds, setRounds] = useState<MatchRound[]>([]);
  const [r, setR] = useState(0);
  const [placed, setPlaced] = useState<Record<string, string>>({}); // item -> target
  const [active, setActive] = useState<string | null>(null);
  const [wrongTarget, setWrongTarget] = useState<string | null>(null);
  const [stats, setStats] = useState({ right: 0, wrong: 0, score: 0 });
  const [say, setSay] = useState<{ mood: Mood; text: string }>({ mood: "happy", text: instructions });
  const [startAt, setStartAt] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const start = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);

  const begin = () => {
    setRounds(make());
    setR(0);
    setPlaced({});
    setActive(null);
    setStats({ right: 0, wrong: 0, score: 0 });
    setResult(null);
    setStartAt(Date.now());
    setNow(Date.now());
    setSay({ mood: "happy", text: instructions });
  };
  // rounds are random, so they are built once after mount ("Play again" rebuilds)
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(begin, []);
  useEffect(() => {
    if (result) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [result]);

  const round = rounds[r];
  if (result) return <Results r={result} onRetry={begin} backHref={backHref} backLabel="More challenges" />;
  if (!round) return <Loading label="Shuffling the cards…" />;

  const left = round.items.filter((i) => !placed[i.id]);
  const done = left.length === 0;

  const tryPlace = (itemId: string, targetId: string) => {
    const item = round.items.find((i) => i.id === itemId);
    if (!item || placed[itemId]) return;
    const target = round.targets.find((t) => t.id === targetId)!;
    if (item.answer === targetId) {
      setPlaced((p) => ({ ...p, [itemId]: targetId }));
      setActive(null);
      setStats((s) => ({ ...s, right: s.right + 1, score: s.score + 100 }));
      actions.answer(item.key, true);
      playSound("correct");
      setSay({ mood: "cheer", text: `Yes! ${item.label} goes with ${target.label}.` });
      if (left.length === 1) celebrate();
    } else {
      setStats((s) => ({ ...s, wrong: s.wrong + 1, score: Math.max(0, s.score - 20) }));
      actions.answer(item.key, false);
      playSound("wrong");
      setWrongTarget(targetId);
      window.setTimeout(() => setWrongTarget(null), 600);
      setSay({ mood: "oops", text: `Not ${target.label}. Try another one!` });
    }
  };

  const next = () => {
    if (r + 1 < rounds.length) {
      setR(r + 1);
      setPlaced({});
      setSay({ mood: "happy", text: "Next round!" });
      return;
    }
    const total = rounds.reduce((a, x) => a + x.items.length, 0);
    const res: RunResult = {
      total,
      correct: stats.right,
      wrong: stats.wrong,
      score: stats.score + Math.max(0, total * 8 - Math.round((Date.now() - startAt) / 1000)) * 2,
      timeSec: Math.round((Date.now() - startAt) / 1000),
      stars: starsFor(stats.right / Math.max(1, stats.right + stats.wrong)),
    };
    setResult(res);
    actions.finishGame(gameId, res.score);
    playSound("win");
    if (res.stars >= 2) celebrate("big");
  };

  const onDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer gone */
    }
    start.current = { id, x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) s.moved = true;
    if (s.moved) setDrag({ id: s.id, x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    setDrag(null);
    if (!s) return;
    if (!s.moved) {
      const it = round.items.find((i) => i.id === s.id);
      setActive((a) => (a === s.id ? null : s.id));
      if (it) speak(it.label);
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-target]") as HTMLElement | null;
    if (el?.dataset.target) tryPlace(s.id, el.dataset.target);
  };

  const elapsed = Math.round((now - startAt) / 1000);
  const total = rounds.reduce((a, x) => a + x.items.length, 0);
  const doneSoFar = rounds.slice(0, r).reduce((a, x) => a + x.items.length, 0) + Object.keys(placed).length;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white px-4 py-2 font-display font-bold shadow-[var(--shadow-card)]">
          Round {r + 1} of {rounds.length}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-display font-bold shadow-[var(--shadow-card)]">
          <Trophy className="size-4 text-[#e5a100]" /> {stats.score}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-display font-bold shadow-[var(--shadow-card)]">
          <Clock className="size-4 text-accent" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>
      <ProgressBar value={doneSoFar / Math.max(1, total)} tone="bg-success" />
      <MascotSays say mood={say.mood} size={60}>
        {say.text}
      </MascotSays>

      <div className={layout === "pairs" ? "grid gap-5 md:grid-cols-[1fr_1.2fr]" : "space-y-5"}>
        <div>
          <p className="mb-2 font-display font-bold text-ink-soft">{done ? "All placed!" : "Drag a card — or tap it, then tap where it goes"}</p>
          <div className={`grid gap-2 ${layout === "pairs" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
            {left.map((it) => (
              <button
                key={it.id}
                type="button"
                aria-label={it.label}
                aria-pressed={active === it.id}
                data-no-announce
                onPointerDown={(e) => onDown(e, it.id)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => {
                  start.current = null;
                  setDrag(null);
                }}
                style={{ touchAction: "none" }}
                className={`grid min-h-16 cursor-grab select-none place-items-center rounded-2xl border-2 p-2 transition active:cursor-grabbing ${
                  active === it.id ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary/50"
                } ${drag?.id === it.id ? "opacity-30" : ""}`}
              >
                {renderItem(it)}
              </button>
            ))}
          </div>
        </div>
        <div className={layout === "pairs" ? "space-y-2" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
          {round.targets.map((t) => {
            const here = round.items.filter((i) => placed[i.id] === t.id);
            return (
              <button
                key={t.id}
                type="button"
                data-target={t.id}
                aria-label={`Put it on ${t.label}`}
                onClick={() => active && tryPlace(active, t.id)}
                className={`w-full rounded-2xl border-2 border-dashed p-3 text-left transition ${
                  wrongTarget === t.id ? "animate-shake border-danger bg-danger-soft" : active ? "border-primary bg-primary-soft/40" : "border-line bg-white"
                } ${layout === "buckets" ? "min-h-32" : ""}`}
                style={t.colour && wrongTarget !== t.id ? { background: `${t.colour}66`, borderColor: t.colour } : undefined}
              >
                {renderTarget(t, here)}
              </button>
            );
          })}
        </div>
      </div>

      {done && (
        <Button className="w-full animate-pop" onClick={next}>
          {r + 1 < rounds.length ? "Next round" : "See my results"} <ArrowRight className="size-5" />
        </Button>
      )}

      {drag && (
        <div className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-1/2 rotate-[-3deg] rounded-2xl bg-white p-2 shadow-2xl ring-2 ring-primary" style={{ left: drag.x, top: drag.y }}>
          {renderItem(round.items.find((i) => i.id === drag.id)!)}
        </div>
      )}
    </div>
  );
}

export function PlacedTick() {
  return <Check className="size-4 text-success" strokeWidth={3} />;
}
