"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, CalendarCheck, CheckCircle2, Globe2, Map as MapIcon, Puzzle, Trophy } from "lucide-react";
import { GameCards } from "@/components/games/GameCards";
import { Card, PageHeader } from "@/components/ui";
import { actions, useProgress, useToday } from "@/lib/progress";
import type { Level } from "@/lib/questions";

const LEVELS: { id: Level; label: string; text: string }[] = [
  { id: "beginner", label: "Beginner", text: "Continents, country names, flags and famous places" },
  { id: "intermediate", label: "Intermediate", text: "Capitals, neighbours, states, districts, food and festivals" },
  { id: "advanced", label: "Advanced", text: "Every country, harder choices and timed challenges" },
];

export default function GamesHub() {
  const p = useProgress();
  const day = useToday();
  const dailyDone = Boolean(day && p.games[`daily:${day}`]);
  useEffect(() => actions.visit("/games", "Geography Challenges"), []);

  return (
    <div className="space-y-8">
      <PageHeader back="/" title="Geography Challenges" subtitle="Pick a game. Every right answer earns points and stars!" />

      <Card className="space-y-3">
        <p className="font-display text-lg font-bold">Choose your level</p>
        <div role="radiogroup" aria-label="Difficulty" className="grid gap-2 md:grid-cols-3">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={p.difficulty === l.id}
              onClick={() => actions.setDifficulty(l.id)}
              className={`rounded-2xl border-2 p-4 text-left transition ${p.difficulty === l.id ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary/40"}`}
            >
              <p className="font-display text-xl font-extrabold">{l.label}</p>
              <p className="text-ink-soft">{l.text}</p>
            </button>
          ))}
        </div>
      </Card>

      <Link
        href="/games/daily"
        className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-secondary p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1"
      >
        <span className="grid size-16 place-items-center rounded-2xl bg-white">
          <CalendarCheck className="size-9 text-[#b47c00]" />
        </span>
        <span className="flex-1">
          <span className="block font-display text-2xl font-extrabold">Daily Geography Challenge</span>
          <span className="text-lg text-ink/80">Five fresh questions today — the same for every explorer</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-display text-lg font-bold">
          {dailyDone ? (
            <>
              <CheckCircle2 className="size-5 text-success" /> Done today · play again
            </>
          ) : (
            <>
              Play <ArrowRight className="size-5" />
            </>
          )}
        </span>
      </Link>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <Globe2 className="size-6 text-primary" /> World games
        </h2>
        <GameCards group="world" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" />
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold">
          <MapIcon className="size-6 text-accent" /> India games
        </h2>
        <GameCards group="india" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/puzzle" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1">
          <Puzzle className="size-10 text-accent" />
          <span>
            <span className="block font-display text-xl font-extrabold">Map puzzles</span>
            <span className="text-ink-soft">India&apos;s states, every state&apos;s districts and every continent</span>
          </span>
        </Link>
        <Link href="/quiz" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1">
          <Trophy className="size-10 text-[#e5a100]" />
          <span>
            <span className="block font-display text-xl font-extrabold">India quiz levels</span>
            <span className="text-ink-soft">Beginner → Intermediate → Advanced</span>
          </span>
        </Link>
      </section>
    </div>
  );
}
