"use client";

import DragMatch, { type MatchRound } from "@/components/DragMatch";
import GameShell from "@/components/games/GameShell";
import { Flag } from "@/components/Media";
import { sample } from "@/lib/content";
import { gamePool } from "@/lib/explorer";
import type { Level } from "@/lib/questions";
import { CONTINENTS, continentLabel } from "@/lib/world";

const TARGETS = CONTINENTS.filter((c) => c.id !== "Antarctica").map((c) => ({ id: c.id, label: continentLabel(c.id), colour: c.colour }));

const rounds = (level: Level): MatchRound[] => {
  const per = level === "beginner" ? 6 : 8;
  // a mix of continents in every round
  const pool = gamePool(level);
  return [0, 1].map(() => {
    const byCont = TARGETS.flatMap((t) => sample(pool.filter((c) => c.continent === t.id), 2));
    const cs = sample(byCont, per);
    return { items: cs.map((c) => ({ id: c.id, answer: c.continent, label: c.name, key: `continent:${c.id}` })), targets: TARGETS };
  });
};

export default function ContinentChallenge() {
  return (
    <GameShell title="Continent Challenge" howTo={["Drag each country into the continent it belongs to.", "Or tap a country, then tap a continent."]}>
      {(level) => (
        <DragMatch
          layout="buckets"
          gameId="continent-challenge"
          backHref="/games"
          instructions="Which continent is each country in?"
          make={() => rounds(level)}
          renderItem={(it) => (
            <span className="flex items-center gap-2 font-display text-base font-bold">
              <Flag id={it.id} size={32} /> {it.label}
            </span>
          )}
          renderTarget={(t, placed) => (
            <span className="block">
              <span className="font-display text-lg font-extrabold">{t.label}</span>
              <span className="mt-2 flex flex-wrap gap-1">
                {placed.map((p) => (
                  <Flag key={p.id} id={p.id} size={30} />
                ))}
              </span>
            </span>
          )}
        />
      )}
    </GameShell>
  );
}
