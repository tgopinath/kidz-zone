"use client";

import DragMatch, { PlacedTick, type MatchRound } from "@/components/DragMatch";
import GameShell from "@/components/games/GameShell";
import { Flag } from "@/components/Media";
import { sample } from "@/lib/content";
import { gamePool } from "@/lib/explorer";
import type { Level } from "@/lib/questions";
import { countryName } from "@/lib/world";

const rounds = (level: Level): MatchRound[] => {
  const per = level === "beginner" ? 3 : level === "intermediate" ? 4 : 5;
  const picks = sample(gamePool(level).filter((c) => c.iso2), per * 3);
  return [0, 1, 2].map((r) => {
    const cs = picks.slice(r * per, r * per + per);
    return {
      items: sample(cs, cs.length).map((c) => ({ id: c.id, answer: c.id, label: `Flag of ${c.name}`, key: `flag:${c.id}` })),
      targets: sample(cs, cs.length).map((c) => ({ id: c.id, label: c.name })),
    };
  });
};

export default function MatchFlags() {
  return (
    <GameShell title="Match the Flags" howTo={["Drag each flag onto its country's name.", "Or tap a flag, then tap the name.", "Three rounds — get them all right for three stars!"]}>
      {(level) => (
        <DragMatch
          gameId="match-flags"
          backHref="/games"
          instructions="Drag each flag to the right country!"
          make={() => rounds(level)}
          renderItem={(it) => <Flag id={it.id} size={84} />}
          renderTarget={(t, placed) => (
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-xl font-bold">{countryName(t.id)}</span>
              {placed[0] ? (
                <span className="flex items-center gap-2">
                  <Flag id={placed[0].id} size={44} /> <PlacedTick />
                </span>
              ) : (
                <span className="h-8 w-12 rounded-md border-2 border-dashed border-line" />
              )}
            </span>
          )}
        />
      )}
    </GameShell>
  );
}
