"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, Lock, ShieldCheck } from "lucide-react";
import { Button, Card, DataStatusBadge, PageHeader, ProgressBar } from "@/components/ui";
import { getDistricts, getState, MAP_BUILT_ON, MAP_SOURCE, PILOT_STATE, STATES } from "@/lib/content";
import { countryName } from "@/lib/world";
import { actions, useProgress, type Progress, type QuizLevel } from "@/lib/progress";
import { missionState } from "@/lib/missions";

function labelFor(key: string) {
  const [kind, a, b] = key.split(":");
  if (kind === "district") return `${getDistricts(a).find((d) => d.id === b)?.name ?? b} district (${getState(a)?.name})`;
  if (kind === "state") return `Locating ${getState(a)?.name}`;
  if (kind === "capital") return `Capital of ${getState(a)?.name}`;
  if (kind === "neighbour") return `Neighbours of ${getState(a)?.name}`;
  if (kind === "country" || kind === "flag" || kind === "wcapital" || kind === "continent") return `${{ country: "Finding", flag: "Flag of", wcapital: "Capital of", continent: "Continent of" }[kind]} ${countryName(a)}`;
  if (kind === "landmark" || kind === "food") return `${kind === "landmark" ? "Landmark" : "Food"}: ${a.replace(/-/g, " ")}`;
  return key;
}

function needsPractice(p: Progress) {
  return Object.entries(p.mistakes)
    .map(([k, wrong]) => ({ k, wrong, right: p.correct[k] ?? 0 }))
    .filter((x) => x.wrong > x.right * 0.5)
    .sort((a, b) => b.wrong - b.right - (a.wrong - a.right))
    .slice(0, 8);
}

