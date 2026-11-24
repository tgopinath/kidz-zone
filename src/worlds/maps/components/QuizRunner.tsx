"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Target, Trophy, X } from "lucide-react";
import MapView, { type RegionMark } from "./MapView";
import GlobeView from "./GlobeView";
import { Flag, Photo } from "./Media";
import { MascotSays, type Mood } from "./Mascot";
import { Card, Loading, SpeakButton } from "./ui";
import { getDistricts, getState, STATES } from "@/lib/content";
import { DISTRICT_FILLS, STATE_FILLS, useDistrictMap, useIndiaMap, useWorldMap, type RegionFeature } from "@/lib/geo";
import { countryName, getCountry } from "@/lib/world";
import { countryDetails } from "@/lib/explorer";

const answerCentre = (id: string): [number, number] | null => {
  const c = getCountry(id);
  const ll = c ? countryDetails(c).latlng : null;
  return ll ? [ll[1], ll[0]] : null;
};
import type { Question } from "@/lib/questions";
import { actions, starsFor } from "@/lib/progress";
import { celebrate, playSound } from "@/lib/celebrate";
import { speak, speakLocal } from "@/lib/speech";
import { useRoundFlow } from "../../../play/roundFlow";
import { GameComplete, RoundCheer, RoundProgress } from "../../../play/ui";
import { answerMark, exposeAnswer } from "../../../play/testMode";

export interface RunResult {
  total: number;
  correct: number;
  wrong: number;
  score: number;
  timeSec: number;
  stars: number;
}

interface Props {
  /** Builds a fresh set of questions (called again on "Play again"). */
  make: () => Question[];
  /** State whose district map district questions use. */
  stateId?: string;
  onFinish: (r: RunResult) => void;
  backHref: string;
  backLabel: string;
}

