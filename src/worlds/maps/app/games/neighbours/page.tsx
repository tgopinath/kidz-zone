"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import MapView, { type RegionMark } from "@/components/MapView";
import { Results, type RunResult } from "@/components/QuizRunner";
import { BackLink } from "@/components/games/BackLink";
import { MascotSays, type Mood } from "@/components/Mascot";
import { Button, Card, Loading, PageHeader, ProgressBar } from "@/components/ui";
import { getState, sample, STATES } from "@/lib/content";
import { STATE_FILLS, useIndiaMap } from "@/lib/geo";
import { actions, starsFor } from "@/lib/progress";
import { celebrate, playSound } from "@/lib/celebrate";
import { useAutoAdvance } from "../../../../../play/roundFlow";
import { RoundCheer } from "../../../../../play/ui";

const ROUNDS = 5;
const POOL = STATES.filter((s) => s.neighbours.length >= 2);

export default function NeighbourChallenge() {
  const { features } = useIndiaMap();
  const [rounds, setRounds] = useState<string[]>([]);
  const [r, setR] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ found: 0, missed: 0, wrong: 0, score: 0 });
  const [startAt, setStartAt] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [say, setSay] = useState<{ mood: Mood; text: string } | null>(null);

  const begin = () => {
    setRounds(sample(POOL, ROUNDS).map((s) => s.id));
    setR(0);
    setFound([]);
    setRevealed(false);
    setStats({ found: 0, missed: 0, wrong: 0, score: 0 });
    setStartAt(Date.now());
    setResult(null);
    setSay(null);
  };
  // random rounds are created after mount so server and client HTML match
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(begin, []);

  const s = rounds.length ? getState(rounds[r])! : null;
  const complete = s ? found.length === s.neighbours.length || revealed : false;
  // the next round loads by itself (shared play kit)
  const cheerPhase = useAutoAdvance(complete && !result, () => next(), { cheer: false, ms: revealed ? 3200 : 1800 });

  const tap = (id: string) => {
    if (!s || complete || id === s.id || found.includes(id)) return;
    if (s.neighbours.includes(id)) {
      const nf = [...found, id];
      setFound(nf);
      setStats((x) => ({ ...x, found: x.found + 1, score: x.score + 50 }));
      actions.answer(`neighbour:${s.id}`, true);
      playSound("correct");
      const left = s.neighbours.length - nf.length;
      setSay({ mood: "cheer", text: left ? `Yes, ${getState(id)!.name}! ${left} more to find.` : `You found all ${s.neighbours.length} neighbours!` });
      if (!left) celebrate();
    } else {
      setStats((x) => ({ ...x, wrong: x.wrong + 1, score: Math.max(0, x.score - 10) }));
      actions.answer(`neighbour:${s.id}`, false);
      playSound("wrong");
      setWrongFlash(id);
      window.setTimeout(() => setWrongFlash(null), 700);
      setSay({ mood: "oops", text: `${getState(id)!.name} doesn't touch ${s.name}. Look right next to its border!` });
    }
  };

  const reveal = () => {
    if (!s) return;
    setStats((x) => ({ ...x, missed: x.missed + (s.neighbours.length - found.length) }));
    setRevealed(true);
    setSay({ mood: "think", text: `${s.name}'s neighbours are ${s.neighbours.map((n) => getState(n)!.name).join(", ")}.` });
  };

  const next = () => {
    if (r + 1 >= rounds.length) {
      const total = stats.found + stats.missed;
      const res: RunResult = {
        total,
        correct: stats.found,
        wrong: stats.wrong + stats.missed,
        score: stats.score,
        timeSec: Math.round((Date.now() - startAt) / 1000),
        stars: starsFor(stats.found / Math.max(1, total + stats.wrong * 0.5)),
      };
      setResult(res);
      actions.finishGame("neighbours", res.score);
      playSound("win");
      if (res.stars >= 2) celebrate("big");
      return;
    }
    setR(r + 1);
    setFound([]);
    setRevealed(false);
    setSay(null);
  };

  if (result) return (<div><BackLink /><Results r={result} onRetry={begin} backHref="/games" backLabel="More games" /></div>);

  const marks: Record<string, RegionMark | undefined> = {};
  if (s) {
    marks[s.id] = "target";
    found.forEach((id) => (marks[id] = "correct"));
    if (revealed) s.neighbours.filter((n) => !found.includes(n)).forEach((n) => (marks[n] = "hint"));
    if (wrongFlash) marks[wrongFlash] = "wrong";
  }

  return (
    <div>
      <RoundCheer phase={revealed ? 'play' : cheerPhase} round={r} />
      <PageHeader back="/games" backLabel="All games" title="Neighbour Challenge" subtitle="Tap every state that touches the orange one." />
      {!features || !s ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="order-2 lg:order-1">
            <MapView
              features={features}
              fillFor={(f) => STATE_FILLS[f.properties.c]}
              marks={marks}
              onSelect={tap}
              labelMode="auto"
              labelFor={(f) => (f.properties.id === s.id || found.includes(f.properties.id) || (revealed && s.neighbours.includes(f.properties.id)) ? getState(f.properties.id)!.name : null)}
              nameFor={(f) => getState(f.properties.id)!.name}
              focusId={s.id}
              ariaLabel="Map of India"
              maxHeight="70vh"
            />
          </div>
          <div className="order-1 space-y-3 lg:order-2">
            <Card className="space-y-3">
              <p className="font-display font-bold text-ink-soft">Round {r + 1} of {rounds.length}</p>
              <h2 className="text-2xl font-extrabold leading-snug">
                Find all <span className="text-accent">{s.neighbours.length}</span> neighbours of {s.name}
              </h2>
              <ProgressBar value={found.length / s.neighbours.length} tone="bg-success" />
              <div className="flex flex-wrap gap-1.5">
                {found.map((id) => (
                  <span key={id} className="rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-[#1d7a52]">{getState(id)!.name}</span>
                ))}
              </div>
              {!complete ? (
                <Button tone="white" className="w-full" onClick={reveal}>
                  <Eye className="size-5" /> Show me
                </Button>
              ) : (
                <p className="text-center text-lg font-bold text-ink-soft" role="status">{r + 1 >= rounds.length ? "Your results are coming…" : "Next round coming…"}</p>
              )}
            </Card>
            {say && <MascotSays say mood={say.mood} size={60}>{say.text}</MascotSays>}
          </div>
        </div>
      )}
    </div>
  );
}