function overall(p: Progress) {
  const tn = getState(PILOT_STATE)!.districtCount;
  const parts = [
    p.statesViewed.length / STATES.length,
    (p.districtsLearned[PILOT_STATE]?.length ?? 0) / tn,
    (["beginner", "intermediate", "advanced"] as QuizLevel[]).filter((l) => (p.quizBest[l]?.stars ?? 0) >= 1).length / 3,
    (["easy", "medium", "hard"] as const).filter((l) => p.puzzles[`${PILOT_STATE}:${l}`]).length / 3,
  ];
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export default function ParentPage({ preUnlocked = false }: { preUnlocked?: boolean }) {
  const p = useProgress();
  const [gate, setGate] = useState<{ a: number; b: number } | null>(null);
  // random question is picked after mount so server and client HTML match
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setGate({ a: 6 + Math.floor(Math.random() * 4), b: 4 + Math.floor(Math.random() * 5) }), []);
  const [answer, setAnswer] = useState("");
  const [open, setOpen] = useState(preUnlocked);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader back="/" title="Parent Corner" />
        <Card className="space-y-4">
          <p className="flex items-center gap-2 font-display text-lg font-bold"><Lock className="size-5 text-primary" /> Grown-ups only</p>
          <p className="text-ink-soft">To continue, answer this question:</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (gate && Number(answer) === gate.a * gate.b) setOpen(true);
            }}
          >
            <label className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-line bg-white px-4 font-display text-xl font-bold">
              {gate ? `${gate.a} × ${gate.b} =` : "…"}
              <input inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-16 py-3 outline-none" aria-label="Answer" />
            </label>
            <Button type="submit">Open</Button>
          </form>
        </Card>
      </div>
    );
  }

  const tn = getState(PILOT_STATE)!;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { k, label: d.toLocaleDateString(undefined, { weekday: "short" }), min: Math.round((p.timeByDay[k] ?? 0) / 60) };
  });
  const maxMin = Math.max(5, ...days.map((d) => d.min));
  const totalMin = Math.round(Object.values(p.timeByDay).reduce((a, b) => a + b, 0) / 60);
  const practice = needsPractice(p);
  const learnedStates = Object.entries(p.districtsLearned).filter(([, v]) => v.length);

  return (
    <div className="space-y-5">
      <PageHeader back="/" title="Parent Dashboard" subtitle="A simple view of your child's learning on this device." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Overall progress" value={`${Math.round(overall(p) * 100)}%`} bar={overall(p)} />
        <Metric label="States completed" value={`${p.statesViewed.length} / ${STATES.length}`} bar={p.statesViewed.length / STATES.length} />
        <Metric label="Districts learned" value={`${Object.values(p.districtsLearned).reduce((a, b) => a + b.length, 0)}`} sub={`${p.districtsLearned[PILOT_STATE]?.length ?? 0} of ${tn.districtCount} in Tamil Nadu`} />
        <Metric label="Learning time" value={`${totalMin} min`} sub={`${p.streak.current}-day streak (best ${p.streak.best})`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-xl font-bold">Minutes per day (last 7 days)</h2>
          <div className="flex h-40 items-end gap-3" role="img" aria-label={days.map((d) => `${d.label} ${d.min} minutes`).join(", ")}>
            {days.map((d) => (
              <div key={d.k} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold text-ink-soft">{d.min}</span>
                <div className="w-full rounded-t-lg bg-primary" style={{ height: `${(d.min / maxMin) * 110}px`, minHeight: d.min ? 4 : 2, opacity: d.min ? 1 : 0.2 }} />
                <span className="text-xs text-ink-soft">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-xl font-bold">Needs more practice</h2>
          {practice.length ? (
            <ul className="space-y-2">
              {practice.map((x) => (
                <li key={x.k} className="flex items-center justify-between gap-3 rounded-2xl bg-bg px-4 py-2">
                  <span className="font-semibold">{labelFor(x.k)}</span>
                  <span className="shrink-0 text-sm font-bold"><span className="text-danger">{x.wrong} wrong</span> · <span className="text-success">{x.right} right</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">Nothing stands out yet. Topics show up here once they are missed more than they are answered correctly.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-xl font-bold">Quiz scores</h2>
          {p.quizzes.length ? (
            <table className="w-full text-left">
              <thead className="text-sm text-ink-soft">
                <tr><th className="pb-2">Date</th><th className="pb-2">Level</th><th className="pb-2">Correct</th><th className="pb-2">Score</th><th className="pb-2">Time</th></tr>
              </thead>
              <tbody>
                {p.quizzes.slice(0, 10).map((q) => (
                  <tr key={q.at} className="border-t border-line">
                    <td className="py-2">{new Date(q.at).toLocaleDateString()}</td>
                    <td className="py-2 capitalize">{q.level}</td>
                    <td className="py-2">{q.correct}/{q.total}</td>
                    <td className="py-2">{q.score}</td>
                    <td className="py-2">{Math.round(q.timeSec / 60)}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-ink-soft">No quizzes taken yet.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-xl font-bold">Districts learned by state</h2>
          {learnedStates.length ? (
            <ul className="space-y-3">
              {learnedStates.map(([id, list]) => {
                const total = getState(id)!.districtCount;
                return (
                  <li key={id}>
                    <div className="mb-1 flex justify-between text-sm font-bold"><span>{getState(id)!.name}</span><span>{list.length}/{total}</span></div>
                    <ProgressBar value={list.length / total} tone="bg-success" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-ink-soft">No districts explored yet.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-xl font-bold">Learning level</h2>
          <p className="text-ink-soft">Sets how hard the world games are. Your child can still change it in Geography Challenges.</p>
          <div role="radiogroup" aria-label="Learning level" className="grid gap-2">
            {(
              [
                ["beginner", "Beginner", "Continents, country names, flags, famous landmarks"],
                ["intermediate", "Intermediate", "Capitals, neighbours, states and districts, food and festivals"],
                ["advanced", "Advanced", "Every country, harder choices, timed challenges"],
              ] as const
            ).map(([id, label, text]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={p.difficulty === id}
                onClick={() => actions.setDifficulty(id)}
                className={`rounded-2xl border-2 px-4 py-3 text-left ${p.difficulty === id ? "border-primary bg-primary-soft" : "border-line bg-white"}`}
              >
                <span className="block font-display text-lg font-bold">{label}</span>
                <span className="text-sm text-ink-soft">{text}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="space-y-2">
          <h2 className="text-xl font-bold">World Explorer</h2>
          <ul className="space-y-2">
            {[
              ["Countries explored (passport stamps)", p.countriesExplored.length],
              ["Landmarks visited", p.landmarksSeen.length],
              ["Foods discovered", p.foodsSeen.length],
              ["Festivals & clothing discovered", p.cultureSeen.length],
              ["Greetings heard", p.greetingsHeard.length],
              ["Missions completed", missionState(p).filter((m) => m.done).length],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between rounded-2xl bg-bg px-4 py-2">
                <span>{k}</span> <b>{v}</b>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-5 text-success" /> Privacy</h2>
        <p className="text-ink-soft">
          No names, emails, photos or locations are collected. Progress is saved only in this browser.
          {" Nothing is sent anywhere."}
        </p>
        <h2 className="flex items-center gap-2 pt-2 text-xl font-bold"><Database className="size-5 text-primary" /> About the map data</h2>
        <p className="text-ink-soft">
          Boundaries: {MAP_SOURCE}, from the Government of India&apos;s Local Government Directory (LGD), December 2023 release, processed on {MAP_BUILT_ON}.
          Tamil Nadu&apos;s 38 districts have been checked against the state&apos;s current district list and come with reviewed facts.
          Other states show the LGD snapshot and may not include districts created or merged after it.
        </p>
        <div className="flex flex-wrap gap-2">
          <DataStatusBadge status="verified" full />
          <DataStatusBadge status="snapshot" full />
          <DataStatusBadge full status="issues" issues={STATES.filter((s) => s.dataStatus === "issues").flatMap((s) => s.issues)} />
        </div>
        <p className="text-sm text-ink-soft">
          Needs update: {STATES.filter((s) => s.dataStatus === "issues").map((s) => `${s.name} — ${s.issues.join(" ")}`).join(" ") || "none"}
        </p>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold">Start over</p>
          <p className="text-ink-soft">Clears all points, badges and progress on this device.</p>
        </div>
        {confirmReset ? (
          <div className="flex gap-2">
            <Button tone="white" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button tone="accent" onClick={() => { actions.reset(); setConfirmReset(false); }}>
              <AlertTriangle className="size-5" /> Yes, clear it
            </Button>
          </div>
        ) : (
          <Button tone="white" onClick={() => setConfirmReset(true)}>Reset progress</Button>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value, sub, bar }: { label: string; value: string; sub?: string; bar?: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-bold text-ink-soft">{label}</p>
      <p className="font-display text-3xl font-extrabold">{value}</p>
      {bar !== undefined && <ProgressBar value={bar} className="mt-2" />}
      {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
    </Card>
  );
}