export default function QuizRunner({ make, stateId, onFinish, backHref, backLabel }: Props) {
  // Questions are random, so build them after mount to keep server and client HTML identical.
  const [qs, setQs] = useState<Question[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const [qStart, setQStart] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [say, setSay] = useState<{ mood: Mood; text: string } | null>(null);
  const [wrongTap, setWrongTap] = useState<string | null>(null);
  const [wrongPicks, setWrongPicks] = useState<Set<string>>(new Set());
  // shared round flow: after an answer the next question loads by itself (no Next button)
  const flow = useRoundFlow({
    total: Math.max(1, qs.length),
    advanceMs: 1800,
    effects: false, // Map Explorer plays its own sounds
    onAdvance: () => next(),
    onComplete: () => next(),
  });

  const india = useIndiaMap();
  const world = useWorldMap(qs.some((x) => x.map === "world" || x.map === "globe"));
  const dist = useDistrictMap(stateId ?? null);
  const q = qs[i];
  const features = q?.map === "district" ? dist.features : q?.map === "world" || q?.map === "globe" ? world.features : india.features;

  const names = useMemo(() => {
    const m = new Map<string, string>();
    if (stateId) getDistricts(stateId).forEach((d) => m.set(d.id, d.name));
    return m;
  }, [stateId]);
  // English option label -> Tamil name, for reading options aloud in Tamil.
  const taByName = useMemo(() => {
    const m = new Map<string, string>();
    STATES.forEach((s) => s.ta && m.set(s.name, s.ta.name));
    if (stateId) getDistricts(stateId).forEach((d) => d.ta && m.set(d.name, d.ta.name));
    return m;
  }, [stateId]);
  const regionName = (id: string) => (q?.map === "district" ? names.get(id) ?? "" : q?.map === "world" || q?.map === "globe" ? countryName(id) : getState(id)?.name ?? "");
  const nameOf = (f: RegionFeature) => regionName(f.properties.id);

  useEffect(() => {
    if (result) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [result]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQs(make());
    setStartAt(Date.now());
    setQStart(Date.now());
    setNow(Date.now());
    // build once per mount; "Play again" rebuilds via restart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = () => {
    setQs(make());
    setI(0);
    setPicked(null);
    setTries(0);
    setCorrect(0);
    setScore(0);
    setStartAt(Date.now());
    setQStart(Date.now());
    setResult(null);
    setSay(null);
    setWrongPicks(new Set());
    flow.flow.replay();
  };

  // Read each new question (and its choices) aloud.
  useEffect(() => {
    const cur = qs[i];
    if (!cur) return;
    speak(cur.kind === "mcq" ? `${cur.prompt} ${cur.options.join(". ")}.` : cur.prompt);
  }, [qs, i]);

  const answered = picked !== null;
  const answer = (value: string) => {
    if (answered || !q || flow.locked || wrongPicks.has(value)) return;
    const ok = value === q.answer;
    if (q.kind === "mcq" && !ok && tries < q.options.length - 2) {
      // a wrong choice: gentle "Try again!", that choice fades, the question stays
      if (tries === 0) actions.answer(q.key, false);
      setTries((t) => t + 1);
      setWrongPicks((w) => new Set(w).add(value));
      playSound("wrong");
      flow.flow.miss();
      setSay({ mood: "oops", text: "Not that one. Try again!" });
      return;
    }
    if (q.kind === "tap" && !ok && tries === 0) {
      flow.flow.miss();
      // Taps get one friendly retry before the answer is shown.
      setTries(1);
      setWrongTap(value);
      window.setTimeout(() => setWrongTap(null), 700);
      playSound("wrong");
      setSay({ mood: "oops", text: `That's ${regionName(value)}. Have another go!` });
      return;
    }
    setPicked(value);
    if (!(q.kind === "mcq" && tries > 0)) actions.answer(q.key, ok);
    if (ok) {
      flow.flow.success();
      const secs = (Date.now() - qStart) / 1000;
      const gained = (tries ? 50 : 100) + Math.max(0, Math.round(50 - secs * 5));
      setScore((s) => s + gained);
      setCorrect((c) => c + 1);
      playSound("correct");
      setSay({ mood: "cheer", text: `Correct! +${gained}. ${q.explain}` });
    } else {
      playSound("wrong");
      setSay({ mood: "think", text: `Here it is. ${q.explain}` });
      flow.flow.reveal();
    }
  };

  const next = () => {
    if (i + 1 >= qs.length) {
      const r: RunResult = {
        total: qs.length,
        correct,
        wrong: qs.length - correct,
        score,
        timeSec: Math.round((Date.now() - startAt) / 1000),
        stars: starsFor(correct / qs.length),
      };
      setResult(r);
      onFinish(r);
      if (r.stars >= 2) celebrate("big");
      playSound("win");
      return;
    }
    setI(i + 1);
    setPicked(null);
    setTries(0);
    setWrongPicks(new Set());
    setSay(null);
    setQStart(Date.now());
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => exposeAnswer(q && !answered ? () => answer(q.answer) : null));
  if (result) return <Results r={result} onRetry={restart} backHref={backHref} backLabel={backLabel} />;
  if (!q) return <Loading label="Getting questions ready…" />;

  const marks: Record<string, RegionMark | undefined> = {};
  const target = q.kind === "mcq" ? q.highlight : null;
  if (features) {
    if (target) features.forEach((f) => (marks[f.properties.id] = f.properties.id === target ? "target" : "dim"));
    if (q.kind === "tap" && answered) marks[q.answer] = picked === q.answer ? "correct" : "hint";
    if (q.kind === "tap" && answered && picked !== q.answer && picked) marks[picked] = "wrong";
    if (wrongTap) marks[wrongTap] = "wrong";
  }
  const fills = q.map === "district" ? DISTRICT_FILLS : STATE_FILLS;
  const elapsed = Math.round((now - startAt) / 1000);

  return (
    <div className="space-y-4">
      <RoundCheer phase={flow.phase} round={i} />
      <div className="flex flex-wrap items-center gap-3">
        <RoundProgress round={i} total={qs.length} />
        <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-display font-bold shadow-[var(--shadow-card)]">
          <Trophy className="size-4 text-[#e5a100]" /> {score}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-display font-bold shadow-[var(--shadow-card)]">
          <Clock className="size-4 text-accent" /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(380px,32%)]">
        <div className="order-2 lg:order-1">
          {q.map === "none" ? (
            q.kind === "mcq" && q.image ? (
              <Photo id={q.image} alt="Picture for this question" ratio="aspect-[4/3]" credit={answered} />
            ) : null
          ) : features && q.map === "globe" ? (
            <GlobeView
              key={q.id}
              features={features}
              fillFor={(f) => fills[f.properties.c]}
              nameFor={(id) => (answered || wrongTap === id ? countryName(id) : "")}
              marks={marks}
              selectedId={answered ? q.answer : null}
              onSelect={q.kind === "tap" && !answered ? answer : undefined}
              focus={answered && q.kind === "tap" && answerCentre(q.answer) ? { coords: answerCentre(q.answer)!, zoom: 2 } : null}
              height="min(64vh, 720px)"
              ariaLabel="Quiz globe. Spin it to find the country."
            />
          ) : features ? (
            <MapView
              key={q.map}
              features={features}
              fillFor={(f) => fills[f.properties.c]}
              marks={marks}
              labelMode={answered ? "selected" : "none"}
              selectedId={answered ? (q.kind === "tap" ? q.answer : target) : null}
              labelFor={nameOf}
              nameFor={(f) => (q.kind === "tap" ? nameOf(f) : "Map region")}
              onSelect={q.kind === "tap" && !answered ? answer : undefined}
              projection={q.map === "world" ? "world" : "mercator"}
              tinyArea={q.map === "world" ? 4 : undefined}
              focusId={null}
              ariaLabel="Quiz map"
              maxHeight="64vh"
            />
          ) : (
            <Loading />
          )}
        </div>

        <div className="order-1 space-y-3 lg:order-2">
          <Card className="space-y-4">
            <div className="flex items-start gap-2">
              <h2 className="flex flex-1 cursor-pointer items-start gap-2 text-3xl font-black leading-snug" data-no-announce onClick={() => speak(q.kind === "mcq" ? `${q.prompt} ${q.options.join(". ")}.` : q.prompt, { force: true })}>
                {q.kind === "tap" && <Target className="mt-1 size-6 shrink-0 text-accent" />}
                {q.prompt}
              </h2>
            </div>
            {q.kind === "mcq" && (
              <div className="grid gap-2">
                {q.options.map((o) => {
                  const isAns = o === q.answer;
                  const state = !answered ? (wrongPicks.has(o) ? "wrong" : "idle") : isAns ? "right" : o === picked ? "wrong" : "idle";
                  return (
                    <div key={o} className="flex items-center gap-1.5">
                    <SpeakButton label={`Say ${o}`} onSpeak={() => speakLocal(o, taByName.get(o), { force: true })} />
                    <button
                      type="button"
                      {...answerMark(isAns)}
                      disabled={answered || wrongPicks.has(o)}
                      onClick={() => answer(o)}
                      className={`flex min-h-20 flex-1 items-center justify-between rounded-3xl border-4 px-5 py-3 text-left font-display text-2xl font-black transition ${
                        state === "right"
                          ? "border-success bg-success text-white"
                          : state === "wrong"
                            ? "animate-shake border-[#f0b35a] bg-[#fff4e5] text-ink opacity-60"
                            : "border-line bg-white hover:border-primary hover:bg-primary-soft disabled:opacity-60"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {q.optionFlags?.[q.options.indexOf(o)] && <Flag id={q.optionFlags[q.options.indexOf(o)]} size={52} />}
                        {o}
                      </span>
                      {state === "right" && <Check className="size-5" />}
                      {state === "wrong" && <X className="size-5" />}
                    </button>
                    </div>
                  );
                })}
              </div>
            )}
            {q.kind === "tap" && !answered && <p className="text-ink-soft">Tap the map. Use + to zoom in on small places.</p>}
          </Card>
          {answered && (
            <div
              role="status"
              className={`animate-pop rounded-[var(--radius-card)] p-5 text-white shadow-[var(--shadow-card)] ${picked === q.answer ? "bg-success" : "bg-accent"}`}
            >
              <p className="flex items-center gap-2 font-display text-lg font-bold text-white/90">
                {picked === q.answer ? <Check className="size-6" strokeWidth={3} /> : <X className="size-6" strokeWidth={3} />}
                {picked === q.answer ? "Correct!" : "The answer is"}
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold leading-tight">{q.kind === "tap" ? regionName(q.answer) : q.answer}</p>
            </div>
          )}
          {say && <MascotSays say mood={say.mood} size={60}>{say.text}</MascotSays>}
          {answered && <p className="text-center text-lg font-bold text-ink-soft" role="status">{i + 1 >= qs.length ? "Your results are coming…" : "Next question coming…"}</p>}
        </div>
      </div>
    </div>
  );
}

export function Results({ r, onRetry, backHref, backLabel }: { r: RunResult; onRetry: () => void; backHref: string; backLabel: string }) {
  const msg = r.stars === 3 ? "Geography star!" : r.stars === 2 ? "Great job!" : "Good try!";
  return (
    <GameComplete
      stars={r.stars}
      title={msg}
      onReplay={onRetry}
      homeHref={backHref.startsWith("/maps") ? backHref : `/maps${backHref}`}
      homeLabel={backLabel}
      detail={
        <p className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xl">
          <span>{r.correct} of {r.total} right</span>
          <span>Score {r.score.toLocaleString()}</span>
          <span>{Math.floor(r.timeSec / 60)}m {r.timeSec % 60}s</span>
        </p>
      }
    />
  );
}
